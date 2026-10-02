import { afterEach, expect, it, vi } from "vitest";
import { AppModel } from "../desktop/renderer/app/models/app";
import type { DesktopAPI, Snapshot, TownLiveState, TownResult } from "../desktop/shared/types";

const settle = () => new Promise(resolve => setTimeout(resolve, 0));
afterEach(() => vi.useRealTimers());

function fixture() {
  const live: TownLiveState = { phase: "connected", generation: 1, revision: 1, beingId: "t_PairedTown", display: "Town 身份",
    sync: 1, message: "已连接", versions: { bonfire: 0, mail: 0, firesides: 0 } };
  const api = {
    townAuth: vi.fn(async () => ({ configured: true, beingId: live.beingId })),
    town: vi.fn(async () => ({ ok: true, data: { messages: [{ id: "letter", content: "原消息" }], scrolls: [], kits: [], seeds: [], items: [], rings: [] }, fetchedAt: "2026-09-27" })),
    localKits: vi.fn(async () => ({ kits: [], enabled: true, directory: "/kits" })),
    openBrowser: vi.fn(async () => {}),
    sendTown: vi.fn(async () => ({ ok: true, data: {}, fetchedAt: "2026-09-27" })),
  } as unknown as DesktopAPI;
  const app = new AppModel(api);
  const snapshot: Snapshot = { settings: { being: "持续的伙伴", endpoint: "https://fixture.test", hasToken: true, workspace: "/workspace",
    portalBinary: "/portal", portalName: "local", autoStart: false, allowExec: true, kitsEnabled: true },
    portal: { phase: "stopped", message: "已停止", logs: [] },
    chatScene: { scene_id: "desktop-reading", scene_meta: { scene_label: "一起读书", client: "fixture" } } };
  app.applySnapshot(snapshot);
  app.chatLoading = false;
  app.town.live = live;
  app.post = vi.fn();
  return { app, api, live };
}

it("restores the last column in each group without changing the Being, scene or chat document", async () => {
  const { app } = fixture();
  const source = app.chatSource;
  app.openPlaceGroup("social"); await settle();
  app.town.tab = "inbox"; app.town.search = "Alice"; app.town.offset = 100;
  app.town.readScroll = () => ({ "#town-body": 244 });
  app.openPlaceGroup("reading"); await settle();
  app.navigate("embers"); await settle();
  app.openPlaceGroup("tools"); await settle();
  app.openPlaceGroup("social");
  expect(app.view).toBe("mail");
  expect(app.town).toMatchObject({ tab: "inbox", search: "Alice", offset: 100, pendingScroll: { "#town-body": 244 } });
  app.closePlace(); app.openPlaceGroup("reading");
  expect(app.view).toBe("embers");
  expect(app.chatSource).toBe(source);
  expect(app.snapshot?.chatScene?.scene_id).toBe("desktop-reading");
  expect(app.snapshot?.settings.being).toBe("持续的伙伴");
  expect(app.town.live?.beingId).toBe("t_PairedTown");
  expect(app.post).not.toHaveBeenCalledWith(expect.objectContaining({ type: "beings:session-select" }));
});

it("parks and reopens the browser in the right pane without refreshing the parked reading frame", async () => {
  const { app, api } = fixture();
  app.navigate("mail"); await settle();
  app.town.search = "Alice";
  app.town.readScroll = () => ({ "#town-body": 192 });
  const reads = vi.mocked(api.town).mock.calls.length;
  await app.openBrowser("https://example.com");
  expect(app.browserVisible).toBe(true);
  expect(app.view).toBe("mail");
  app.town.readScroll = () => ({}); // The reading component is unmounted while browsing.
  app.hideBrowser();
  expect(app.browserVisible).toBe(false);
  expect(app.town.search).toBe("Alice");
  expect(app.town.pendingScroll).toEqual({ "#town-body": 192 });
  expect(api.town).toHaveBeenCalledTimes(reads);
  await app.openBrowser();
  app.openPlaceGroup("social");
  expect(app.browserVisible).toBe(false);
  expect(app.view).toBe("mail");
});

it("restores only the manually placed panels for each scene without changing system settings or reloading chat", async () => {
  const { app, api } = fixture();
  const original = structuredClone(app.snapshot!);
  const source = app.chatSource;
  app.navigate("mail"); await settle();
  app.town.search = "Alice";
  app.town.readScroll = () => ({ "#town-body": 244 });
  app.setChatPlacement({ ...app.placement.chat, width: 510, side: "left", mode: "edge" });
  const next = { ...original, chatScene: { scene_id: "another", scene_meta: { scene_label: "阅读", client: "fixture" } } };
  app.applySnapshot(next);
  expect(app.view).toBe("chat");
  expect(app.placement).toMatchObject({ content: null, chat: { side: "right", mode: "docked", width: 420 } });
  app.navigate("mail"); await settle();
  expect(app.town.search).toBe("");
  app.navigate("bonfire"); await settle();
  app.setChatPlacement({ ...app.placement.chat, mode: "floating" });
  app.applySnapshot(original);
  expect(app.view).toBe("mail");
  expect(app.placement.chat).toMatchObject({ mode: "edge", side: "left", width: 510 });
  expect(app.town.search).toBe("Alice");
  expect(app.town.pendingScroll).toEqual({ "#town-body": 244 });
  expect(app.snapshot?.settings).toEqual(original.settings);
  expect(app.chatSource).toBe(source);
  const reads = vi.mocked(api.town).mock.calls.length;
  app.applySnapshot({ ...original, chatScene: { ...original.chatScene!, scene_meta: { ...original.chatScene!.scene_meta, scene_label: "换个名字" } } });
  expect(app.view).toBe("mail");
  expect(app.placement.chat.mode).toBe("edge");
  expect(api.town).toHaveBeenCalledTimes(reads);
  app.applySnapshot(next);
  expect(app.view).toBe("bonfire");
  expect(app.placement.chat.mode).toBe("floating");
});

it("keeps a saved reading panel alongside an explicit quote when chat was collapsed", async () => {
  const { app } = fixture();
  app.navigate("mail"); await settle();
  app.setChatPlacement({ ...app.placement.chat, mode: "edge" });
  app.town.choose({ id: "letter", title: "Alice 的来信", excerpt: "选中的句子", private: true });
  expect(app.placement.chat.mode).toBe("docked");
  expect(app.placement.content?.view).toBe("mail");
  expect(app.view).toBe("mail");
  expect(app.post).not.toHaveBeenCalledWith(expect.objectContaining({ type: "beings:send" }));
});

it("does not restore private reading or reply requirements across a Town identity change", async () => {
  const { app, live } = fixture();
  app.navigate("mail"); await settle();
  app.town.compose(); app.town.content = "旧私信正文"; app.town.replyInstructions = "旧写作要求";
  app.navigate("scrolls"); await settle();
  app.town.receiveLive({ ...live, revision: 2, generation: 2, beingId: "t_AnotherTown" });
  expect(app.town.restoreRemembered("mail")).toBe(false);
  expect(app.town.content).toBe("");
  expect(app.town.replyInstructions).toBe("");
  expect(app.town.sendTarget).toBeUndefined();
  await settle();
});

it("keeps reply bodies and instructions with their recipient when navigating and switching replies", async () => {
  const { app } = fixture();
  app.navigate("mail"); await settle();
  const alice = { id: "a", author: "Alice", recipient: "t_Alice", content: "原文 A", preview: "原文 A" };
  const river = { id: "b", author: "River", recipient: "t_River", content: "原文 B", preview: "原文 B" };
  app.town.compose(alice); app.town.content = "写给 Alice"; app.town.replyInstructions = "要求 A";
  app.navigate("kits"); await settle();
  expect(app.town.sendOpen).toBe(false);
  app.navigate("mail"); app.town.compose(river);
  expect(app.town.content).toBe("");
  app.town.content = "写给 River";
  app.town.compose(alice);
  expect(app.town.content).toBe("写给 Alice");
  expect(app.town.replyInstructions).toBe("要求 A");
  expect(app.town.recipient).toBe("t_Alice");
});

it("sends only the reply body and leaves a newly opened destination alone when sending finishes", async () => {
  const { app, api } = fixture();
  let complete!: (result: TownResult) => void;
  vi.mocked(api.sendTown).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  app.navigate("mail"); await settle();
  app.town.compose({ id: "a", author: "Alice", recipient: "t_Alice", content: "原文", preview: "原文" });
  app.town.content = "发出的正文"; app.town.replyInstructions = "不要把这句当正文发送";
  const sending = app.town.send();
  app.navigate("kits"); await settle();
  const reads = vi.mocked(api.town).mock.calls.length;
  complete({ ok: true, data: {}, fetchedAt: "2026-09-27" }); await sending;
  expect(api.sendTown).toHaveBeenCalledWith({ kind: "dm", recipient: "t_Alice", content: "发出的正文", replyTo: "a" });
  expect(app.view).toBe("kits");
  expect(api.town).toHaveBeenCalledTimes(reads);
  expect(app.town.sendOpen).toBe(false);
});
