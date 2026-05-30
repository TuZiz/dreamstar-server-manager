# AGENTS.md

本项目是 DreamStar Server Manager，一个 Windows 优先的 Minecraft 多服务器 + 数据库管理器。

开发规则：

- 优先保证可运行，不要只写伪代码。
- 所有功能都要围绕 Minecraft 多服管理、Velocity、Purpur、Paper、MySQL、PostgreSQL、Redis。
- Windows 是第一目标平台。
- 进程管理必须安全，停止 Minecraft 优先发送 `stop`，不要直接 `kill`。
- Velocity 默认停止命令是 `end`。
- 数据库危险操作必须二次确认。
- renderer 不允许直接执行系统命令，必须通过 preload + IPC 调用 main process。
- 不要把数据库密码写死在代码里。
- 不要在日志里输出密码。
- 用户不应该手动编辑 YAML/JSON，所有配置必须能在 UI 中创建和修改。
- 每次修改后尽量运行 `npm run typecheck` 或 `npm run build`。
- UI 要简洁、现代、浅色主题优先，像服务器实例管理器。
- 代码要模块化，方便后续扩展 Web 面板、QQ/Discord 通知、自动备份、TPS/MSPT 监控。
