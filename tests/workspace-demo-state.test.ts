import { describe, expect, it } from "vitest";
import { defaultData, emptyData, migrateLegacy, readStore, restoreSnapshot, takeSnapshot } from "../demo/workspace-state";

describe("workspace preview persistence", () => {
  it("imports legacy objects, per-scene drafts, pending notes and snapshot without altering the source", () => {
    const legacy = {
      objects: [{ id:"custom", title:"旧便笺", content:"不能丢的正文", scene:"临时讨论", parked:true }],
      drafts: { "临时讨论": { text:"未发送的中文草稿", quote:true } }, thought:"尚未保存的想法",
      snapshot: { objects:[], drafts:{ "临时讨论": {text:"收工时的草稿"} }, scene:"临时讨论",view:"chat",time:"22:30" },
    };
    const before = JSON.stringify(legacy);
    const next = migrateLegacy(legacy,defaultData());
    const id = next.objects[0].scene;
    expect(next.scenes.find(s=>s.scene_id===id)?.scene_meta.scene_label).toBe("临时讨论");
    expect(next.drafts[id]).toEqual({text:"未发送的中文草稿",quote:true});
    expect(next.editors["new:ideas"]).toBe("尚未保存的想法");
    expect(next.snapshot?.activeId).toBe(id);
    expect(next.snapshot?.drafts[id].text).toBe("收工时的草稿");
    expect(JSON.stringify(legacy)).toBe(before);
  });
  it("keeps the legacy empty fixture empty", () => {
    const next = migrateLegacy({objects:[],drafts:{},thought:""},emptyData());
    expect(next.scenes).toEqual([]);expect(next.objects).toEqual([]);expect(next.inbox).toEqual([]);
  });
  it("restores and undoes a snapshot including unread state and edits, with independent copies", () => {
    const data = defaultData();data.drafts.room={text:"收工前"};
    data.editors.room="未提交的便笺编辑";
    const snapshot=takeSnapshot(data,"room",false,"22:00");data.snapshot=snapshot;
    data.drafts.room.text="收工后";data.inbox[0].read=true;data.archived.push("reading");
    const undo=takeSnapshot(data,"reading",true,"恢复前");
    const restored=restoreSnapshot(data,snapshot);
    expect(restored.drafts.room.text).toBe("收工前");expect(restored.inbox[0].read).toBe(false);
    expect(restored.editors.room).toBe("未提交的便笺编辑");expect(restored.archived).toEqual([]);
    restored.drafts.room.text="恢复后的修改";expect(snapshot.drafts.room.text).toBe("收工前");
    const undone=restoreSnapshot(restored,undo);
    expect(undone.drafts.room.text).toBe("收工后");expect(undone.inbox[0].read).toBe(true);expect(undone.archived).toEqual(["reading"]);
  });
  it("marks malformed current storage invalid rather than replacing it with legacy data", () => {
    const next=readStore('{"version":3,"daily":null}',JSON.stringify({daily:{objects:[],drafts:{}}}));
    expect(next.invalid).toBe(true);expect(next.store.daily.objects.length).toBeGreaterThan(0);
  });
  it("round trips a migrated store and keeps edits separate from saved object content", () => {
    const migrated=readStore(null,JSON.stringify({daily:{objects:[],drafts:{"共同工作室":{text:"旧草稿"}}},empty:{objects:[],drafts:{}},theme:"dark"}));
    migrated.store.daily.editors["new:room"]="编辑中";
    const loaded=readStore(JSON.stringify(migrated.store),null);
    expect(loaded.invalid).toBe(false);expect(loaded.store.theme).toBe("dark");
    expect(loaded.store.daily.drafts.room.text).toBe("旧草稿");expect(loaded.store.daily.editors["new:room"]).toBe("编辑中");
    expect(loaded.store.daily.objects).toEqual([]);
  });
});
