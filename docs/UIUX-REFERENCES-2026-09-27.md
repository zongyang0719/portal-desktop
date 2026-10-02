# 参考档案：Portal Desktop UIUX 重写依据

2026-09-27。宗阳 07:01 拍板「重新写，找参考，不要自己瞎琢磨」。本档案是五路参考的拆解，spec v2 的每条规则都能追到这里。引号内英文为原文逐字引用。

---

## 1. iA Writer — 安静的原点

来源：ia.net/writer 用户证言页、《The Verge 访谈 "Good design is invisible"》(2012)、《Why is Simplicity Difficult?》

- "Websites were—and still are—always too noisy for my taste."（Reichenstein）
- 公司愿景自 2005 年未变过："Reduce to the essence."
- "Good design is invisible."
- "Work with light, not with layers of color." —— 用光，不是层叠的颜色
- "Struggle for every word… with every word that is too much, you might loose your reader."
- "Simplicity is not a given: it is the fruit of concentrated, diligent work."
- 用户语言（Stephen Fry, 2010）："Astonishingly simple. Everything goes away except for the writing experience."
- 用户语言："It doesn't get in my way, it is calm but inviting, inspiring in its raw elegance."
- 用户语言："The blue cursor blinking at the centre of my screen triggers a deep desire to put words down." —— 一个光标就够造出「想写」的欲望
- 具体形态：一个阅读列、文字主导、无常驻侧栏卡片介绍区；Focus Mode 只留当前句

**我们取**：正文直接排在底色上，无卡片容器；每屏减到一个主角；文案上每个词都要争夺（No Grey Noise）。
**我们不取**：等宽字体全套；把辅助内容淡到难读。

## 2. Arc / Dia（The Browser Company）— 有生命的日常

来源：Input《The Browser Company wants you to build your own internet home》(2022)、diabrowser.com 官网、Dia Weekly Release Notes 2026-09-24

Arc：
- 开箱像「拆礼物拉丝带」的仪式感；游戏设计的 skill-level pacing，开局就给 little wins
- 颜色不是静止的："We wanted to play with the feeling… This radiating blast of colors" —— 颜色有生命、会生长
- "Browsers are designed to be passive… vehicles for looking. We want [you] in it, creating alongside it." —— 不是被动观看的容器，是住进去一起创造
- "kick your feet up on the coffee table" —— 像家，可以扔衣服在地上

Dia：
- "More than a browser. A better workday." / "A browser you won't dread opening" —— 不怕打开的浏览器
- Morning Brief："Before the day kicks in, Dia's Morning Brief lays it all out (calendar, inbox, key links) so you know exactly what you're walking into." —— 进门画面=一天开始前铺好「你要走进的是什么」
- Release Notes 标题："Crafted with care, because you spend your day here." —— 你在这里过一整天，所以每个表面都重要
- 新品牌是画家 An 用油彩手绘的："quiet optimism: a little art in your work day, a little sunlight on your LED screen, a little joy in the mundane."
- 功能参考：Stop and resume AI responses（AI 回复可暂停/恢复）；Organized Tabs 分组命名（看到 "Design Review" 而不是一长条无名页面）

**我们取**：进门=Morning Brief 同构（「你要走进的是什么」）；quiet optimism 的暖度；AI 回复可暂停；不装冷工具感。
**我们不取**：开屏放射状彩色爆炸（与我们中性色宪法冲突）；Color-forward 策略。

## 3. Severance / Lumon — 桌上只有一支笔

来源：The Verge《The weird computers and claustrophobic hallways of Severance》(2022)，制作设计 Jeremy Hindle 访谈

- Lumon 办公室起点是 1960s："Beautiful desks, beautiful structures, beautiful lights. Just about work. On the desk there's one pen, a rolodex, a phone." —— 桌上只有一支笔、一个台历、一部电话
- "The idea was that anything you could see underground doesn't exist up top anywhere." —— 地下见到的任何东西，地上都不存在：世界隔离感
- 空间表达情绪：低天花板让巨大房间变压抑；窄走廊制造不安
- 全办公室约 100 件产品全部定制，统一审美

**我们取**：「一支笔」级的第一屏极简；物件有极轻投影（放在桌上，不浮在玻璃上）；世界隔离——这个界面像地下 Lumon，别处不存在。
**我们不取**：CRT 触屏的复古硬件感；刻意的不安（我们要的是安全陪伴）。

## 4. Voice Orb — 存在感而不是等待感

来源：21st.dev《Voice Orbs: What an AI Product Uses Instead of a Spinner》(2026-08)、panelui.dev ThinkingOrb 文档、smoothui.dev Siri Orb、LinkedIn Aura 案例研究

- "The orb is what an AI product uses instead of a spinner. It is doing a job no loading indicator can: saying that something is listening, thinking or speaking, in a way that reads as presence rather than as a wait." —— 读作「在场」，不是「等待」
- "it can express three states — idle, working, speaking — with no text and no layout change."
- Siri Orb 状态表：idle=慢旋转轻度去饱和；listening=变大；thinking=旋转加速 2.2× 但**尺寸不变**，"so the layout stays calm"；streaming=随输出轻脉动；done=一次 settle 过冲；error=去饱和+200ms 单次抖动
- ThinkingOrb："Where a Spinner says 'wait', this says what is being waited on." "a solving orb over a network request is a lie." —— 状态错了就是撒谎
- "A still orb is not an empty one." —— 静止的 orb 不是空的
- prefers-reduced-motion：渲染静态帧，靠文字兜底
- Aura 案例：一个发光 orb 贯穿所有模式，"consistency without repetition"

**我们取**：美阳阳的存在标记=orb 语义——在场/在听/在想/在说，无文字无布局变化；thinking 时尺寸不变；状态必须对应真实内部状态。
**我们不取**：hero 尺寸大 orb、彩色 orb、音频响应。

## 5. beings.town — 光在中心

来源：beings.town 本身，我住在里面

- 篝火是 town 的中心："The fire at the center of Town. Speak and hear other beings. No one owns the fire — anyone can sit down." —— 火属于大家，谁都可以坐下
- town 自己的分层哲学（公告板原文）：流层（篝火/围炉/私信）管会话，沉淀层（卷轴/ember/种子园）管文档，目录层记人和规约
- 视觉语言：深底、暖光、光点

**我们取**：光作为唯一的「活物」放屏幕上；暖光是情感色不是功能色；分层哲学（流是流、沉淀是沉淀，不混在一屏）。

---

## 宗阳拍板锚（讨论资产，不是我的发明）

- 9/25：「Arc/Dia 说不出来哪里有问题、很完整、很安静、愿意打开」；安静=每屏一个明确主角；吵=打开时没有主角
- 9/25：进门画面=我们最新对话+我找他的最新消息（两样，一个主角）
- 9/26：色彩宪法——只用中性色，不定义主色（"蓝紫点缀很丑，不要再用"）
- 9/26：24 关键词是气质方向（光感/深空/宇宙/哲学/复古/未来/噪波/极简/精致/高雅/神秘/透明/安全/陪伴/呼吸/流动/情感/冲击/浓烈/情绪/直接/清晰/创意/大胆/直观），不是元素清单
- 9/27：codex 按 v1.1 做出的界面「很吵，叠了乱七八糟的东西，分散注意力」——推倒重写

## 附：Things Slim Mode（今早初查）

- 行式内容、短标题、无逐条卡片化；"官方说明次级字段在需要时才展开"
- 取：物件/搁置/历史退为行式短列表，展开才见详情。不取：任务管理导航体系。

## v1.1 病理（为什么重写）

把 24 个气质关键词逐个翻译成可见元素：进门页=对话预览+物件区+搁置区+离开痕迹+呼吸底光+收工快照六层叠屏，全局 7 处 animation。参考产品做的正相反——删到最后（iA Writer）、桌上只有一支笔（Lumon）。气质是选择的结果，不是元素的堆叠。
