import { describe, expect, it } from "vitest";
import { captureMessage, emptyWorkspaceScene, migrateWorkspaceState, visibleWorkspaceScenes, workspaceReducer as reduce, type WorkspaceState, type WorkspaceReference } from "../desktop/renderer/workspace/model";

const mail = { destination: "inbox", resource: "mail-alice" };
const document = { destination: "scrolls", resource: "document" };
const quote: WorkspaceReference = { id: "q1", title: "Alice 的来信", text: "只引用选中的这句话。", resource: "mail-alice" };
function fixture(): WorkspaceState {
  return { version: 3, currentScene: "work", scenes: { work: emptyWorkspaceScene("work", "工作讨论"), daily: emptyWorkspaceScene("daily", "日常聊天") }, drafts: {} };
}

describe("conversation navigation", () => {
  it("browses fixed destinations without changing the current conversation or its composer", () => {
    let state = reduce(fixture(), { type: "draft", scene: "work", text: "我们怎么回复？" });
    state = reduce(state, { type: "open", scene: "work", route: mail });
    state = reduce(state, { type: "navigate", scene: "work", destination: "campfire", resource: "campfire" });
    state = reduce(state, { type: "navigate", scene: "work", destination: "inbox", resource: "inbox" });
    expect(state.currentScene).toBe("work");
    expect(state.scenes.work.draft).toBe("我们怎么回复？");
    expect(state.scenes.work.reading.route).toEqual(mail);
  });
  it("restores each conversation's reading, scroll, draft and quote after a round trip", () => {
    let state = reduce(fixture(), { type: "open", scene: "work", route: mail });
    state = reduce(state, { type: "draft", scene: "work", text: "A 群草稿" });
    state = reduce(state, { type: "quote", scene: "work", reference: quote });
    state = reduce(state, { type: "scroll", scene: "work", resource: "mail-alice", top: 240 });
    state = reduce(state, { type: "switch", scene: "daily" });
    state = reduce(state, { type: "open", scene: "daily", route: document });
    state = reduce(state, { type: "draft", scene: "daily", text: "B 群草稿" });
    state = reduce(state, { type: "switch", scene: "work" });
    expect(state.scenes.work).toMatchObject({ draft: "A 群草稿", references: [quote], reading: { route: mail }, scroll: { "mail-alice": 240 } });
    expect(state.scenes.daily).toMatchObject({ draft: "B 群草稿", reading: { route: document } });
  });
  it("keeps source replies independent from discussion drafts and shared between groups", () => {
    let state = reduce(fixture(), { type: "resource-draft", resource: "mail-alice", text: "写给 Alice 的草稿" });
    state = reduce(state, { type: "draft", scene: "work", text: "问 Being 的话" });
    state = reduce(state, { type: "switch", scene: "daily" });
    state = reduce(state, { type: "open", scene: "daily", route: mail });
    state = reduce(state, { type: "chat-only", scene: "daily" });
    expect(state.drafts["mail-alice"]).toBe("写给 Alice 的草稿");
    expect(state.scenes.work.draft).toBe("问 Being 的话");
    expect(state.scenes.daily.draft).toBe("");
  });
  it("keeps a manually collapsed chat collapsed while browsing, and reopens for an explicit quote", () => {
    let state = reduce(fixture(), { type: "open", scene: "work", route: mail });
    state = reduce(state, { type: "chat-visible", visible: false });
    state = reduce(state, { type: "open", scene: "work", route: document });
    expect((state.scenes[state.currentScene].placement.chat.mode !== "edge")).toBe(false);
    state = reduce(state, { type: "quote", scene: "work", reference: quote });
    expect((state.scenes[state.currentScene].placement.chat.mode !== "edge")).toBe(true);
    expect(state.scenes.work.reading.route).toEqual(document);
    expect(state.scenes.work.messages).toEqual([]);
  });
  it("remembers an explicit collapse even with empty content, and new groups keep their own default", () => {
    let state = reduce(fixture(), { type: "chat-visible", visible: false });
    expect(state.scenes.work.placement.chat.mode).toBe("edge");
    state = reduce(state, { type: "switch", scene: "daily" });
    expect(state.scenes.daily.placement.chat.mode).toBe("docked");
    state = reduce(state, { type: "switch", scene: "work" });
    expect(state.scenes.work.placement.chat.mode).toBe("edge");
    state = reduce(state, { type: "chat-only", scene: "work" });
    expect(state.scenes.work.placement.chat.mode).toBe("edge");
    expect(state.scenes.work.placement.content).toBeNull();
    state = reduce(state, { type: "open", scene: "work", route: mail });
    expect(state.scenes.work.placement.chat.mode).toBe("edge");
  });
  it("swaps only presentation and preserves reading, reply and message target", () => {
    let state = reduce(fixture(), { type: "open", scene: "work", route: mail });
    const scenes = state.scenes;
    state = reduce(state, { type: "swap-chat" });
    expect(state.scenes[state.currentScene].placement.chat.side).toBe("left");
    expect(state.currentScene).toBe("work");
    expect(state.scenes.work.reading).toBe(scenes.work.reading);
    expect(state.scenes.work.messages).toBe(scenes.work.messages);
    expect(state.scenes.daily).toBe(scenes.daily);
  });
  it("can collapse chat beside temporary settings without closing the conversation", () => {
    let state = reduce(fixture(), { type: "draft", scene: "work", text: "设置之前的输入" });
    state = reduce(state, { type: "chat-visible", visible: false, temporaryContent: true });
    expect((state.scenes[state.currentScene].placement.chat.mode !== "edge")).toBe(false);
    expect(state.scenes.work.reading.route).toBeNull();
    state = reduce(state, { type: "chat-only", scene: "work" });
    expect(state.scenes.work.placement.chat.mode).toBe("edge");
    expect(state.scenes.work.draft).toBe("设置之前的输入");
  });
  it("returns through an installation route and forward again without changing the group", () => {
    let state = fixture();
    for (const resource of ["kits", "reader-kit", "local-tools"]) state = reduce(state, { type: "open", scene: "work", route: { destination: "kits", resource } });
    state = reduce(state, { type: "back", scene: "work" });
    expect(state.scenes.work.reading.route?.resource).toBe("reader-kit");
    state = reduce(state, { type: "forward", scene: "work" });
    expect(state.scenes.work.reading.route?.resource).toBe("local-tools");
    expect(state.currentScene).toBe("work");
  });
  it("rejects a selection that belonged to the conversation just left", () => {
    const state = reduce(fixture(), { type: "switch", scene: "daily" });
    expect(reduce(state, { type: "quote", scene: "work", reference: quote })).toBe(state);
  });
  it("freezes selected text and send destination even when source data changes or the group switches", () => {
    const reference = { ...quote };
    let state = reduce(fixture(), { type: "quote", scene: "work", reference });
    reference.text = "更改后的原文";
    expect(state.scenes.work.references[0].text).toBe(quote.text);
    const message = captureMessage(state.scenes.work, "m1");
    state = reduce(state, { type: "switch", scene: "daily" });
    state = reduce(state, { type: "message", scene: "work", message, clearComposer: true });
    expect(state.scenes.work.messages[0].references?.[0].text).toBe(quote.text);
    expect(state.scenes.daily.messages).toHaveLength(0);
    expect(state.scenes.work.references).toHaveLength(0);
  });
  it("removes a reference without clearing the draft, and deduplicates the same selection", () => {
    let state = reduce(fixture(), { type: "draft", scene: "work", text: "已有草稿" });
    state = reduce(state, { type: "quote", scene: "work", reference: quote });
    state = reduce(state, { type: "quote", scene: "work", reference: { ...quote, id: "q2" } });
    expect(state.scenes.work.references).toHaveLength(1);
    state = reduce(state, { type: "remove-reference", scene: "work", id: "q1" });
    expect(state.scenes.work.draft).toBe("已有草稿");
    expect(state.scenes.work.references).toHaveLength(0);
  });
  it("removes a local scene row without losing its history and restores it when bound again", () => {
    let state = reduce(fixture(), { type: "draft", scene: "work", text: "保留" });
    const scene = state.scenes.work;
    state = reduce(state, { type: "hide-scenes", ids: ["work"], fallback: emptyWorkspaceScene("new", "新场景") });
    expect(visibleWorkspaceScenes(state).map(value => value.id)).toEqual(["daily"]);
    expect(state.scenes.work.draft).toBe("保留");
    state = reduce(state, { type: "create", value: scene });
    expect(state.currentScene).toBe("work");
    expect(visibleWorkspaceScenes(state).map(value => value.id)).toContain("work");
  });
  it("migrates old local drafts without carrying over resource tabs or fabricating selected text", () => {
    const old = { currentScene: "work", scenes: { work: { id: "work", title: "工作讨论", draft: "别丢", references: ["mail-alice"], messages: [], tabs: ["mail-alice"], kept: [], layout: { active: "mail-alice", chat: "floating" }, scroll: {} } }, drafts: { "mail-alice": "回信草稿" } };
    const saved = JSON.stringify(old);
    const migrated = migrateWorkspaceState(old, { "mail-alice": "inbox" })!;
    expect(migrated.scenes.work.reading.route).toBeNull();
    expect(migrated.scenes.work.placement.chat.mode).toBe("docked");
    expect(migrated.scenes.work.references[0].text).toBe("");
    expect(migrated.scenes.work.draft).toBe("别丢");
    expect(migrated.drafts["mail-alice"]).toBe("回信草稿");
    expect(JSON.stringify(old)).toBe(saved);
    expect(migrateWorkspaceState(migrated, { "mail-alice": "inbox" })).toEqual(migrated);
  });
});
