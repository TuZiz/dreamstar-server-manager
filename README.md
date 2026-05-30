# DreamStar Server Manager

DreamStar Server Manager 是一个 Windows 优先的本地 Web 管理面板，用来托管已有 Minecraft / Velocity / 自定义控制台实例，并管理常用数据库连接。

项目方向是“管理器”，不是开服向导：不自动生成服务端配置，不覆盖已有目录，不考虑 Linux / Docker / 多节点平台能力。

## 运行

推荐 Web 模式：

```bash
npm install
npm run dev:web
```

默认地址：

- 前端面板：http://127.0.0.1:5173/
- 本机 API：http://127.0.0.1:25888/

Windows 下也可以直接双击：

```text
start-dreamstar.bat
```

脚本会安装依赖、启动本地 Web API 和 Vite 前端，并自动打开浏览器。

## 构建

```bash
npm run typecheck
npm run build:web
npm run start:web
```

`build:web` 会生成 `out-web/renderer`。生成后执行 `start:web`，API 服务会直接托管构建后的 Web 面板。

Electron 桌面入口仍保留为可选兼容模式：

```bash
npm run dev
npm run build
```

## 当前能力

- 添加已有 Minecraft、Velocity、自定义控制台实例。
- 保存实例名称、类型、工作目录、启动命令、关闭命令、日志路径、自动重启策略。
- Dashboard 查看实例状态、PID、端口、工作目录，并支持启动、停止、重启、强制终止。
- 实例详情页提供实时控制台、命令输入、日志清理。
- 支持编辑实例配置，不重新生成服务端文件。
- 支持浏览实例工作目录，并编辑常见文本配置文件。
- 支持 MySQL / PostgreSQL / Redis 连接、连接测试、基础 SQL 查询和 Redis key 操作。
- Web 前端通过 REST + SSE 连接本机 API；Electron 模式通过 preload IPC 复用同一套前端。

## Web 模式说明

普通浏览器没有 Electron 的系统文件选择器，因此 Web 模式下“选择目录 / 选择文件”会弹出路径输入框。填入本机绝对路径即可，例如：

```text
D:\Minecraft\survival-1
C:\Program Files\Java\jdk-21\bin\java.exe
```

Web API 只监听本机地址，默认不会暴露到局域网。需要调整端口时可设置：

```bash
set DREAMSTAR_WEB_PORT=25888
npm run dev:web
```

## 配置位置

Web 模式配置保存到：

```text
config/config.json
```

该文件已加入 `.gitignore`，不要把包含数据库密码的真实配置提交到仓库。

## 安全策略

- Minecraft 停止默认发送 `stop`，Velocity 停止默认发送 `end`。
- 强制终止前会二次确认；Windows 下使用 `taskkill /PID <pid> /T /F`。
- 手动停止会标记 `manualStop=true`，不会触发自动重启。
- 意外退出且 `autoRestart=true` 时，才进入自动重启流程。
- SQL 的 `INSERT / UPDATE / DELETE / DROP / TRUNCATE / ALTER / CREATE / GRANT / REVOKE` 需要二次确认。
- Redis 的 `DEL / FLUSHDB / FLUSHALL / CONFIG / SHUTDOWN / EVAL` 需要二次确认。
- 错误信息会脱敏常见密码字段。

## 边界

- 不做 Docker、Linux、多节点、多用户、市场和商业化面板能力。
- 不自动下载核心，不自动生成 `server.properties` / `velocity.toml`。
- 后续可继续补齐备份、导出、TPS/MSPT 指标、计划任务和更完整的文件操作。
