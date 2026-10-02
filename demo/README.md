# Portal Desktop 组件预览

## 当前迭代：场景 placement（2026-09-27）

唯一设计依据是 `docs/IA-REFACTOR-SPEC-2026-09-27.md` 与对应 CODEX 任务书。实现记录：`docs/IA-REFACTOR-IMPLEMENTATION-2026-09-27.md`。下面的旧版说明不再作为当前行为依据。

- `collaboration.html`：实际 Desktop 的 `DesktopWorkspace`、窄导航、场景列表、Town/Portal/Browser 面板和 `AppModel`；仅连接、聊天正文与安装等传输使用示例适配器。
- `scenes.html`：保留之前的私信/划词交互样例，与 Desktop 共用 `PanelLayout` 和 placement 数据结构。全部初始场景采用同一布局；没有工作/阅读场景与功能的预设绑定。
- 聊天支持拖动调宽、左右换边、贴边展开、手动浮动和移动/缩放。存储按端点、Being、场景 ID 隔离；只记录人的操作。设置和 Being 消息不会成为场景类型或布局模板。
- 实际 Desktop 已接入外壳；尚未打包替换日常客户端，Electron 原生视图仍需实机验收。

```sh
npm run build:collaboration-demo
npm run build:scenes-demo
```

`scenes.html` 改用 `being-scene-placement-demo-v3`。升级保留旧聊天、草稿、引用和回信；旧版不能区分人为摆放与写死预设，所以只重置旧版布局。旧存储副本保留。Desktop placement key 为 `beings:scene-placements:v1`，浏览器与日常客户端来源隔离。

## 历史记录：对话与小镇第一轮（2026-09-27）

最新入口是 `scenes.html`。最左窄图标栏直达固定功能，旁边的场景列表只放聊天群；主区域内容在左、当前群对话在右，可换边或收起。以 `docs/UIUX-INFORMATION-ARCHITECTURE-2026-09-27.md` 为依据，仍待用户反馈。下面的方案保留作历史记录。

```sh
npm run build:scenes-demo
```

生成自包含的 `demo/scenes.html`，复用真实 `ChatSceneIndicator`、侧栏样式、CodeMirror 输入与 Markdown 渲染。场景外壳与状态位于 `desktop/renderer/workspace/`，示例业务适配位于 `demo/scenes.tsx`。尚未挂入正式客户端。

本轮主要路径：点功能不换群；切群恢复各自的阅读位置、聊天草稿与引用；划词“一起看”只带入选中的文字，不自动发送；收起对话后从右下角恢复；私信建议采用前保护已有回复草稿；工具详情内安装、离开、查看本机与返回来源；设置占用内容区并保留当前对话。旧内容标签、浮动布局、整页“一起看”和自动安排入口已撤出。

场景、文字草稿、选区引用与阅读路径保存到本预览来源的 `localStorage`（`being-conversation-navigation-demo-v2`）；首次迁移旧 `being-scene-composition-demo-v1`，保留旧存储副本，不读写日常客户端数据。安装进度、设置和示例发送结果只在当前页面有效。小镇其他栏目是入口与示例列表，不代表完整业务已重构。

验证：13 条状态测试、类型检查、单文件构建通过；本轮在 1280 × 820 与 560 × 820 下实际操作检查主要路径。内置浏览器使用 HTTP 入口；未完成直接双击和真实 Electron 客户端验收。详见 `docs/UIUX-SCENE-PROTOTYPE-2026-09-27.md`。

## 历史方案：三栏协作（2026-09-27）

本节描述旧版；`collaboration.html` 已更新为上方所述的实际 Desktop 外壳预览，`workspace.html` 保留历史方案。

```sh
npm run build:collaboration-demo
```

双击生成的 HTML 即可离线打开；也可通过静态 HTTP 服务预览。它直接复用真实的顶栏、场景列表、Town 阅读与工具组件、安装对话框、CodeMirror 输入和引用组件。主对话正文与回复是演示数据，传输、安装和账户接口是隔离的 fixture，不会联系 Being、发送 Town 私信或安装软件。

这一轮主要验证：私信「一起看」与主对话同时使用；草稿与引用独立、返回原文；Grove 安装结果、查看本机 Kit、回退原详情；常驻场景信息；中间阅读面圆角与亮暗层级。其他栏目的内容、浏览器与设置的完整流程不属于这一轮预览验收。

已在浏览器操作验证上述主要路径与菜单键盘行为，相关 156 条单元测试、类型检查、聊天资源及桌面 renderer 构建通过。真实 Electron 窗口捕捉被 macOS 拒绝，尚未安装新包或完成真实客户端视觉验收。完整分期与边界见 `docs/UIUX-REDESIGN-2026-09-27.md`。

## 工作台组件预览（2026-09-27）

`workspace.html` 现在与 `sidebar.html` 使用同一个单文件构建器，包含 React、组件、CSS 和依赖许可证，可双击离线打开，不需要开发服务器或 CDN。`localhost` 只是一种预览入口，不是运行依赖。不读写真实客户端数据。

源码分层：`desktop/renderer/app/components/workspace-home.tsx` 和 `workspace.css` 是可复用的工作台展示组件；`demo/workspace.tsx` 只提供示例数据与本机操作适配。侧栏直接复用 `ChatSceneIndicator`，输入直接复用 CodeMirror `ComposerField`，浮层复用 `Dialog`。新增工作台组件尚未挂入真实客户端页面，不声称已完成服务集成。

```sh
npm run build:workspace-demo  # 生成 demo/workspace.html
npm run workspace:watch      # 监听共享组件，构建后刷新浏览器
```

不要手改两个生成的 HTML；它们均被 Git 忽略。原有 `npm run build:demo` 继续生成 sidebar 预览。

视觉主参考是 iA Writer，短列表参考 Things。按最新 v2.2 规范，首屏只留对话摘录、有未读才出现的一行消息与输入；物件移入当前场景抽屉，搁置和收件入口在真实侧栏底部。存在标记移到输入左侧。具体参考与取舍见 `docs/UIUX-DEMO-V2-2026-09-27.md`。

可体验工作台与对话切换、物件详情、便笺编辑、搁置/拿回、引用、聊天草稿、收工快照及恢复/撤销。右上角「更多 → 预览设置」切换浅色/深色/跟随系统、日常/空桌面/离线、示例存在姿态。内容是虚构示例，聊天只保存草稿，不发送。

便笺、编辑草稿、聊天草稿、引用、物件位置、收件已读状态及快照保存在该预览来源的 `localStorage`（`portal-workspace-demo-v3`）。首次读取可导入 `portal-workspace-demo-v1`，不修改或删除旧 key；不同浏览器、端口、file/HTTP 来源的数据互相独立。当前存储损坏时不静默覆盖，写入失败保留页面内容并提示。更多菜单和预览设置保留示例说明。

从场景列表删除仅移出导航，内容保留在「先放一放 → 从列表移出的场景」，可以拿回；编辑便笺关闭后仍保留未提交草稿。流式光点只有手动模拟收到输出时闪动一次，不循环假装正在输出。

最新规范见 `docs/UIUX-SPEC-2026-09-27.md`。组件版构建、类型与存储测试见设计记录；本轮浏览器访问被自动审批拦截，尚未完成新版视觉检查，不能把旧样机截图当作组件版结果。原有 `sidebar.html` 的生成和验证方式保持如下。

## 共享侧栏预览

直接用浏览器打开本目录的 `sidebar.html`。文件已包含 React、组件和样式，可离线使用，无需启动 Electron、服务端或连接 Being。也可以通过任意静态 HTTP 服务打开。

预览直接导入桌面端的 `desktop/renderer/app/components/chat-scene.tsx` 和 `desktop/renderer/app/styles.css`，正文过程摘要也复用正式的 `ChatActivity`。没有独立复制的 sidebar 实现；`sidebar.tsx` 仅提供 mock 数据、回调和对话背景，`sidebar-demo.css` 仅设置预览工具条与模拟对话。

支持展开/收起、场景切换、新建、新建右侧绑定/标题旁详情、行菜单、上下文切换，以及全部状态/日常/长列表/空列表/未连接数据、明暗主题和 Web/macOS/Windows 窗口示意及右侧辅助面板。对话数据和顺序只保存在页面内存，刷新或点击「重置预览」即可还原；宽度单独保存在本机。

```sh
npm run build:demo       # 改动共用组件后，更新可直接打开的 HTML
npm run demo:watch       # 监听共用代码；构建完成后刷新浏览器
npm run test:sidebar-demo # 构建并使用 Chrome 检查 file:// 离线交互
npm run test:sidebar-interactions # 拖拽、调宽、键盘、菜单和失败恢复
npm run test:sidebar-list # 行内改名、输入法、多选、批量操作和原子恢复
```

`sidebar.html` 是本地生成的预览文件，不提交到 Git。首次使用或修改相关组件后运行 `npm run build:demo`，请勿手改 HTML。浏览器检查需要本机安装 Google Chrome。

预览包含真实组件的 hover peek：收起后，将鼠标停在窗口内左缘 8px 区域 300ms；离开 300ms 后收起，Escape 立即关闭，顶部按钮固定面板。参数依据见 `docs/SIDEBAR-INTERACTION-2026-09-25.md`。Web 模式不绘制红黄绿灯；macOS 示意模式用装饰圆点展示控制带布局。真实红黄绿灯由 Electron/macOS 绘制，纯 Web 入口不能验证其原生实际对齐。

9 月 26 日版：左栏贯穿顶部，去掉重复标题、行图标和状态文字；状态使用小圆环或静态符号。查看三栏结构可打开「右侧面板」。相关决策见 `docs/SIDEBAR-QUIET-2026-09-26.md`。

「数据 → 全部状态」保留全部 8 种状态及无活动行。排队用时钟（表盘固定、指针转动），思考/回复/执行/等待共用旋转圆环，完成用静态勾，停止用无外圈的静态小方块，错误保留静态提示。悬停图标或键盘聚焦可读到具体状态；减少动态效果时圆环和指针静止，各状态仍可辨认。

打开即展示全部 8 种状态，以真实感对话名称呈现。时钟、勾和错误图标采用 beUI AI Sidebar 同款 Lucide；回复流程与正文共用同一 `ActivitySpinner` 组件。选择对话后，正文过程摘要随状态变化，可展开查看 mock 过程；排队预览复用正式的 `ChatSceneStatus`。数据与右侧信息仍是 mock，不代表完整客户端顶栏和聊天历史验收。

常规操作：拖动左栏右边缘调宽，双击恢复默认；直接拖动场景行排序（长列表靠边自动滚动），Escape 取消。整行右键打开菜单：重命名、查看场景信息、复制场景 ID、分隔线、删除场景；不再显示「⋯」按钮。键盘聚焦行后按 Shift+F10 / 菜单键，触屏长按也可打开。查看信息不切换当前聊天，显示该行场景的名称、ID、客户端和状态，信息面板内也能复制 ID。排序没有菜单入口或弹窗。键盘 F2 改名、Alt+Shift+上下键排序；宽度边界也能用左右箭头调整。“保存失败模拟”用于预览保存失败后的原序恢复。完整边界见 `docs/SIDEBAR-OPERATIONS-2026-09-26.md`。

双击场景即可行内改名；Enter/失焦保存，Escape 撤销。⌘/Ctrl 单击多选，Shift 连选，Shift+上下键扩选，⌘/Ctrl+A 全选；多选不切换当前聊天。拖动已选行会移动整组选区，右键已选行可批量复制 ID、确认后删除。Delete / ⌘Backspace 进入删除确认，⌘/Ctrl+C 复制所选 ID。没有常驻勾选框或更多按钮，悬停采用共享的 GlideMenu 高亮层。

“保存失败模拟”同时覆盖行内改名、整组排序和批量删除：改名保留草稿，移动/删除恢复完整数据。全部删除后留一个新场景，可继续使用。

细节回归：`npm run test:sidebar-review` 在真实共享组件上对 mock 注入可控请求延迟，验证最后一次场景点击、改名草稿保留、菜单混合输入与 Tab 退出、空列表恢复、邻接删除及浅深色对比度。截图输出到 `test-results/sidebar-review/`。完整 review 与修复前后证据见 `docs/ux-audit-sidebar-details-2026-09-26.md`。

视觉与状态回归：`npm run test:sidebar-visual` 向 mock 连续推送八种活动及 idle，验证 tooltip 同步/清除、标题宽度稳定、旋转环不中断、长标题和多选提示、浅深色/hover/离线可读性。图标保持 Lucide 与正文共用状态形态，idle 只留空槽；底部开关文字为 12px。截图与测量输出到 `test-results/sidebar-visual/`，完整检查表见 `docs/ux-audit-sidebar-visual-2026-09-26.md`。

顶部按钮保持原来的空心 PanelLeft，只补 hover 背景、按下加深和键盘焦点反馈，不切换填充图标。`npm run test:sidebar-toggle` 覆盖浅深色交互、收起/预览/固定、位置稳定、键盘和减少动效，截图输出到 `test-results/sidebar-toggle/`。侧栏常读小字已局部加深，视觉回归也覆盖多选文字、菜单快捷键、输入占位提示、hover 与按下背景。


9 月 27 日三栏重构：运行 `npm run build:collaboration-demo` 后打开 `demo/collaboration.html`。该预览复用真实左栏、Town 阅读、内嵌回复、安装结果与浏览器外壳，运输接口由示例适配器替换，不发送真实消息或安装真实工具。左侧“交流／阅读／工具库”改变右侧内容，场景改变中间对话。默认桌面宽度可并排三栏，小窗口用按钮展开左栏浮层。实现与验证边界见 `docs/UIUX-NAVIGATION-REFACTOR-2026-09-27.md`。
