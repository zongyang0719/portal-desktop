# 自用分支入口

2026-09-26：日常目录已整理到 `mine`，包含 CodeMirror 输入框、Markdown/列表编辑和 sidebar（含窄窗口修复）。`main` 对齐本次 fetch 后的官方 `46a2e32`；`contrib/sidebar` 保留原 PR 的 `7cf9a5d`。

## 开始新需求

在这个项目开新 Session，直接说需求，例如：

> 基于 mine，把客户端改成白底浅色。按 AGENTS.md 执行，不提 PR；先看当前界面，再小步调整。

串行工作直接使用日常目录。并行任务由 Agent 从 `mine` 建立独立 worktree 和临时个人功能分支，最终整合回 `mine`。新 Session 本身不会隔离文件；同一目录不能由多个任务同时改写。仍只安装和使用一个客户端与日常数据目录。

## 当前整理结果

- 输入框实现保留自 `feat/composer-live-markdown`，sidebar 合并自 `contrib/sidebar`，两者冲突已处理。
- 旧目录的个人队列提示移除、选项字重、Demo、设计文档保留在个人分支；个人提交不进入已有官方 PR。
- 默认二进制更新源改为 `zongyang0719/portal-desktop`。构建时不要把 `PORTAL_DESKTOP_UPDATE_REPOSITORY` 覆盖成官方仓；仅个人发布源上的版本可供这个客户端更新。
- 本次只整理源码与本地 Git，没有推送个人分支、发布版本或替换已安装客户端。后续安装由 `mine` 构建，保留现有日常数据。
- `docs/SIDEBAR-DELIVERY-2026-09-26.md` 等旧交付记录是历史快照；后续从 `mine` 继续，不把旧临时构建目录当作最新源码。

## 本地恢复点

- 恢复分支：`codex/archive-before-mine-20260926`，保存整理前的源码与文档快照，仅用于恢复，不作为 PR 或合并来源。
- 备份目录：`out/mine-integration-backup-20260926-213004/`，含原文件归档、SHA-256 清单、差异和 Git bundle。
- 文件归档含本地数据，必须留在本机，不上传。`.dev-profile/`、`.stash/`、生成 HTML、截图证据已排除 Git，原文件保留在日常目录。
