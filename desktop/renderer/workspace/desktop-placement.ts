import { defaultPlacement, PlacementStore, readPlacement, type ChatPlacement, type ContentPlacement, type PlacementStorage } from "./placement";

export type PanelId = "chat" | "content";
export type DesktopPlacement = {
  version: 2;
  content: ContentPlacement;
  chat: ChatPlacement;
  contentPanel: ChatPlacement;
  focused: PanelId | null;
  stackedRatio: number;
};
export const DESKTOP_PLACEMENT_STORAGE = "beings:window-placements:v2";
export const FAVORITES_STORAGE = "beings:navigation-favorites:v1";
export type NavigationFavorite = { kind: "view" | "scene"; id: string };

export function defaultDesktopPlacement(): DesktopPlacement {
  const original = defaultPlacement();
  return { ...original, version: 2, focused: null, stackedRatio: .5,
    contentPanel: { ...original.chat, side: "left", width: 620,
      floating: { x: 0, y: 0, width: 620, height: 560 } } };
}
export function readDesktopPlacement(value: unknown): DesktopPlacement {
  const initial = defaultDesktopPlacement();
  if (!value || typeof value !== "object") return initial;
  const raw = value as Partial<DesktopPlacement>;
  const legacy = readPlacement({ ...raw, version: 1 });
  const contentPanel = raw.contentPanel
    ? readPlacement({ version: 1, chat: raw.contentPanel }).chat : initial.contentPanel;
  // At least one surface stays docked, even if saved state is damaged.
  if (legacy.chat.mode !== "docked" && contentPanel.mode !== "docked") contentPanel.mode = "docked";
  return { ...legacy, version: 2, contentPanel,
    stackedRatio: typeof raw.stackedRatio === "number" && Number.isFinite(raw.stackedRatio) ? Math.max(.25, Math.min(.75, raw.stackedRatio)) : .5,
    focused: raw.focused === "chat" || raw.focused === "content" ? raw.focused : null };
}

/** A window belongs to a connection. Conversation selection never enters this key. */
export function desktopPlacementKey(endpoint: string, being: string) {
  return JSON.stringify([endpoint, being]);
}

export class DesktopPlacementStore {
  private values: Record<string, DesktopPlacement> = {};
  private legacy: PlacementStore;
  constructor(private storage?: PlacementStorage) {
    this.legacy = new PlacementStore(storage);
    try {
      const saved = JSON.parse(storage?.getItem(DESKTOP_PLACEMENT_STORAGE) || "null");
      if (saved?.version === 2 && saved.placements && typeof saved.placements === "object")
        this.values = Object.fromEntries(Object.entries(saved.placements).map(([key, value]) => [key, readDesktopPlacement(value)]));
    } catch { /* In-memory navigation still works without storage. */ }
  }
  get(key: string, legacySceneKey?: string): DesktopPlacement {
    if (!Object.hasOwn(this.values, key)) {
      const migrated = readDesktopPlacement(legacySceneKey ? this.legacy.get(legacySceneKey) : undefined);
      this.put(key, migrated); // One migration, from the current scene only; never overwrites the old key.
    }
    return readDesktopPlacement(this.values[key]);
  }
  put(key: string, value: DesktopPlacement): boolean {
    this.values[key] = readDesktopPlacement(value);
    try { this.storage?.setItem(DESKTOP_PLACEMENT_STORAGE, JSON.stringify({ version: 2, placements: this.values })); return true; }
    catch { return false; }
  }
}

export class NavigationFavoritesStore {
  private values: Record<string, NavigationFavorite[]> = {};
  constructor(private storage?: PlacementStorage) {
    try {
      const saved = JSON.parse(storage?.getItem(FAVORITES_STORAGE) || "null");
      if (saved?.version === 1 && saved.favorites && typeof saved.favorites === "object")
        for (const [key, value] of Object.entries(saved.favorites)) this.values[key] = this.normalize(value);
    } catch { /* Optional local preference. */ }
  }
  private normalize(value: unknown): NavigationFavorite[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((item): item is NavigationFavorite => {
      if (!item || (item.kind !== "view" && item.kind !== "scene") || typeof item.id !== "string" || !item.id.trim()) return false;
      const key = JSON.stringify([item.kind, item.id]);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).map(({ kind, id }) => ({ kind, id }));
  }
  get(key: string) { return this.normalize(this.values[key]); }
  put(key: string, value: NavigationFavorite[]): boolean {
    this.values[key] = this.normalize(value);
    try { this.storage?.setItem(FAVORITES_STORAGE, JSON.stringify({ version: 1, favorites: this.values })); return true; }
    catch { return false; }
  }
}
