# 整面侧栏与内容降噪

用户在 9 月 26 日明确扩大范围：减少侧栏内容噪声，并把横贯窗口的顶部栏改为各面板自己的顶部区域。此前“只改框，不改货”的边界在本轮被这一指令更新。

## 最终结构

左侧 224px 导航从顶部到底部贯通，中间的标题栏与聊天共享同一左边界；右侧辅助面板保留独立表面。收起后中间面板填满可用区域；hover peek 覆盖在上面，主区与主区标题栏都不移动。既有 8px / 300ms / 300ms hover 规则未改。

| 之前 | 现在 | 原因 |
| --- | --- | --- |
| 横向顶部栏把侧栏切成下方另一块 | 左栏包括顶部控制带，中间标题栏从左栏右边开始 | 按面板组织，不增加第四块视觉区域 |
| “场景＋数量”“当前 Being 的对话” | 移除 | 同一列重复解释列表是什么 |
| 新建卡片＋绑定图标 | 一行轻量“新建场景”；右侧常驻绑定图标 | 用户选定 A 方案：关联操作放在一起；保留“场景”命名 |
| 每行对话图标＋名称＋当前点＋状态文案 | 名称＋必要状态符号，选中靠底色 | 名称是导航主角，不让相同图标挤占宽度 |
| 运行、等待、完成等文字常驻 | 排队时钟、回复流程圆环、完成勾、停止小方块；错误静态提示 | 八种状态标签仍保留在 tooltip 与可访问描述中；不只依赖颜色或运动 |
| 常驻详情按钮 | 当前标题旁的信息按钮 | 详情跟随当前对话，收起侧栏也能查看 |
| 底部完整长句 | “全部上下文”，可访问名称保持原语义 | 缩短文案，保留切换能力 |

## 动效参考

早先参考 [beUI Loader](https://beui.dev/components/motion/loader) 分别使用 dots、bars、spinner。按用户最新纠正，排队、回复流程、完成必须可辨：排队使用 Lucide Clock3，固定表盘且仅指针转动；思考/回复/执行/等待四阶段复用正文的 `ActivitySpinner`：12px、1.5px 描边、1s linear；完成使用静态 Check。指针沿用相同周期，减少动态效果时全部静止，具体阶段通过提示和可访问标签保留。时钟、勾、错误和操作按钮继续使用 [beUI AI Sidebar](https://beui.dev/components/agents/ai-sidebar) 同款 lucide-react 图标包。最新检查见 [二次收敛](SIDEBAR-REFINEMENT-2026-09-26.md)。

几何、选择、hover 与按压沿用已有参考：224px 宽度、280ms 框体、150ms 行反馈、.98 按压。顶部唯一 pin 入口与当前场景标题保留，标题不再因为 pin 改变而条件消失。

## 状态完整性复核

来源链路为 `runtime.sceneActivity()` → `scene-runtime.sceneStatus()` → `beings:scene-activity` → `AppModel.setChatSceneActivity()` → 左栏。`desktop/shared/types.ts` 定义的 8 种活动全部保留。当前视觉与正文一致，不要求八种状态各自拥有不同动画：

| 活动 | 含义 | 符号 |
| --- | --- | --- |
| queued | 排队中 | Lucide Clock3，仅指针转动 |
| thinking | 思考中 | 共用 ActivitySpinner |
| replying | 回复中 | 共用 ActivitySpinner |
| working | 执行中 | 共用 ActivitySpinner |
| waiting | 等待回复 | 共用 ActivitySpinner |
| done | 已回复 | Lucide Check |
| error | 出错了 | Lucide CircleAlert |
| stopped | 已停止 | 共用 ActivityStopped，8px 静态实心小方块 |

活动为空时不绘制符号。`done` 在当前对话被阅读后消失是原有已读逻辑，不是遗漏。后台任务的 `running/queued` 聚合为执行中，完成后尚未收到回复为等待回复，`failed/interrupted/budget_exhausted/timeout` 依照原有优先级聚合为出错；保留已有运行态及错误/停止优先规则，没有更改调度、桥接和已读处理。

状态组件使用穷尽的 `Record<ChatSceneActivity, …>`，新增活动但未补映射会触发类型检查错误。Demo 的「全部状态」从共享状态表生成，覆盖 8 种活动和无活动；浏览器回归检查符号、tooltip、可访问描述及减少动态效果。回复流程四阶段的图形相同，标签不同；排队、完成、停止、错误各有明确形状，不依赖悬停才能辨别。

## 平台边界

- macOS 保留系统红黄绿灯，左栏底色延伸到灯下方。
- Windows 使用 Electron `titleBarStyle: hidden` 与原生 `titleBarOverlay`，保留系统最小化/最大化/关闭按钮；控制区高 52px，符号颜色跟随应用主题。原生控件安全区由 CSS 环境变量避让。依据：[Electron 官方自定义标题栏文档](https://github.com/electron/electron/blob/main/docs/tutorial/custom-title-bar.md)。
- 右侧实际辅助面板为 Windows 原生控制区留出顶部空间；没有仿制可点击的系统窗口按钮。
- Demo 新增 Windows 示意和可选右侧面板。红黄绿灯及 Windows 三按钮明确为装饰示意；辅助面板仅展示 mock 对话信息，不冒充新产品功能。
- Codex 的 [Windows 官方页面](https://learn.chatgpt.com/docs/windows/windows-app)将其界面描述为 sidebar / active chat / review pane。本次遵循用户指出的面板归属关系，没有声称复刻或实测 Codex 两平台的所有细节。

## 验证

- `npm test`：512 通过，23 跳过；`npm run typecheck` 与 `git diff --check` 通过。
- file:// demo、明暗主题、长列表、创建/绑定/重命名/删除、标题详情、绑定入口和上下文切换通过。
- 几何断言覆盖：侧栏顶部/底部等于工作区，中间标题栏与聊天左边界等于侧栏右边界，右侧面板与主区相接。
- Hover 专项回归通过：95 帧主区坐标一致、pin 无写入，Escape、反向操作、焦点/菜单、减少动态效果均保持。
- Windows overlay 构造、主题切换、监听清理及主窗口识别有跨平台测试；Windows 实机按钮、DPI、Snap 行为尚未在本机验证。不能把 Web 示意截图当作 Windows 原生验收。
- 完整场景 Electron 脚本已有绑定后的重复消息失败，前一轮已用原始 HEAD 复现；本轮保留该断言，不掩盖历史合并问题。

## 入口与提示更新

用户选择 A：绑定位于“新建场景”右侧，详情位于当前标题旁，底部只保留上下文开关。提示支持图标悬停、行/按钮键盘聚焦、Escape 关闭且保留焦点；状态符号不增加 Tab 停靠点，后来新增的行更多按钮独立可聚焦。提示显示延迟沿用 [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip) 的默认 700ms，键盘即时显示，不改 peek 参数。提示与触发器之间有连续命中区域，移入提示会维持 peek；离开两者后恢复关闭计时。

Demo 初始直接展示全部 8 种状态；日常样本保留。mock 正文、右侧信息和窗口按钮的边界已在 demo 内写明。后续检查与方案记录见 [侧栏 UX 检查](ux-audit-sidebar-2026-09-26.md)。
