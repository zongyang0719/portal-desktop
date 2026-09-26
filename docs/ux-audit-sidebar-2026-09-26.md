# Sidebar 检查与下一轮方案

## 范围与证据

范围：当前 `feat/sidebar` 的左栏、操作入口、8 种活动及离线 demo；面向日常使用 Being 的用户。采用 ux-audit quick、native-feel 的输入/焦点/窗口约定与 brainstorming 比较方案。此报告先于本轮实现。

已看：共享 React/CSS、状态来源、demo fixtures 和测试；本轮前已有浏览器回归截图（明暗、8 状态、长列表、收起、Mac/Windows 三栏）及测试记录。截图覆盖了渲染，源码覆盖了入口与事件；没有将源码阅读写成真人可用性测试。

未看：当前用户浏览器中的实时页面、Windows 原生实机行为、Codex App 的实时界面。读取 Codex App 被 Computer Use 安全策略禁止，未使用其他途径绕过。demo 的聊天正文和右侧信息为 mock，并不具备真实聊天历史、输入框、SBS 等完整行为。

## 最重要的三点

1. Demo 默认三个状态只是数据样本过小，8 种状态都在共享组件中；但把完整展示藏在下拉框后，导致交付难以检查。
2. 降噪不应改变操作的归属。绑定属于进入/添加对话，详情属于当前对话；塞进远端底部菜单降低可发现性。
3. 8 个符号不应该要求用户记忆。保留所有状态，但用悬停及键盘提示解释；已有 `title` 不能等同于完整的键盘可见提示。

## 检查项

| ID | 类型 / 问题 | 严重度 | 证据与位置 | 改法 / 工作量 |
| --- | --- | --- | --- | --- |
| STATE-01 | 缺陷：默认只展示 3 个活动，完整性不直观 | Medium | Observed (code + prior render)：`demo/sidebar.tsx` 默认 5 行，仅 working/done/waiting | 默认打开全部状态；保留日常样本 / S |
| NAV-01 | 缺陷：绑定与新建分离到列表底部 | Medium | Observed (code + prior render)：`chat-session-options` 位于 footer | 回到新建旁边，避免滚动到底或猜测全局更多 / S |
| NAV-02 | 缺陷：详情离开当前对话标题 | Medium | Observed (code)：详情经底部更多打开 | 归于标题旁，收起侧栏也能进入 / S |
| A11Y-01 | 缺陷：状态仅有原生 title，无自定义键盘可见提示 | Medium | Observed (code)：`ChatSceneStatus` 的 span.title，整行有 aria-describedby，但没有 focus tooltip | 行键盘聚焦时可见提示；图标悬停可解释；Escape 可关，不新增八个 Tab 停靠点 / M |
| FBK-01 | 机会：回复/执行中心图形仅 4px，区分困难 | Medium | Observed (code + prior render)：14px 图标中细线/方块；可辨程度未做人测 | 先用提示补足，不继续制造花样动画；需要真人对照验证 / S |
| NAV-03 | 机会：改名/删除仅显式绑定在右键菜单 | Medium | Observed (code)：列表 onContextMenu，无可见行操作入口 | 后续可加行 hover/focus 更多；为键盘提供明确路径，状态保持可见 / M |
| DEMO-01 | 缺陷：简化顶部及静态正文容易被当作全客户端验证 | Medium | Observed (code + prior render)：demo 手写 pair-name/local-note；生产 Topbar 有 SBS/Portal/刷新/更多 | 明示 demo 边界；侧栏完整流程逐项覆盖；真实聊天由 Electron 验证 / S |

## 三种布局候选

| 方案 | 创建/绑定 | 详情 | 代价 |
| --- | --- | --- | --- |
| A（推荐） | 同一行：轻量“新对话”＋右侧常驻绑定图标 | 当前标题旁的信息按钮 | 多一个小图标，需要提示，但可直接操作 |
| B | “新对话”＋下拉箭头，菜单里绑定 | 当前标题旁的信息按钮 | 最安静，绑定多一步且发现性较弱 |
| C | “新对话”和“绑定对话”两行文字 | 当前标题旁的信息按钮 | 最好找，但多占一行且创建区权重更高 |

共同部分：底部仅保留上下文开关；已存在的 8 状态语义与已读处理不变；完整高左栏与三面板关系不变。用户已通过问题卡选择 A，按 A 实施。

## 实施与验证计划

- [x] `chat-scene.tsx`：删除底部更多菜单；新建右侧独立绑定按钮；标题旁独立详情按钮。保留原回调和 aria-label，菜单/对话框仍阻止 peek 误关闭。
- [x] `sidebar-hint.tsx`、`styles.css`：统一图标与状态提示，鼠标延迟显示、键盘即时、Escape 关闭且焦点不移动；提示浮层不改变主区几何。状态行仍仅一个 Tab 停靠点。
- [x] `demo/sidebar.tsx`：初始直接展示全部状态，日常数据保留；增加可见的预览范围说明。
- [x] `tests/sidebar-demo.mjs` 及原入口回归：移除旧底部菜单步骤，验证绑定/详情位置、8 状态提示、焦点恢复与提示/peek 共存；截图覆盖全部状态及操作弹窗。
- [x] 执行 `npm run typecheck`、`npm test`、`npm run test:sidebar-demo`、`npm run test:sidebar-peek` 和受入口迁移影响的场景上下文回归，检查截图。

## Tooltip 规则建议

- 仅图标的操作需要解释：展开/收起、绑定、信息、更多。已有明确文字的新对话不重复提示同一句。
- 状态 hover 显示完整语义（例如“等待 Being 回复”，不是等待用户输入）；键盘聚焦该行也能看到状态。状态本身不成为另一个可点击按钮。
- 标题截断时能读全文；提示不能改变布局，不能阻断选中行，也不能导致 peek 意外关闭。
- Escape 优先关闭提示，焦点不搬走；失焦/离开关闭。必要内容不只放在 tooltip 里。
- 不杜撰 Codex 的提示延迟。后续参数明确标为 Portal 自身设计选择，并记录来源或依据。

依据：[WAI APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) 说明 hover/focus、Escape 和焦点留在触发元素；页面也注明该模式仍在讨论中，不能说成已实测的 Codex 行为。

## 参考的可用结论

- [官方桌面文档](https://learn.chatgpt.com/docs/app)：新建与它的 Quick chat 次级入口相邻。可以借鉴“关联操作就近”，不是证明 Being 的绑定等价于 Quick chat。
- [官方 Windows 页面](https://learn.chatgpt.com/docs/windows/windows-app)：示意中 New thread 在导航上部，Settings 在底部。不能据此把所有低频操作都归到设置区。
- [beUI AI Sidebar 源码](https://beui.dev/components/agents/ai-sidebar)：行操作在 hover/focus 时出现，触摸输入时保持可见；可以借鉴显式可达路径，不需要移植它的文件树或拖拽能力。
- native-feel 的 T3（尊重平台）及 `06-native-conventions.md` 支持原生窗口按钮、合理焦点/键盘操作和细微行反馈；本轮不迁移框架，也不照抄其中所有平台判断。

## 保留与边界

保留：8px / 300ms / 300ms peek、224px 面板、减少动态效果、读完清除 done、源状态聚合规则。源代码中的八状态已逐项核对。

这是侧栏的定向检查，不是整个 Portal 的完整 UX 审计。Windows 原生控件、完整顶栏布局和真实聊天历史仍要实机验收；当前 demo 不能替代这些证据。

## 本轮落地结果

- STATE-01、NAV-01、NAV-02、A11Y-01 已处理：默认 8 状态、A 布局、hover/keyboard 提示、Escape 与焦点恢复。
- FBK-01 已换方案：移除手画 4px 内嵌图形。采用 beUI Loader 的 dots/bars/spinner；其余采用 beUI AI Sidebar 同款 Lucide。所有 8 状态和无活动样本仍存在。非旋转动画用 CSS ease-in-out，减少动态效果时静止，明确是本项目适配。
- DEMO-01 已注明范围并扩充流程截图；静态正文未被包装成完整客户端。检查了新建、绑定、详情、改名、删除、明暗、三栏、长列表及展开/收起/peek。
- NAV-03 作为后续机会保留：显式行操作入口尚未增加，本轮没有再向每行塞入更多图标。
- 额外修复：Tab 顺序先左栏后主区；绑定弹窗焦点直接进入场景 ID；提示在状态变化时同步更新。Tooltip 的 700ms 悬停延迟依据 Radix 文档，键盘即时显示。

验证：`npm test` 512 通过、23 跳过；一次既有文件监听用例超时，未改源码，单项及全量复跑均通过。类型检查、离线 demo、peek（95 帧主区不移动，pin 零写入）、场景上下文与真实 Topbar/SBS 测试通过。上下文/SBS 测试夹具已补齐生产 workspace-stage 结构，未用强制点击规避遮挡。

截图目录：`test-results/sidebar-demo/`。`overview.png` 为打开后的全部状态；`state-tooltip.png` 展示 peek 上的状态提示；`create-dialog.png`、`bind-dialog.png`、`details-dialog.png`、`rename-dialog.png`、`delete-dialog.png` 为完整侧栏流程。Windows 截图仍为示意。

## 追加：常规操作补齐

用户明确追加可调宽、拖拽排序及常规菜单；NAV-03 已在本次追加处理。沿用上方 A 布局，详见 [操作约定](SIDEBAR-OPERATIONS-2026-09-26.md)。

- 代码核对发现通用场景变更会把上下文设回 current；排序改用独立 move 操作，只更新现有目录数组，保留选择、聊天 iframe、草稿和阅读范围。无时间元数据，因此不编造“最近活动排序”。
- 宽度默认 224，调整后本机记忆，窗口约束只影响显示，不覆盖偏好；peek 中调整仍不固定也不挤正文。
- 行菜单在 hover/focus 出现、触摸常驻；与原状态并存。新增按钮成为独立键盘停靠点，不把按钮嵌套进选择按钮。右键和 Shift+F10 提供同一路径。
- 真正操作了拖动排序、键盘上/下移、菜单首尾移动、失败恢复、取消、边缘滚动及宽度持久化。修正排序结束后延迟恢复焦点的竞争，改为 DOM 提交后同步恢复。
- 截图检查 `row-menu.png` 与 `resized-three-panes.png`：状态未被更多按钮替换；操作集中在按需菜单；调宽后保持三面板结构。浏览器截图证据不等于 Windows 原生验收。

本次结果：`npm test` **514 通过 / 23 跳过**；typecheck、diff check、离线 demo、peek、新增 sidebar-interactions、场景上下文回归均通过。peek 录制 94 帧主区坐标一致、pin 零写入；调宽中的 peek 另有零位移断言。

## 追加：状态一致与菜单减负

用户反馈三种动效太杂、排序占据过多菜单空间后，再用 ux-audit 与 emil-design-eng 检查。上文 dots/bars/spinner 和四个排序命令是历史迭代，已被本轮替代：进行中三阶段与正文共用圆环；菜单保留四项，排序只留一个入口。八种状态、调宽、拖拽、键盘与失败回滚保留。

新增 STATE-02、NAV-04、DEMO-02 与 VIS-01 的 Before/After、公开 Codex 截图及 GitHub / Behance / Dribbble 的取舍，均见 [二次收敛记录](SIDEBAR-REFINEMENT-2026-09-26.md)。Demo 使用真实感对话名与正式正文过程摘要组件，可点选核对对应状态。
