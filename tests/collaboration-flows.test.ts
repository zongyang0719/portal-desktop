import { afterEach, expect, it, vi } from "vitest";
import { TownModel } from "../desktop/renderer/town/models/town";
import { SceneStore } from "../desktop/renderer/shared/models/scene";
import type { DesktopAPI, KitInstallPlan, LocalKit } from "../desktop/shared/types";

afterEach(() => vi.useRealTimers());
function fixture() {
  const local: LocalKit = { name: "reader", directory: "/kits/reader", version: "1.0", description: "读取文档", command: ["reader"], tools: [], compatible: true, eager: false };
  const api = {
    townAuth: async () => ({ configured: true, beingId: 'fixture' }),
    town: async () => ({ ok: true, data: { kits: [], messages: [] }, fetchedAt: "2026-09-27" }),
    localKits: async () => ({ directory: "/kits", enabled: true, kits: [local] }),
    installKit: vi.fn(async () => ({ name: "reader", message: "文件已写入，Portal 将刷新清单。" })),
    discardKit: vi.fn(async () => {}),
  } as unknown as DesktopAPI;
  const scenes = new SceneStore();
  scenes.configure("Being", "https://fixture.test");
  const nav = vi.fn((view: string, id?: string) => { scenes.enter(view as any); model.show(view, id); });
  const choose = vi.fn();
  const model = new TownModel(api, vi.fn(), nav, scenes, choose, vi.fn());
  return { model, nav, scenes, choose, local };
}
it('keeps the selected message visible when adding it to the main conversation', () => {
  const { model, nav, choose, scenes } = fixture();
  model.view = 'mail'; model.tab = 'inbox'; model.visible = true;
  model.search = 'Alice'; model.data = { messages: [{ id: 'letter', content: '讨论这条消息' }] };
  model.readScroll = () => ({ '#town-body': 286 });
  scenes.enter('mail');
  model.choose({ id: 'letter', title: 'Alice 的私信', excerpt: '讨论这条消息', private: true });
  expect(model.view).toBe('mail'); expect(model.search).toBe('Alice');
  expect(nav).not.toHaveBeenCalled(); expect(choose).toHaveBeenCalledOnce();
  model.view = 'kits'; model.tab = 'grove'; model.search = '';
  expect(model.restoreSelection('letter')).toBe(true);
  expect(model.view).toBe('mail'); expect(model.tab).toBe('inbox');
  expect(model.search).toBe('Alice');
  expect(model.data?.messages).toEqual([{ id: 'letter', content: '讨论这条消息' }]);
  expect(model.pendingScroll).toEqual({ '#town-body': 286 });
});
it('leaves installation at its source and returns from the local Kit to the same Grove detail', async () => {
  const { model } = fixture();
  model.view = 'kits'; model.tab = 'grove'; model.tabs.kits = 'grove';
  model.search = 'reader'; model.offset = 24; model.selectedId = 'reader-kit';
  model.detail = { query: { kind: 'kit', id: 'reader-kit' }, fragments: [{ name: 'reader', description: '原详情' }] };
  model.data = { kits: [{ id: 'reader-kit', name: 'reader' }] };
  model.readScroll = () => ({ '.catalog-detail': 180 });
  model.plan = { ticket: 'fixture', name: 'reader', environment: [] } as unknown as KitInstallPlan;
  await model.install();
  expect(model.installResult?.name).toBe('reader');
  expect(model.tab).toBe('grove'); expect(model.selectedId).toBe('reader-kit');
  model.closeInstall();
  await model.showInstalledKit('reader');
  expect(model.tab).toBe('local'); expect(model.localKit?.name).toBe('reader');
  expect(model.returnView).toBe('kits');
  model.returnToSource();
  expect(model.tab).toBe('grove'); expect(model.search).toBe('reader'); expect(model.offset).toBe(24);
  expect(model.detail?.fragments[0].description).toBe('原详情');
  expect(model.pendingScroll).toEqual({ '.catalog-detail': 180 });
});
