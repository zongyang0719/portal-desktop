# Portal Desktop 设计走查报告 · 2026-09-24

走查方式：纯代码走查（无截图权限，本机 `screencapture` 被系统拒绝）。方法论参考 `skills/design/apple-hig-review`（Apple HIG 桌面部分 + 工艺视角）与 `skills/design/ux-audit`（每条发现必须有代码证据）。视觉真源以 CSS 为准，对比度数值由 hex 实际计算，不是估计。

总体评价：**Good 偏 Needs work**。这套设计有一个清晰且少见的论点——"对话是两个人共享的一个地方"（暖纸底色、克制的绿色、衬线标题只留给"地点"），方向是对的，执行的大部分也克制。主要问题集中在三处：**浅色模式下小号灰字对比度不达标**、**同类控件在四个地方长成四个样子**、以及**聊天 iframe 里残留着一整套没被删干净的旧 GitHub 深色主题**。

已知问题（你自己提的）我做了验证，在对应区域里标注 ✅；报告主体是你没提到的。

---

## ① 顶部栏（app/components/topbar.tsx + app/styles.css）

**1. 同一排控件四种高度，视觉重心互相对不齐** — 高
- 位置：app/styles.css `.chat-scene-indicator`（min-height 28px）、`.local-portal-status`（min-height 30px）、`.topbar-icon-button`（32px）、`.client-update`（36px）、`#options-trigger`（32px）
- 类别：对齐。虽然 flex `align-items:center` 保证垂直居中，但 28/30/32/36 四种高度混在一排，加上场景按钮有边框、其他没有，视觉上就是"没对齐"的来源——印证了你提的那点 ✅。
- 建议：统一成 32px 一档（更新按钮也收进 32），场景按钮的边框去掉或给所有控件统一边框。

**2. SBS 开关是一个 18×22px 的无文字圆点** — 高
- 位置：topbar.tsx 约 155 行；样式 app/styles.css `.sbs-header-switch`（width:18px;height:22px，内嵌 10px 圆点）
- 类别：可访问性 + 图标一致性。桌面端 HIG 控件最小 20×20pt，这个只有 18×22 且有效点击区集中在 10px 圆点上；它同时是一个 toggle（`aria-pressed`）却没有任何可见标签，含义完全靠 title 悬停解释。呼吸动画 `scale(1.35)` 还会让圆点放大到超出按钮盒子。
- 建议：要么做成带文字的胶囊开关（如聊天 iframe 里 `SBS` 那种），要么至少把点击区扩到 28×28。

**3. 「你 · Being」中间的间隔号用了 Georgia 20px** — 低
- 位置：app/styles.css `.pair-link{font:20px Georgia,serif}`，topbar.tsx 约 150 行
- 类别：对齐。一个 20px 衬线字号的 `·` 夹在两个 13px 文字中间，基线对不齐，是顶部"看起来歪"的第二来源。改成 `font-size:inherit` 或用一个 4px 圆点元素即可。

**4. Portal 状态药的 hover 换字是个好细节，但状态文案有九种** — 中
- 位置：topbar.tsx 约 131-141 行，`portalLabels` 有 运行中/未启动/启动中/已连接/重连中/停止中/实例冲突/启动失败 + "外部运行"
- 类别：交互反馈。hover 把"状态"换成"实例名"（样式里 grid 叠放、不动布局，做得对 ✅ 印证你提的点），但九种状态文案里"实例冲突"和"启动失败"对普通用户是系统语言不是人话。建议把错误两态改成"另一个实例在运行""启动没成功，点我看日志"这类可行动的文案。

**5. 隐藏规则已成死代码** — 低
- 位置：app/styles.css `body:not([data-view=chat]) #conversation-name{display:none}`（文件前段）被后段 `body[data-view] #conversation-name{display:inline}` 覆盖
- 类别：代码卫生。两层覆盖导致"非聊天视图隐藏名字"的意图实际失效。删掉其一，否则下次改主题的人会踩到。

---

## ② 场景列表（app/components/chat-scene.tsx + app/styles.css）

**6. 重命名/删除只藏在右键菜单里，没有任何可见入口** — 高
- 位置：chat-scene.tsx 约 108 行 `onContextMenu` 是唯一起点
- 类别：交互反馈。Mac 用户对列表项右键的预期很弱（Finder 都给了工具栏和菜单栏），场景名旁边的"当前点 •"和状态标签都不是按钮。建议：列表项 hover 时露出一个 12px 的"···"按钮，点开同一个菜单。右键保留作为快捷方式。

**7. "显示全部场景上下文"在两个地方是两种不同的控件** — 中
- 位置：chat-scene.tsx 约 152 行用 `<input type="checkbox">`（样式化成开关）；chat/page.tsx 约 351 行（standalone 分支）用原生 checkbox + label
- 类别：图标一致性。同一个设置，在场景面板是 switch 样式、在独立聊天页是勾选框。另外前者用了 switch 外观却没写 `role="switch"`（对比：app/components/settings.tsx 239 行的通知开关写了），VoiceOver 会把它读成"复选框"。统一成 switch 样式 + `role="switch"`。

**8. 新建/绑定按钮的禁用条件绑在 `sessions.length` 上** — 中
- 位置：chat-scene.tsx `disabled={!connected || busy || !sessions.length}`
- 类别：交互反馈。没有场景时"新建场景"恰恰是唯一该能按的按钮，现在反而被禁用了——空列表下用户无法创建第一个场景（除非走顶栏的 createRequest 路径）。这应该是个逻辑笔误：禁用条件只需要 `!connected || busy`。

---

## ③ 聊天主界面（chat/page.tsx + chat/styles.css）

**9. 浅色模式小号灰字对比度 3.5:1，不达标** — 高（可访问性）
- 位置：chat/styles.css `--text-muted:#82897e`（用在 10px 的 `.message .meta`、时间戳、`.message-scene`）；app/styles.css 同名变量用在 10px 的 `.chat-session-caption`、`.list-status`、`.eyebrow`、`#client-version` 等
- 类别：色彩。实测 #82897e 对 #faf9f5 = **3.46:1**，17pt 以下文字需要 4.5:1。深色模式（#8b9c8e 对 #202923 ≈ 5.2:1）是达标的，问题只在浅色。
- 建议：浅色 `--text-muted` 从 #82897e 调深到 #6b7566（约 4.6:1），一次改两个文件里的同一个变量，收益最大。

**10. 聊天样式表里埋着一整套没删的旧 GitHub 深色主题** — 高（维护风险）
- 位置：chat/styles.css 开头 `:root{--bg:#0d1117;--accent:#58a6ff;...}` 及随后约 900 行针对它的规则，直到文件后 1/3 才被三层 `:root` 覆盖改回暖纸主题
- 类别：层级（样式层级）。文件自上而下是"GitHub Dark → 浅灰 → 暖纸"三次覆盖，大量前面定义的规则（`.btn-primary` 蓝字、`#soul-card`、`.llm-item` 网格等）靠覆盖压制。这是改样式时最大的坑：任何人改前段的规则，都说不清会不会幽灵复活。建议拆成 `chat-legacy.css` 或直接删除被完全覆盖的规则，只留一层主题变量。

**11. 界面文案中英混用，且英文那句恰好是用户会看到的** — 中
- 位置：chat/page.tsx 约 300 行 `drop files here`（拖文件时的全屏提示，全界面唯一大字号英文）；同文件 `aria-label="message input"`、发送按钮 `title="send"`、aria-label `"send message"`
- 类别：文案。全屏拖放提示是真实用户可见文案，应改成"把文件拖到这里"；三个 aria/title 顺手统一成中文。

**12. 输入框确实是纯 textarea，无任何格式辅助** — 中 ✅（印证你提的点）
- 位置：chat/page.tsx 约 483 行，`<textarea>` 无工具栏、无预览
- 展开建议：不一定要做 markdown 工具栏。性价比最高的两步是——① 发送按钮 title 补"Enter 发送 · Shift+Enter 换行"的快捷键提示；② 对方回复里已支持完整 markdown 渲染（code-block / 表格 / 预览模式都有），输入侧先加一个"粘贴代码自动包 ``` 围栏"就够了，完整预览可以往后排。

**13. 左侧消息导航刻度条点击区 12px 高** — 中
- 位置：chat/styles.css `.chat-index-tick{height:12px;width:36px}`，chat/components/navigation.tsx
- 类别：可访问性。桌面控件最小 20pt 高，刻度条只有 12px，且 `opacity:.25` 常隐。建议每格加到 16-18px 高，默认 opacity 提到 .5。

**14. TemperatureGlow 的"情绪色"用的是旧主题的蓝紫色系** — 低
- 位置：chat/components/messages.tsx 约 200 行 `cool: rgba(88,166,255,0.06)`、`deep: rgba(188,140,255,0.08)`
- 类别：色彩。这两组色来自第 10 条那套旧 GitHub 主题，和暖纸绿底完全不一个家族；它又是纯装饰性渲染（关键词匹配给整个页面底部染色），属于 HIG 提醒的"别把愉悦误当装饰"的边界案例。要么换成 accent 色系，要么考虑删掉——这是"可以拿走一个配件"的候选。

**15. `document.title = "Loom · ..."`** — 低
- 位置：chat/page.tsx 约 165 行。品牌名残留（应用叫 Portal Desktop / beings.town），窗口标题和菜单里会露出来。

---

## ④ 设置（app/components/settings.tsx + app/styles.css）

**16. 主题只有浅色/深色两档，无"跟随系统"** — 高 ✅（印证你提的点）
- 位置：settings.tsx 约 184 行 `(["light","dark"] as const).map(...)`；chat/page.tsx 约 113 行聊天 iframe 的初始主题只看 URL 参数 `?theme=dark`，默认永远 light
- 展开：HIG 对深浅色的要求是"跟随系统外观，应用内不提供专属切换"（`dark-mode.md`）。现在的实现等于要求用户手动维护一个系统本来就有的状态。建议：主题选项改为 跟随系统/浅色/深色 三档，默认"跟随系统"，用 `prefers-color-scheme` 监听；iframe 侧在 `matchMedia` change 时同步 `data-theme`。
- 顺带的隐患：settings.tsx 187 行 `onClick` 里 `if (app.theme !== theme) void app.toggleTheme()` —— 二态 toggle 逻辑，加第三档时这里必须重写，别在旧逻辑上打补丁。

**17. 设置里有两套"模型设置"入口，样式语言完全不同** — 中
- 位置：app 侧 `openClientSettings()`（圆角 20px、tab 式对话框）vs chat 侧 `ChatSettings` 侧滑面板（`shared/model-settings.css`）
- 类别：层级。⌘, 打开的客户端设置和聊天里的模型设置是两种容器范式（对话框 vs 抽屉）、两套控件样式。桌面惯例是所有设置收进一个设置窗口。短期至少把两处共用的字段/开关样式统一到 `shared/model-settings.css`。

---

## ⑤ Town（town/ + app/styles.css 相关段）

**18. 红色/错误色系有六种不同的色值** — 中
- 位置：app/styles.css 里 `#c64949`（场景删除/错误）、`#b34b47`（over-limit、danger-action）、`#c5674e`（form-error）、`#b76a46`（inline-error）、`#b45d58`（portal 状态点）、`.chat-session-activity[data-status=error]` 引用了一个从未定义的 `var(--danger, #b34b43)`
- 类别：色彩/图标一致性。一个颜色只该表达一个意思，现在"危险/错误"有六种红。建议定义 `--danger` 变量并全部归一（顺便把那个 fallback 填上）。

**19. 更新按钮的实蓝色 #3b82ee 不属于这套色板** — 低
- 位置：app/styles.css `.client-update{background:#3b82ee}` + hover/active 各一个硬编码蓝
- 类别：色彩。全应用都是暖纸绿，唯独更新按钮是 Tailwind 默认蓝，在顶部栏非常跳。如果"更新可点"需要一个信号色，用现有 `--green` 加深一档即可。

**20. Town 头部标题被 `hidden` 了，eyebrow 也没渲染** — 低
- 位置：town/page.tsx 约 44-47 行 `<div className="town-heading" hidden>`
- 类别：层级。样式表里为 town-heading 保留了大量布局规则（含响应式），实际永远隐藏——和第 5、10 条是同一种"样式与结构脱节"的债。要么恢复标题，要么清掉死样式。

---

## 做得对、要保住的

- `.local-portal-status` 的 hover 换字用 grid 叠放，宽度不变、不挤邻居（④ 之外少数零成本 delight）。
- 右键/菜单的键盘支持非常完整：ArrowUp/Down/Home/End、Escape 返回焦点、inert 管理、`prefers-reduced-motion` 几乎每条动画都有降级。
- 关闭按钮用伪元素画 ×，不吃各平台字体基线的亏。
- 衬线字体只给"地点/书名"，导航控件全是系统字——品牌克制得对，不要破例。

---

## Top 10 按性价比排序

| # | 修复 | 工作量 | 收益 |
|---|------|--------|------|
| 1 | 浅色 `--text-muted` #82897e → #6b7566（两个 CSS 文件同一变量） | 5 分钟 | 全应用小号灰字对比度从 3.46:1 到 4.6:1（发现 9） |
| 2 | 场景面板"新建场景"禁用条件去掉 `!sessions.length` | 1 行 | 修好空状态死路（发现 8） |
| 3 | 顶部栏控件统一 32px 高 + 修 `.pair-link` 字号 | 半小时 | "顶部没对齐"一次收口（发现 1、3） |
| 4 | 拖放提示、send/message input 的英文文案中文化 | 10 分钟 | 消灭全屏英文（发现 11） |
| 5 | 场景项 hover 露出"···"按钮，复用现有右键菜单 | 半天 | 重命名/删除可发现（发现 6） |
| 6 | 主题加"跟随系统"档 + iframe `matchMedia` 同步（重写二态 toggle 逻辑） | 1-2 天 | 不再需要手动维护主题（发现 16） |
| 7 | 定义 `--danger` 并归一六种错误红，补上未定义的 fallback | 半天 | 错误色一致（发现 18） |
| 8 | SBS 开关改为带文字胶囊或扩大点击区至 28×28 | 半天 | 可点性 + 可理解性（发现 2） |
| 9 | 两处"显示全部场景上下文"统一 switch 样式 + `role="switch"` | 半天 | 控件一致 + 读屏正确（发现 7） |
| 10 | chat/styles.css 拆除旧 GitHub 主题层（或拆文件隔离） | 1-2 天 | 之后所有样式改动不再踩雷（发现 10） |

> 发现 14（TemperatureGlow 蓝紫光）不在 Top 10：它是"要不要保留这个装饰"的产品决定，不是修 bug。我的判断是换成 accent 色或删除，但值得你先在暗色下看一次再定。
