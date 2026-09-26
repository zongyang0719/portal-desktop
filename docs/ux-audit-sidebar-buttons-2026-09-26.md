# 侧栏按钮与交互实测 · 2026-09-26

范围是本次左侧场景边栏及与正文的交互边界，面向桌面日常使用。证据包括共享组件的浏览器实测，以及安装源码上的 Electron mock 集成测试；没有接入真实 Being 发送消息。当前原生客户端的整页可访问性读取被自动审批拦截，等待用户切换到空白场景或允许本次读取，因此不能把 mock 结果称为已安装客户端验收通过。

## 前一轮结果（不代表原生鼠标点验）

7 组共享组件测试全部通过。测试使用的 12 个侧栏共享源码文件与安装源码逐字节一致。修正旧测试的定位与 mock 数据后，安装源码的完整 Electron 流程连续两轮通过；`npm test` 再跑结果为 523 通过、23 跳过。检查过本轮生成的 mock 右键菜单截图。没有修改用户的场景、草稿、排序或历史，也没有新装 Dev 客户端。

| 操作 | 已有实测结果 |
|---|---|
| 展开、收起、固定、hover/按下/键盘焦点 | 当时仅 DOM/mock 点击通过；原生鼠标收起失败，见下方修正 |
| hover peek 触发/关闭、重入、Esc、输入与拖拽防误触 | 通过；测量的 95 帧正文布局不变 |
| 拖动宽度、刷新记忆、双击复位、键盘调整、取消拖动 | 通过 |
| 新建、绑定、查看信息、复制 ID、关闭/取消对话框 | 共享组件通过；新建/绑定及取消也经 Electron 集成通过 |
| 双击/F2/右键改名、空名称、IME、失败保留输入 | 通过 |
| 单选、组合键多选、Shift 范围选、全选、清除多选 | 通过 |
| 单条/多条拖拽、越界取消、滚动、失败回滚 | 通过 |
| 单条/批量删除确认、取消、全部删除后的可用场景 | 通过，均为 mock 数据 |
| 八种状态、动态更新、正文标记对应、提示文字 | 共享组件测试通过 |
| 切换后的聊天历史、每个场景独立草稿、实际发送 scene_id | Electron mock 连续两轮通过 |
| A → B → C 排队顺序、202 等待回复、后台任务状态 | Electron mock 连续两轮通过 |
| 浅色/深色、窄窗口、长标题、减少动态效果 | 通过 |
| 已安装应用的真实原生按钮 | 尚未完成，等待界面读取授权 |

## 诊断发现

### TEST-01 · 正文与历史预览的定位歧义

- 类型：测试缺陷；严重度 Medium；置信度 Observed（Electron mock 运行日志）。
- 证据：`chat.getByText('回复：方案内容')` 同时匹配 `#messages` 和历史 tooltip，导致 strict mode violation。
- 影响：界面内容正常存在时，集成测试也可能随机中断，后续按钮没有得到验证。
- 处理：正文断言已限定到 `#messages`，保留历史预览的专门断言；完整复测通过。工作量 S。

### TEST-02 · Mock 历史改变了实际提交正文

- 类型：测试数据缺陷；严重度 Medium；置信度 Observed（模拟请求、历史记录、源代码）。
- 证据：绑定场景后仅有一条 `Bound scene message` 请求，但 mock 在写入历史前去掉了传输场景提示。现有回显对账按提交正文匹配，因此出现两条用户气泡。
- 影响：不能用这一条 mock 重复气泡直接推断真实服务行为，也不能把 `.first()` 当作修复掩盖它。
- 处理：mock 保存 `body.message`，模拟回复仍使用去前缀的正文；增加只有一条用户回显的断言，完整复测通过。未改消息业务代码。工作量 S。

### TEST-03 · 仍查找已经移除的状态文字

- 类型：测试缺陷；严重度 Medium；置信度 Observed（Electron mock 状态和源代码）。
- 证据：`[data-scene-id="feishu-shared"]` 已处于 `working`，测试仍要求其内部存在可见“执行中”文字。当前设计已把状态改为图标及可访问标签。
- 影响：功能已正常进入执行状态，旧断言却判失败。
- 处理：改为验证 `data-status="working"` 标记及 `aria-label="执行中"`，保留正文运行状态验证，完整复测通过。工作量 S。

### OPEN-01 · 排队状态首次超时

首次集成运行新建 C 场景后未等到 `queued`；后续诊断已通过该队列阶段。测试现在在输入前确认 iframe 现有 `beings:history-scope-state` 初始状态或 `beings:session-selected` 切换回执的场景身份与侧栏一致；业务代码没有添加测试钩子或固定延迟。修正后的完整流程连续两轮通过，未再复现超时。第一次失败时缺少足够事件记录，不能断言所有真实设备的切换竞态已被排除；实际客户端仍待点验。检查日志位于 `out/sidebar-delivery/button-check-2026-09-26/`，不进入 PR。

## 用户实测后的修正 · 20:24

此前测试漏掉了两个真实缺陷，不能把“DOM 点击通过”当作 macOS 原生按钮可用。用户截图与原生 mock 坐标点击已经证明这一点。

### BUG-01 · 原生拖拽区域吞掉收起点击

- 严重度 High；置信度 Observed。展开时 `.chat-session-panel::before` 的全宽 `-webkit-app-region:drag` 与独立按钮重叠；DOM z-index 和按钮自身的 no-drag 未能排除此原生区域。
- 修复前原生坐标点击可展开，展开后同坐标无法收起；AX/DOM 点击可绕过，解释了此前误判。
- 修复：拖拽区物理边界移到控制区右侧（复用已有 Web/Windows 60px、macOS 136px 留位），按钮保持原图标与位置；没有改 hover 时序参数。
- 修复后使用 CUA 点击同一屏幕坐标，连续四次正常切换展开/收起。测试窗口使用真实共享组件、macOS hiddenInset 和相同红绿灯位置，全部数据为临时 mock。

### BUG-02 · 启动横幅被固定侧栏覆盖

- 严重度 Medium；置信度 Observed。正文和顶栏给侧栏让位，但同级 startup-notice 未让位；此前 fixture 根本没有横幅。
- 修复：横幅和场景主题带与正文共用侧栏偏移、调整宽度与减少动态效果规则；长横幅换行且不被纵向 flex 压扁。
- 原生截图确认固定展开后横幅全文从正文列开始。已有 Electron 测试补入真实标题栏配置、平台标记、长横幅和场景带，验证原生拖拽区与按钮不相交，以及默认宽度、调整宽度、收起后的横幅/正文对齐。

### 本轮验证与交付

- 当前 feat/sidebar：npm test 519 通过、23 跳过；实际安装源码：523 通过、23 跳过。
- toggle / peek / interactions 三组定向浏览器测试通过。
- 完整 Electron 集成首轮在后续并发发送的提示文字等待上超时，新增布局检查已通过；保留诊断日志。诊断重跑和未删减原测试复跑都完整通过，不能把未复现超时宣称为根因已修。
- 在既有 `tests/chat-sessions-electron.mjs` 补回归，没有新加官方测试文件。
- 重新构建 renderer、更新包内 ASAR 完整性清单、重新封装外层签名，原位替换同一个 `/Applications/Portal Desktop.app` 并启动。签名和引擎摘要核验通过；没有新增日常客户端，没有改私人对话数据。
- 自动审批仍不允许读取已安装窗口的整页私人对话；因此上述坐标验证明确属于相同原生配置的 mock 窗口，不称为整机/全部业务验收。

证据日志：`out/sidebar-delivery/native-fix-2026-09-26/`；候选补丁和安装源码归档已同步；没有 commit、push 或 PR。


## Windows 与同类问题审查 · 20:34

本轮结论：还有确定的未解决问题，不能声称全量可用或 Windows 已验收。原先测试漏检不是测试数量不足，而是测试层级和 fixture 不匹配：DOM/AX 点击绕过原生命中；简化 shell 缺少横幅、真实工具栏以及关闭后仍挂载的面板。

### BUG-03 · Windows 原生控制区留位被隐藏面板取消（代码与布局复现，已修）

- `.workspace-body:has(> :is(#place-panel,#companion-panel,#browser-panel))` 只检查节点存在。真实 Browser 和 Companion 在关闭后仍挂载、使用 hidden 隐藏；Companion 即使打开也是 absolute 浮层，不占右侧列。
- 结果：完整 shell 的顶栏右 padding 总被重置成 24px，应用按钮进入 Windows 原生最小化/最大化/关闭区域。macOS 浏览器中使用 138px 模拟 caption inset 复现该几何冲突；没有 Windows OS 点击证据。
- 修复：只有可见的 docked place/browser 面板移走右上角留位；隐藏节点与 Companion 浮层不触发。仅改侧栏整合标题栏所需 CSS。
- 已有 Electron fixture 补入真实 workspace-body 结构和常驻隐藏面板，断言三种情况。Windows 分支 fixture 也改为产品使用的 hidden + titleBarOverlay 配置，避免在 Windows CI 继续测试错误的默认标题栏。
- 完整 mock Electron 集成通过；当前分支 npm test 519 通过、23 跳过。修复已原位同步到同一个客户端包；没有改右侧业务、没有新建客户端、没有 commit/push/PR。

### BUG-04 · 窄窗三栏正文被挤压（自动让位已实现，待复验）

- 严重度 High；原始问题置信度 Observed。920px 窗口、右侧 place panel 620px 时，stage 仅剩 300px；左栏固定宽 200px 会把正文压到 100px，顶栏也因此拥挤。macOS 和 Windows 共享布局都受影响。
- 修复策略：测量 workspace-stage 和实际侧栏宽度；正文可用宽度低于 320px 时，左栏不再占位，场景列表改为按钮/左缘可打开的浮层。右侧面板不变；固定偏好和保存栏宽不清除，空间恢复后回到固定布局。
- 实现位于 `use-sidebar-width.ts`、`use-sidebar-peek.ts` 和 `chat-scene.tsx`。修复已推送到 PR #3，并打入同一个本地 Portal Desktop 0.2.0。
- 验证边界：本轮没有重跑 npm test、typecheck 或 920px 布局矩阵；只确认 renderer build、ASAR 完整性、签名和引擎摘要。PR #3 当前未报告 CI 检查；Windows 原生也未验证。请把 920px + 620px 下的自动让位视为待用户复验，不标成已验收。
### Windows 证据边界与无需自备设备的验收路径

- 本地可查：共享代码、Windows 平台 CSS、布局几何、窗口构造配置、Windows Ctrl 组合键实现；这些不是 Windows 原生验收。
- 未验证：真实 Windows 原生命中、最大化/还原与 Snap、100/125/150/200% 系统缩放、多屏 DPI 切换。这些需实际 Windows 环境。
- 仓库已有 `.github/workflows/desktop-tests.yml` 的 windows-latest 矩阵，会通过 `test:all` 运行 chat-sessions 集成；当前改动尚未提交/推送，因此本轮没有 Windows CI 运行。云端 Windows Electron 集成仍不能自动证明真实鼠标命中正确，需交互式 Windows 虚拟机/远程测试机进行原生点验。
- 参考 Electron 官方 [Custom Window Interactions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions)：drag 区忽略 pointer 事件，必须排除交互区；以及 [Custom Title Bar](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar) 的 Windows titleBarOverlay。共用旧 CSS 的 Windows 存在同类风险，不能将 macOS 修复后的点验推广为 Windows 通过。
- 本地 skill 审查依据为 `native-feel/references/01-philosophy.md` T1（渲染面与原生窗口分开验证）及 `references/06-native-conventions.md` 的 Windowing & focus、Accessibility；未采用其与本项目无关的架构重写建议。


## 图标校准与 hover 排序修复 · 2026-09-26 本轮

用户明确：bug 是收起后 hover 浮层里的场景条目排序。按 systematic-debugging 先复现事件顺序，再修改；按 emil-design-eng 检查视觉尺寸、命中范围和交互中断。

| Before | After | Why |
|---|---|---|
| 展开收起图标 18px，展开时加深到正文色 | 保留原 PanelLeft 线框图标，改为 16px；默认 muted，hover/按下为 secondary | 降低视觉重量；不换填充图标，32px 点击范围保持不变 |
| macOS 按钮 left 92px、top 10px，控制带结束于 136px | left 88px、top 11px，控制带结束于 132px | 根据用户并排截图缩小与红绿灯间距并下移 1px；原生拖拽区域继续与按钮保持物理间隔 |
| 原生排序开始发出 pointercancel，hover hook 立即关闭浮层 | dragstart 同步标记原生拖拽，pointercancel 不再关闭；dragover 更新位置，drop/dragend 恢复关闭逻辑 | 浏览器从 Pointer Events 接管到 HTML DND 是正常生命周期，不等于用户取消 |
| 已有排序验证主要覆盖固定展开，缺少 hover 路径 | 既有 Electron 测试加入收起→hover→拖动→落点排序，断言场景与正文布局不变 | 直接覆盖用户报告路径，避免固定侧栏通过掩盖 hover 失败 |

修复前实测：dragstart → pointercancel → panel open=false → dragend，顺序不变。修复后：拖动持续超过关闭延迟，浮层保持 open=true；drop 后顺序按目标位置更新。没有改动已有热区宽度或开关延迟等交互参数。

验证：当前分支 npm test 519 通过、23 跳过；typecheck 和 git diff --check 通过。toggle、peek、interactions、list 四组浏览器测试通过。实际安装源码的完整 mock Electron 集成通过，包含新增 hover 排序、当前场景与正文几何稳定的回归。

原生证据边界：相同 hiddenInset 配置的临时 mock 窗口中，CUA 坐标点击可展开/收起；原生拖拽产生 dragstart 与 pointercancel 时浮层保持打开。CUA 没有完成 drop，因此不将完整原生鼠标排序标为通过。随后 Esc 产生 dragend，浮层正常关闭。hover 准备使用 fixture 专用按钮，不将其作为原生 hover 入场证据。系统屏幕共享标记覆盖了红绿灯，无法凭此次原生截图确认三色按钮中心线；对齐调整基于用户截图与 CSS 几何，仍需用户视觉确认。

日志：out/sidebar-delivery/peek-sort-before.log、peek-sort-after.log、peek-sort-npm-test.log。图标状态对照：test-results/sidebar-toggle/state-matrix.png。

本轮已原位更新同一个 Portal Desktop，签名与引擎摘要校验通过。没有新加官方测试文件，没有 commit、push 或 PR。窄窗三栏自动让位已实现并进入 PR，仍待本机复验；没有 Windows 原生验收结果。


## 窄窗自动让位实现与提交 · 2026-09-26

用户确定采用左栏自动让位并保留固定偏好。修复提交 `7cf9a5d` 已推送到 PR #3；只含三个侧栏文件。本地同一个 Portal Desktop 已重新构建、原位安装并启动，ASAR、外层签名与引擎摘要校验通过。

本轮没有重跑测试或 typecheck。519/23 的 npm test 与之前 hover 排序 Electron/浏览器检查均早于本次自动让位改动。PR #3 当前未报告 CI；Windows 原生验收仍缺。请在 920px 窗口配 620px 右面板下确认浮层及恢复固定行为。
