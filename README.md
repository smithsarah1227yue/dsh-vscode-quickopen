# DSH Quick Open

在 VS Code 里一键打开 **DeepSeek Harness** 的 Web 界面——一个编辑器标题栏上的按钮（＋键盘快捷键）：如果 `dsh web` 服务没在运行，它会自动帮你启动，然后再在 VS Code 内置浏览器里打开。

一个极小的、零依赖的 VS Code 扩展（纯 JS，无需构建）。

## 功能特性

- 🐳 从**编辑器标题栏**一键打开（DeepSeek 鲸鱼图标）
- ⌨️ 快捷键：`Cmd+Shift+D`（macOS）/ `Ctrl+Alt+D`（Windows/Linux）
- 🤖 **自动启动**：端口上没有服务在跑时，自动 `dsh web` 并等待就绪后再打开
- 🔁 检测到已在运行的实例时直接打开（不重启、不打断会话）
- 🛡️ 探测会检查页面标记（不只是"端口开着"），避免把其他服务误当成 DSH
- ⚙️ 命令、端口、URL 均可配置

## 安装

**从 Release 下载 VSIX（无需账号）：**

```sh
code --install-extension ./dsh-vscode-quickopen-0.1.0.vsix
```

或 VS Code 里：`扩展(Extensions) → ⋯ → 从 VSIX 安装(Install from VSIX...)`

**从源码（工作区扩展）：**

```sh
git clone https://github.com/smithsarah1227yue/dsh-vscode-quickopen && code dsh-vscode-quickopen
# VS Code 会提示安装 .vscode/extensions/dsh-vscode-quickopen 这个工作区扩展
```

## 工作原理

1. 探测 `http://127.0.0.1:3080/` —— 必须返回 `200`、`text/html`，且包含 `__ModuleLoader__` 标记。
2. 若无响应，则后台启动 `dsh web --no-open --port <port>`，输出追加到 `<工作区>/.dsh-web.log`。
3. 轮询直到就绪（最多 30 秒，带进度通知）。
4. 调用 `simpleBrowser.show <url>` 在 VS Code 浏览器中打开。

> 刻意使用 `--no-open`：`dsh web` 启动时会默认打开系统浏览器；这个扩展改为把页面交给 VS Code 内置浏览器。

## 配置

| 设置 | 默认值 | 说明 |
|---|---|---|
| `dshOpen.dshCommand` | `""` | 启动 DSH 的命令。留空使用 PATH 上的 `dsh`；如果 `dsh` 不在 VS Code（GUI 应用）能看到的 PATH 里，可填绝对路径，例如 `"/Users/you/.local/bin/dsh"`。 |
| `dshOpen.port` | `3080` | DSH Web 服务监听的端口。 |
| `dshOpen.url` | `""` | 可选完整 URL；设置后覆盖 `dshOpen.port`。 |

如果 `dsh` 找不到，扩展会自动回退 `npx --yes @deepseek-ai/dsh web --no-open`。

## 环境要求

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`），或有网络让 `npx` 拉取。
- VS Code `^1.82.0`。

## License

MIT，见 [LICENSE](LICENSE)。

---

鲸鱼图标取自 DeepSeek Harness Web UI 自带的 `favicon.svg`。DeepSeek logo 是 DeepSeek 的商标；本扩展与 DeepSeek 无任何隶属或背书关系。
