import { useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { ChatSceneIndicator } from "../desktop/renderer/app/components/chat-scene";
import { Workspace, WorkspaceSheet, presenceLabels, type WorkspacePresence } from "../desktop/renderer/app/components/workspace-home";
import { moveChatSessions } from "../desktop/shared/chat-session-order";
import type { ChatSessionOperation } from "../desktop/shared/types";
import { LEGACY_KEY, STORAGE_KEY, makeScene, readStore, restoreSnapshot, sampleReply, takeSnapshot, titleOf, type Data, type Item, type Snapshot, type Store, type Theme } from "./workspace-state";
import "../desktop/renderer/app/styles.css";
import "../desktop/renderer/app/components/workspace.css";

type Layer = "menu" | "settings" | "presence" | "objects" | "parked" | "inbox" | "object" | "editor" | "message" | "restore" | null;
function initial() {
  try { return readStore(localStorage.getItem(STORAGE_KEY), localStorage.getItem(LEGACY_KEY)); }
  catch { return { ...readStore(null, null), invalid: true }; }
}
const loaded = initial();

function WorkspaceDemo() {
  const [store, setStore] = useState(loaded.store);
  const currentStore = useRef(store);
  const [scenario, setScenario] = useState<"daily" | "empty" | "offline">("daily");
  const dataset = scenario === "empty" ? "empty" : "daily";
  const data = store[dataset];
  const [activeId, setActiveId] = useState(data.scenes.find(s => !data.archived.includes(s.scene_id))?.scene_id || "room");
  const [home, setHome] = useState(true);
  const [layer, setLayer] = useState<Layer>(null);
  const [itemId, setItemId] = useState("");
  const [messageId, setMessageId] = useState("");
  const [listOrigin, setListOrigin] = useState<"objects" | "parked">("objects");
  const [editorKey, setEditorKey] = useState("");
  const [status, setStatus] = useState<WorkspacePresence>("idle");
  const [outputPulse, setOutputPulse] = useState(0);
  const [feedback, setFeedback] = useState(loaded.invalid ? "原预览数据未能读取，已保留原始数据；当前修改只留在此页面。" : "");
  const [sheetNotice, setSheetNotice] = useState("");
  const [undo, setUndo] = useState<Snapshot | null>(null);
  const focusOrigin = useRef<HTMLElement | null>(null);
  const scene = data.scenes.find(s => s.scene_id === activeId);
  const title = titleOf(scene);
  const item = data.objects.find(o => o.id === itemId);
  const message = data.inbox.find(m => m.id === messageId);
  const draft = data.drafts[activeId] || { text: "" };
  const presence = scenario === "offline" ? "unknown" : status;
  const unread = data.inbox.find(m => !m.read);
  const visibleScenes = data.scenes.filter(s => !data.archived.includes(s.scene_id));

  useLayoutEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const update = () => { document.documentElement.dataset.theme = store.theme === "auto" ? query.matches ? "dark" : "light" : store.theme; };
    update(); query.addEventListener("change", update);
    document.documentElement.dataset.platform = "web"; document.body.dataset.view = "chat";
    return () => query.removeEventListener("change", update);
  }, [store.theme]);

  function save(next: Store): boolean {
    currentStore.current = next; setStore(next);
    try {
      if (loaded.invalid) throw new Error("原数据需要恢复，暂不覆盖");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return true;
    } catch {
      const note = "未能写入本机，内容仍在当前页面。请先复制，勿关闭。";
      setFeedback(note); setSheetNotice(note); return false;
    }
  }
  function change(update: (value: Data) => void): boolean {
    const next = structuredClone(currentStore.current); update(next[dataset]); return save(next);
  }
  function open(next: Layer) {
    if (!layer) focusOrigin.current = document.activeElement as HTMLElement;
    setSheetNotice(""); setLayer(next);
  }
  function close() {
    setLayer(null); setSheetNotice("");
    const target = focusOrigin.current; focusOrigin.current = null;
    requestAnimationFrame(() => { if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true }); });
  }
  function go(id: string) {
    if (data.archived.includes(id)) change(d => { d.archived = d.archived.filter(s => s !== id); });
    setActiveId(id); setHome(false); setFeedback("");
    if (layer) close();
    requestAnimationFrame(() => document.querySelector(".ws-back")?.scrollIntoView({ block: "start" }));
  }
  function continueChat() {
    const id = visibleScenes[0]?.scene_id || "room";
    if (!data.scenes.some(s => s.scene_id === id)) change(d => { d.scenes.push(makeScene(id, "新对话")); });
    go(id);
  }
  function showItem(id: string, origin: "objects" | "parked") {
    setItemId(id); setListOrigin(origin); change(d => { const o = d.objects.find(x => x.id === id); if (o) o.unread = false; }); open("object");
  }
  function showMessage(id: string) {
    setMessageId(id); change(d => { const m = d.inbox.find(x => x.id === id); if (m) m.read = true; }); open("message");
  }
  function edit(value?: Item) {
    setItemId(value?.id || crypto.randomUUID()); const key = value?.id || `new:${activeId}`;
    if (value) setActiveId(value.scene);
    setEditorKey(key);
    if (data.editors[key] === undefined) change(d => { d.editors[key] = value?.content || ""; });
    open("editor");
  }
  function saveItem() {
    const content = (currentStore.current[dataset].editors[editorKey] || "").trim();
    if (!content) { setSheetNotice("先写一点内容；原物件会保留。"); return; }
    const before = currentStore.current;
    const ok = change(d => {
      const o = d.objects.find(x => x.id === itemId);
      if (o) { o.content = content; o.title = content.split("\n")[0].slice(0,60); }
      else d.objects.push({ id: itemId, title: content.split("\n")[0].slice(0,60), kind: "便笺", content, scene: activeId, source: title + " · 你留下的", parked: false });
      delete d.editors[editorKey];
    });
    if (ok) open("objects");
    else { currentStore.current = before; setStore(before); }
  }
  function saveDraft(text: string, quote = draft.quote) {
    change(d => { d.drafts[activeId] = { text, quote }; });
    if (!loaded.invalid && feedback.startsWith("已保存")) setFeedback("");
  }
  async function onSession(operation: ChatSessionOperation, value: string | string[], id?: string) {
    if (operation === "select" && typeof value === "string") { go(value); return; }
    // Persist before reporting success to the shared sidebar; roll back on failure.
    const before = structuredClone(currentStore.current);
    let selected = activeId;
    const ok = change(d => {
      if (operation === "move") d.scenes = moveChatSessions(d.scenes, Array.isArray(value) ? value : [value], id);
      else if (operation === "delete") {
        const ids = Array.isArray(value) ? value : [value];
        d.archived = [...new Set([...d.archived, ...ids])];
        // Removing a scene from navigation never deletes its saved content.
        if (!d.scenes.some(s => !d.archived.includes(s.scene_id))) d.scenes.push(makeScene(crypto.randomUUID(), "新对话"));
        selected = d.archived.includes(activeId) ? d.scenes.find(s => !d.archived.includes(s.scene_id))!.scene_id : activeId;
      } else if (typeof value === "string" && operation === "rename") d.scenes = d.scenes.map(s => s.scene_id === id ? { ...s, scene_meta: { ...s.scene_meta, scene_label: value } } : s);
      else if (typeof value === "string" && (operation === "create" || operation === "bind")) {
        selected = operation === "bind" ? id || crypto.randomUUID() : crypto.randomUUID();
        if (!d.scenes.some(s => s.scene_id === selected)) d.scenes.push(makeScene(selected, value));
        d.archived = d.archived.filter(s => s !== selected);
      }
    });
    if (!ok) { currentStore.current = before; setStore(before); throw new Error("保存失败，场景列表已恢复。"); }
    setActiveId(selected); if (operation === "create" || operation === "bind") go(selected);
  }
  const list = (items: Item[], origin: "objects" | "parked") => items.length ? items.map(o => <button key={o.id} className="ws-list-row" onClick={() => showItem(o.id, origin)}><FileText /><span>{o.title}</span><small>{o.kind}</small></button>) : <p className="ws-empty">{origin === "parked" ? "没有搁置的东西。" : "这个场景还没有物件。"}</p>;
  const layerTitle: Record<Exclude<Layer, null>, string> = { menu:"更多",settings:"预览设置",presence:"存在与连接",objects:`${title} · 物件`,parked:"先放一放",inbox:"收件",object:item?.kind || "物件",editor:item ? "接着写" : "留个想法",message:"留下的消息",restore:"恢复收工快照" };

  return <>
    <Workspace home={home} title={title} draft={draft.text} quote={draft.quote ? sampleReply.replace("\n", "") : undefined}
      presence={presence} presenceDescription={`示例状态：${presenceLabels[presence]}`} outputPulse={outputPulse}
      excerpt={scenario !== "empty" ? { author: "溯", time: "昨天", text: sampleReply } : undefined}
      unread={home && unread ? { source: titleOf(data.scenes.find(s => s.scene_id === unread.scene)), summary: unread.summary, time: unread.time, onOpen: () => showMessage(unread.id) } : undefined}
      navigation={<ChatSceneIndicator sessions={visibleScenes} scene={scene} connected scope="current" scopeReady={false} onScope={() => {}} onSession={onSession}
        onCopy={text => { void navigator.clipboard?.writeText(text).then(() => setFeedback("场景 ID 已复制"), () => setFeedback(`场景 ID：${text}`)); if (!navigator.clipboard) setFeedback(`场景 ID：${text}`); }}
        initiallyPinned={false} widthPreferenceKey="portal.demo.workspaceSidebarWidth" heading={<span className="ws-context">{home ? "共同工作室" : title}</span>}
        footer={<nav className="ws-nav-links" aria-label="工作台入口"><button onClick={() => {setHome(true);setActiveId(visibleScenes[0]?.scene_id || "room");}}>进门页</button><button onClick={() => open("inbox")}>收件</button><button onClick={() => open("parked")}>先放一放</button></nav>} />}
      connectionNotice={scenario === "offline" ? <>连接中断，草稿仍留在本机。<button onClick={() => setScenario("daily")}>模拟重连</button></> : status === "error" ? <>示例回复失败，草稿已保留。<button onClick={() => setStatus("idle")}>模拟重试</button></> : undefined}
      feedback={feedback} submitLabel="保存草稿，不发送" onHome={() => {setHome(true);setActiveId(visibleScenes[0]?.scene_id || "room");}}
      onContinue={continueChat} onObjects={() => open("objects")} onMore={() => open("menu")} onPresence={() => open("presence")}
      onDraft={text => saveDraft(text)} onSubmit={() => {
        if (!draft.text.trim()) { setFeedback("先写一点内容。");return; }
        if (change(d => {d.drafts[activeId] = draft;})) setFeedback("已保存在本机预览，未发送。");
      }} onRemoveQuote={() => saveDraft(draft.text, false)}>
      {scenario !== "empty" && activeId === "room" ? <>
        <article className="ws-message ws-message-human"><small>你 · 昨天</small>我想要一个地方。下次回来，我们还记得聊到了哪里。</article>
        <article className="ws-message ws-message-being"><small>溯 · 昨天</small>{sampleReply}<div className="ws-actions">
          <button className="ws-text-action" onClick={() => saveDraft(draft.text, true)}>引用</button>
          <button className="ws-text-action" onClick={() => { if (change(d => {
            const pinned = d.objects.find(o => o.id === "focus-message");
            if (pinned) pinned.parked = false; else d.objects.push({ id:"focus-message",title:"先把日常相处的方式想清楚",kind:"对话",content:sampleReply,source:"共同工作室 · 昨天",scene:activeId,parked:false });
          })) setFeedback("已留在当前场景物件里。"); }}>留下</button>
        </div></article>
        <details className="ws-process"><summary>已留下一页草稿</summary><p>示例过程：将讨论要点整理为「一个共同的工作室」。</p></details>
      </> : <p className="ws-empty">这里还没有对话。</p>}
    </Workspace>
    <WorkspaceSheet title={layer ? layerTitle[layer] : ""} open={!!layer} kind={layer === "menu" ? "menu" : ["settings","presence","restore"].includes(layer || "") ? "settings" : "drawer"} onClose={close}>
      {layer === "menu" && <>
        <button className="ws-menu-row" onClick={() => { const before=currentStore.current;const ok = change(d => {d.snapshot = takeSnapshot(d,activeId,home,new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}));}); if(ok){close();setFeedback("已留好。");}else{currentStore.current=before;setStore(before);} }}>今天先这样</button>
        {data.snapshot && <button className="ws-menu-row" onClick={() => open("restore")}>恢复收工快照</button>}
        {undo && <button className="ws-menu-row" onClick={() => { const before = currentStore.current;const next={...before,[dataset]:restoreSnapshot(data,undo)};if(save(next)){setActiveId(undo.activeId);setHome(undo.home);setUndo(null);close();setFeedback("已撤销恢复。");}else{currentStore.current=before;setStore(before);} }}>撤销恢复</button>}
        <div className="ws-menu-rule" /><button className="ws-menu-row" onClick={() => open("settings")}>预览设置</button><p className="ws-note">示例内容 · 不发送消息</p>
      </>}
      {layer === "settings" && <>
        <label className="ws-setting">外观<select aria-label="外观" value={store.theme} onChange={e => save({...currentStore.current,theme:e.target.value as Theme})}><option value="auto">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label>
        <label className="ws-setting">示例场景<select aria-label="示例场景" value={scenario} onChange={e => {const s=e.target.value as typeof scenario;setScenario(s);setActiveId(store[s === "empty" ? "empty" : "daily"].scenes[0]?.scene_id || "room");setHome(true);setUndo(null);setFeedback("");}}><option value="daily">日常</option><option value="empty">空桌面</option><option value="offline">离线</option></select></label>
        <label className="ws-setting">示例状态<select aria-label="示例状态" value={status} onChange={e => setStatus(e.target.value as WorkspacePresence)}>{Object.entries(presenceLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        {status === "streaming" && <button className="ws-text-action" onClick={() => setOutputPulse(x => x+1)}>模拟收到一段输出</button>}
        <p className="ws-note">单文件组件预览；状态和消息均为示例。侧栏、输入编辑器和弹层使用客户端组件；草稿仅在此预览保存。</p>
        <p className="ws-note"><a href="https://ia.net/writer" target="_blank" rel="noreferrer">iA Writer</a><a href="https://culturedcode.com/things/features/" target="_blank" rel="noreferrer">Things</a></p>
      </>}
      {layer === "presence" && <><p className="ws-object-body">{presenceLabels[presence]}</p><p className="ws-note">当前为示例状态。连接可用不等于已确认在场；真实状态过期或缺失时，光点保留静态轮廓。</p><button className="ws-text-action" onClick={() => open("settings")}>预览其他状态</button></>}
      {layer === "objects" && <>{list(data.objects.filter(o=>o.scene===activeId&&!o.parked),"objects")}<button className="ws-list-row" onClick={()=>edit()}><Plus /><span>留个想法</span></button></>}
      {layer === "parked" && <>{list(data.objects.filter(o=>o.parked),"parked")}{data.archived.length > 0 && <><p className="ws-note">从列表移出的场景</p>{data.scenes.filter(s=>data.archived.includes(s.scene_id)).map(s=><button key={s.scene_id} className="ws-list-row" onClick={()=>go(s.scene_id)}><span>{titleOf(s)}</span><small>拿回场景</small></button>)}</>}</>}
      {layer === "inbox" && (data.inbox.length ? data.inbox.map(m=><button key={m.id} className="ws-list-row" onClick={()=>showMessage(m.id)}><span>{m.summary}</span>{!m.read&&<span className="ws-unread-dot" aria-label="未读"/>}<small>{m.time}</small></button>) : <p className="ws-empty">还没有消息。</p>)}
      {layer === "message" && message && <><p className="ws-object-source">{titleOf(data.scenes.find(s=>s.scene_id===message.scene))} · {message.time}</p><p className="ws-object-body">{message.content}</p><div className="ws-actions"><button className="ws-text-action" onClick={()=>go(message.scene)}>进入场景</button><button className="ws-text-action" onClick={()=>open("inbox")}>所有消息</button></div></>}
      {layer === "object" && item && <>
        <button className="ws-back" onClick={()=>open(listOrigin)}><ArrowLeft />{listOrigin==="parked"?"先放一放":"场景物件"}</button>
        <h3 className="ws-object-title">{item.title}</h3><p className="ws-object-source">{item.source}</p><p className="ws-object-body">{item.content}</p>
        <div className="ws-actions"><button className="ws-text-action" onClick={()=>edit(item)}>接着写</button><button className="ws-text-action" onClick={()=>go(item.scene)}>回到对话</button><button className="ws-text-action" onClick={()=>{if(change(d=>{const o=d.objects.find(x=>x.id===item.id);if(o)o.parked=!o.parked;}))open(listOrigin);}}>{item.parked?"拿回场景":"先放一放"}</button></div>
      </>}
      {layer === "editor" && <><button className="ws-back" onClick={()=>open("objects")}><ArrowLeft />场景物件</button><textarea className="ws-note-editor" aria-label="便笺内容" value={data.editors[editorKey] || ""} onChange={e=>change(d=>{d.editors[editorKey]=e.target.value;})} placeholder="写在这里…"/><div className="ws-actions"><button className="ws-save" onClick={saveItem}>保存物件</button></div><p className="ws-note">关闭后保留编辑草稿。</p></>}
      {layer === "restore" && data.snapshot && <><p className="ws-note">恢复到 {data.snapshot.time} 的物件、场景、消息和草稿；替换之后的修改。恢复后可从更多菜单撤销。</p><div className="ws-actions"><button className="ws-save" onClick={()=>{
        const snapshot=data.snapshot!;const before=currentStore.current;
        try{const next={...before,[dataset]:restoreSnapshot(data,snapshot)};
          if(save(next)){setUndo(takeSnapshot(data,activeId,home,"恢复前"));setActiveId(snapshot.activeId);setHome(snapshot.home);close();setFeedback("已恢复；可在更多菜单撤销。");}
          else{currentStore.current=before;setStore(before);}
        }catch(error){setSheetNotice(String(error));}
      }}>恢复</button><button className="ws-text-action" onClick={close}>取消</button></div></>}
      {sheetNotice && <p className="ws-note" role="alert">{sheetNotice}</p>}
    </WorkspaceSheet>
  </>;
}

createRoot(document.getElementById("root")!).render(<WorkspaceDemo />);
