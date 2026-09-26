# 左侧边栏：交付范围与本地安装

本轮不 commit、push 或创建 PR。工作区继续保留在 `feat/sidebar`；`mine` 已从现用版本对应的 `9dbd23b` 建立，未来个人功能在 `mine` 开发。

## 范围核对

不能把当前整个工作区直接提交为侧栏 PR。已按白名单抽出独立候选，共 39 个文件：30 个功能/构建文件，9 个已有测试文件。候选基于本地已知的官方 `46a2e32`；正式提 PR 前仍需检查上游最新 main。

候选只包含左侧场景边栏及其必要配套：

| 范围 | 必要原因 |
|---|---|
| 场景列表、菜单、改名、提示、拖拽、多选、宽度与 hover peek | 本次主体功能 |
| 场景持久化、IPC 类型、AppModel | 排序与批量删除需要落盘，改名/排序不能误切换聊天或读取范围 |
| 聊天 iframe 与快速历史索引桥接 | 解决侧栏 peek 与正文历史预览抢占，以及鼠标离开和 Escape 跨 iframe 的边界 |
| 窗口控制带、macOS/Windows 留位、正文区域偏移 | 实现左栏贯穿顶部的布局；右侧业务面板未重设计 |
| 共享活动标记及正文引用 | 来自此前“思考/执行都转圆圈，并与对话对应”的要求；没有改任务调度或消息发送规则 |
| Lucide 依赖、样式打包、第三方许可证 | 保证正式桌面/Web 产物加载同一状态组件和图标 |

已从本次候选与安装源码排除的额外差异：

- 全局 `select option:checked` 字重由 550 改为 500。
- 聊天正文现有排队提示与“取消排队”入口的删除。
- 对应 `.local-queue-status` 样式的删除。

这些改动仍保留在原工作区，未覆盖或丢弃。安装版沿用此前正式版本的排队入口；本次没有新增排队消息条。`out/sidebar-delivery/sidebar-only.patch` 是经过筛选的差异，不能用当前工作区的 `git diff` 全量替代它。

## 哪些进入官方 PR

| 材料 | 处理 |
|---|---|
| `tests/chat-scene.test.ts`、`tests/renderer-state.test.ts` | 应进入：覆盖排序、批量删除、错误回滚、保留上下文等业务行为 |
| 现有 `chat-react` / `chat-scene-context` / `chat-sessions-electron` / `sbs-refresh` 测试修改 | 应进入：新 DOM 结构及跨 iframe、状态标记需要回归保护 |
| `window-icon.test.ts`、Windows 客户端测试及其辅助文件 | 应进入：Windows 原生控制带行为随本功能变化 |
| 7 个 `tests/sidebar-*.mjs` | 当前依赖个人 demo，不原样进入。保留本地用于验收；正式 PR 若需要补充对应覆盖，应改成 tests/support 下的独立 fixture，并合并重复用例 |
| `demo/`、demo 构建脚本、package 中 demo 命令、tsconfig 的 demo includes | 本地预览保留，不进官方 PR |
| spec、参考 JSON、设计审计、截图、测量、交付记录、AGENTS.md | 本地/个人分支材料，不进官方 PR |
| `.dev-profile/`、`.stash/`、test-results、日志、二进制、安装备份 | 不进入任何功能提交或 PR |

不能为了缩小文件数删除必要回归，也不能因为测试有用就把整套 demo 和审计材料一起提交。当前候选的 `package.json` 只增加正式依赖，不增加 demo 命令。

## 构建基底与程序身份

现用 `/Applications/Portal Desktop.app` 为 0.2.0，包内构建标记 `9dbd23b`，对应 `local/integration`。直接打包 `feat/sidebar` 会回到 0.1.7 并丢失已安装的 CodeMirror 输入框，因此本轮从现用提交生成临时构建源，再合并独立侧栏候选。

- 名称仍为 Portal Desktop，bundle ID 仍为 `town.beings.portal-desktop`，版本仍为 0.2.0。
- 保留现用 Markdown 输入框、列表续写和其他既有功能。
- 沿用正常 `portal-desktop` 数据目录，不设置 `PORTAL_DESKTOP_USER_DATA`，不运行 start:dev。
- 复用现用客户端自带的 Portal 引擎，不升级引擎。按已有本地方式进行 ad hoc 签名。
- 自用构建更新源设为 `zongyang0719/portal-desktop`；此配置仅用于个人构建，不混入官方侧栏补丁。
- 应用包内共 22 个条目，已验证没有 demo、tests、docs、AGENTS.md、profile 或 stash。
- 旧版以 ZIP 备份保留在忽略的 `out/sidebar-delivery/`，不额外安装第二个程序。

### 本地签名与启动状态

已替换 `/Applications/Portal Desktop.app`，标记为 `9dbd23b+sidebar`。本机旧程序使用无 Hardened Runtime 的 ad hoc 签名；本次采用同样方式。此签名配置仅位于临时个人构建源，不进入官方侧栏候选。

打包时曾出现两个安装问题：默认 Hardened Runtime 拒绝无 Team ID 的框架；重新签名又改写了自带引擎，触发摘要保护。前者已按旧客户端签名方式修复；后者已从旧包恢复引擎的完整字节，只重新封装外层签名，安装时再次核验摘要。最终引擎 SHA-256 为 `32c45c56552ceab70743a01efebdbc42cc726f868aaab5fa51d9bea8838f013f`，与原安装及 runtime manifest 一致。

17:56 的原生启动采样显示主线程等待 macOS `SecItemCopyMatching` 钥匙串授权；需用户在系统弹窗中完成。工具禁止操作 `SecurityAgent`，没有修改凭据或绕过系统保护。此前摘要失败留下的 Portal 接管保护仍待通过客户端正常“启动”操作重试，未手工删除保护记录。完成授权和重试前，不把本次原生启动标记为已通过。

## 验证记录

- 官方基底候选：typecheck 通过；npm test 519 通过 / 23 跳过。
- 实际安装源码：typecheck 通过；npm test 523 通过 / 23 跳过。
- 完整 package 构建、macOS 深度签名校验、引擎摘要与清单校验通过。
- 包内核对：CodeMirror 保留、现有排队取消保留、侧栏与 hover 样式已打入、更新源为个人 fork。
- 安装源码的 composer 浏览器检查通过，场景上下文检查通过；后者修正了旧测试中“场景详情”按钮名称为现在的“场景信息”。
- 曾在原生客户端读取到新侧栏、六个原有场景、宽度控制、场景信息入口与 CodeMirror 输入框；最终包的完整原生启动验证仍等待系统授权。
- 两次归档测试最初均缺少 Git 子模块，补入原仓库的锁定子模块引用后完整通过；没有跳过失败测试。
- 追加按钮检查：7 组共享侧栏回归全部通过；安装源码 Electron 完整场景流程连续两轮通过；npm test 再跑仍为 523 通过 / 23 跳过。修正了已有集成测试的正文/hover 预览定位歧义、状态图标断言、mock 历史正文及场景切换就绪等待，没有修改产品代码。详情见 `docs/ux-audit-sidebar-buttons-2026-09-26.md`。

精确文件白名单、候选补丁摘要、构建路径与包摘要见 `out/sidebar-delivery/manifest.json`。此次安装测试不代表官方 PR 已获准，也不代表真实 Windows 验收已完成。

## 20:24 用户实测后的热修

已确认此前 DOM/mock 按钮检查漏掉原生拖拽命中，以及不存在于旧 fixture 中的启动横幅。现已修复顶部拖拽区域与按钮相交、横幅被侧栏覆盖两处 CSS 问题，并在相同 macOS 原生窗口配置的临时 mock 中使用真实坐标点击确认。当前分支 npm test 519/23，安装源码 523/23；三组定向浏览器回归及完整 Electron 复跑通过。完整集成首轮另有一次发送等待超时，诊断与原测试随后通过，日志保留且未宣称其根因已经修复。

修复已原位安装并重新启动，ASAR 摘要为 `c5de8d44fd130ac4c32c4fb084bd9f0bac9e5150e1a9a39a368c05d8a3ec8df4`。引擎仍与旧包完全一致，签名与完整性检查通过。没有新增 Dev 程序、没有提交 PR。当前安装进程存在；整页私人界面读取仍受自动审批限制，不把原生 mock 点测等同于已安装客户端全量验收。详情和前一轮结论纠正见按钮审计。

## 20:34 Windows 留位修正与未解决缺陷

同类审查又确认隐藏/浮动面板误触发 Windows caption 留位取消，已修复并补已有 Electron 用例、原位同步客户端。当前 ASAR 摘要见 manifest（本轮为 `dbbb528786e86d251afd529dbd40ccfe9081f9461c9be7660e011a7b2fef52df`）。

另外明确保留 OPEN-02：920px 窗口同时展开左栏和 620px 右侧场所面板时正文仅 100px，顶栏重叠；两个平台都复现，尚未修复。32 组几何矩阵结果为 30 通过、2 失败。没有 Windows 实机/虚拟机测试结果；不能将本轮 CSS 模拟或 Mac Electron 结果标成 Windows 验收。详见按钮审计的 Windows 章节。


## 本轮交付 · 图标与 hover 场景排序

保留线框图标，视觉尺寸改为 16px、默认颜色调浅，macOS 位置左移 4px/下移 1px，32px 命中范围保留。修复 hover 浮层排序开始时 pointercancel 被误判为取消而关闭面板的问题；不改 hover 参数。

当前分支 npm test 519 通过/23 跳过，typecheck、四组浏览器检查及安装源码完整 Electron 场景集成通过。原生 mock 证明拖拽接管期间保持打开及 Esc 恢复；工具未完成原生 drop，不宣称完整原生排序验收通过。此前 OPEN-02 与 Windows 原生验证缺口继续保留。

已重新构建 renderer，原位安装并启动同一个 `/Applications/Portal Desktop.app`。ASAR SHA-256：`01cb0ea97df0c78bdac77b93735833473c90aa25e555afb28ec1311b530a5a95`。引擎摘要仍为原版，签名及完整性校验通过。候选补丁仍为 39 个文件；补丁与安装源码归档已同步。没有 commit、push 或 PR。


## 窄窗自动让位修复 · PR #3 更新

用户采用的规则：正文可用空间不足 320px 时，左栏不占位，列表改为按钮/左缘可打开的浮层；固定偏好与保存栏宽保留，空间恢复后回到固定栏。右侧面板未修改。

提交 `7cf9a5d` 已推送到个人 fork 的 `contrib/sidebar` 并更新官方 PR #3。仅提交 `chat-scene.tsx`、`use-sidebar-peek.ts`、`use-sidebar-width.ts`。原 `feat/sidebar` 工作区的其他未提交内容保持原样。

同一个 `/Applications/Portal Desktop.app` 已重建、替换并启动。ASAR SHA-256 `9581fb0a7eac27d1aa06231c792a6c9e250b265fa3f62b42d992247106a5e43f`；引擎摘要未变；签名及完整性检查通过。本轮没有重跑测试/typecheck；此前 519/23 与 hover 排序检查都早于这项修复。PR 目前未报告 CI；Windows 原生交互未验证。920px 窗口 + 620px 右栏的自动让位仍待用户复验。
