// dsh-open: open the DeepSeek Harness Web UI in VS Code.
//
// Flow: probe the web URL -> if not running, spawn `dsh web --no-open`
// (detached, so it survives VS Code closing) -> poll until ready -> open the
// integrated/simple browser with the URL.
//
// Everything machine-specific is configurable via the `dshOpen.*` settings
// (`dshOpen.dshCommand`, `dshOpen.port`, `dshOpen.url`), so this extension is
// portable across machines. See README.md for details.
const vscode = require('vscode');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROBE_TIMEOUT_MS = 700;
const START_TIMEOUT_MS = 30000;
// How long the launcher gives a spawned server to prove it did not fail to boot
// before trying the fallback command (e.g. npx).
const LAUNCH_SETTLE_MS = 3000;

function cfg(key, fallback) {
  return vscode.workspace.getConfiguration('dshOpen').get(key, fallback);
}

// Resolve the URL to open/probe. Prefers `dshOpen.url`; otherwise derives
// `http://127.0.0.1:<port>` from `dshOpen.port`.
function webUrl() {
  const explicit = (cfg('url', '') || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const port = cfg('port', 3080);
  return `http://127.0.0.1:${port}`;
}

function workspaceRoot() {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length > 0 ? folders[0].uri.fsPath : os.homedir();
}

// A DSH web server responds 200 with text/html whose body carries the
// `__ModuleLoader__` marker; this feature check avoids mistaking some other
// service squatting on the port for a running DSH.
async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return false;
    const body = await res.text();
    return body.includes('__ModuleLoader__');
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Build the launch commands. `--no-open` is required: `dsh web` opens the OS
// default browser on start unless told otherwise, and we hand the URL to the
// VS Code browser instead.
function buildCommands() {
  const user = (cfg('dshCommand', '') || '').trim();
  const port = cfg('port', 3080);
  const tail = `web --no-open${port ? ` --port ${port}` : ''}`;
  return {
    // Primary: whatever the user configured, or `dsh`.
    primary: `${user || 'dsh'} ${tail}`,
    // Fallback: install/run DSH through npx for environments without a global dsh.
    fallback: `npx --yes @deepseek-ai/dsh ${tail}`,
  };
}

// Launch a command through a login shell so the user's PATH (e.g. ~/.local/bin,
// nvm) is visible even when VS Code is launched from the GUI.
function launch(command) {
  let file, args;
  if (process.platform === 'win32') {
    file = 'cmd.exe';
    args = ['/c', command];
  } else if (process.platform === 'darwin') {
    file = 'zsh';
    args = ['-lc', command];
  } else {
    file = 'bash';
    args = ['-lc', command];
  }
  return spawn(file, args, {
    cwd: workspaceRoot(),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
}

// Start `dsh web --no-open`, appending output to `<workspace>/.dsh-web.log`.
// Tries the primary command, then the npx fallback, and returns a handle to
// track whether the surviving process is still alive.
async function startServer() {
  const root = workspaceRoot();
  const logPath = path.join(root, '.dsh-web.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  const commands = buildCommands();
  const attempts = [commands.primary, commands.fallback];

  let alive = false;

  for (const command of attempts) {
    const child = launch(command);
    if (child.stdout) child.stdout.pipe(logStream);
    if (child.stderr) child.stderr.pipe(logStream);
    let died = false;
    let code = null;
    child.on('error', () => { died = true; alive = false; });
    child.on('exit', (c) => { died = true; code = c; alive = false; });
    child.unref();

    alive = true;
    // Give the process a moment; if it dies quickly with a non-zero code it
    // failed to boot (e.g. command not found), so try the next command.
    for (let w = 0; w < LAUNCH_SETTLE_MS / 100; w++) {
      if (died) break;
      await sleep(100);
    }
    if (!died || code === 0) break; // survived, or exited cleanly — stop retrying
  }

  return { logPath, isAlive: () => alive };
}

async function waitUntilReady(isAlive, progressRef) {
  const url = webUrl();
  const t0 = Date.now();
  while (Date.now() - t0 < START_TIMEOUT_MS) {
    if (await probe(url)) return true;
    if (!isAlive()) return false; // 进程已退出/启动失败，快速失败，不用干等 30s
    if (progressRef && progressRef.cancelled) return false;
    await sleep(1000);
  }
  return false;
}

async function openWebUI() {
  const url = webUrl();

  if (await probe(url)) {
    // Already running: just open the page.
    return vscode.commands.executeCommand('simpleBrowser.show', url);
  }

  const { logPath, isAlive } = await startServer();
  const started = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'DSH Web 启动中...',
      cancellable: true,
    },
    (progress, token) => {
      const ref = { cancelled: false };
      token.onCancellationRequested(() => { ref.cancelled = true; });
      return waitUntilReady(isAlive, ref);
    }
  );

  if (started) {
    return vscode.commands.executeCommand('simpleBrowser.show', url);
  }
  return vscode.window.showErrorMessage(
    `DSH Web 未就绪（30s 超时或进程已退出），请查看日志: ${logPath}；` +
      `可在设置里改 "dshOpen.dshCommand"（例如 dsh 的绝对路径），或直接运行: dsh web`
  );
}

function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand('dsh.openWebUI', openWebUI));
}

function deactivate() {}

module.exports = { activate, deactivate };
