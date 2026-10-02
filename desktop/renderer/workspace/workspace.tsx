import { PanelLayout } from "./panel-layout";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Dispatch } from "react";
import type { EditorView } from "@codemirror/view";
import { ArrowLeft, ArrowRight, ArrowLeftRight, ArrowUp, ArrowUpRight, ChevronDown, MessageCircle, MoreHorizontal, PanelLeftClose, PanelRightClose, Search, Settings, X, type LucideIcon } from "lucide-react";
import { ChatSceneIndicator } from "../app/components/chat-scene";
import type { ChatScene, ChatSessionOperation } from "../../shared/types";
import { moveChatSessions } from "../../shared/chat-session-order";
import type { HistoryScope } from "../chat/models/scenes";
import { MAX_DRAFT_REFERENCES } from "../chat/models/references";
import { ComposerField } from "../chat/components/composer-field";
import { Markdown } from "../shared/components/markdown";
import { emptyWorkspaceScene, visibleWorkspaceScenes, type WorkspaceAction, type WorkspaceScene, type WorkspaceState, type WorkspaceReference } from "./model";
import "../app/styles.css";
import "./workspace.css";

export type WorkspaceResource = { id: string; title: string; destination: string; icon: LucideIcon; description?: string };
export type ResourceContext = {
  scene: WorkspaceScene;
  draft: string;
  onDraft: (text: string) => void;
  open: (resource: string) => void;
  back: () => void;
};
type Props = {
  state: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  resources: WorkspaceResource[];
  being: string;
  renderResource: (resource: WorkspaceResource, context: ResourceContext) => ReactNode;
  renderSettings: () => ReactNode;
  onSubmit: (scene: WorkspaceScene) => void;
  onSuggestion: (text: string, scene: WorkspaceScene) => void;
  notice?: string;
  sbs: boolean;
  onSbs: (enabled: boolean) => void;
};
export function IconButton({ label, children, onClick, pressed, disabled }: { label: string; children: ReactNode; onClick: () => void; pressed?: boolean; disabled?: boolean }) {
  return <button type="button" className="sw-icon" title={label} aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>{children}</button>;
}

type SelectionQuote = { scene: string; reference: WorkspaceReference; left: number; top: number };
function useSelectionQuote(scene: string) {
  const [quote, setQuote] = useState<SelectionQuote | null>(null);
  useEffect(() => {
    setQuote(null);
    const read = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount || selection.isCollapsed) { setQuote(null); return; }
      const element = (node: Node | null) => node?.nodeType === Node.ELEMENT_NODE ? node as Element : node?.parentElement;
      const start = element(selection.anchorNode), end = element(selection.focusNode);
      const source = start?.closest<HTMLElement>('[data-share-source]');
      if (!source || end?.closest('[data-share-source]') !== source || !source.getClientRects().length ||
        start?.closest('textarea,input,button,[contenteditable=true],.sw-reference') || end?.closest('textarea,input,button,[contenteditable=true],.sw-reference')) { setQuote(null); return; }
      const text = selection.toString().trim();
      if (!text) { setQuote(null); return; }
      const range = selection.getRangeAt(0);
      const rect = Array.from(range.getClientRects()).at(-1) ?? range.getBoundingClientRect();
      setQuote({ scene, reference: { id: crypto.randomUUID(), title: source.dataset.shareTitle || "对话摘录", text,
        ...(source.dataset.shareResource ? { resource: source.dataset.shareResource } : { message: { scene: source.dataset.shareScene || scene, id: source.dataset.shareSource! } }) },
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 112)), top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 48)) });
    };
    const clear = () => setQuote(null);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") clear(); };
    document.addEventListener("selectionchange", read);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("selectionchange", read); window.removeEventListener("scroll", clear, true); window.removeEventListener("resize", clear); window.removeEventListener("keydown", key); };
  }, [scene]);
  return [quote, () => setQuote(null)] as const;
}

export function SceneWorkspace(props: Props) {
  const { state, dispatch, resources, being } = props;
  const scene = state.scenes[state.currentScene];
  const route = scene.reading.route;
  const [scope, setScope] = useState<HistoryScope>("current");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [triggerContainer, setTriggerContainer] = useState<HTMLDivElement | null>(null);
  const [headingContainer, setHeadingContainer] = useState<HTMLDivElement | null>(null);
  const [quote, clearQuote] = useSelectionQuote(scene.id);
  const [quoteError, setQuoteError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const editor = useRef<EditorView | null>(null);
  const messageToReveal = useRef<string | null>(null);
  const resource = (id: string) => resources.find(value => value.id === id);
  const selected = route && resource(route.resource);
  const hasContent = !!selected || settingsOpen;
  const sessions: ChatScene[] = visibleWorkspaceScenes(state).map(value => ({ scene_id: value.id, scene_meta: { scene_label: value.title, client: "preview" } }));
  const open = (id: string) => {
    const value = resource(id);
    if (!value) return;
    dispatch({ type: "open", scene: scene.id, route: { destination: value.destination, resource: id } });
    setSettingsOpen(false); clearQuote();
  };
  const navigate = (destination: string) => {
    setSettingsOpen(false); clearQuote();
    if (destination === "chat") { dispatch({ type: "chat-only", scene: scene.id }); return; }
    dispatch({ type: "navigate", scene: scene.id, destination, resource: destination });
  };
  const back = () => { dispatch({ type: "back", scene: scene.id }); clearQuote(); };
  const changeSession = async (operation: ChatSessionOperation, value: string | string[], id?: string) => {
    if (operation === "select" && typeof value === "string") dispatch({ type: "switch", scene: value });
    else if (operation === "rename" && id && typeof value === "string") dispatch({ type: "rename", scene: id, title: value });
    else if (operation === "move") dispatch({ type: "order", ids: moveChatSessions(sessions, Array.isArray(value) ? value : [value], id).map(item => item.scene_id) });
    else if (operation === "delete") dispatch({ type: "hide-scenes", ids: Array.isArray(value) ? value : [value], fallback: emptyWorkspaceScene(crypto.randomUUID(), "新场景") });
    else if ((operation === "create" || operation === "bind") && typeof value === "string") {
      const nextId = operation === "bind" && id ? id : crypto.randomUUID();
      dispatch({ type: "create", value: state.scenes[nextId] ?? emptyWorkspaceScene(nextId, value) });
    }
    // A transient list should reveal the selected chat; pinned lists stay put.
    if (["select", "create", "bind"].includes(operation)) window.dispatchEvent(new Event("beings:sidebar-dismiss"));
  };
  useEffect(() => {
    const messageId = messageToReveal.current;
 setSettingsOpen(false); setScope("current"); setQuoteError("");
    if (messageId) requestAnimationFrame(() => document.getElementById(`message-${messageId}`)?.scrollIntoView({ block: "center" }));
    messageToReveal.current = null;
  }, [scene.id]);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector("dialog[open]")) return;
      if ((event.metaKey || event.ctrlKey) && event.key === ",") { event.preventDefault(); setSettingsOpen(value => !value); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") { event.preventDefault(); setSearchOpen(value => !value); dispatch({ type: "chat-visible", visible: true }); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") { event.preventDefault(); document.getElementById("chat-scene-indicator")?.click(); }
      if (event.key === "Escape") { setSettingsOpen(false); setSearchOpen(false); document.querySelectorAll<HTMLDetailsElement>('.sw-popover[open]').forEach(menu => { menu.open = false; }); }
    };
    const outside = (event: PointerEvent) => document.querySelectorAll<HTMLDetailsElement>('.sw-popover[open]').forEach(menu => { if (!menu.contains(event.target as Node)) menu.open = false; });
    window.addEventListener("keydown", key); window.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("pointerdown", outside); };
  }, [dispatch]);
  const showChat = () => { dispatch({ type: "chat-visible", visible: true }); requestAnimationFrame(() => editor.current?.focus()); };
  const showSource = (reference: WorkspaceReference) => {
    if (reference.resource) open(reference.resource);
    else if (reference.message) {
      if (reference.message.scene !== scene.id) messageToReveal.current = reference.message.id;
      dispatch({ type: "switch", scene: reference.message.scene });
      dispatch({ type: "chat-visible", visible: true }); setScope("current"); setSettingsOpen(false);
      requestAnimationFrame(() => document.getElementById(`message-${reference.message!.id}`)?.scrollIntoView({ block: "center" }));
    }
  };
  const discussSelection = () => {
    if (!quote || quote.scene !== scene.id) { clearQuote(); return; }
    const duplicate = scene.references.some(ref => ref.text === quote.reference.text && ref.resource === quote.reference.resource && ref.message?.id === quote.reference.message?.id && ref.message?.scene === quote.reference.message?.scene);
    if (scene.references.length >= MAX_DRAFT_REFERENCES && !duplicate) { setQuoteError(`这条消息已有 ${MAX_DRAFT_REFERENCES} 条引用，请先移除一条。`); clearQuote(); return; }
    dispatch({ type: "quote", scene: quote.scene, reference: quote.reference });
    clearQuote(); window.getSelection()?.removeAllRanges();
    requestAnimationFrame(() => editor.current?.focus());
  };
  const destination = settingsOpen ? "settings" : route?.destination ?? "chat";
  const railIds = ["town", "inbox", "fireside", "campfire", "garden", "shelf", "scrolls", "kits", "contacts", "browser"];
  const messages = scope === "all" ? Object.values(state.scenes).flatMap(value => value.messages.map(message => ({ ...message, sourceScene: value.id, sourceTitle: value.title }))) : scene.messages.map(message => ({ ...message, sourceScene: scene.id, sourceTitle: scene.title }));
  const filteredMessages = searchOpen && search.trim() ? messages.filter(message => `${message.text} ${message.suggestion ?? ""}`.toLowerCase().includes(search.toLowerCase())) : messages;

  return <div className="scene-workspace">
    <nav className="sw-rail" aria-label="功能导航">
      <div ref={setTriggerContainer} className="sw-scene-trigger" /><div className="sw-rail-main">{railIds.map((id, index) => {
        const value = resource(id); const Icon = id === "chat" ? MessageCircle : value?.icon;
        if (!Icon) return null;
        const title = id === "chat" ? "对话" : value!.title;
        return <button key={id} className={`sw-rail-button ${[1, 4, 7].includes(index) ? "sw-rail-group" : ""}`} aria-label={title} title={title} aria-current={destination === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={20} /><span className="sw-rail-tooltip" aria-hidden="true">{title}</span></button>;
      })}</div>
      <div className="sw-rail-bottom"><details className="sw-popover sw-more"><summary className="sw-rail-button" aria-label="更多" title="更多"><MoreHorizontal size={20} /></summary><div className="sw-small-menu">{[["announcements", "公告"], ["preview", "关于预览"]].map(([id, title]) => <button key={id} onClick={event => { event.currentTarget.closest("details")!.open = false; open(id); }}>{title}</button>)}</div></details><button className="sw-rail-button" aria-label="设置" title="设置（⌘,）" aria-current={settingsOpen ? "page" : undefined} onClick={() => { setSettingsOpen(value => !value); }}><Settings size={20} /><span className="sw-rail-tooltip" aria-hidden="true">设置</span></button></div>
    </nav>
    <div className="sw-stage workspace-stage">
      <header className="sw-topbar">
        <ChatSceneIndicator initiallyPinned={false} triggerContainer={triggerContainer} headingContainer={headingContainer} scene={sessions.find(value => value.scene_id === scene.id)} sessions={sessions} connected scope={scope} scopeReady onScope={setScope} onSession={changeSession} widthPreferenceKey="being.ia.sidebarWidth"
          onCopy={value => { void navigator.clipboard?.writeText(value); }}
          sidebarHeader={<div className="sw-being-header"><details className="sw-popover sw-being-menu"><summary>{being}<ChevronDown size={13} /></summary><div className="sw-small-menu"><label><span>自主醒来</span><input type="checkbox" role="switch" checked={props.sbs} onChange={event => props.onSbs(event.target.checked)} /></label><small>预览状态</small></div></details><IconButton label="查找对话" onClick={() => { setSearchOpen(true); showChat(); }}><Search /></IconButton></div>}
          footer={<label className="chat-session-context-toggle"><input type="checkbox" checked={scope === "all"} aria-label="显示全部场景上下文" onChange={event => setScope(event.target.checked ? "all" : "current")} /><span>全部上下文</span></label>} />
        <button className="sw-preview-label" onClick={() => open("preview")}>交互预览</button>
      </header>
      <main className="sw-shell">
        <div className="sw-surface">
          <PanelLayout placement={scene.placement.chat} onChange={chat => dispatch({ type: "chat-placement", scene: scene.id, chat })}
            hasContent={hasContent}
            title={<><strong>{being}</strong><div ref={setHeadingContainer} className="sw-chat-scene-heading" /></>}
            label={scene.title}
            content={<section className="sw-materials" aria-label={settingsOpen ? "设置内容" : selected?.title ?? "内容"}>
              <header className="sw-pane-header" hidden={!hasContent}><div className="sw-content-history">
                <IconButton label={settingsOpen ? "返回原内容" : "返回上一处"} disabled={!settingsOpen && !scene.reading.back.length} onClick={() => settingsOpen ? setSettingsOpen(false) : back()}><ArrowLeft /></IconButton>
                {!settingsOpen && <IconButton label="前往下一处" disabled={!scene.reading.forward.length} onClick={() => dispatch({ type: "forward", scene: scene.id })}><ArrowRight /></IconButton>}
              </div><span className="sw-pane-title">{settingsOpen ? "设置" : selected?.title}</span><IconButton label={settingsOpen ? "关闭设置" : "收起内容"} onClick={() => settingsOpen ? setSettingsOpen(false) : navigate("chat")}><X /></IconButton></header>
              <div className="sw-settings-surface" hidden={!settingsOpen}>{props.renderSettings()}</div>
              {selected && <ReadingSurface key={`${scene.id}:${selected.id}`} scene={scene} resource={selected} dispatch={dispatch} side={scene.placement.chat.side} hidden={settingsOpen}>
                {props.renderResource(selected, { scene, draft: state.drafts[selected.id] ?? "", onDraft: text => dispatch({ type: "resource-draft", resource: selected.id, text }), open, back })}
              </ReadingSurface>}
            </section>}>
            {searchOpen && <div className="sw-chat-search"><Search size={15} /><input ref={searchRef} value={search} placeholder="查找当前显示的对话" aria-label="查找对话文字" onChange={event => setSearch(event.target.value)} /><IconButton label="关闭查找" onClick={() => { setSearchOpen(false); setSearch(""); }}><X /></IconButton></div>}
            <Discussion key={scene.id} scene={scene} messages={filteredMessages} being={being} dispatch={dispatch} side={scene.placement.chat.side} editor={editor} onSubmit={() => props.onSubmit(scene)} onSuggestion={text => { setSettingsOpen(false); props.onSuggestion(text, scene); }} showSource={showSource} scope={scope} />
          </PanelLayout>
        </div>
      </main>
    </div>
    {(props.notice || quoteError) && <div className="sw-notice" role="status">{quoteError || props.notice}{quoteError && <IconButton label="关闭提示" onClick={() => setQuoteError("")}><X /></IconButton>}</div>}
    {quote && <button className="sw-selection-action" style={{ left: quote.left, top: quote.top }} onMouseDown={event => event.preventDefault()} onClick={discussSelection}><MessageCircle size={14} />一起看</button>}
  </div>;
}

function ReadingSurface({ scene, resource, dispatch, children, side, hidden }: { scene: WorkspaceScene; resource: WorkspaceResource; dispatch: Dispatch<WorkspaceAction>; children: ReactNode; side: string; hidden: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = useRef(scene.scroll[resource.id] ?? 0);
  useLayoutEffect(() => { if (ref.current && !hidden) ref.current.scrollTop = scroll.current; }, [side, hidden]);
  useEffect(() => () => { dispatch({ type: "scroll", scene: scene.id, resource: resource.id, top: scroll.current }); }, [dispatch, scene.id, resource.id]);
  return <div ref={ref} hidden={hidden} className="sw-reading-surface" onScroll={event => { scroll.current = event.currentTarget.scrollTop; }} data-share-source={resource.id} data-share-title={resource.title} data-share-resource={resource.id}>{children}</div>;
}

type DisplayMessage = WorkspaceScene["messages"][number] & { sourceScene: string; sourceTitle: string };
function Discussion({ scene, messages, being, dispatch, side, editor, onSubmit, onSuggestion, showSource, scope }: {
  scene: WorkspaceScene; messages: DisplayMessage[]; being: string; dispatch: Dispatch<WorkspaceAction>; side: string;
  editor: React.MutableRefObject<EditorView | null>; onSubmit: () => void; onSuggestion: (text: string) => void;
  showSource: (reference: WorkspaceReference) => void; scope: HistoryScope;
}) {
  const composing = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const scroll = useRef(scene.scroll.discussion ?? 0);
  useLayoutEffect(() => { if (transcript.current) transcript.current.scrollTop = scroll.current; }, [side]);
  useEffect(() => () => { dispatch({ type: "scroll", scene: scene.id, resource: "discussion", top: scroll.current }); }, [dispatch, scene.id]);
  const count = useRef(scene.messages.length);
  useEffect(() => { if (count.current !== scene.messages.length) transcript.current?.scrollTo({ top: transcript.current.scrollHeight }); count.current = scene.messages.length; }, [scene.messages.length]);
  return <div className="sw-discussion">
    <div ref={transcript} className="sw-transcript" onScroll={event => { scroll.current = event.currentTarget.scrollTop; }}><div className="sw-conversation-date">今天</div>
      {messages.map(message => <article id={`message-${message.id}`} key={`${message.sourceScene}:${message.id}`} className={`sw-message ${message.role}`} data-share-source={message.id} data-share-title={`${message.sourceTitle} · ${message.role === "human" ? "你" : being}`} data-share-scene={message.sourceScene}>
        <div className="sw-message-author">{message.role === "human" ? "你" : being}{scope === "all" && <span>{message.sourceTitle}</span>}</div>
        {message.references?.map(reference => <button key={reference.id} className="sw-source-link" onClick={() => showSource(reference)} title={reference.text}><ArrowUpRight size={13} />{reference.title}</button>)}
        <Markdown content={message.text} className="sw-markdown" />
        {message.suggestion && <div className="sw-suggestion"><p>{message.suggestion}</p><button className="sw-text-button" onClick={() => onSuggestion(message.suggestion!)}>放入回复草稿<ArrowUpRight size={14} /></button></div>}
      </article>)}
      {!messages.length && <p className="sw-empty">{scene.messages.length ? "没有找到匹配的文字" : "想聊点什么？"}</p>}
    </div>
    <div className="sw-composer-wrap">{scope === "all" && <div className="sw-send-target">发送到：{scene.title}</div>}<div className="sw-composer">
      {!!scene.references.length && <div className="sw-composer-references">{scene.references.map(reference => <div className="sw-reference" key={reference.id}><details><summary title={reference.text}>{reference.title}</summary><blockquote>{reference.text || "之前保留的来源链接"}</blockquote><button className="sw-text-button" onClick={() => showSource(reference)}>回到原文<ArrowUpRight size={12} /></button></details><IconButton label={`移除引用：${reference.title}`} onClick={() => dispatch({ type: "remove-reference", scene: scene.id, id: reference.id })}><X /></IconButton></div>)}</div>}
      <ComposerField editorRef={editor} id={`discussion-${scene.id}`} value={scene.draft} placeholder={`和${being}说说…`} onChange={text => dispatch({ type: "draft", scene: scene.id, text })} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={event => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing && !composing.current && event.keyCode !== 229) { event.preventDefault(); if (scene.draft.trim() || scene.references.length) onSubmit(); }
      }} />
      <div className="sw-composer-bottom"><button className="sw-send" title="发送示例消息" aria-label="发送示例消息" disabled={!scene.draft.trim() && !scene.references.length} onClick={onSubmit}><ArrowUp size={18} /></button></div>
    </div></div>
  </div>;
}
