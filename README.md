# DreamStar Server Manager

Windows 优先的本地 Minecraft 多服务器 + 数据库管理器 MVP。

## 运行

```bash
npm install
npm run dev
```

Windows 下也可以直接双击：

```text
start-dreamstar.bat
```

脚本会自动检查 Electron 二进制。如果缺少 `node_modules/electron/path.txt` 或 `node_modules/electron/dist/electron.exe`，会使用镜像重新执行：

```bash
npx install-electron --no
```

## 检查与构建

```bash
npm run typecheck
npm run build
```

## MVP 能力

- 在 UI 中添加 Minecraft、Velocity、自定义控制台实例。
- 使用 Electron main process 后台启动进程，不弹出一堆 `.bat` 黑窗口。
- 停止 Minecraft 默认发送 `stop`，停止 Velocity 默认发送 `end`，超时后才强制终止。
- Dashboard 查看实例状态、PID、端口、工作目录，并支持启动、停止、重启、强制终止。
- 终端详情页实时显示 stdout/stderr 日志，并能向 stdin 发送命令。
- 在 UI 中添加 MySQL / PostgreSQL / Redis 连接，测试连接，执行 SELECT，搜索 Redis key。
- renderer 只通过 preload 暴露的安全 API 调用 IPC，不直接访问 Node.js。

## 基本使用

1. 启动后进入 Dashboard。
2. 点击“添加 Minecraft”，填写名称、ID、工作目录、启动命令和关闭命令后保存。
3. 回到 Dashboard 后点击实例卡片上的启动按钮。
4. 点击终端按钮进入实例终端页，查看 stdout/stderr 日志并输入命令。
5. 在 Databases 页面创建 MySQL / PostgreSQL / Redis 连接，保存后可测试连接。
6. MySQL / PostgreSQL 连接可使用 SQL 控制台执行查询；Redis 连接可搜索 key、查看值、执行命令。

## 安全策略

- Minecraft 停止默认发送 `stop`；Velocity 停止默认发送 `end`。
- 强制终止使用前端二次确认，Windows 下会走 `taskkill /PID <pid> /T /F`。
- 手动停止会标记 `manualStop=true`，不会触发自动重启。
- 意外退出且 `autoRestart=true` 时，才进入自动重启流程。
- SQL 的 `INSERT / UPDATE / DELETE / DROP / TRUNCATE / ALTER / CREATE / GRANT / REVOKE` 需要二次确认。
- Redis 的 `DEL / FLUSHDB / FLUSHALL / CONFIG / SHUTDOWN / EVAL` 需要二次确认。
- 错误信息会脱敏常见密码字段。

## 当前 MVP 边界

- 已实现可运行桌面骨架、实例创建、进程管理、日志终端、命令输入、数据库连接测试和基础查询。
- 编辑实例 UI、CSV 导出、完整数据库备份、托盘图标、自动下载 Paper/Purpur/Velocity、TPS/MSPT 监控属于后续阶段。
- 配置使用本地 JSON 存储，但用户不需要手动编辑该文件。

## 配置位置

运行后配置保存在 Electron 的用户数据目录中，例如 Windows：

```text
%APPDATA%/dreamstar-server-manager/config.json
```

不要把包含数据库密码的真实配置提交到仓库。导出配置时请注意其中可能包含连接密码。
