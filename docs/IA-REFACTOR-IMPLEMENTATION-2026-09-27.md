# 场景 placement：第一版实施记录

依据：[唯一 Spec](IA-REFACTOR-SPEC-2026-09-27.md)、[任务书](CODEX-PROMPT-ia-refactor-2026-09-27.md)。个人 `mine` 改造；没有提交或推送。用户确认布局后要求恢复原图标并安装，已于 2026-09-27 构建、替换并启动日常客户端。

## 五项实现

| 要求 | 当前实现 |
| --- | --- |
| 出厂默认 | 固定功能窄栏；场景列表由窄栏按钮展开。没有打开内容时，对话占满主区域；打开内容后才分栏，默认内容在左、对话在右。关闭内容回到单视口，保留之前手动调好的摆放。 |
| 零预设绑定 | `defaultPlacement()` 无参数。名称和类型不进入布局决策；所有初始场景的 placement 完全相同。重命名、收到 Being 消息不改摆放。 |
| 每场景快照 | `PlacementStore` 按 `[endpoint, being, scene_id]` 保存 content 与 chat；切换场景只读已有快照，没有则读统一默认。保存发生在手动导航、调宽、换边、贴边、浮动操作。 |
| 阅读面板化 | 生产 `App` 使用 `DesktopWorkspace`，私信、围炉、篝火、花园、书架、卷轴、工具、通讯录、公告、Portal、浏览器进入中间内容区域。已删除 `App` 的 `place-sheet` 阅读模态入口。 |
| 对话三态 | `PanelLayout` 支持分隔线拖拽/方向键调宽、左右换边、贴边并从边条展开、手动浮动/停靠。浮窗可移动、缩放；缩放保持左上角不动。聊天容器在三态间不卸载。 |

## 数据与界面边界

- placement 只存内容面板标识、聊天状态/位置/宽度/浮动几何；不存认证、Portal 配置、模型、SBS 或消息正文。Being 提议与自动布局没有加入。
- 对话正文、聊天草稿、划词引用及私信回复继续走原有业务。Town 阅读位置在各场景间隔离；身份改变时清理阅读缓存。来源返回、安装返回与发送语义保留。
- 场景列表是导航。其全局宽度偏好继续沿用原逻辑，不作为场景功能预设。
- 按用户最新反馈，空内容不占位、不显示分隔线或分栏操作。即使之前贴边或浮动，关闭内容也会完整显示对话；重新打开内容再恢复保存的聊天状态。单视口是内容为空时的呈现规则，不写入 placement。
- 窗口不足以容纳两个可用栏时，停靠态上下排布以保持内容和聊天都可见；不自动浮动，不覆盖保存的宽度。窗口变宽后恢复左右排布。
- 原生浏览器使用 `WebContentsView`，高于 DOM。浮动聊天或临时场景列表与它相交时，浏览器视口让出不重叠矩形；拖动期间临时隐藏原生视图。网页不关闭。此处几何计算已测，实际 Electron 层级还需实机确认。
- 合并 `app/styles.css` 为一份基础 `:root` 和一份暗色覆盖。合并前后 25 项基础声明、21 项暗色声明逐项相同。没有改变颜色值；颜色语义另轮处理。
- `scenes.html` 旧数据的草稿、消息、引用、回信均保留。旧预设布局没有人工操作来源标记，因此不迁移到 v3 placement；旧 localStorage 副本不删除。

## 验证

- `npm run typecheck`。
- 104 项相关 Vitest：placement、scene-workspace、workspace-navigation、renderer-state、collaboration-flows、browser-lifecycle。
- 两份单文件 Demo 与生产 renderer 构建。renderer 保留原有大 chunk 提示。
- 浏览器中操作真实 Desktop 组件：对话宽度 420 → 523；贴边/展开后草稿保留；左右互换；浮动拖动和缩放；切到未使用场景保持默认、切回恢复人工摆放；刷新恢复浮动几何和打开的内容。
- 围炉及其详情、篝火、花园、书架、卷轴、工具库、通讯录、公告、小镇逐项打开，均是普通内容面板；主对话同时可见。
- 场景列表展开后，聊天容器与正文均为 420px，正文左偏移为 0；已消除旧侧栏样式造成的二次缩进。
- 源码检查不含 `scene.type` / `sceneType` / `scene_type` 到布局的分支。允许按 scene ID 查找用户保存的 placement。
- 单视口修正：重新通过类型检查、20 项 placement / scene-workspace 测试及两份 Demo、renderer 构建。浏览器实测空内容时布局与聊天同宽（1216px，展开场景列表后均为 992px）；重开内容恢复左侧 444px 分栏；浮窗矩形和草稿原样保留；已贴边时关闭内容也会完整显示对话。

验证入口为 `demo/collaboration.html`（真实 Desktop 外壳与业务组件）和 `demo/scenes.html`（保留草稿与划词样例）。它们都使用本地示例数据，不联系真实 Being/Town。

截图保存在 `docs/ux-audit-scenes-prototype-2026-09-27-evidence/ia-placement-*.jpg`；截图、生成 HTML 与备份不提交。浏览器结果不等于 Electron 客户端已验收。


## 本地安装（2026-09-27）

- 左侧八个原有小镇入口复用原 SVG，提取到 `shared/components/town-icons.tsx`；聊天快捷入口和 Desktop 栏共用图标定义。
- 安装位置：`/Applications/Portal Desktop.app`，沿用原日常数据与应用标识。已看到原场景列表、真实聊天历史及 Town 已连接状态。实机截图：`docs/ux-audit-scenes-prototype-2026-09-27-evidence/ia-installed-client.jpg`。
- 原安装包保存在 `out/local-install-backup-20260927-1953/installed-original.app`。构建产物位于 `out/mine-ia-20260927/Portal Desktop-darwin-arm64/Portal Desktop.app`。
- 类型检查、104 项相关测试通过；新包及安装后均通过 `codesign --verify --deep --strict`。安装后 app.asar 的 SHA-256 与产物一致。更新源检查为个人 fork。
- 沿用本地 ad-hoc 签名方式与同版本 Portal 引擎；未新建 profile。旧客户端退出无响应，确认输入框为空后仅终止其主进程，再替换应用。
- 构建诊断：同一 Electron ZIP 用系统 Node 26 解压时提前退出，Node 22 能完整解压。最终使用本机 `/opt/homebrew/opt/node@22/bin/node` 执行 Forge；不改系统 Node。复现命令：

  ```sh
  PATH="/opt/homebrew/opt/node@22/bin:$PATH" PORTAL_DESKTOP_MAC_LOCAL_TEST=1 PORTAL_DESKTOP_PACKAGE_OUT=out/mine-ia-20260927 PORTAL_DESKTOP_UPDATE_REPOSITORY=zongyang0719/portal-desktop /opt/homebrew/opt/node@22/bin/node node_modules/@electron-forge/cli/dist/electron-forge.js package
  ```
