import type { ChatScene } from "../desktop/shared/types";

export type Theme = "auto" | "light" | "dark";
export type Draft = { text: string; quote?: boolean };
export type Item = { id: string; kind: string; title: string; content: string; source: string; scene: string; parked: boolean; unread?: boolean };
export type InboxMessage = { id: string; scene: string; summary: string; time: string; content: string; read: boolean };
export type Data = { scenes: ChatScene[]; archived: string[]; objects: Item[]; drafts: Record<string, Draft>; editors: Record<string, string>; inbox: InboxMessage[]; snapshot: Snapshot | null };
export type Snapshot = Omit<Data, "snapshot"> & { activeId: string; home: boolean; time: string };
export type Store = { version: 3; theme: Theme; daily: Data; empty: Data };
export const STORAGE_KEY = "portal-workspace-demo-v3";
export const LEGACY_KEY = "portal-workspace-demo-v1";
export const makeScene = (id: string, title: string): ChatScene => ({ scene_id: id, scene_meta: { client: "workspace-preview", scene_label: title } });
export const titleOf = (scene?: ChatScene) => scene?.scene_meta.scene_label || "未命名场景";
export const sampleReply = "先把日常相处的方式想清楚，\n再决定空间长什么样。";

export function emptyData(): Data {
  return { scenes: [], archived: [], objects: [], drafts: {}, editors: {}, inbox: [], snapshot: null };
}
export function defaultData(): Data {
  return {
    ...emptyData(), scenes: [makeScene("room", "共同工作室"), makeScene("reading", "读到的东西"), makeScene("ideas", "一些没想好的")],
    objects: [
      { id: "room", kind: "草稿", title: "一个共同的工作室", content: "一个共同的工作室\n\n回来时，知道我们上次停在哪里。\n有些东西可以留下，不必在对话里重新翻找。\n没想好的事，也可以先放一放。", source: "共同工作室 · 昨天", scene: "room", parked: false },
      { id: "reading", kind: "摘记", title: "界面，也可以留一点空白", content: "界面，也可以留一点空白\n\n让正在讨论的内容成为中心。工具在需要的时候出现。", source: "读到的东西 · 昨天", scene: "reading", parked: false },
      { id: "space", kind: "想法", title: "它需要一个怎样的房间？", content: "它需要一个怎样的房间？\n\n" + sampleReply, source: "一些没想好的 · 周四", scene: "ideas", parked: true },
    ],
    inbox: [{ id: "reading-note", scene: "reading", summary: "把你提到的留白，整理成了一页摘记。", time: "09:12", content: "你昨天提到，希望工具在需要时再出现。\n\n我把这个想法留成了一页摘记，放在「读到的东西」里。", read: false }],
  };
}
function isRecord(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object" && !Array.isArray(v); }
function validData(v: unknown): v is Data {
  if (!isRecord(v)) return false;
  return Array.isArray(v.scenes) && v.scenes.every(s => isRecord(s) && typeof s.scene_id === "string" && isRecord(s.scene_meta))
    && Array.isArray(v.archived) && v.archived.every(id => typeof id === "string")
    && Array.isArray(v.objects) && v.objects.every(o => isRecord(o) && ["id", "title", "content", "scene"].every(k => typeof o[k] === "string"))
    && isRecord(v.drafts) && Object.values(v.drafts).every(d => isRecord(d) && typeof d.text === "string")
    && isRecord(v.editors) && Object.values(v.editors).every(e => typeof e === "string")
    && Array.isArray(v.inbox) && v.inbox.every(m => isRecord(m) && ["id", "scene", "summary", "time", "content"].every(k => typeof m[k] === "string"));
}
/** Import old preview data without writing or deleting the legacy storage key. */
export function migrateLegacy(value: unknown, fallback: Data): Data {
  if (!isRecord(value) || !Array.isArray(value.objects) || !isRecord(value.drafts)) return fallback;
  const next: Data = { ...structuredClone(fallback), objects: [], drafts: {}, editors: {}, snapshot: null };
  const sceneId = (name: unknown) => {
    const label = typeof name === "string" && name ? name : "共同工作室";
    const known = next.scenes.find(s => titleOf(s) === label);
    if (known) return known.scene_id;
    const id = defaultData().scenes.find(s => titleOf(s) === label)?.scene_id || `imported:${encodeURIComponent(label)}`;
    next.scenes.push(makeScene(id, label)); return id;
  };
  for (const item of value.objects) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.title !== "string" || typeof item.content !== "string") continue;
    next.objects.push({ id: item.id, title: item.title, content: item.content, kind: typeof item.kind === "string" ? item.kind : "便笺",
      source: typeof item.source === "string" ? item.source : "之前的预览", scene: sceneId(item.scene), parked: item.parked === true, unread: item.unread === true });
  }
  for (const [name, draft] of Object.entries(value.drafts)) {
    if (isRecord(draft) && typeof draft.text === "string") next.drafts[sceneId(name)] = { text: draft.text, quote: draft.quote === true };
  }
  if (typeof value.thought === "string" && value.thought) next.editors["new:ideas"] = value.thought;
  if (isRecord(value.snapshot) && Array.isArray(value.snapshot.objects) && isRecord(value.snapshot.drafts)) {
    const old = migrateLegacy({ ...value.snapshot, snapshot: null }, emptyData());
    const selected = sceneId(value.snapshot.scene);
    if (!old.scenes.some(s => s.scene_id === selected)) old.scenes.push(makeScene(selected, typeof value.snapshot.scene === "string" ? value.snapshot.scene : "共同工作室"));
    next.snapshot = { ...old, activeId: selected, home: value.snapshot.view !== "chat", time: typeof value.snapshot.time === "string" ? value.snapshot.time : "上次收工" };
  }
  return next;
}
export function readStore(current: string | null, legacy: string | null): { store: Store; invalid: boolean } {
  const fresh: Store = { version: 3, theme: "auto", daily: defaultData(), empty: emptyData() };
  try {
    if (current) {
      const v: unknown = JSON.parse(current);
      if (isRecord(v) && v.version === 3 && validData(v.daily) && validData(v.empty)) return { store: { ...fresh, daily: v.daily, empty: v.empty, theme: v.theme === "light" || v.theme === "dark" ? v.theme : "auto" }, invalid: false };
      return { store: fresh, invalid: true };
    }
    if (legacy) {
      const v: unknown = JSON.parse(legacy);
      if (!isRecord(v)) return { store: fresh, invalid: true };
      return { store: { ...fresh, daily: migrateLegacy(v.daily, fresh.daily), empty: migrateLegacy(v.empty, fresh.empty), theme: v.theme === "light" || v.theme === "dark" ? v.theme : "auto" }, invalid: false };
    }
  } catch { return { store: fresh, invalid: true }; }
  return { store: fresh, invalid: false };
}
export function takeSnapshot(data: Data, activeId: string, home: boolean, time: string): Snapshot {
  const { snapshot: _old, ...content } = data;
  return { ...structuredClone(content), activeId, home, time };
}
export function restoreSnapshot(data: Data, snapshot: Snapshot): Data {
  if (!validData(snapshot)) throw new Error("这份快照不完整，当前内容已保留。");
  const { activeId: _id, home: _home, time: _time, ...content } = structuredClone(snapshot);
  return { ...content, snapshot: data.snapshot };
}
