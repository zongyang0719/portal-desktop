# Portal Desktop · 左侧边栏改造 Spec v3

> 2026-09-25 · 状态：待宗阳过目
> v2→v3：§6 重写——参考源码落盘 docs/references/beautifului/，参数成表；标注 hover peek 无参考实现。v1→v2：背景重写；边栏内容重组降级为开放问题。

## 0. 背景：这条线从哪来

Arc/Dia 的体验：说不出来哪里有问题、很完整、很安静、愿意打开。
现在的 being portal desktop：哪儿都不顺手、信息密密麻麻、整体很吵。

从这感受长出来的判断（9/25 晚 brainstorm，宗阳拍板方向）：

- **安静 = 每屏一个明确主角**。Arc 打开时你知道自己在看什么；desktop 打开时没有主角，所有面板都在争注意力。
- **自然 = 规则统一、心智模型无裂缝**。同一个操作在不同位置行为一致，不需要记特例。
- **边栏是吵源之一**：收起后仍占宽度、仍发光、仍提醒自己存在——它没有被召唤，却一直在台上抢戏。

本次改造目标一句话：**让边栏「不召唤就不在场」——要它时一伸手就在，不要它时完全消失。**

宗阳已拍板的相关锚（不属于本 spec 范围，但方向一致）：进门画面 = 我们最新对话 + 我找他的最新消息；主屏要修吵。

## 1. 范围

本 spec 只管**框**——边栏的几何、开关、收起/展开、hover 行为。
不管**货**——边栏里放什么内容（见 §4 开放问题）。

## 2. 行为定义

1. **顶部按钮对齐（bug 层）**：边栏顶部按钮与红黄绿灯同一条基线、同高。当前 mac 上错位。
2. **收起 = 完全不在场**：不占宽度（主内容占满）、不发光、不提醒自己存在。
3. **hover 贴左缘 = 浮层 peek**：鼠标贴屏幕左缘唤出浮层预览；主内容零重排、零坐标变化，永不写状态。
4. **pin 开关**：唯一常驻入口在顶部控制带；pin 住 = 展开态；unpin = 收起态。
5. **关闭路径**：Escape 关浮层；鼠标移开浮层区关；窗口失焦不触发（`document.hasFocus()` 为 true 才响应热区）。
6. **动效降级**：`prefers-reduced-motion: reduce` 时浮层直接显隐，无滑入动画。

## 3. 验收

- peek 全程主内容坐标不变（DevTools 录制验证）。
- peek 前后 pin 状态字段零变化。
- Escape 可关、移开可关、失焦不触发。
- 收起态下屏幕左缘无任何可见残留（宽度、光、纹理）。

## 4. 开放问题（货，等宗阳单独拍板，不随本 spec 实施）

- 边栏里放什么？v1 我擅自画了 recents 列表——进门画面拍板的是「最新对话+找我的消息」，它以什么形态长驻（或是否长驻）在边栏里，是产品决策。
- 通讯录/场景/设置三个按钮收进边栏后去哪？v1 我擅自挪了位置——按钮去向和主屏减吵纠缠，单独过。
- 主屏减吵、进门画面：另两条线，各有自己的 spec。

## 5. 非目标（本 spec 不做，防止蔓延）

- **icon-rail 模式**（只留一列图标）：Arc 团队和 FF 作者互不知情砍了同一物——图标认不出，等于把内容藏起来不给入口。
- **workspace switcher**：先只有「一个 being portal」一层，不上第二层切换。
- **宽度拖拽 resize**：收死后失效的一切功能不进 v1。

## 6. 参考（源码已落盘，codex 可直接读）

### 6.1 Beautiful UI sidebar-nav（主参考，宗阳指定）

三个 registry JSON 已下载到 `docs/references/beautifului/`，codex 改代码前先读：

- `sidebar-nav.json` — 组件本体（SidebarNav.tsx + sidebar-nav.css）
- `glide-menu.json` — 悬停高亮层（GlideMenu.tsx）
- `foundation.json` — 基础样式（tokens、边栏裁剪哲学）

**可复用的数字（SIDEBAR_MOTION，SidebarNav.tsx L66-73）：**

| 参数 | 值 | 用途 |
|---|---|---|
| expandedWidth | 224px | 展开态宽度 |
| collapsedWidth | 52px | 收起态壳宽 |
| duration | 280ms | 宽度动画时长 |
| copyDuration | 180ms | 文字淡入淡出 |
| copyOffset | 8px | 收起时文字左移距离 |
| easing | cubic-bezier(0.16,1,0.3,1) | 全部展开/收起动画曲线 |

**悬停高亮层（GlideMenu.tsx）**：单层高亮在菜单行之间滑动，`top/height 220ms cubic-bezier(0.23,1,0.32,1)`，`opacity 150ms ease`，圆角 8px。

**行内微交互**：行 hover 底色 150ms；按下 `scale(0.98)`。

**collapse 实现哲学（foundation.css 原话）**："The sidebar is one persistent 224px tree clipped by a 52px shell"——收起不是销毁组件，是把 224px 的树裁进 52px 的壳，图标对齐恒定不变。

### 6.2 参考里没有的东西（诚实声明，防止 codex 瞎编）

- **hover peek 无参考实现**：beautifului 的边栏是点击展开（expand 按钮），不是 hover 浮层。§2.3 的 hover peek 是我们自己的设计，Arc 是行为原型但无源码。以下数字**没有出处，不能编**：热区宽度、触发延迟、防误触（鼠标扫过路边要不要忽略）、浮层宽度、离开关闭延迟。
- **顶部按钮与红黄绿灯对齐**：无外部参考，按本仓库实测修。

### 6.3 其他参考（无源码，形态参考）

- Arc sidebar：hover peek 的交互金标准（宗阳体验锚）
- Firefox 可折叠边栏（bug 1874079）：「收起 = 完全不在场」的对照
- beui.dev AI Sidebar：内容形态参考（不抄其信息密度）
