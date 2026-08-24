# DSH Quick Open

Open the **DeepSeek Harness** Web UI directly in VS Code — a one-click editor-title button (and keybindings) that starts the `dsh web` server for you if it is not already running, then opens the page in VS Code's integrated browser.

A tiny, dependency-free VS Code extension (plain JS, no build step).

## Features

- 🐳 One-click open from the **editor title bar** (the DeepSeek whale icon).
- ⌨️ Keybindings: `Cmd+Shift+D` (macOS) / `Ctrl+Alt+D` (Linux/Windows).
- 🤖 **Auto-starts** `dsh web` if nothing is listening on the port, waits for it to become ready, then opens it.
- 🔁 Detects an already-running instance and just opens it (no restart, no wrangling the session).
- 🛡️ Probe checks the page marker (not just "port is open") so it won't mistake another service for DSH.
- ⚙️ Configurable command, port, and URL.

## Install

**From a VSIX release** (no account needed):

```sh
code --install-extension ./dsh-vscode-quickopen-0.1.0.vsix
```

or in VS Code: `Extensions (...) → ⋯ → Install from VSIX...`

**From the marketplace** (once published): search "DSH Quick Open".

**From source** (workspace extension):

```sh
git clone https://github.com/smithsarah1227yue/dsh-vscode-quickopen && code dsh-vscode-quickopen
# VS Code will offer to install the workspace extension in .vscode/extensions/dsh-vscode-quickopen
```

## How it works

1. Probe `http://127.0.0.1:3080/` — must return `200`, `text/html`, and contain the `__ModuleLoader__` marker.
2. If that fails, spawn `dsh web --no-open --port <port>` detached and append output to `<workspace>/.dsh-web.log`.
3. Poll until ready (max 30s, with a progress notification).
4. Call `simpleBrowser.show <url>` to open it in the VS Code browser.

> `--no-open` is deliberate: `dsh web` opens the OS default browser on start; this extension hands the page to the VS Code browser instead.

## Configuration

| Setting | Default | Description |
|---|---|---|
| `dshOpen.dshCommand` | `""` | Command to launch DSH. Empty = use `dsh` on the shell PATH. Set an absolute path if `dsh` isn't on the PATH that VS Code (a GUI app) sees — e.g. `"/Users/you/.local/bin/dsh"`. |
| `dshOpen.port` | `3080` | Port the DSH web server uses. |
| `dshOpen.url` | `""` | Optional full URL; overrides `dshOpen.port`. |

If `dsh` isn't found, the extension tries `npx --yes @deepseek-ai/dsh web --no-open` as a fallback.

## Requirements

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`), or network access so `npx` can fetch it.
- VS Code `^1.82.0`.

## License

MIT. See [LICENSE](LICENSE).

---
The whale icon is derived from the DeepSeek Harness web UI's own `favicon.svg`. The DeepSeek logo is a trademark of DeepSeek; this extension is not affiliated with or endorsed by DeepSeek.
