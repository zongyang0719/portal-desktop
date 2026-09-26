# 左栏二次收敛：状态一致、菜单减负

本次检查仅覆盖左栏、它与正文进度状态的对应，以及 demo 呈现。面向日常对话用户，兼顾键盘用户。使用 ux-audit 的定向检查与 emil-design-eng 的频率/动效判断；证据为本仓库源码、上一轮实际渲染截图和本轮打开的公共设计参考。没有读取 Codex 客户端内部代码，也不把设计展示图当作交互测试。

## 改动前检查

| ID / 等级 / 证据 | Before | After | Why / 工作量 |
| --- | --- | --- | --- |
| STATE-02 / Medium / Observed(code + 既有渲染) | 左栏 thinking 跳点、replying 音柱、working 圆环；正文 running 都是圆环 | 进行中的三种阶段共用正文的圆环组件，具体阶段仍有独立状态值和提示 | 用户不用学习两套“正在处理”的视觉语言；S |
| NAV-04 / Medium / Observed(code + row-menu.png) | 8 个菜单项，其中 4 个是调整位置，另有与点行重复的“打开对话” | 常用菜单收为重命名、复制 ID、调整顺序、删除；排序选择目标位置；拖动和快捷键保留 | 低频排列操作不再占据半个菜单；M |
| DEMO-02 / Low / Observed(code + overview.png) | 状态样例直接叫“排队中 / 思考中…”；正文始终是同一句静态回复 | 保留全部 8 种状态，用真实感对话名；选中样例时正文显示相应过程 | 让默认预览看起来像产品，同时可以核对状态；S |
| VIS-01 / Low，审美判断 / Observed(既有渲染) | 左栏 12px 字，菜单宽 230px、行高约 36px，与内容量不匹配 | 左栏 13px；精简菜单约 192px、32px 行；保留单色与轻选中反馈 | 提高文字可读性，把空白让给列表而非冗余命令；S |

代码依据：`chat-scene-status.tsx`、`chat-scene.tsx`、`chat/components/messages.tsx` 及 `.run-activity.running .run-icon:before`。正文圆环目前 12px、1.5px 描边、1s linear，并有减少动态效果降级。复用这些既有参数，不另造一组动效数字。

## 参考取舍

- **GitHub / Chatbox**：[SessionItem.tsx](https://github.com/chatboxai/chatbox/blob/main/src/renderer/components/session/SessionItem.tsx)。直接读取 main 分支源码：进行中用旋转 loader；移动端菜单有单一 `Adjust order`，没有四项位置命令。借鉴动作组织；本项目使用位置选择器作为触摸/键盘替代路径，不宣称照搬其排序模式。
- **Codex 公开截图**：[原讨论](https://community.openai.com/t/codex-app-needs-a-real-delete-thread-feature/1379288)、[截图](https://github.com/user-attachments/assets/a646df23-12af-4199-8c55-2c0eebddacc9)。浏览器看到了固定、改名、归档、未读、复制及 fork 分组，未见上移/下移/首尾四项。来源是 2026 年早期问题中的截图，仅支持该版本的可见菜单；不代表当前 Codex 菜单、macOS/Windows 的全面实测。
- **Behance**：[AI Chat Dashboard / Rahibul Haque & Lutfun Haque](https://www.behance.net/gallery/226918691/AI-Chat-Dashboard)。实际打开图稿：大留白、细分界、低对比表面值得参考；图标窄栏与中央推荐卡片不采用，因为它们与本项目已确定结构不一致。
- **Dribbble**：[AI Sidebar Design / Charlie Baker, Drewl](https://dribbble.com/shots/24270162-AI-Sidebar-Design)。实际打开列表图：文字为主、轻选中背景；不采用它的拟物大球、阴影与额外图标栏。展示图不提供拖拽/焦点/时序证据。
- **beUI**：继续沿用用户指定的 [AI Sidebar](https://beui.dev/components/agents/ai-sidebar) Lucide 家族。状态图形统一不等于合并业务状态。

当前 shell 未发现 Agent Reach 命令；本轮用公开网页检索、浏览器看图、GitHub 原始源码补足。对 Codex 本地 App 的自动操作此前被安全审查拒绝，本轮没有改用其它途径访问它。

## 状态对应与实施边界

| 源状态 | 左栏 | 正文 |
| --- | --- | --- |
| queued | 静态时钟；排队中 | 消息排队提示 |
| thinking | 共用圆环；思考中 | 过程摘要圆环 + 具体思考文案 |
| replying | 共用圆环；回复中 | 过程摘要圆环 / 流式正文 |
| working | 共用圆环；执行中 | 过程摘要圆环 + 工具/后台执行文案 |
| waiting | 静态等待图标；等待回复 | 静态等待，不伪装为仍在执行 |
| done | 完成勾；已回复 | 完成摘要；既有读完清除规则保留 |
| error | 错误符号；出错了 | 错误摘要 |
| stopped | 停止符号；已停止 | 已停止摘要 |

保留宽度拖拽、全部八状态、持久化顺序、peek 原参数和错误回滚。先改状态与菜单，再用同源 demo 检查明暗、真实对话名称、长列表、键盘及减少动态效果。高级分组、收藏和自动最近排序不是本次新增范围。

## 落地与验证

- STATE-02：`ActivitySpinner` 与样式由正式正文、左栏和 demo 共用。正文既有过程摘要样式移入共享文件，并接入桌面聊天构建与 Web 聊天入口。未更改活动来源、聚合和已读语义。
- NAV-04：菜单从八项降到四项；“调整顺序…”打开目标位置选择器。仍可整行拖动和 Alt+Shift+方向键调整；失败保留原序与弹窗，Escape 恢复原行焦点。
- DEMO-02 / VIS-01：默认展示九条自然名称样本，含八活动及无活动。正文直接复用 `ChatActivity`，可以逐条对照状态与展开过程；左栏字级 13px、菜单 192px。
- 实际检查了 `test-results/sidebar-demo/overview.png` 与 `row-menu.png`：不再同时出现跳点、音柱和旋转三套动效；菜单不再占据长段列表。审美结果仍需用户查看确认，不把自动测试通过等同于视觉认可。

验证结果：

- `npm test`：**514 通过、23 跳过**；`npm run typecheck`、`git diff --check` 通过。
- `npm run build:demo`、`npm run build:chat`、`npm run build:web:static`、`npm run build:web` 通过；Web 构建保留已有大 chunk 提示，两个 Web 产物均已补齐 Lucide 许可声明。
- `tests/sidebar-demo.mjs`：离线 file://、全部八状态与正文对应、圆环计算样式一致、明暗、弹窗、键盘与减少动态效果通过。
- `tests/sidebar-interactions.mjs`：调宽持久化与撤销、拖动和快捷键排序、四项菜单、目标位置弹窗、失败回滚、焦点恢复及边缘滚动通过。
- `tests/sidebar-peek.mjs`：**83 帧主区坐标一致、pin 零写入**；延迟、防误触、返回、关闭、键盘、菜单与保留滚动通过。
- `tests/chat-react.mjs`：真实聊天构建的历史、流式回复、停止/错误清理、Markdown 等回归通过；新增断言确认正在运行的正文实际加载共享 12px / 1s linear 圆环。

上述浏览器验证使用测试脚本启动的 Chrome。没有声称刷新过用户当前打开的预览，也没有声称完成 Windows 原生实机或完整场景 Electron 套件验收；后者既有重复消息失败仍见前一轮记录。

## 追加：按用户反馈合并状态外观

本次以最新用户指令覆盖上方八状态视觉映射，沿用 emil-design-eng 的必要反馈原则。圆环只表达“本次回复流程尚未结束”；后台的八种状态继续用于调度、错误判断、已读处理和具体提示。

| Before | After | Why |
| --- | --- | --- |
| 排队时钟、等待气泡、三种阶段圆环 | 五个未结束阶段统一圆环，精确阶段留在悬停/键盘提示 | 不让用户学习多种处理中符号；等待与回复视觉合并，但不伪称已经输出文字 |
| 完成勾、停止符号常驻左栏 | 完成/停止不占状态图标位置；完整语义留在行提示、可访问描述和正文 | 已结束记录回归安静的文字列表，不删除底层状态 |
| 正文等待用静态时钟，终态另有勾/停止符号 | 正文所有未结束过程使用同一圆环；完成/停止用原有文字说明，错误仍有静态提示 | 左栏与正文一致；真正的“停止生成”操作仍可用 |

继续使用已有 12px、1.5px 描边、1s linear 参数；减少动态效果时静止。没有改动 peek 参数或新增动画类型。

实际实现：左栏只输出圆环或错误图标；完成/停止通过隐藏描述与整行提示保留信息。正文未结束时也使用圆环，排队条抽成正式与 demo 共用的 `QueuedMessageStatus`，保留取消排队能力。正文已结束摘要去掉完成/停止图标，原有状态文字和停止生成按钮功能保留。

追加验证：`npm test` 514 通过 / 23 跳过，typecheck、demo/chat/Web 静态构建和 diff check 通过。首次沙箱测试出现本地监听 EPERM 及文件监听超时，允许测试所需环境后原样全量复跑通过，未修改相关业务实现。浏览器 demo 检查了五种圆环实际旋转、两种终态没有图标、完整描述与提示、正文对应及减少动态效果；原点击后原地 hover 的测试动作不能触发重新进入，改为真实离开/重入后通过。交互回归与真实聊天回归通过，真实聊天额外确认停止按钮仍生效且结束后无多余图标。Peek 95 帧主区坐标一致、pin 零写入。

## 纠正：保留排队、回复中、完成的明确区分

用户指出上一轮把主状态合并过度。本节覆盖上一节的外观映射；保留八种底层状态，视觉按任务进度区分，不恢复多套进行中动画。沿用 emil-design-eng 的状态反馈检查。

| Before | After | Why |
| --- | --- | --- |
| 排队与处理中都是圆环 | 排队用 Clock3，固定表盘、指针转动；思考/执行/等待/回复继续共用旋转圆环 | 可直接看出“尚未轮到”与“回复流程正在进行”，兼顾未结束状态有动态反馈；减少动态效果时也可辨认 |
| 完成与无活动/停止都无图标 | 完成恢复静态 Check；停止仍无常驻图标 | 成功完成必须有明确反馈，继续保留完成后原有的阅读清除规则 |
| 正文排队也转圈，完成只有文字 | 正文采用相同 Lucide 时钟和勾，过程仍共用圆环 | 左栏和正文使用同一套进度语言 |

异常保留静态错误提示；精确阶段、停止语义、键盘/悬停说明及后台调度均保留。排队指针沿用已有圆环的 1s linear 与减少动态效果降级，是 Portal 的呈现选择，不声称来自 Codex。未改动 peek 参数。

验证：typecheck、demo/chat/Web 静态构建、diff check 通过；`npm test` **514 通过 / 23 跳过**。离线浏览器检查确认排队表盘静止而指针转动，回复过程圆环旋转，完成勾静止；两处排队/完成 SVG 形状一致，减少动态效果时两类动画均停止。完整 demo 流程与真实聊天回归通过，完成勾恢复且停止操作保留。Peek 97 帧主区坐标一致、pin 零写入。已复看新版 `overview.png`，三个主状态在同一列表内有明确形状差别。

## 纠正：已停止也明确可见

| Before | After | Why |
| --- | --- | --- |
| 已停止只有悬停/键盘说明，常态与无活动混淆 | 左栏和正文共用静态小方块，悬停仍显示“已停止” | 用户应能直接区分成功完成、停止和无活动；保持简洁而不隐去状态 |

`ActivityStopped` 沿用正文既有停止按钮的 8px、2px 圆角实心方块，去掉按钮容器，不新增外圈、色彩或动画。完成仍是勾，错误仍为错误符号，排队和回复过程保持上一节方案。后台状态与停止操作行为未改动。

验证：typecheck、demo/chat 构建、diff check 通过；`npm test` 514 通过 / 23 跳过。浏览器 demo 验证停止标记与正文同尺寸、静态、无外圈且提示可达；真实聊天验证停止按钮生效后出现方块且不再旋转。已查看 `all-statuses-light.png`，左栏和正文均能直接辨认已停止。

## 入口图标与“场景”命名

用户截图指出带箭头的侧栏图标与方框铅笔图标不合适，并要求保留“场景”说法。侧栏开关改为 Lucide `PanelLeft`，不再切换箭头图形；创建入口改为简洁 `Plus`，可见文案恢复“新建场景”。绑定/详情提示、排序说明与 demo 场景标签同步命名，正文中“对话”的自然语义保留。加号也符合落盘 `sidebar-nav.json` 新建入口的图形选择。开关状态继续由 aria 状态与“展开/收起/固定场景列表”提示表达，交互参数不变。

验证：类型检查、demo 构建、diff check 通过；`npm test` 514 通过 / 23 跳过。更新测试中旧文案的定位与断言后，完整离线 demo 浏览器流程通过；已查看新版 overview 渲染。

## 排序直接拖动

用户明确要求移除“调整顺序”选项。删除菜单项、整个目标位置弹窗、局部状态和专属样式；场景排序直接拖动，保留不占菜单的 Alt+Shift+上下键操作。菜单收为重命名、复制场景 ID、删除三项。排序保存、失败回滚、拖动取消与边缘滚动沿用现有实现。

验证：typecheck、demo 构建、diff check 通过；`npm test` 514 通过 / 23 跳过。实际鼠标拖动首尾移动、键盘排序、两种输入的失败回滚、焦点恢复、拖出取消及边缘滚动均通过；peek 95 帧主区无位移、pin 零写入。交互测试按既有 peek 专项的方式先离开再进入热区，保留收起后的防误触保护。已检查三项菜单截图 `row-menu.png`。

## 查看场景信息，保留复制快捷操作

按用户要求，行菜单首项新增“查看场景信息”，保留“复制场景 ID”快捷操作。复用现有详情弹窗，将详情目标从“当前选中场景”分离为独立的查看对象；名称、ID、客户端和实时活动状态均来自目标场景。查看与复制不触发切换场景，关闭后焦点返回原行。标题旁的信息入口仍查看当前场景。无活动时显示“暂无活动”，不编造状态或元数据。

验证：typecheck、demo 构建、diff check 通过；`npm test` 514 通过 / 23 跳过。浏览器验证查看其他场景时选中行、聊天标题与上下文范围不变，详情复制和菜单快捷复制均使用目标场景 ID，关闭后焦点恢复；标题旁入口仍查看当前场景。完整 demo、拖动与菜单交互、peek 回归通过，peek 94 帧主区无位移、pin 零写入。已查看 `other-scene-info.png` 与更新后的四项菜单截图。

## 移除行内更多按钮，以对象为操作入口

用户指出悬停更多按钮仍给列表增加视觉负担。本轮实际读取 `native-feel` 的哲学及原生交互清单、`emil-design-eng`，采用 T3「Adopt the platform; don't compete with it」的上下文操作和键盘可达原则，保留现有跨端组件。代价是次要操作少一个可见入口；以整行右键、菜单键/Shift+F10、触屏长按及读屏说明覆盖输入方式，不再补回另一枚图标。

| Before | After | Why |
| --- | --- | --- |
| 每行悬停或聚焦出现「⋯」，触屏常驻 | 删除按钮、Lucide import、动画和占位 | 让行只承载场景名称与活动状态 |
| 行尾为更多按钮额外预留 22px | 恢复统一 12px 内边距，状态自然靠右 | 腾出标题宽度，悬停不改变几何 |
| 触屏依赖按钮 | 长按同一行打开同一菜单 | 与右键保持同一操作对象；滚动或取消不触发 |
| 次要操作有单独的 Tab 停靠点 | 行聚焦后 Shift+F10 / 菜单键打开，Escape 返回该行 | 保留完整键盘路径，少一个重复焦点 |

依据：本轮查看 [Arc 官方 Pinned Tabs](https://resources.arc.net/hc/en-us/articles/19231060187159-Pinned-Tabs-Tabs-you-want-to-stick-around)、[Radix Context Menu 文档](https://www.radix-ui.com/primitives/docs/components/context-menu) 与 [GitHub 源码](https://github.com/radix-ui/primitives/blob/main/packages/react/context-menu/src/context-menu.tsx)。Arc 文档明确使用右键标签操作；Radix 源码提供 700ms 触屏/触笔长按及移动/抬手/取消清理，系统 contextmenu 先到时取消计时。这里只引用文档与源码证据，不声称实测了当前 Codex 或 Arc 客户端，也不推导“现代软件都没有更多按钮”。Agent Reach 在当前 PATH 未找到，本轮使用公开网页和上游源码。

菜单内容保持查看信息、重命名、复制 ID、删除；长按释放与右键不会选择另一场景。没有修改 hover peek 的六项交互参数。

验证：typecheck、demo 构建、diff check 通过；`npm test` 514 通过 / 23 跳过。Chrome 浏览器完成鼠标右键、点击行尾状态右键、Shift+F10 / 菜单键、真实触摸事件长按与普通轻点验证，滑动/取消不会延迟弹出菜单，长按松手不切换场景；删除更多按钮后每行只有一个可聚焦按钮，悬停状态位置不变。拖动与失败恢复、完整 demo 回归通过，peek 95 帧正文无位移、pin 零写入。截图为 `rows-without-more.png`、`row-menu.png`。首次布局断言捕获到上一轮拖动释放后的既有 scale 回弹；改为等待 transform 恢复后测稳定布局，未调整产品动效参数。触屏验证为 Chrome 自动化触摸输入，不冒称 iOS/Android 实机测试。

## 标准列表交互：行内改名、多选和整组操作

用户追加双击改名、多选及 shadcn React Aria Sidebar 参考。本轮按 `native-feel` 的平台输入和焦点约定、`emil-design-eng` 的高频操作即时响应规则补齐交互，复用当前数据层和离线 demo。

| Before | After | Why |
| --- | --- | --- |
| F2 / 菜单改名弹窗，双击无动作 | 双击、F2、菜单统一行内编辑 | 操作对象与输入位置一致，Enter/失焦保存，Escape 取消 |
| 只有单项切换 | 当前聊天、列表选区、键盘焦点分别表达 | ⌘/Ctrl 与 Shift 选择不切换正在看的聊天 |
| 一次只能拖一行 | 非连续选区也作为一组移动，保留原顺序 | 多选后动作符合选区，而不是只作用于鼠标下的一项 |
| 无批量操作 | 多选菜单只留复制 ID 和确认删除 | 无效的批量重命名/单项详情不出现，不增加常驻按钮 |
| 行 hover 逐行切换 | 改编本地 GlideMenu 单层高亮 | 鼠标有连续性；键盘、减少动效即时；多选保持稳定选区 |
| 更名或删除非活动场景也重置上下文 | 只更新元数据和场景目录 | 保留用户正在看的聊天、工作区和全部上下文选择 |

本轮查看 [shadcn React Aria Sidebar](https://ui.shadcn.com/docs/components/aria/sidebar)、[React Aria Selection](https://react-aria.adobe.com/selection)、[Arc 官方双击改名说明](https://resources.arc.net/hc/en-us/articles/20498293324823-Arc-for-macOS-2024-2026-Release-Notes)。shadcn 是布局参考，React Aria 提供范围选择/修饰键选择和焦点分离依据；这里未安装整个 shadcn 或 React Aria 框架，也不把多选归功于仅提供外观的 Sidebar 组件。GlideMenu 改编自仓库三份参考 JSON 中的源码，沿用有出处的曲线和时长。

图标包来源：用户本轮给出的 `@central-icons-react/round-outlined-radius-2-stroke-2` 也是 `sidebar-nav.json` 源码的 import。读取 npm 1.2.1 包的 `LICENSE.md` 后发现是 Iconists 自定义购买授权条款；用户表示尚不清楚授权，因此未安装或替换图标，当前继续使用既有 Lucide。包只下载到临时目录作来源核对，未引入项目依赖。

批量操作沿用现有 move/delete 通道，允许 ID 数组。服务端在一次写入前验证完整选区；失败时整组不变。选区 ID 按当前列表顺序规范化，批量删除全部本机入口后只创建一个新场景。编辑器保留失败草稿、中文输入法确认不提交；提示在多选时停用，Escape 优先退出多选，编辑退出在布局阶段恢复焦点，不延迟一帧。

验证：`npm test` 519 通过 / 23 跳过，新增整组保存、过期 ID 拒绝、失败回滚、重启持久化和上下文隔离测试；typecheck、demo 构建、diff check 通过。`sidebar-list.mjs` 实际验证双击/F2/失焦改名、中文输入法、空名称、保存失败草稿、修饰键/范围伸缩/键盘全选、整组拖动到尾部及选区中间空隙、批量复制/删除/失败恢复和全部删除后的新场景焦点。GlideMenu 捕获到中间动画帧，键盘和减少动效路径无过渡。原有 interactions、完整离线 demo 与 peek 回归通过；peek 95 帧正文不位移、pin 零写入。已查看 `inline-rename.png` 与 `multi-selection.png`。Windows 原生与手机实机未作为已验收范围。
