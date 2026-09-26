# Sidebar 浏览器预览

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
