import { describe, expect, it } from "vitest";
import { defaultPlacement, dockWidth, floatingRect, resizeFloating, PlacementStore, placementKey, readPlacement, unobscuredRect, type PlacementStorage } from "../desktop/renderer/workspace/placement";
import { initialState } from "../demo/scenes-data";
import { emptyWorkspaceScene, migrateWorkspaceState, workspaceReducer } from "../desktop/renderer/workspace/model";

function storage(): PlacementStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}
describe("manual scene placement", () => {
  it("gives every scene and fixture the same unassigned factory layout, independent of labels", () => {
    for (const title of ["工作", "阅读", "coding", "social", "随便起的名字"])
      expect(emptyWorkspaceScene(title, title).placement).toEqual(defaultPlacement());
    for (const scene of Object.values(initialState().scenes)) {
      expect(scene.placement).toEqual(defaultPlacement());
      expect(scene.reading.route).toBeNull();
    }
  });
  it("persists human placement independently by scene, Being and endpoint", () => {
    const disk = storage(), store = new PlacementStore(disk);
    const key = placementKey("https://a", "Being", "one");
    const placed = defaultPlacement();
    placed.content = { view: "mail" };
    placed.chat = { ...placed.chat, side: "left", width: 512, mode: "floating", floating: { x: .25, y: .8, width: 400, height: 460 } };
    store.put(key, placed);
    const restored = new PlacementStore(disk);
    expect(restored.get(key)).toEqual(placed);
    for (const other of [placementKey("https://a", "Being", "two"), placementKey("https://b", "Being", "one"), placementKey("https://a", "Other", "one")])
      expect(restored.get(other)).toEqual(defaultPlacement());
    restored.get(key).chat.width = 999;
    expect(restored.get(key).chat.width).toBe(512);
  });
  it("survives unavailable/corrupt storage and clamps corrupt geometry", () => {
    const broken = { getItem: () => "{", setItem: () => { throw new Error("denied"); } };
    const store = new PlacementStore(broken), placement = defaultPlacement();
    placement.chat.mode = "edge";
    expect(store.put("one", placement)).toBe(false);
    expect(store.get("one")).toEqual(placement);
    expect(readPlacement({ version: 1, chat: { width: Infinity, mode: "suggested", floating: { x: -5, y: 90 } } }).chat)
      .toMatchObject({ width: 420, mode: "docked", floating: { x: 0, y: 1 } });
  });
  it("renaming or receiving a Being message never changes placement; refresh retains manual geometry", () => {
    let state = initialState();
    state = workspaceReducer(state, { type: "open", scene: "work", route: { destination: "inbox", resource: "mail" } });
    state = workspaceReducer(state, { type: "chat-placement", scene: "work", chat: { ...state.scenes.work.placement.chat, width: 530, side: "left", mode: "edge" } });
    const placement = state.scenes.work.placement;
    state = workspaceReducer(state, { type: "rename", scene: "work", title: "读书" });
    state = workspaceReducer(state, { type: "message", scene: "work", message: { id: "m", role: "being", text: "建议你把聊天浮起来" } });
    expect(state.scenes.work.placement).toEqual(placement);
    const restored = migrateWorkspaceState(JSON.parse(JSON.stringify(state)), { mail: "inbox" })!;
    expect(restored.scenes.work.placement).toEqual(placement);
    expect(restored.scenes.daily.placement).toEqual(defaultPlacement());
  });
  it("fits a smaller window without rewriting the preferred placement", () => {
    const chat = defaultPlacement().chat;
    chat.width = 600;
    expect(dockWidth(chat.width, 800)).toBe(520);
    expect(dockWidth(chat.width, 1200)).toBe(600);
    expect(floatingRect(chat, 340, 380)).toEqual({ x: 8, y: 8, width: 324, height: 364 });
    expect(chat.width).toBe(600);
  });
  it("prevents a native browser view covering floating chat without closing its page", () => {
    const view = { x: 100, y: 60, width: 1100, height: 700 };
    expect(unobscuredRect(view, { x: 770, y: 80, width: 420, height: 560 })).toEqual({ ...view, width: 670 });
    expect(unobscuredRect(view, { x: 10, y: 60, width: 60, height: 700 })).toEqual(view);
  });
  it("keeps the floating panel's upper-left corner anchored while resizing the opposite grip", () => {
    const chat = defaultPlacement().chat, available = { width: 1200, height: 800 };
    chat.floating = { x: .4, y: .3, width: 400, height: 480 };
    const before = floatingRect(chat, available.width, available.height);
    const after = floatingRect({ ...chat, floating: resizeFloating(chat, 480, 400, available) }, available.width, available.height);
    expect(after.x).toBeCloseTo(before.x); expect(after.y).toBeCloseTo(before.y);
    expect(after.width).toBe(480); expect(after.height).toBe(400);
  });
});
