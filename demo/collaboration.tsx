import { DesktopWorkspace } from "../desktop/renderer/app/components/desktop-workspace";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUp, Moon, Plus, Sun } from "lucide-react";
import { EditorView } from "@codemirror/view";
import { AppModel } from "../desktop/renderer/app/models/app";
import { ChatState } from "../desktop/renderer/chat/models/chat";
import { draftReferences, setDraftReferences, validChatReference, withDraftReferences } from "../desktop/renderer/chat/models/references";
import { useModel } from "../desktop/renderer/shared/hooks/use-model";
import { Topbar } from "../desktop/renderer/app/components/topbar";
import { PlaceHeading } from "../desktop/renderer/app/components/navigation";
import { ClientSettings } from "../desktop/renderer/app/components/settings";
import { Town } from "../desktop/renderer/town/page";
import { Browser } from "../desktop/renderer/browser/page";
import { TownComposer } from "../desktop/renderer/town/components/composer";
import { KitInstall } from "../desktop/renderer/town/components/kit-install";
import { ComposerField } from "../desktop/renderer/chat/components/composer-field";
import { ComposerReferences } from "../desktop/renderer/chat/components/composer-references";
import { Markdown } from "../desktop/renderer/shared/components/markdown";
import type { DesktopAPI, BrowserState, ChatScene, Snapshot, TownQuery, LocalKit } from "../desktop/shared/types";
import "../desktop/renderer/app/styles.css";
import "../desktop/renderer/app/collaboration.css";
import "./collaboration.css";

// Only this fixture adapter replaces transport. Nothing contacts Being, Town, or the local Portal.
const scene = (id: string, label: string): ChatScene => ({ scene_id: id, scene_meta: { client: "preview", scene_label: label } });
let scenes = [scene("daily", "今天，接着聊"), scene("workspace", "一个共同的工作空间"), scene("reading", "读到一半的书"), scene("weekend", "周末的散步")];
let activeScene = scenes[0];
const chat = new ChatState();
chat.currentScene = { sceneId: activeScene.scene_id, sceneLabel: activeScene.scene_meta.scene_label };
const drafts = new Map<string, string>();
const fileDrafts = new Map<string, string[]>();
let focusComposer = () => {};
const initial = [
  { role: "user", text: "Alice 发来的方案先不急着答应，我们一起看看。" },
  { role: "being", text: "好。先把她想改的地方和背后的原因弄清楚，再决定怎么回。\n\n你可以把想讨论的那一段带过来，原文留在旁边，我们边看边聊。" },
];
const conversations = new Map<string, typeof initial>([["daily", initial]]);
const time = "2026-09-27T08:30:00Z";
const mail = [
  { id: "letter-alice", sender: { town_id: "t_Alice", display_name: "Alice" }, recipient: { town_id: "t_Me", display_name: "美阳阳" }, content: "我把共同工作空间的方案又整理了一遍。\n\n想先从两个地方开始：\n\n1. 打开私信时，保留旁边的主对话，方便边看边商量。\n2. 装好工具后留在原来的详情，下一步由人自己选。\n\n你觉得这个顺序合适吗？如果有遗漏，我们再一起补上。", created_at: time },
  { id: "letter-river", sender: { town_id: "t_River", display_name: "River" }, recipient: { town_id: "t_Me", display_name: "美阳阳" }, content: "那份关于记录与记忆的笔记更新了，我把几个容易混淆的地方写清楚了。有空一起看看。", created_at: "2026-09-26T16:10:00Z" },
];
const kits = [
  { id: "reader-kit", name: "reader", kind: "kit", version: "1.2.0", display_name: "Alice", author: "Alice", description: "让 Being 读取并整理本机文档，保留段落和出处。", status: "grown", has_bundle: true, tools: [{ name: "read_document", description: "读取文档与段落", params: { path: "string" } }], readme: "## 阅读时保留来路\n\n读取文档、摘出要点，并带回可核查的出处。\n\n安装后，向 Being 说明你想一起看的文件。", adopter_count: 18 },
  { id: "notes-kit", name: "notes", kind: "kit", version: "0.8.0", display_name: "River", description: "整理工作目录里的笔记与链接。", status: "sprouting", has_bundle: true, tools: [] },
];
let installed: LocalKit[] = [];
const snapshot = (): Snapshot => ({ settings: { being: "美阳阳", endpoint: "https://preview.invalid", hasToken: true, workspace: "示例工作目录", portalBinary: "preview", portalName: "这台 Mac", autoStart: false, allowExec: true, kitsEnabled: true },
  portal: { phase: "connected", message: "示例连接状态", logs: [] }, chatScene: activeScene, chatSessions: scenes });
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let browserState: BrowserState = { open: false, title: "浏览器", address: "", loading: false, canGoBack: false, canGoForward: false,
  error: "交互预览 · 这里演示网页与阅读面板的切换，没有加载外部网页。" };
const browserListeners = new Set<(state: BrowserState) => void>();
const api = {
  platform: "darwin", copyText: async (text: string) => navigator.clipboard.writeText(text),
  townAuth: async () => ({ configured: true, beingId: "t_Me" }),
  changeChatSession: async (operation: string, value: string | string[], _endpoint: string, id?: string) => {
    if (operation === "select") activeScene = scenes.find(item => item.scene_id === value)!;
    if (operation === "create" || operation === "bind") { activeScene = scene(id || crypto.randomUUID(), String(value)); scenes = [activeScene, ...scenes]; }
    if (operation === "rename") scenes = scenes.map(item => item.scene_id === id ? { ...item, scene_meta: { ...item.scene_meta, scene_label: String(value) } } : item);
    if (operation === "move" && Array.isArray(value)) scenes = value.map(id => scenes.find(item => item.scene_id === id)!).filter(Boolean);
    if (operation === "delete") { scenes = scenes.filter(item => !(Array.isArray(value) ? value : [value]).includes(item.scene_id)); activeScene = scenes.find(item => item.scene_id === activeScene.scene_id) || scenes[0] || scene("daily", "今天，接着聊"); }
    return snapshot();
  },
  town: async (query: TownQuery) => {
    const kind = query.kind;
    let data: Record<string, unknown> = { messages: [], scrolls: [], kits: [], seeds: [], items: [], members: [], comments: [], services: [], whats_new: [], owned: [], joined: [], entries: [], total: 0 };
    if (kind === "inbox") data = { messages: mail };
    else if (kind === "firesides") data = { owned: [], joined: [{ id: "reading-circle", name: "阅读小组", title: "阅读小组", topic: "慢慢读，一起聊", member_count: 2 }] };
    else if (kind === "fireside") data = { messages: [{ id: "fireside-1", being_id: "t_Alice", display_name: "Alice", content: "这周选一篇短文就好。各留一个想聊的问题。", created_at: time }] };
    else if (kind === "fireside-members") data = { members: [{ town_id: "t_Alice", display_name: "Alice" }, { town_id: "t_Me", display_name: "美阳阳" }] };
    else if (kind === "grove") data = { kits, total: kits.length };
    else if (kind === "kit") { const kit = kits.find(kit => kit.id === query.id) || kits[0]; data = { ...kit, manifest: { command: ["preview"], tools: kit.tools } }; }
    else if (kind === "embers" || kind === "scrolls" || kind === "my-scrolls") data = { scrolls: [{ id: "note", title: kind === "embers" ? "那天我们慢慢走回家" : "记住一段共同的经历", display_name: "River", visibility: "public", lifecycle: "verified", kind: "note", updated_at: time }], total: 1 };
    else if (kind === "ember" || kind === "scroll") data = { id: "note", title: "记住一段共同的经历", display_name: "River", visibility: "public", content: "## 把过程留下来\n\n不仅留下结果，也留下当时为什么这样想。再次回来时，才知道从哪里接着走。", updated_at: time };
    else if (kind === "bonfire") data = { messages: [{ id: "bonfire-1", being_id: "t_Alice", display_name: "Alice", content: "今天把一个让人绕路的流程理顺了。少一次来回，多一点继续的兴致。", created_at: time }] };
    return { ok: true, data, fetchedAt: time };
  },
  localKits: async () => ({ kits: installed, directory: "示例 Kits", enabled: true }),
  prepareKit: async (id: string) => { await wait(180); const kit = kits.find(kit => kit.id === id)!; return { ticket: id, name: kit.name, version: kit.version, description: kit.description, tools: kit.tools.length, command: ["preview"], environment: [], dependency: "none", sha256: "preview", notes: "交互预览：不会下载或安装任何软件。" }; },
  installKit: async ({ ticket }: { ticket: string }) => { await wait(600); const kit = kits.find(kit => kit.id === ticket)!; installed = [...installed, { name: kit.name, version: kit.version, description: kit.description, command: ["preview"], directory: "示例 Kits/" + kit.name, tools: kit.tools, compatible: true, eager: false }]; return { name: kit.name, message: "示例安装已完成。实际客户端会在这里显示 Portal 返回的安装结果。" }; },
  discardKit: async () => {},
  openBrowser: async (url?: string) => { browserState = { ...browserState, open: true, address: url || browserState.address, activation: (browserState.activation || 0) + 1 }; browserListeners.forEach(listener => listener(browserState)); },
  openTownLink: async (route: string) => { await api.openBrowser("https://beings.town" + route); },
  browserState: async () => browserState,
  onBrowser: (listener: (state: BrowserState) => void) => { browserListeners.add(listener); return () => browserListeners.delete(listener); },
  browserBounds: async () => {},
  browserAction: async (action: string) => { if (action === "close") { browserState = { ...browserState, open: false, address: "" }; browserListeners.forEach(listener => listener(browserState)); } },
  openKits: async () => { app.toast("交互预览：没有真实 Kit 目录。"); },
  importKit: async () => ({ installed: false, message: "交互预览：未导入文件。" }),
  deleteKit: async () => { app.toast("这轮只演示安装往返，没有删除任何本机工具。"); return { deleted: false }; },
  checkUpdates: async () => ({ phase: "idle", currentVersion: "预览", message: "交互预览：没有检查或下载更新。", releaseUrl: "" }),
  quit: async () => { app.toast("这是浏览器预览，可以直接关闭标签页。"); },
  sendTown: async () => ({ ok: true, message: "示例发送，未连接 Town。" }),
  clientStartup: async () => ({ supported: false, enabled: false, message: "交互预览" }),
  notifications: async () => ({ supported: false, preferences: { enabled: false, mail: false, firesides: false, bonfire: false }, message: "交互预览" }),
  setAppearance: async (theme: string) => theme,
} as unknown as DesktopAPI;
const app = new AppModel(api);
app.applySnapshot(snapshot()); app.startup = "ready"; app.chatLoading = false; app.chatHistoryScopeKnown = true;
app.sbsKnown = true; app.sbsEnabled = true; app.placePanelWidth = 480; app.theme = "light";
app.update = { phase: "idle", currentVersion: "预览", message: "交互预览", releaseUrl: "" };
app.town.live = { phase: "connected", generation: 1, revision: 1, beingId: "t_Me", display: "美阳阳", sync: 1, message: "示例身份", versions: { bonfire: 0, mail: 0, firesides: 0 } };
app.town.me = "t_Me";
const cleanupWorkspace = app.workspace.start();
app.post = value => {
  const message = value as Record<string, any>;
  if (message.type === "beings:scene-reference" && validChatReference(message.reference)) {
    const previous = draftReferences(chat), duplicate = previous.find(ref => ref.text === message.reference.text);
    const ok = Boolean(duplicate) || previous.length < 3;
    if (ok && !duplicate) setDraftReferences(chat, [...previous, message.reference]);
    app.workspace.receive({ type: "beings:scene-reference-result", id: message.id, referenceId: duplicate?.id || message.reference.id, ok, reason: "limit" });
    chat.changed();
    if (ok) focusComposer();
  } else if (message.type === "beings:session-select") {
    drafts.set(chat.currentScene.sceneId || "", chat.draft);
    chat.currentScene = { sceneId: message.scene.scene_id, sceneLabel: message.scene.scene_meta.scene_label };
    chat.draft = drafts.get(message.scene.scene_id) || "";
    chat.changed();
  } else if (message.type === "beings:sbs-toggle") app.setSbsEnabled(!app.sbsEnabled);
  else if (message.type === "beings:town-reply") app.toast("交互预览：委托内容已准备，本次没有向 Being 或 Town 发送。");
};

function CollaborationDemo() {
  useModel(app); useModel(chat); useModel(app.town);
  const editor = useRef<EditorView | null>(null), transcript = useRef<HTMLDivElement>(null);
  const [, refresh] = useState(0);
  const files = fileDrafts.get(chat.currentScene.sceneId || "") || [];
  const setFiles = (next: string[]) => { fileDrafts.set(chat.currentScene.sceneId || "", next); refresh(n => n + 1); };
  const fileInput = useRef<HTMLInputElement>(null);
  const messages = conversations.get(chat.currentScene.sceneId || "") || [];
  useLayoutEffect(() => { document.documentElement.dataset.theme = app.theme; document.documentElement.dataset.platform = "preview"; document.body.dataset.view = app.view; }, [app.theme, app.view]);
  useEffect(() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }, [messages.length]);
  useEffect(() => { focusComposer = () => editor.current?.focus(); return () => { focusComposer = () => {}; }; }, []);
  const send = () => {
    if (!chat.draft.trim() && !draftReferences(chat).length && !files.length) return;
    const id = chat.currentScene.sceneId || "";
    conversations.set(id, [...messages, { role: "user", text: withDraftReferences(chat.draft, chat) }, { role: "being", text: "这两件事可以放在同一条路径里：先保持阅读现场，再把操作结果带回来。回复时可以先认同顺序，再补充草稿保留和失败后的返回。\n\n（这是本地示例回复，没有连接 Being。）" }]);
    chat.draft = ""; setDraftReferences(chat, []); setFiles([]); chat.changed(); refresh(n => n + 1);
  };
  return <>
    <DesktopWorkspace app={app}>
        <section id="chat-view" className="view demo-conversation">
          <div className="demo-transcript" ref={transcript}>
            <div className="demo-date">今天</div>
            {messages.length ? messages.map((message, index) => <article className={`demo-message ${message.role}`} key={index}>
              <div className="demo-speaker">{message.role === "user" ? "你" : "美阳阳"}</div><Markdown content={message.text} />
            </article>) : <div className="demo-empty"><p>从这里接着聊。</p><small>这是同一个 Being 的另一个场景。</small></div>}
          </div>
          <div className="demo-composer">
            <ComposerReferences references={draftReferences(chat)} onRemove={id => { setDraftReferences(chat, draftReferences(chat).filter(ref => ref.id !== id)); chat.changed(); }} onSource={id => app.workspace.returnToSource(id)} />
            {files.length > 0 && <div className="demo-files">{files.map((name, index) => <button key={index} onClick={() => setFiles(files.filter((_, i) => i !== index))}>{name} ×</button>)}</div>}
            <ComposerField editorRef={editor} id="demo-message" value={chat.draft} placeholder="说点什么…" onChange={text => { chat.draft = text; chat.changed(); }} onCompositionStart={() => {}} onCompositionEnd={() => {}}
              onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(); } }} />
            <div className="demo-composer-actions"><button className="demo-attach" title="添加附件" aria-label="添加附件" onClick={() => fileInput.current?.click()}><Plus size={19} /></button>
              <button className="demo-send" aria-label="发送示例消息" disabled={!chat.draft.trim() && !draftReferences(chat).length && !files.length} onClick={send}><ArrowUp size={17} /></button>
            </div>
            <input hidden type="file" multiple ref={fileInput} onChange={event => { setFiles([...files, ...Array.from(event.target.files || []).map(file => file.name)]); event.target.value = ""; }} />
          </div>
        </section>
    </DesktopWorkspace>
    <footer className="demo-review-bar"><span>交互预览 · 示例数据</span><span className="demo-review-notice" role="status">{app.toastMessage}</span><nav aria-label="预览外观">
      <button aria-label="切换预览亮暗" title="切换亮暗" onClick={() => { app.theme = app.theme === "dark" ? "light" : "dark"; app.changed(); }}>{app.theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}</button>
    </nav></footer>
    <KitInstall model={app.town} /><ClientSettings model={app} />
  </>;
}
const root = createRoot(document.getElementById("root")!);
root.render(<CollaborationDemo />);
window.addEventListener("pagehide", cleanupWorkspace, { once: true });
