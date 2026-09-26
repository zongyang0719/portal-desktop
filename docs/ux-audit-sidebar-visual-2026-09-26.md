# 左侧边栏：图标、文字、颜色与状态复核

2026-09-26 · `feat/sidebar` · 接续交互细节 review。发现和测量基线先于本轮产品修改写入；下方保留修复前的问题依据，结尾是修复后的实测结果。

## 范围与方法

覆盖共享场景边栏、其新建/绑定/信息/删除面板、上下文开关，以及 demo 中的对应呈现；不重设计正文或右侧业务面板。面向日常桌面用户和熟练键盘用户。使用 ux-audit 的视觉层级、设计系统、反馈状态检查，以及 emil-design-eng 的细节与动效检查。

证据为真实共享 React 组件的离线浏览器渲染、computed styles、逐层合成背景后的对比度计算，以及向 mock 注入的连续活动变化。修复前[数据](ux-audit-sidebar-visual-2026-09-26-evidence/before.json)和[浅色](ux-audit-sidebar-visual-2026-09-26-evidence/before-light.png)、[深色](ux-audit-sidebar-visual-2026-09-26-evidence/before-dark.png)截图已留档。正常布局检查为 1280×860；窄侧栏、长标题、缩减动效和多选由修复后的专项回归覆盖。未进行真人可用性实验、真实屏幕阅读器或 Windows 原生验收，不给全应用无障碍合规结论。

## 结论

主列表已经保持单一字体、图标家族和安静的颜色层级，不需要再增加装饰或常驻状态文字。13px 场景名配 36px 行高适合当前桌面密度，顶部 12px 标题作为次级定位信息也合理。需要改善的是功能性小字、离线数据的可读性，以及状态从有到无时的稳定性。当前提示系统同时使用原生 title 和自定义 tooltip，体验不一致；多选又会完全关闭提示。色彩检查还发现此前只修了红色语义，普通活动标记在浅色选中背景上仍接近或低于 3:1。此次修复集中在这些可见问题，保留用户已确认的简化状态形态。

## 全部检查项与设计判断

| 维度 | 观察与结论 | 处理 |
|---|---|---|
| 图标家族 | PanelLeft、Plus、Link2、Info、Clock3、Check、CircleAlert 均为 Lucide；旋转环和停止方块为正文共用的状态图形 | 保留，避免混入另一套笔画语言 |
| 图标语义 | 新建有文字；绑定、信息有 accessible name 和 tooltip。顶部面板只有标签变化，图形没有状态区别 | 此项原判“保留”漏查了状态，见下方 STATE-V4 更正 |
| 图标尺寸 | 顶部面板 18px；新建/绑定 16px；Info 15px；状态槽 14px，旋转环 12px，停止实心 8px | 保留光学层级，不把所有图形机械放成相同面积 |
| 线条 | Lucide 实测 stroke-width 1.75，圆环边框 1.5px；实心停止是状态形态，无需假装描边图标 | 保留 |
| 主文字 | 场景名、新建、菜单 13px；行高 19.5px、行容器 36px；当前项 500，多选中的当前项 600 | 保留，避免为了“现代感”盲目放大和加粗 |
| 辅助文字 | 标题 12px、tooltip 11px、信息面板 12px；上下文开关仅 10px、有效高度 18px | 底部提高到 12px、点击区域至少 28px；F2 提高到 11px |
| 字体与中英文 | 系统无衬线字体；完整场景 ID 用 code 字体，正文标题不混用装饰字体 | 保留；校验中文、拉丁字符与长名称省略 |
| 常规颜色 | 名称 secondary，当前/选择 text，错误使用独立浅深色 token；普通活动无额外彩色强调 | 保留语义，修普通状态及辅助说明对比度 |
| 悬停与选中 | 当前项 hover 未失去选中底色；GlideMenu 单层滑动，选择状态独立 | 保留；选区与活动聊天并非同一概念，不合并 |
| 键盘焦点 | 外框显示焦点，Enter 打开；方向键导航、多选、菜单已在上一轮验证 | 保留，继续回归，不用 hover 取代焦点 |
| 禁用 | 按钮禁用是合理的；已有列表内容跟着降到 40% 透明度则难读 | 操作保持禁用，已有名称和状态保持可读 |
| 状态形态 | 排队时钟；进行中旋转环；已回复勾；已停止方块；错误提示；idle 无标记 | 保留五种形态和八个源状态，不再压缩语义 |
| 状态变化 | 进行中各阶段 tooltip 可同步；变成 idle 后 tooltip 残留，标题宽度增加 23px | 清除失效提示，保留隐形状态槽避免字尾跳变 |
| 长标题 | 单行省略正确；鼠标依赖浏览器原生 title，键盘和状态依赖自定义 tooltip | 统一自定义提示；完整可见名称不重复提示 |
| 提示可用性 | 单选可看状态；多选时所有 tooltip 被关闭；相邻提示均重新等待 700ms | 保留多选的鼠标查询；不让提示拦截取消多选；采用有来源的连续提示机制 |
| 微动效 | 展开 280ms、Glide 220ms/150ms、按下 .98 均来自现有 spec；时钟/圆环 1s，终态不动 | 保留既有参数，验证 reduced-motion 和阶段更新不重置圆环 |
| 空/错/长列表 | 上一轮已修空数据、失败保留和原子回滚；本轮再检查外观与文字是否完整可见 | 回归验证，不添加新常驻说明 |

## 发现与修复优先级

| ID | 维度 / 类型 | 严重度 | 证据置信度 | 工作量 |
|---|---|---|---|---|
| STATE-V1 | 状态反馈 / Defect：idle 后仍显示上一次状态提示 | Medium | Observed（rendered + code） | S |
| COLOR-V1 | 可读性 / Defect：辅助说明和当前状态对比不足 | Medium | Observed（computed + rendered） | S |
| STATE-V2 | 禁用反馈 / Defect：不可操作被表现成已有内容不可读 | Medium | Observed（rendered + computed） | S |
| TIP-V1 | 信息获取 / Opportunity：提示途径不一致，多选时不可查询 | Low | Observed（code + rendered）；双 tooltip 重叠仅为风险，未宣称实测 | M |
| STATE-V3 | 视觉稳定 / Defect：状态消失导致标题可用宽度变化 | Low | Observed（measured） | S |
| TYPE-V1 | 字号与命中 / Opportunity：常用开关文字与区域过小 | Low | Observed（computed + rendered） | S |

### STATE-V1 · 状态消失，提示仍说“已停止”

位置：`useSidebarHint` / `ChatSceneStatus`。在同一行依次更新全部状态，tooltip 正确变为“已停止”；随后清除该行活动，标记消失，tooltip 仍留在屏幕上。[截图](ux-audit-sidebar-visual-2026-09-26-evidence/before-stale-tooltip.png)。这会误报当前状态，并继续持有 hover peek。建议提示随锚点移除或提示内容清空一起关闭。源状态完成后被标记已读也会回到无标记状态，因此不能只验证八个静态图标。工作量 S。

### COLOR-V1 · 普通状态与辅助说明仍然太淡

位置：`.chat-session-activity`、`.chat-session-hint`、`.chat-scene-details dt`。浅色选中行的旋转环前景与背景对比约 **2.97:1**，普通未选状态为 **3.27:1**；绑定说明和信息字段名均 **3.42:1**。计算基于浏览器实际颜色与祖先背景，未把旋转后包围盒误认为图形尺寸。对比度阈值依据 [W3C 非文字对比](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) 与常规文字 4.5:1；只要求有意义的旋转弧可辨，弱轨道是辅助形状。建议这些文字和普通状态使用现有 secondary 色；错误保留上一轮的语义红色。工作量 S。

补充实测：把 GlideMenu 的独立背景层也纳入计算后，浅色未选行 hover 的文字仅约 **4.15:1**。[实际颜色记录](ux-audit-sidebar-visual-2026-09-26-evidence/hover-before.json)：面板底色约 `245,244,238`，上覆 `rgba(65,111,80,.094)`，文字仍为 `99,112,104`。建议 hover 文字使用 text 色，维持背景原参数；仅检查 DOM 祖先背景会漏掉这个层。

### STATE-V2 · 断线后名称也像不可见了

位置：禁用场景行。未连接时每行 `opacity:.4`，所选场景名称的合成对比仅约 **2.15:1**，非选中更淡。[截图](ux-audit-sidebar-visual-2026-09-26-evidence/before-offline.png)。用户仍需要辨认自己在哪个场景；这里报告的是信息可读性问题，不把禁用控件硬算作 WCAG 对比失败。建议保留 disabled 行为、去掉整行透明度，保留现有连接状态说明，新建/绑定仍按禁用按钮呈现。工作量 S。

可读性恢复后也要解释为什么不能操作：禁用行悬停显示“未连接，暂时无法切换场景”，保存时显示“正在保存，请稍候”；新建/绑定入口对应说明需要连接。说明只按需出现，不在每行添加常驻文字。

### TIP-V1 · 同一列表使用两套提示机制

位置：行标题原生 `title`、状态自定义 tooltip、`selection.length < 2` 的全局提示开关。完整可见标题也设置原生 title；长标题没有自定义提示；多选时绑定图标和状态的提示都被关闭。建议标题仅在截断时显示同一套提示，状态仍显示具体阶段；多选保留鼠标查询，关闭行的自动键盘提示并让 Escape 继续取消多选。相邻提示不用每次重新等待：采用 [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip) 的既有 700ms 首次延迟、300ms skip window。**这些是 tooltip 参数，不改 hover peek 的任何数字。** 工作量 M。

### STATE-V3 · 无活动时文字槽突然变宽

位置：场景行的标题/状态布局。同一行有活动时文字槽 **160px**，清除活动后为 **183px**，变化 **23px**；长标题会随状态出现/消失改变省略位置。建议所有行保留 14px 状态槽，idle 仅保留空位置，不显示假状态、不新增图标。工作量 S。

### TYPE-V1 · 功能开关小于其他辅助文字

位置：底部“全部上下文”。字号 **10px**、可点击区域高度 **18px**，比标题、tooltip 及空状态文字都小。建议字号 12px，点击区域最少 28px，保留 30×18px 开关本体；F2 从 10px 到 11px。属于当前产品的可读性判断，**不宣称规范禁止 10px 字号**，也不忽略 [目标大小的间距例外](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)。工作量 S。

窄侧栏的长标题提示还出现末尾单字孤行，使用短提示的均衡换行减少这种排版断裂；长字符串仍允许换行，不隐藏内容。

## Before / After / Why

| Before | After（已完成） | Why |
|---|---|---|
| 标记消失，提示残留 | 锚点移除/内容清空即关闭 | 状态信息不能过期 |
| 普通活动与信息说明用 muted | 采用 secondary，测实际背景 | 保持低强调但能读清 |
| 禁用整行变成 40% 透明 | 内容保持可读，操作仍禁用 | 断线不能抹掉用户的位置感 |
| 原生 title + 自定义 tooltip + 多选全部关闭 | 一套按需提示，多选可用，连续查询免重复等待 | 减少视觉重复与输入方式差异 |
| idle 多出 23px 文字宽度 | 稳定的隐形状态槽 | 活动变化不干扰扫描 |
| 10px 开关文字，18px 点击高度 | 12px / 28px，F2 11px | 提高日常可读性和命中率 |

## 边界与不变项

不替换已有图标库，不增加“更多”、排序菜单、常驻复选框、状态文字或颜色图例。Central Icons 授权仍未确认，保持之前已说明的选型边界。绑定仍与新建同行，场景信息仍靠近标题；底部只保留上下文开关。该名称表达读取历史的范围，不误叫成过滤场景列表。

状态标签沿用真实源代码：排队中、思考中、回复中、执行中、等待回复、已回复、出错了、已停止。四种进行中共用圆环是用户此前明确的简化决定，详细阶段由提示和正文说明；已回复被阅读后允许清除标记，不能把 idle 伪造为结束失败。停止和错误均为静态终态，错误另有颜色和图形区别。

## 修复后实测

六类问题已处理，额外补齐 hover 背景叠加和禁用原因提示。已有布局、图标家族、场景用词及八种源状态保留。修复后的[完整数据](ux-audit-sidebar-visual-2026-09-26-evidence/after.json)与[验证日志](ux-audit-sidebar-visual-2026-09-26-evidence/validation.txt)在本文旁，可复现命令为 `npm run test:sidebar-visual`。

| 检查 | 修复后观察 |
|---|---|
| 八状态连续变化 → idle | 图标、ARIA 标签、状态提示同步；idle 自动关闭失效 tooltip，不再持有旧状态 |
| 排队/进行中/已回复/停止/错误 | 五种形态保留；四个进行中阶段共用圆环，切换阶段不替换或重启动画 |
| 状态槽与文字 | 同一行八状态与 idle 的文字槽均为 160px，行高不变 |
| 基础图标与字号 | 主列表 13px/36px 保留；底部 12px/最少 28px，F2 11px；无新增常驻图标/文字 |
| 提示 | 完整可见标题不弹重复提示；截断标题按需显示全文；相邻提示跳过首次等待；多选仍可查询，Escape 同时关闭提示并取消多选 |
| 离线 | 名称和状态仍可读，动作保持 disabled；悬停解释未连接原因，新建/绑定明确需要连接 |
| 减少动态效果 | 时钟指针和圆环静止，原有形状继续可辨 |
| 窄宽度与排版 | 200px 侧栏长标题可读，tooltip 不越界、均衡换行；400px 展开后可见的短名称不弹冗余提示 |

浅深色、当前项、hover、整组选区、离线等共 **76 个前景/背景样本**通过本次阈值检查；采样等待实际 CSS 过渡结束，并纳入独立 GlideMenu 高亮层。最小值：常规文字 **4.71:1**，hover 文字 **8.78:1**；普通/当前状态 **4.28:1**，hover 状态 **4.15:1**，多选状态 **3.72:1**；绑定说明与信息字段名 **4.93:1**；离线场景名称 **4.71:1**。没有把禁用按钮的淡化误算成失败，也没有用这些样本宣称全产品合规。

已逐张检查：[浅色全貌](ux-audit-sidebar-visual-2026-09-26-evidence/after-overview-light.png)、[深色全貌](ux-audit-sidebar-visual-2026-09-26-evidence/after-overview-dark.png)、[离线可读性](ux-audit-sidebar-visual-2026-09-26-evidence/after-offline-light.png)、[多选](ux-audit-sidebar-visual-2026-09-26-evidence/after-multiselect-dark.png)、[窄侧栏长标题](ux-audit-sidebar-visual-2026-09-26-evidence/after-narrow-long-title.png)、[状态清除后](ux-audit-sidebar-visual-2026-09-26-evidence/after-idle-no-stale-tip.png)。

验证结果：`npm test` **519 通过 / 23 跳过**；typecheck、demo 构建、diff 检查通过。demo / list / interactions / peek / review / visual 六组浏览器回归通过；peek 记录 95 帧主区位置一致、pin 零写入。`demo/sidebar.html` 已重新生成，仍共用正式组件代码。

## 后续更正：顶部控制状态与文字余量

用户指出顶部收起/展开没有视觉状态。此前只检查其静态尺寸、ARIA 和 tooltip，未对照不同状态的渲染，原先“图标语义保留”的判断不完整；上面的六类修复结果不等于完整交互验收。

**STATE-V4 · Medium · Observed（rendered + code）· S**：`#chat-scene-indicator:is(:hover,:active,[aria-expanded=true])` 强制透明背景。[修复前实测](ux-audit-sidebar-visual-2026-09-26-evidence/toggle-before.json)显示，展开后的 idle / hover / pressed 均为同一个文字色及透明背景，用户看不到交互响应。按用户最新决定，所有模式保留原来的空心 PanelLeft，不切换填充或虚线图标；只补 hover / pressed 主题背景，键盘保留焦点圈。已有 150ms / .98 参数沿用 §6，键盘和 reduced-motion 立即反馈，peek 六个交互参数不变。

**COLOR-V2 · Low · Observed（既有 76 个 computed 样本）· S**：普通小字最低 4.71:1，达到 [WCAG 常规文字最低 4.5:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)，但仅过线不等于易读，尤其 11–13px 中文。侧栏文字用途把 secondary 向 text 混合 20%，保持字号与选中层级；这是本产品的视觉判断，不是规范规定的配方。扩大检查到新建文字、菜单快捷键、输入框占位提示、多选文字与 hover/pressed，不只测静态行。

| Before | After（已实现并浏览器复测） | Why |
|---|---|---|
| 开合及 hover / pressed 都没有形状变化 | 原空心图标保持稳定，开合标签与真实状态同步 | 尊重用户明确选择，不添加填充图标 |
| hover / active 都是透明 | 主题 hover / pressed 背景及按下反馈 | 用户能看见控件响应 |
| 小字最低 4.71:1 | 局部加深常读文字，复测实际背景 | 给小字号更多可读余量，不把所有文字都变成同一强调 |

本轮初次加深样式误覆盖了多选文字色，回归测到 4.43:1；这是本轮引入并修复的优先级问题，不是原版缺陷。最终仅替换普通行的默认色，选中、hover 等规则继续独立生效。正文模块的 `QueuedMessageStatus` 导出在本轮工作期间被移除，demo 已改为复用现有 `ChatSceneStatus`，未恢复或修改正文模块。

最终 **130 个前景/背景样本**：常规文字最低浅色 **5.61:1**、深色 **7.90:1**；多选文字 **9.01:1 / 7.90:1**；绑定说明/占位提示和信息说明最低 **5.87:1 / 8.43:1**；菜单及 F2 最低 **5.14:1 / 6.40:1**；所有本轮测量的可操作文字状态最低 **4.95:1**（新建按钮 hover/pressed）。这些是指定侧栏样本，未覆盖整个 demo 的说明文字或全客户端。

结果：[对比度数据](ux-audit-sidebar-visual-2026-09-26-evidence/contrast-refined.json)、[浅色](ux-audit-sidebar-visual-2026-09-26-evidence/contrast-light.png)、[深色](ux-audit-sidebar-visual-2026-09-26-evidence/contrast-dark.png)、[按钮状态实拍对照](ux-audit-sidebar-visual-2026-09-26-evidence/toggle-state-matrix.png)。按钮对照是浏览器实际截图放大 2 倍排版；图形保持一致，变化只在交互底色、颜色和键盘焦点。

本轮验证：`npm test` 519 通过 / 23 跳过；typecheck、demo 构建通过；toggle / visual / demo / peek 浏览器回归通过。peek 记录 94 帧主区位置一致、pin 零写入。[日志](ux-audit-sidebar-visual-2026-09-26-evidence/toggle-contrast-validation.txt)。Web/Mac/Windows 检查为共享组件的浏览器布局示意，未宣称真实 Electron 或原生 Windows 验收完成。
