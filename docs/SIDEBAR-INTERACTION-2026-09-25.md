# Sidebar hover peek：参数与交互决策

采用 **8px 热区 / 300ms 打开 / 224px 浮层 / 300ms 离开宽限**。这是针对 Portal 的可验证基线，不是声称存在一套普适的「最佳参数」，也不是 Arc/Codex 的逆向测量结果。

用户在 2026-09-25 的后续指令中授权查找并选择方案。本文补充原 spec §6.2 的未定项；边栏内容不重组，不新增 workspace switcher、resize 或 icon rail。

## 参数、依据与适用边界

| 项目 | 采用方案 | 依据与取舍 |
| --- | --- | --- |
| 热区宽度 | 窗口内左缘 **8 CSS px**，贯穿 workspace 高度；透明、无布局占位；这 8px 专用于触发，覆盖 iframe 边缘以接收指针事件 | **Portal 设计选择**，没有可靠证据称它是 Arc/Codex 的值。避免 1px 在非最大化窗口过难命中，也避免宽条侵入内容。保留 32px 顶部按钮作为可发现、可键盘操作的入口；8px 不是唯一操作目标。 |
| 触发延迟 | 在热区连续停留 **300ms**；离开立即取消等待 | [Baymard 的 hover 导航研究](https://baymard.com/research-articles/dropdown-menu-flickering-issue)建议 300–500ms 过滤经过；取下限以照顾高频操作。研究对象是电商菜单，迁移到桌面边栏是**设计推断**，不是本产品用户实验结论。 |
| 防误触 | 仅支持 hover 的精确鼠标；扫过不触发；按键拖拽、文字选区、模态框、失焦和页面不可见时不触发；计时完成时再次核对 | [Floating UI](https://floating-ui.com/docs/usehover)提供 mouse-only、独立开关延迟和可进入浮层的模式。采用连续停留，不叠加未经验证的速度/角度阈值或多段等待。Escape/失焦/主动收起后，须离开热区再进入才可重新触发。 |
| 浮层宽度 | **224px**，与固定态共用同一组件、同一宽度 | 直接来自本地 Beautiful UI `SidebarNav.tsx` 的 `expandedWidth`。状态改变时行文与截断保持一致。极窄 Web 视口保留右侧可点击空间；桌面窗口本身有最小宽度。 |
| 离开关闭延迟 | 离开热区、面板和顶部按钮的联合区域后 **300ms**；返回立即取消关闭 | [Radix Hover Card](https://www.radix-ui.com/primitives/docs/components/hover-card)的 `closeDelay` 默认 300ms，提供一个成熟实现的宽限基线。借用延迟，不借用 Hover Card 的语义（其默认不向读屏呈现，不能照搬给导航）。[Floating UI](https://floating-ui.com/docs/usehover#handleclose)也允许短关闭延迟替代复杂安全多边形。 |

## 连续性与关闭规则

- 浮层贴左缘，热区与浮层重合，没有需要精确跨越的空隙。穿越到顶部按钮有关闭宽限，不遮住主内容的点击。
- 鼠标进入浮层、进入顶部按钮、键盘焦点停留于面板、打开场景菜单/编辑对话框时保留浮层。关闭内部菜单后按当前指针/焦点位置重新决定是否收起。
- 鼠标预览不抢焦点、不写 pin、不写 localStorage；选择场景沿用现有逻辑。主内容只在用户点击 pin/unpin 时改变宽度，peek 全程坐标保持不变。
- 聊天 iframe 通过现有桥接校验来源与 revision 后转发未被内部 UI 消费的 Escape；Escape 即时关闭 peek 并抑制原地重开；内层菜单/对话框先处理 Escape。固定态不会被 Escape 意外解除固定；固定入口只在顶部控制带。
- 点击浮层外即时关闭且不吞掉该次点击。失焦立即撤销临时 peek，并取消尚未触发的计时。
- 关闭时若焦点还在面板里，恢复到顶部按钮。隐藏的内容树保留，但使用 `inert` 和 `aria-hidden` 防止 Tab/读屏进入。符合 [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)的可关闭、可进入、持续显示原则；不据此宣称完成全部 WCAG 审计。

## 动效和原生控制带

使用 `emil-design-eng` skill 的高频交互、可中断 transition、键盘即时响应原则。避免弹跳、逐行 stagger、把 pointer 速度解释为意图的额外阈值。

| Before | After | Why |
| --- | --- | --- |
| 条件挂载/卸载整个场景列表 | 常驻同一棵树，隐藏时 inert 并移出窗口 | 保留滚动位置，连续切换不重建内容 |
| 面板存在就给主区增加 margin | 只有 `data-pinned=true` 改变主区宽度 | peek 的主内容坐标不变 |
| 236px 浮动卡片、独立关闭按钮 | 224px 固定/浮层两态，顶部唯一 pin 按钮 | 统一几何和操作入口 |
| 顶栏 68px，按钮中心 34px | 控制带 52px，按钮中心 26px | 对齐仓库原生灯位置 `y:20` 的灯体中心；实际 macOS 验证另记 |
| 条件挂载时 160ms keyframe | 280ms 可中断 transition，曲线 `.16,1,.3,1` | 直接复用 Beautiful UI 的框体动效；快速反向操作不会重播关键帧 |

框体 280ms、文字 180ms / 8px、曲线 `.16,1,.3,1` 来自 spec §6.1。行 hover 150ms / press `.98` 同样取自其源码。peek 只移动浮层；pin 允许主区重排。键盘触发和 `prefers-reduced-motion: reduce` 直接切换，不滑动。

初始 pin 状态沿用当前实现（展开）；本次不新增持久化或改变启动偏好。顶部标题始终显示当前场景，开关侧栏不使标题显隐；按钮没有常驻边框或底色，图标左半区填充表示已固定。此处按用户后续对标题稳定性的反馈修订。

## 参考筛选

- Beautiful UI：本地三个 JSON 已读，用其几何和动效，不采用 52px icon rail。
- [Zen compact-mode 源码](https://github.com/zen-browser/desktop/blob/dev/src/zen/compact-mode/ZenCompactMode.mjs)及[样式](https://github.com/zen-browser/desktop/blob/dev/src/zen/compact-mode/sidebar.inc.css)：参考 hover 与用户展开状态分开、处理子菜单与原生窗口边界的机制。未把其窗口外跟踪距离误当热区宽度；没有复制 MPL 源码。
- [Arc 官方侧栏说明](https://resources.arc.net/hc/en-us/articles/25619487530519-How-Do-You-Hide-the-Sidebar)：未提供上述五项精确参数。Codex 作为形态参考，未获得可引用的精确 hover 参数。
- [beUI AI Sidebar](https://beui.dev/components/agents/ai-sidebar)：内容/资源树与当前范围不同，不移植项目、文件夹或拖拽管理功能。

## 验证范围

浏览器回归覆盖 file:// 离线入口、快速扫过/连续停留、离开后返回、Escape 原地抑制、关闭后的 Tab、拖拽/选区/触摸/失焦防误触、菜单与键盘交互、滚动保持、pin 与 peek 状态隔离、逐帧主区坐标、减少动态效果。原生窗口对齐与 iframe 边界另做 Electron 检查。测试结果以本次执行记录为准，不以源码存在代替行为验证。

## 9 月 26 日细节收敛

- **历史索引避让**：聊天 iframe 的快速索引原位于左侧 9px，与 8px 侧栏热区只差 1px。内嵌聊天改为 20px，留出 12px 缓冲；预览卡同步内移。索引内容与跳转保持原样；侧栏 peek 打开时，通过来源和 revision 校验的桥接明确清除历史预览，避免跨 iframe 的 mouseleave 遗漏造成两个浮层同时出现。独立聊天网页不做这一避让。
- **层级**：固定与浮层沿用同一轻微区分于主区的面板底色（现有 surface/bg 混合）；仅浮层加阴影。颜色不是唯一状态提示，图标填充和按钮可访问名称共同表达状态。
- **微交互**：图标状态与颜色 150ms；行底色 150ms、按下 .98；无逐行动画；关闭不会丢失滚动位置。键盘和减少动态效果使用即时切换。
- **新建**：保留现有边栏内入口，不在标题栏重复新增，避免把“改框”扩大为导航内容重组。
- **Web 边界**：demo/sidebar.html 可离线直接打开；新增 Web/macOS 示意切换。示意灯只画布局，不模拟系统窗口能力。现有 web/ 应用是另一套外壳，本次未重写。
- **跨文档**：聊天通过现有来源/revision 校验桥接报告鼠标位置区域、Escape 和点击；父文档不会把进入 iframe 的 blur 当成应用失焦。自动回归必须覆盖真实 iframe，单页 demo 不足以证明该边界。

## 本次验证（2026-09-26）

- `npm test`：65 个文件通过、10 个跳过；511 项通过、23 项跳过。
- `npm run typecheck`、`git diff --check`：通过。
- `tests/sidebar-demo.mjs`、`tests/sidebar-peek.mjs`：通过。离线 file://、明暗主题、Web/macOS 示意布局、300ms 防扫过/返回宽限、焦点/菜单/选区/拖拽、减少动态效果均覆盖；录制 94 帧主区几何一致，pin 无写入。
- Electron 实际聊天 iframe：输入框焦点保持、Escape 关闭、重入、历史索引 hover 不误触、peek 清除历史预览、标题稳定均通过。
- 完整 `tests/chat-sessions-electron.mjs` 在绑定场景的消息去重断言失败：同一 `Bound scene message` 出现两条。使用未修改 HEAD 在 `/tmp` 隔离目录运行同一测试，复现相同失败；本次未改聊天历史合并逻辑，也未放宽原断言。
- 原生窗口通过真实 `createMainWindow` 测到按钮 `x=92,y=10,width=32,height=32`，Electron 窗口灯位置 `{x:18,y:20}`。截图中的系统共享指示遮住灯区，因此不把这一截图声称为完整的原生视觉验收；Web 中的灯仅为明确标记的布局示意。
