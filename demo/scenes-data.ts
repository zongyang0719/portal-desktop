import { BookOpen, BookText, Compass, FileText, Flame, Library, Mail, Sprout, Users, Wrench, ContactRound, Globe, Info, Megaphone } from "lucide-react";
import type { WorkspaceResource } from "../desktop/renderer/workspace/workspace";
import { emptyWorkspaceScene, type WorkspaceState } from "../desktop/renderer/workspace/model";

export const resources: WorkspaceResource[] = [
  { id: "inbox", title: "私信", destination: "inbox", icon: Mail },
  { id: "mail-alice", title: "Alice 的来信", destination: "inbox", icon: Mail },
  { id: "fireside", title: "围炉", destination: "fireside", icon: Users },
  { id: "fireside-reading", title: "阅读小组", destination: "fireside", icon: Users },
  { id: "campfire", title: "篝火", destination: "campfire", icon: Flame },
  { id: "garden", title: "花园", destination: "garden", icon: Sprout },
  { id: "seed-reading", title: "共读前的三个问题", destination: "garden", icon: Sprout },
  { id: "shelf", title: "书架", destination: "shelf", icon: Library },
  { id: "story-weekend", title: "一个没有读完的周末", destination: "shelf", icon: BookOpen },
  { id: "scrolls", title: "卷轴", destination: "scrolls", icon: BookText },
  { id: "shared-space", title: "把阅读留给周末", destination: "scrolls", icon: FileText },
  { id: "scene-notes", title: "关于一起读书的笔记", destination: "scrolls", icon: FileText },
  { id: "kits", title: "工具库", destination: "kits", icon: Wrench },
  { id: "reader-kit", title: "共读工具", destination: "kits", icon: BookOpen },
  { id: "local-tools", title: "本机工具", destination: "kits", icon: Wrench },
  { id: "contacts", title: "通讯录", destination: "contacts", icon: ContactRound },
  { id: "browser", title: "浏览器", destination: "browser", icon: Globe },
  { id: "town", title: "小镇概览", destination: "town", icon: Compass },
  { id: "announcements", title: "公告", destination: "announcements", icon: Megaphone },
  { id: "preview", title: "关于预览", destination: "preview", icon: Info },
];
export const replySuggestion = "Alice，可以呀。我们每周选一小节，各自留下一两个想继续聊的问题，不用赶进度。这个周末就开始？";
export function initialState(): WorkspaceState {
  const work = emptyWorkspaceScene("work", "工作讨论");
  work.messages = [
    { id: "work-human-1", role: "human", text: "Alice 想一起读点东西。我们怎么回？", references: [{ id: "quote-alice", title: "Alice 的来信", text: "不用赶进度，每周选一小节，聊聊真正想继续想下去的问题。", resource: "mail-alice" }] },
    { id: "work-being-1", role: "being", text: "可以呀。你上次说，比起读完一本书，更想有人一起聊聊。\n\n先把节奏留得轻一点：", suggestion: replySuggestion },
  ];
  const daily = emptyWorkspaceScene("daily", "日常聊天");
  daily.messages = [{ id: "daily-human-1", role: "human", text: "今天想慢一点。" }, { id: "daily-being-1", role: "being", text: "好。那就先不安排什么。\n\n窗外天气怎么样？" }];
  const reading = emptyWorkspaceScene("reading", "一起阅读");
  reading.messages = [{ id: "reading-being-1", role: "being", text: "上次你划下了那句“给一个问题多留一点时间”。\n\n这两天还有想起它吗？" }];
  return { version: 3, currentScene: "work", scenes: { work, daily, reading }, drafts: {} };
}
export const documents: Record<string, { subtitle: string; body: string }> = {
  "shared-space": { subtitle: "Alice · 卷轴 · 示例内容", body: "## 把阅读留给周末\n\n小时候，周末的下午总是很长。一本书摊在桌上，看到哪一页都算数，也不觉得非要带走一个结论。\n\n后来读书成了日程表上的一项。还剩多少页、这个月读了几本，反而比书里写了什么更容易想起来。\n\n### 先留一个下午\n\n我想试试，每周只给一本书留一个下午。不规定页数，也不写完整的读书笔记。遇到喜欢的一段，就停一停。\n\n有人一起读的话，先交换各自停下来的地方。也许是同一句，也许根本不是同一章。这些差别反而值得多聊几句。\n\n### 给一个问题多留一点时间\n\n有些问题在第一次读到时没什么感觉。过几天，走在路上，忽然和另一件事连到了一起。\n\n**阅读也许可以慢到，给一个问题多留一点时间。**\n\n不用每次都整理成一个观点。只是记着：这里还有一点没想明白，下次可以从这里继续。\n\n### 下次见面的时候\n\n带一句划下来的话，或一个想问的问题就够了。\n\n如果什么也没准备，也可以说说这周怎么过的。书在那里，并不会跑掉。\n\n周末见。" },
  "scene-notes": { subtitle: "美阳阳 · 卷轴 · 示例内容", body: "## 关于一起读书的笔记\n\n先记下我们已经说好的几件小事。\n\n### 节奏\n\n每周一小节。没有固定页数，读到想停的地方就停。\n\n### 交流\n\n各带一两个问题。先聊彼此感兴趣的地方，不急着总结。\n\n### 留白\n\n忙的时候可以跳过一周。不补作业，也不积攒进度。\n\n### 这周\n\n从 Alice 那篇《把阅读留给周末》开始。我想聊聊：一本书读得慢的时候，究竟在发生什么？" },
  "seed-reading": { subtitle: "Alice · 经验种子 · 示例内容", body: "## 共读前的三个问题\n\n约好一起读书之后，先不用急着定计划。\n\n1. 这一回，你最想从书里得到什么？\n2. 你愿意花多少时间，而不觉得它变成负担？\n3. 下次见面，想聊什么比读完了多少更重要？\n\n### 用过之后\n\n上次的小组先聊了这三个问题，最后只选了一篇短文。大家反而都带着自己的想法来了。" },
  "story-weekend": { subtitle: "Alice · 故事 · 示例内容", body: "## 一个没有读完的周末\n\n我们带了同一本书去咖啡店，最后只读了十几页。\n\n美阳阳停在一段对话前，问：如果两个人对同一句话的理解不一样，还算一起读过了吗？\n\n这个问题让我们聊了很久。后来天暗下来，书还摊在同一页。\n\n回去的路上，我觉得这个下午读到的东西，比那十几页多一些。" },
};
