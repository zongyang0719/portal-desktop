# 左栏常规操作补齐

用户明确追加宽度拖拽、列表拖拽排序和右键菜单，覆盖原 spec §5 的 resize 排除项。业务范围仍是左侧场景列表；demo 的正文和右侧面板是示意。此前为全高三栏调整过顶栏几何和 Windows 窗口控制带，这不是右栏功能重做。

## 交互约定

| 操作 | 行为与边界 |
| --- | --- |
| 宽度 | 在左栏右边缘拖动，实时跟手，不播放布局缓动；松手保存本机偏好。双击恢复 224px。Escape、指针取消、窗口失焦撤销本次未提交拖动。 |
| 范围 | 常规 200–400px，最多占到工作区剩余 320px 正文空间处；极窄时下限也随可用空间缩小。缩小窗口或打开右栏只临时夹取显示值，不覆盖用户偏好，空间恢复后自动恢复。 |
| 键盘调宽 | Tab 聚焦边界，左右箭头 8px，Shift+箭头 32px，Home/End 到最小/最大，Enter 收起。separator 向辅助技术提供当前值与范围。 |
| Peek 调宽 | 同样可拖动；沿用本机宽度，正文零位移，不写 pin 状态。隐藏时不能聚焦边界。 |
| 拖动排序 | 拖动整行或整个选区；多项按列表原顺序形成一组，拖动预览显示数量。源行淡化，目标上下缘显示插入线；原生浏览器拖动阈值。进入列表上下沿自动滚动。Escape、拖出列表后放下均取消；外部文件拖入不会排序。 |
| 顺序保存 | 每个 Being 独立保存到现有 `chat-sessions.json` 的数组顺序；乐观更新，保存失败恢复原序并显示错误。新增对话仍追加到末尾。 |
| 选择隔离 | 拖动不打开其他对话，不重置全部上下文，不向聊天 iframe 发送场景切换，也不清除状态。后台消息不自动重排。 |
| 行内改名 | 双击、F2 或右键“重命名”进入同一行内输入框并全选文字；Enter 或失焦保存，Escape 撤销；输入法确认不提交。空名称显示行内错误，保存失败保留草稿和焦点。单击仍即时打开场景，没有人为等待双击的延迟。 |
| 多选 | ⌘/Ctrl 单击增减；Shift 连选可伸缩，⌘/Ctrl+Shift 添加范围；Shift+方向键扩选，⌘/Ctrl+A 全选，空格切换当前行，Escape 收回到焦点行。修改选区不打开场景。焦点与当前聊天分别表达；只有一个列表 Tab 入口。 |
| 行菜单 | 整行右键、Shift+F10 / ContextMenu 键或触屏/触笔长按；没有「⋯」按钮及其占位。长按 700ms，移动、抬手、取消、滚动、失焦或禁用时取消计时。系统已产生 contextmenu 时取消重复计时；长按释放不切换场景。 |
| 菜单内容 | 重命名、查看场景信息、复制场景 ID、分隔线、删除场景。信息展示目标场景的名称、ID、客户端和活动状态，不切换当前场景；直接复制 ID 保留为快捷操作。排序直接拖动，不设菜单入口或目标位置弹窗；保留键盘快捷键。删除有确认且只删本机入口。 |
| 批量操作 | 右键已选行保留整个选区，右键未选行改为单项。批量菜单只含复制所选 ID、删除所选场景；确认框显示数量与名称。⌘/Ctrl+C 复制，Delete / ⌘Backspace 发起确认。批量移动和删除各只提交一次原子保存；全部删除后留一个新场景。无常驻复选框或批量工具条。 |
| 键盘列表 | 上下箭头、Home/End 移动焦点，Enter/空格打开，F2 改名，Alt+Shift+上下箭头排序；支持前缀输入查找。排序完成焦点跟随原行。 |
| 菜单边界 | 自动避开窗口边缘，短窗口内可滚动；方向键跳过禁用项，Home/End 到首尾。Escape 回到原行，Tab/Shift+Tab 关闭并向后/前继续页面焦点顺序；外部点击、滚动、失焦关闭。 |
| 安静外观 | 行内只保留名称与状态；没有更多按钮。参考 GlideMenu 的单层轻高亮在鼠标行间移动，键盘即时、减少动效时静止；多选/拖动/编辑时停用滑动层。多选时停用键盘提示，避免抢走 Escape。八种状态保留，输入框出现时也保留状态。 |

## 依据及参数归属

- [beUI AI Sidebar 源码](https://beui.dev/components/agents/ai-sidebar)：借鉴原生 DragEvent、键盘移动、拒绝移动回滚。此前借鉴的 hover/focus 更多入口已按用户反馈移除；沿用同一 Lucide 图标族，未移植其文件树、项目层级或完整 Motion 依赖。
- [Arc 官方 Pinned Tabs](https://resources.arc.net/hc/en-us/articles/19231060187159-Pinned-Tabs-Tabs-you-want-to-stick-around)：文档列出直接右键标签执行操作，作为对象操作入口的行为参考；不将文档视为当前版本视觉实测。
- [Radix ContextMenuTrigger 源码](https://github.com/radix-ui/primitives/blob/main/packages/react/context-menu/src/context-menu.tsx)：触屏/触笔长按 700ms；移动、抬手、取消时清理计时，系统 contextmenu 先到时也清理计时。保留项目菜单组件与额外的点击抑制，长按结束不会误切换场景。
- [shadcn React Aria Sidebar](https://ui.shadcn.com/docs/components/aria/sidebar)：布局和组件分工参考；多选语义参考 [React Aria Selection](https://react-aria.adobe.com/selection)。采用无复选框的修饰键选择与选择/动作分离；保留 Portal 单击打开、双击改名的约定，不冒称直接采用完整 React Aria 组件。共享组件保持现有离线构建结构。
- [Arc 官方改名说明](https://resources.arc.net/hc/en-us/articles/20498293324823-Arc-for-macOS-2024-2026-Release-Notes)：双击/右键改名的行为参考。`GlideMenu` 改编自已落盘的 `glide-menu.json`，沿用其 220ms / cubic-bezier(.23,1,.32,1) 与 150ms 淡入淡出；键盘和减少动效无插值。
- 曾参考 [Chatbox SessionItem](https://github.com/chatboxai/chatbox/blob/main/src/renderer/components/session/SessionItem.tsx) 添加单一 Adjust order 入口；用户明确要求直接拖动后，入口及选择器已移除。拖动和快捷键共用保存路径，失败恢复原序与焦点，见 [二次收敛](SIDEBAR-REFINEMENT-2026-09-26.md)。
- [WAI APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)：参考可聚焦 separator、值域及左右箭头/Home/End/Enter 语义。文档自身仍标注待完整示例评审，不把它当作 Codex 的产品行为证明。
- `native-feel` T3 / `06-native-conventions.md`：原生鼠标光标、可预测焦点、键盘可达和无文字选中干扰。这里保留项目既有 React 菜单，不冒称系统原生菜单。
- 224px 和 150ms 行反馈来自原 spec §6。200/400/320px、6px 拖动边缘（粗指针 12px）、8/32px 键盘步长、32px 自动滚动区域及最高约 500px/s 均是 **Portal 适配选择**，依据当前列表密度、文本区保留和可操作性制定，未声称是 Arc/Codex 测量值。键盘前缀查找的 700ms 缓冲也是本项目选择。
- 原 hover peek 的 8px 热区、300ms 触发、300ms 离开、选择/拖动/焦点防误触保持不变；浮层默认仍 224px，但遵循用户新授权沿用调整后的宽度。

## Demo 与验证

`demo/sidebar.html` 仍直接复用正式组件。宽度使用独立的 `portal.demo.sceneSidebarWidth` 存储键；模拟对话/顺序仍仅在页面内存，刷新或“重置预览”恢复数据。重置宽度请双击边缘。“保存失败模拟”覆盖改名、排序和删除，以预览草稿保留及整批恢复。

新增后端用例验证排序跨重启、Being 隔离、不切换活动场景、过期目标拒绝和写入失败不破坏原数据。renderer 用例验证排序保留聊天地址、历史范围、活动状态及当前工作区。

`tests/sidebar-interactions.mjs` 验证真实鼠标拖拽、键盘移动、菜单/焦点、失败回滚、长列表滚动、宽度保存/撤销/边界，以及 peek 调宽零位移。常规 demo 和 peek 回归继续覆盖全部状态及旧流程。

本轮用户已明确追加标准列表和多选交互，因此批量删除纳入范围。未增加分组、收藏、自动按最近活动排序或全局撤销栈。Windows 原生环境仍需实机验证；Web 示意不能代替。

## 交互细节复核

单选菜单固定为「重命名 → 查看场景信息 → 复制场景 ID → 分隔线 → 删除场景」。鼠标打开时不预选动作，移动到哪项就把键盘目标同步到哪项；键盘打开聚焦首项。Tab/Shift+Tab 关闭菜单并继续页面焦点顺序，Escape 返回源行；外部点击保留其正常目标，空白处关闭时返回源行。

改名保存期间保留只读输入，暂时锁定场景操作，失败保留草稿与焦点；尚未完成的编辑不会被另一行替换。快速导航按最后请求目标去重，不再忽略“B 尚未返回时点回 A”。已连接的空列表可新建/绑定；删除当前场景时 demo 与正式逻辑均选择最近的后继幸存场景，无后继则选前一个。

菜单 F2、空列表与多选说明使用 secondary 文字色；删除/错误的局部 token 分浅深色，错误状态仍保留自己的静态图形。[完整复核](ux-audit-sidebar-details-2026-09-26.md)记录问题分级、修复前截图及实际对比度。

视觉与状态续审：普通活动使用 secondary 色；hover 名称使用 text 色以保证叠加背景的对比度。所有行保留隐形状态槽，idle 不显示标记。状态清除时同步关闭旧提示；长标题仅在截断时使用统一 tooltip。提示首次延迟 700ms，连续查询沿用 Radix 的 300ms skip window，与 hover peek 时序无关。多选保留鼠标提示，Escape 不被提示截断；离线保持已有数据可读，并按需解释不能操作的原因。底部文字 12px、点击区域最小 28px，F2 11px。[完整视觉检查表与证据](ux-audit-sidebar-visual-2026-09-26.md)。
