# 左侧场景边栏 · 交互细节复核

2026-09-26，`feat/sidebar` 工作区；先记录问题，再修复。接续此前的外观与列表功能迭代。

## 1. 范围与证据

面向日常桌面用户及键盘熟练用户，检查左侧边栏的入口、信息层级、菜单、焦点、多选、改名、排序、状态、空列表、异常恢复、收起与 hover peek。入口结构为：顶部收起按钮 → 新建/绑定 → 场景列表 → 底部上下文开关；当前场景信息位于正文标题旁，单个对象操作位于该行右键菜单。

证据：真实共享组件在离线 Web demo 中渲染；Chrome 1280×860 实际鼠标/键盘操作；对 mock 注入可控延迟复现竞态（未修改生产数据源）。修复前的[观测数据](ux-audit-sidebar-details-2026-09-26-evidence/before.json)、[菜单截图](ux-audit-sidebar-details-2026-09-26-evidence/before-menu.png)、[空列表截图](ux-audit-sidebar-details-2026-09-26-evidence/before-empty.png)保存在本文旁。

不包含右侧业务面板改造、真实 Being 网络验证、Windows 原生窗口验收及读屏器合规认证。Mac/Win demo 的标题栏按钮只是布局示意。不能把公开 Codex 截图或 Web mock 当成原生应用实测。

本轮使用本地 ux-audit、native-feel、emil-design-eng 方法。键盘菜单行为核对 [WAI-ARIA Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)，动画参数沿用 spec §6 与本地 Beautiful UI 三份 JSON。没有重新发明 hover peek 参数。

## 2. 结论

边栏的信息量已经收敛，主要问题转为操作之间衔接不完整。菜单顺序需要按当前任务调整，但比顺序更严重的是延迟保存时的草稿丢失，以及快速导航没有服从最后一次点击。空列表把已连接和未连接混成一种状态，导致用户无法从空列表开始。键盘焦点和鼠标高亮各自生效，菜单出现两项同时被强调的情况。此次应修复这些可复现缺陷，保持现有三面结构、场景叫法和完整状态集合。无需增加更多按钮、排序选项或常驻说明来补偿这些问题。

## 3. 优先修复

| ID | 问题 | 类型 / 严重度 | 证据置信度 | 工作量 |
|---|---|---|---|---|
| FORM-01 | 旧改名请求关闭新编辑器，丢失草稿 | Defect / High | Observed（rendered + code） | M |
| NAV-01 | 快速点 B 再点 A，最后停在 B | Defect / High | Observed（rendered + code） | S |
| STATE-01 | 已连接空列表禁用新建和绑定 | Defect / Medium | Observed（rendered + code） | S |
| A11Y-01 | 菜单 Tab 只退回源行；焦点与 hover 双高亮 | Defect / Medium | Observed（rendered + computed） | M |
| NAV-02 | 高频编辑入口排在信息查询之后 | Opportunity / Low | Observed（rendered）；优先级是产品判断 | S |
| DEMO-01 | 删除当前场景后的邻接选择与正式逻辑不同 | Defect / Low | Observed（code） | S |
| COPY-01 | 同一信息面板使用“详情”和“场景信息”两种名称 | Defect / Low | Observed（rendered + code） | S |
| A11Y-02 | 删除文字、错误状态与辅助文字局部对比不足 | Defect / Medium | Observed（computed + rendered） | S |

## 4. 发现与处理建议

### FORM-01 · 改名保存和下一次编辑相互覆盖

位置：`SceneNameEditor` / `ChatSceneIndicator.renameSave`。按 F2 编辑 A，挂起保存；双击 B 并输入草稿；释放 A 的保存后，B 的输入框消失，草稿没有保存。`before.json` 中 `renameBeforeRelease` 为“第二个未保存草稿”，释放后编辑器数量为 0。原因是共用 `renameId`，旧请求完成后无条件清空；保存过程中其他行仍能开始编辑。

后果：真实网络/磁盘延迟下丢失用户正在输入的名称。建议在改名保存期间保留只读输入框，明确保存状态，暂时禁止重入操作；关闭编辑器时核对对象 ID，不能关闭其他行；失败保留原草稿和焦点。未保存/验证失败的编辑也不应被第二次改名覆盖。工作量 M。

### NAV-01 · 最后一次导航意图被忽略

位置：`ChatSceneIndicator.select`。初始 A，挂起到 B 的请求，再点 A；释放 B 后仍在 B（实测 `demo-idle` → `demo-status-queued`）。代码仅按当前已呈现的 `scene_id` 判断是否跳过，没有考虑排队中的切换。

后果：列表和用户最后点击的目标不一致。建议把待处理的目标纳入去重判断，保持请求顺序，最终进入最后点击的场景。工作量 S。

### STATE-01 · 空列表没有可用的开始路径

位置：新建/绑定入口与空列表文案。已连接的 empty fixture 中两个入口均 disabled，文案仍为“连接 Being 后创建场景”。禁用条件把没有场景当成不可操作条件。

后果：空数据用户走进死路，文案又错误提示其未连接。建议连接状态单独控制禁用；已连接时保留新建/绑定，提示“还没有场景，点击上方新建”；未连接时保留连接说明。工作量 S。

### A11Y-01 · 菜单混合输入和退出焦点不连贯

位置：场景右键菜单。Shift+F10 打开后鼠标移到“复制场景 ID”，首项键盘焦点和复制项 hover 同时有底色，截图可见两条高亮。Tab 被 preventDefault，关闭菜单后仍停留源行，必须再按一次才继续页面。

后果：视觉强调和 Enter 真正执行的动作不一致；Tab 无法完成正常的向前/向后离开。建议菜单只有一个活动项，鼠标移动同步焦点，鼠标移出清空活动高亮；键盘打开聚焦首项，鼠标打开先聚焦菜单容器；方向键从容器进入首/末项。Tab 关闭菜单并向下一个可聚焦控件继续，Escape 返回源行。滚动/缩放关闭时不把焦点丢到 body，外部点击不得抢回焦点。工作量 M。

### NAV-02 · 菜单按任务频率排列

位置：单个场景菜单。原顺序为信息 → 重命名 → 复制 ID → 删除。用户正通过列表管理场景，改名是直接编辑动作，信息是查询，ID 是辅助操作。

建议：**重命名 → 查看场景信息 → 复制场景 ID → 分隔线 → 删除场景**。保留 F2 提示，不给每项增加图标，不增加“调整顺序”或“更多”入口。多选时只出现适用的批量操作。这是基于当前任务的设计判断，不声称所有软件采用统一顺序。工作量 S。

### A11Y-02 · 局部对比不足（第二轮截图复核追加，修色前记录）

位置：菜单删除项、F2 标签、侧栏错误状态及同色错误提示。[实际计算结果](ux-audit-sidebar-details-2026-09-26-evidence/contrast-before.json)使用浏览器 computed color，逐层合成透明背景后计算相对亮度。删除文字浅色 **4.48:1**、深色 **3.20:1**；F2 浅色 **3.42:1**；错误图标深色 **2.70:1**。13px 正文按 4.5:1，状态图形按 3:1 核对；这是局部测量，不宣称整个应用达到无障碍标准。

后果：错误状态在深色背景中难以辨认，低强调的小字同时变得难读。建议为侧栏错误语义使用适应浅深色的局部 token；F2、菜单多选说明、空列表提示用现有 secondary 文字色。保持整体暖灰/深绿背景不变，常规状态继续克制。工作量 S。

### DEMO-01 · 删除后的落点不一致

位置：`demo/sidebar.tsx` 删除分支与 `desktop/main/chat/scene.ts`。正式逻辑选中被删除当前场景之后最近的幸存场景，否则选前一个；demo 总选第一个。

后果：用 demo 验收会误判实际导航表现。建议 mock 同样选择邻近场景，并保留删空后生成一个可用场景的既有逻辑。工作量 S。

### COPY-01 · 信息入口名称不一致

位置：顶部 Info 按钮的 aria-label/tooltip 与弹窗标题。前者“场景详情”，后者“场景信息”。建议统一为“场景信息”，菜单保留动词“查看场景信息”；文案仍使用“场景”。工作量 S。

## 5. Before / After / Why 与实施顺序

| 顺序 | Before | After（已修复） | Why |
|---|---|---|---|
| 1 | 旧保存结果清空新编辑 | 单个编辑事务，错误不丢草稿 | 防止数据丢失 |
| 2 | 跳过仍显示为当前的点击 | 按待处理目标去重并顺序完成 | 最后一次点击生效 |
| 3 | 空列表无入口 | 已连接即可创建/绑定 | 从空状态可恢复 |
| 4 | 菜单双高亮、Tab 停在源行 | 单活动项、完整焦点退出 | 鼠标和键盘行为一致 |
| 5 | 深色错误标记与小字对比不足 | 局部主题色、辅助字使用 secondary | 保持安静且可读 |
| 6 | 信息先于编辑 | 重命名先、删除隔离且末尾 | 频率、关联与风险分组 |
| 7 | Demo 删除跳首项 | 与正式逻辑同样选邻居 | 验收可靠 |
| 8 | 详情/信息两种叫法 | 统一“场景信息” | 同一入口容易识别 |

## 6. 保留的设计与验证边界

保留：顶部与边栏同一整面；新建场景常驻、绑定在同一行；底部仅上下文开关；八种状态不丢失，排队/进行中/完成/已停止可区分；单行不增加操作按钮；原生拖动、多选和键盘排序共存；已选项、当前对话、键盘焦点分别表达；缩减动效偏好生效。

保持既有 hover peek 热区和时序，不根据观感随意调数；右键菜单、编辑、拖动和调宽期间持有浮层。浅/深色、长标题、40 行滚动、640×430 小窗口、失败恢复与菜单边界纳入回归。小窗口检查不等同浏览器缩放验收。现有品牌色与 Lucide 图标不因审查主观换风格。

## 7. 未决项与验证记录

Central Icons 授权仍未确认，本轮不引入新图标包。真实系统红绿灯/Windows 标题栏、真实网络延迟及中文输入法候选窗口需原生环境验收；Web 自动化不能替代这些验证。此处没有因此阻断已授权的 Web/共享组件修复。

## 8. 修复后验证

上面 8 项已修复。鼠标/键盘打开菜单分别处理；菜单始终只有一个活动项，输入方式切换时也不叠加高亮，键盘高亮不等待动画。Tab 向后、Shift+Tab 向前继续，Escape 回源行；滚动/窗口改变关闭菜单会恢复源行，外部控件保留正常焦点，空白处关闭则在浏览器完成默认焦点处理后恢复源行。

改名期间保留只读输入并标注 aria-busy，阻止覆盖正在保存或验证失败的草稿；关闭时校验对象 ID。可控延迟验证了 A→B→A 和包含重复目标的长切换队列，均落在最后请求的场景。空列表新建成功；删除落点与正式逻辑一致。

| 覆盖状态 / 组合 | 实测结果 | 证据 |
|---|---|---|
| 菜单顺序、鼠标→键盘→鼠标、Tab/Shift+Tab、Escape、空白/外部控件关闭 | 通过 | `tests/sidebar-review.mjs`；[菜单](ux-audit-sidebar-details-2026-09-26-evidence/after-menu.png) |
| 延迟切换、延迟改名、保存失败/重试、双击/F2/IME 确认、失焦保存 | 通过 | review + list 两组浏览器回归 |
| 已连接空数据、未连接、创建/绑定、删除至空、邻接选择 | 通过 | review + demo + list；[空列表](ux-audit-sidebar-details-2026-09-26-evidence/after-empty.png) |
| 8 种状态 + idle、正文对应形态、缩减动效 | 通过 | demo 回归；[浅色全貌](ux-audit-sidebar-details-2026-09-26-evidence/after-overview-light.png)、[深色全貌](ux-audit-sidebar-details-2026-09-26-evidence/after-overview-dark.png) |
| 多选、扩选/缩选、整组拖动、批量复制/删除、失败原子回滚 | 通过 | list + interactions 回归 |
| 40 行滚动、长名称、省略显示、640×430 菜单防溢出 | 通过 | [浅色小窗口](ux-audit-sidebar-details-2026-09-26-evidence/after-compact-light.png)、[深色小窗口](ux-audit-sidebar-details-2026-09-26-evidence/after-compact-dark.png) |
| 调宽保存/撤销、触屏长按/滑动取消、边缘自动滚动 | 通过 | interactions 回归 |
| peek 与编辑/菜单/拖动/调宽互锁，Esc/离开/重新进入，保留滚动 | 通过 | peek + interactions 回归，95 帧主区位置一致，pin 零写入 |

局部[对比度复测](ux-audit-sidebar-details-2026-09-26-evidence/contrast-after.json)：删除文字浅色常态 **5.25:1**、高亮 **4.64:1**；深色常态 **6.77:1**、高亮 **5.13:1**。F2 浅色 **4.93:1**；错误图标深色 **6.34:1**。全部达到本文抽样项的阈值，未扩展为全产品合规声明。

可复现命令：`npm run test:sidebar-review`、`node tests/sidebar-demo.mjs`、`node tests/sidebar-list.mjs`、`node tests/sidebar-interactions.mjs`、`node tests/sidebar-peek.mjs`。后四项运行前先执行 `npm run build:demo`。`npm test`、typecheck、构建与 diff 检查结果见旁附 `validation.txt`。
