/** Placement contains presentation only. It never accepts a scene name or type. */
export type ContentPlacement = { view: string; id?: string } | null;
export type ChatPlacement = {
  mode: "docked" | "edge" | "floating";
  side: "left" | "right";
  width: number;
  floating: { x: number; y: number; width: number; height: number };
};
export type Placement = { version: 1; content: ContentPlacement; chat: ChatPlacement };
export const PLACEMENT_STORAGE = "beings:scene-placements:v1";

export function defaultPlacement(): Placement {
  return { version: 1, content: null, chat: { mode: "docked", side: "right", width: 420,
    floating: { x: 1, y: 0, width: 420, height: 560 } } };
}
const clamp = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function readPlacement(value: unknown): Placement {
  const initial = defaultPlacement();
  if (!value || typeof value !== "object") return initial;
  const raw = value as Partial<Placement>;
  if (raw.version !== 1) return initial;
  const chat = raw.chat;
  return { version: 1,
    content: raw.content && typeof raw.content.view === "string"
      ? { view: raw.content.view, ...(typeof raw.content.id === "string" ? { id: raw.content.id } : {}) } : null,
    chat: { mode: chat?.mode === "floating" || chat?.mode === "edge" ? chat.mode : "docked",
      side: chat?.side === "left" ? "left" : "right", width: clamp(chat?.width, 420, 280, 960),
      floating: { x: clamp(chat?.floating?.x, 1, 0, 1), y: clamp(chat?.floating?.y, 0, 0, 1),
        width: clamp(chat?.floating?.width, 420, 280, 960), height: clamp(chat?.floating?.height, 560, 240, 1200) } } };
}

export type PlacementStorage = Pick<Storage, "getItem" | "setItem">;
/** Keys isolate endpoints, Beings and conversation IDs, never conversation labels. */
export function placementKey(endpoint: string, being: string, sceneId: string): string {
  return JSON.stringify([endpoint, being, sceneId]);
}
export class PlacementStore {
  private values: Record<string, Placement> = {};
  constructor(private storage?: PlacementStorage) {
    try {
      const saved = JSON.parse(storage?.getItem(PLACEMENT_STORAGE) || "null");
      if (saved?.version === 1 && saved.placements && typeof saved.placements === "object")
        this.values = Object.fromEntries(Object.entries(saved.placements).map(([key, value]) => [key, readPlacement(value)]));
    } catch { /* Storage is optional; the in-memory layout remains usable. */ }
  }
  get(key: string): Placement { return readPlacement(this.values[key]); }
  /** Called only for a human navigation/placement action, never on snapshot activation. */
  put(key: string, placement: Placement): boolean {
    this.values[key] = readPlacement(placement);
    try { this.storage?.setItem(PLACEMENT_STORAGE, JSON.stringify({ version: 1, placements: this.values })); return true; }
    catch { return false; }
  }
}

export type PanelRect = { x: number; y: number; width: number; height: number };
export function floatingRect(chat: ChatPlacement, width: number, height: number): PanelRect {
  const w = Math.min(chat.floating.width, Math.max(0, width - 16));
  const h = Math.min(chat.floating.height, Math.max(0, height - 16));
  return { x: 8 + Math.max(0, width - w - 16) * chat.floating.x,
    y: 8 + Math.max(0, height - h - 16) * chat.floating.y, width: w, height: h };
}
export function dockWidth(preferred: number, available: number): number {
  return Math.max(0, Math.min(preferred, Math.max(280, available - 280)));
}

export function resizeFloating(chat: ChatPlacement, width: number, height: number, available: { width: number; height: number }): ChatPlacement["floating"] {
  const origin = floatingRect(chat, available.width, available.height);
  const next = { ...chat.floating, width: clamp(width, origin.width, 280, 960), height: clamp(height, origin.height, 240, 1200) };
  const resolved = floatingRect({ ...chat, floating: next }, available.width, available.height);
  // Resizing the lower-right grip holds the upper-left corner in place.
  next.x = Math.max(0, Math.min(1, (origin.x - 8) / Math.max(1, available.width - resolved.width - 16)));
  next.y = Math.max(0, Math.min(1, (origin.y - 8) / Math.max(1, available.height - resolved.height - 16)));
  return next;
}

/** Native WebContentsView is above DOM. Keep its viewport clear of a floating DOM panel. */
export function unobscuredRect(view: PanelRect, cover?: PanelRect): PanelRect {
  if (!cover || cover.x >= view.x + view.width || cover.x + cover.width <= view.x ||
      cover.y >= view.y + view.height || cover.y + cover.height <= view.y) return view;
  const choices = [
    { ...view, width: Math.max(0, cover.x - view.x) },
    { ...view, x: cover.x + cover.width, width: Math.max(0, view.x + view.width - cover.x - cover.width) },
    { ...view, height: Math.max(0, cover.y - view.y) },
    { ...view, y: cover.y + cover.height, height: Math.max(0, view.y + view.height - cover.y - cover.height) },
  ];
  return choices.sort((a, b) => b.width * b.height - a.width * a.height)[0];
}
