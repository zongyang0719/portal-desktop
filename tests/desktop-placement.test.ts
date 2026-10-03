import { describe, expect, it } from "vitest";
import { defaultPlacement, placementKey, PlacementStore, PLACEMENT_STORAGE, type PlacementStorage } from "../desktop/renderer/workspace/placement";
import { defaultDesktopPlacement, desktopPlacementKey, DesktopPlacementStore, NavigationFavoritesStore, readDesktopPlacement, FAVORITES_STORAGE } from "../desktop/renderer/workspace/desktop-placement";

function storage(): PlacementStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}
describe("connection-owned window layout", () => {
  it("migrates the active legacy scene once and leaves the original data recoverable", () => {
    const disk = storage(), legacy = new PlacementStore(disk);
    const first = defaultPlacement(), second = defaultPlacement();
    first.content = { view: "mail", id: "alice" }; first.chat.width = 518; first.chat.side = "left";
    second.content = { view: "scrolls" };
    legacy.put(placementKey("https://a", "one", "first"), first);
    legacy.put(placementKey("https://a", "one", "second"), second);
    const original = disk.getItem(PLACEMENT_STORAGE);
    const store = new DesktopPlacementStore(disk), key = desktopPlacementKey("https://a", "one");
    const migrated = store.get(key, placementKey("https://a", "one", "first"));
    expect(migrated).toMatchObject({ version: 2, content: first.content, chat: first.chat });
    expect(new DesktopPlacementStore(disk).get(key, placementKey("https://a", "one", "second"))).toEqual(migrated);
    expect(disk.getItem(PLACEMENT_STORAGE)).toBe(original);
  });
  it("persists the two surfaces and returns detached copies without leaking to another connection", () => {
    const disk = storage(), store = new DesktopPlacementStore(disk), key = desktopPlacementKey("a", "one");
    const value = defaultDesktopPlacement(); value.content = { view: "firesides" }; value.contentPanel.mode = "floating"; value.focused = "content";
    expect(store.put(key, value)).toBe(true);
    const copy = store.get(key); copy.contentPanel.width = 333;
    expect(new DesktopPlacementStore(disk).get(key)).toEqual(value);
    expect(store.get(desktopPlacementKey("b", "one"))).toEqual(defaultDesktopPlacement());
    expect(store.get(desktopPlacementKey("a", "two"))).toEqual(defaultDesktopPlacement());
  });
  it("clamps damaged layouts and stays usable when saving is unavailable", () => {
    const disk = { getItem: () => "{", setItem: () => { throw new Error("denied"); } };
    const store = new DesktopPlacementStore(disk), value = defaultDesktopPlacement(); value.chat.mode = "edge";
    expect(store.put("connection", value)).toBe(false);
    expect(store.get("connection")).toEqual(value);
    expect(readDesktopPlacement({ chat: { mode: "floating", width: Infinity }, contentPanel: { mode: "floating", floating: { x: -8 } }, focused: "missing", stackedRatio: Infinity }))
      .toMatchObject({ chat: { mode: "floating", width: 420 }, contentPanel: { mode: "docked", floating: { x: 0 } }, focused: null, stackedRatio: .5 });
    expect(readDesktopPlacement({ chat: { mode: "edge" }, contentPanel: { mode: "edge" } }))
      .toMatchObject({ chat: { mode: "edge" }, contentPanel: { mode: "docked" } });
  });
});
describe("navigation favorites", () => {
  it("persists mixed shortcuts, deduplicates them, and rejects malformed values", () => {
    const disk = storage();
    disk.setItem(FAVORITES_STORAGE, JSON.stringify({ version: 1, favorites: { one: [null, { kind: "scene", id: "s1" }, { kind: "scene", id: "s1" }, { kind: "view", id: "mail" }, { kind: "unknown", id: "x" }] } }));
    const store = new NavigationFavoritesStore(disk);
    expect(store.get("one")).toEqual([{ kind: "scene", id: "s1" }, { kind: "view", id: "mail" }]);
    store.put("one", [{ kind: "view", id: "browser" }]);
    expect(new NavigationFavoritesStore(disk).get("one")).toEqual([{ kind: "view", id: "browser" }]);
    expect(store.get("two")).toEqual([]);
  });
});
