import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Mail, PackageCheck, Search, X } from "lucide-react";
import { SceneWorkspace, type ResourceContext, type WorkspaceResource } from "../desktop/renderer/workspace/workspace";
import { captureMessage, migrateWorkspaceState, workspaceReducer, type WorkspaceScene, type WorkspaceState } from "../desktop/renderer/workspace/model";
import { Markdown } from "../desktop/renderer/shared/components/markdown";
import { documents, initialState, resources } from "./scenes-data";
import "./scenes.css";

const storageKey = "being-scene-placement-demo-v3";
function readState(): WorkspaceState {
  try {
    const raw = localStorage.getItem(storageKey) ?? localStorage.getItem("being-conversation-navigation-demo-v2") ?? localStorage.getItem("being-scene-composition-demo-v1");
    const saved = migrateWorkspaceState(JSON.parse(raw || "null"), Object.fromEntries(resources.map(value => [value.id, value.destination])));
    if (saved) {
      for (const scene of Object.values(saved.scenes)) for (const ref of [...scene.references, ...scene.messages.flatMap(message => message.references ?? [])])
        if (ref.resource && ref.id.startsWith("legacy-")) ref.title = resources.find(value => value.id === ref.resource)?.title ?? ref.title;
      return saved;
    }
  } catch { /* Keep the preview usable if storage is unavailable. */ }
  return initialState();
}
type Install = "available" | "review" | "installing" | "installed";
function Demo() {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, readState);
  const [notice, setNotice] = useState("");
  const [install, setInstall] = useState<Install>("available");
  const [sent, setSent] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null);
  const [sbs, setSbs] = useState(true);
  const [settingSection, setSettingSection] = useState("being");
  const [readable, setReadable] = useState(false);
  const [appearance, setAppearance] = useState("light");
  const [filters, setFilters] = useState<Record<string, { query: string; tab: string }>>({});
  const [postDrafts, setPostDrafts] = useState<Record<string, string>>({});
  const [posts, setPosts] = useState<Record<string, string[]>>({});
  const installTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch { setNotice("预览无法保存；请保留当前页面，避免丢失输入。"); }
  }, [state]);
  useEffect(() => {
    if (!notice || notice.startsWith("预览无法")) return;
    const timer = setTimeout(() => setNotice(""), 3000); return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => () => { if (installTimer.current) clearTimeout(installTimer.current); }, []);
  useEffect(() => { document.documentElement.dataset.theme = appearance; }, [appearance]);
  function submit(scene: WorkspaceScene) {
    if (!scene.draft.trim() && !scene.references.length) return;
    dispatch({ type: "message", scene: scene.id, message: captureMessage(scene, crypto.randomUUID()), clearComposer: true });
    setNotice("已记入预览对话，未发送到 Being。");
  }
  function adopt(text: string, scene: WorkspaceScene) {
    dispatch({ type: "open", scene: scene.id, route: { destination: "inbox", resource: "mail-alice" } });
    if (state.drafts["mail-alice"]?.trim() && state.drafts["mail-alice"] !== text) setPendingSuggestion(text);
    else { dispatch({ type: "resource-draft", resource: "mail-alice", text }); setPendingSuggestion(null); }
  }
  function installKit() {
    if (install === "installing" || install === "installed") return;
    setInstall("installing");
    installTimer.current = setTimeout(() => { setInstall("installed"); setNotice("共读工具：模拟安装完成。没有安装实际软件。"); }, 1600);
  }
  function settings() {
    const sections = [["being", "Being 与连接"], ["portal", "本机 Portal"], ["town", "小镇连接"], ["client", "外观与通用"], ["about", "关于与诊断"]];
    return <div className="sd-settings"><nav aria-label="设置分类">{sections.map(([id, title]) => <button key={id} aria-current={settingSection === id ? "page" : undefined} onClick={() => setSettingSection(id)}>{title}</button>)}</nav><div className="sd-settings-body">
      <h2>{sections.find(([id]) => id === settingSection)?.[1]}</h2>
      {settingSection === "being" && <><div className="sd-setting-row"><span>美阳阳</span><small>示例 Being</small></div><label className="sd-setting-row"><span>自主醒来</span><input type="checkbox" role="switch" checked={sbs} onChange={event => setSbs(event.target.checked)} /></label><div className="sd-setting-row"><span>Being 连接</span><small>预览未连接</small></div><div className="sd-setting-row"><span>模型</span><small>连接后读取</small></div></>}
      {settingSection === "portal" && <><div className="sd-setting-row"><span>本机 Portal</span><small>未启动</small></div><div className="sd-setting-row"><span>工作目录</span><small>未选择</small></div><div className="sd-setting-row"><span>subagent 模型</span><small>连接后读取</small></div><p className="sd-note">本预览不启动本机服务。</p></>}
      {settingSection === "town" && <><div className="sd-setting-row"><span>小镇身份</span><small>示例数据</small></div><p className="sd-note">正式客户端的配对将从这里进入，完成后回到原内容。</p></>}
      {settingSection === "client" && <><div className="sd-setting-row"><span>外观</span><div className="sd-filter-tabs">{[["light", "浅色"], ["dark", "深色"]].map(([id, label]) => <button key={id} aria-pressed={appearance === id} onClick={() => setAppearance(id)}>{label}</button>)}</div></div><label className="sd-setting-row"><span>较大正文</span><input type="checkbox" role="switch" checked={readable} onChange={event => setReadable(event.target.checked)} /></label></>}
      {settingSection === "about" && <><p className="sd-note">交互预览 · 9 月 27 日</p><p className="sd-note">示例数据，不连接真实 Being、不发送私信、不安装软件。</p></>}
    </div></div>;
  }
  const rows: Record<string, Array<[string, string, string]>> = {
    inbox: [["mail-alice", "Alice", state.drafts["mail-alice"] ? "草稿 · 一起读书的安排" : "一起读书的安排 · 今天 10:24"]],
    fireside: [["fireside-reading", "阅读小组", "Alice：这周不如只选一篇短文。"]],
    garden: [["seed-reading", "共读前的三个问题", "Alice · 经验种子"]],
    shelf: [["story-weekend", "一个没有读完的周末", "Alice · 共同经历"]],
    scrolls: [["shared-space", "把阅读留给周末", "Alice · 公开卷轴"], ["scene-notes", "关于一起读书的笔记", "美阳阳 · 我的卷轴"]],
    kits: [["reader-kit", "共读工具", install === "installed" ? "已安装 · 演示" : "摘录、出处与阅读笔记"]],
    contacts: [["mail-alice", "Alice", "t_alice · 写私信"]],
    town: [["campfire", "篝火", "公共交流"], ["announcements", "公告", "小镇消息"], ["kits", "工具库", "Grove"]],
  };
  function content(value: WorkspaceResource, context: ResourceContext): ReactNode {
    if (documents[value.id]) return <article className="sd-document"><p className="sd-meta">{documents[value.id].subtitle}</p><Markdown content={documents[value.id].body} className="sw-markdown" /></article>;
    if (value.id === "mail-alice") return <MailContent draft={context.draft} onDraft={context.onDraft} sent={sent} pending={pendingSuggestion} resolve={action => {
      if (action === "replace" && pendingSuggestion) context.onDraft(pendingSuggestion);
      if (action === "append" && pendingSuggestion) context.onDraft(`${context.draft}\n\n${pendingSuggestion}`);
      setPendingSuggestion(null);
    }} onSend={() => { setSent(context.draft); context.onDraft(""); setNotice("已模拟发送私信，没有对外发送。"); }} />;
    if (value.id === "campfire" || value.id === "fireside-reading") {
      const ring = value.id === "fireside-reading";
      const draft = postDrafts[value.id] ?? "";
      return <div className="sd-detail sd-feed"><div className="sd-list-heading"><h1>{value.title}</h1>{ring && <details className="sd-members"><summary>2 位成员</summary><p>Alice · 美阳阳</p></details>}</div>
        <article className="sd-post"><div className="sd-post-byline"><strong>Alice</strong><time>10:24</time></div><p>{ring ? "这周不如只选一篇短文。各自带一个问题，周末再聊。" : "最近试着不再记录读了多少页。遇到想停下来的地方，就多待一会儿。"}</p><button className="sd-link" onClick={() => context.open("shared-space")}>把阅读留给周末<ArrowUpRight size={13} /></button></article>
        <article className="sd-post"><div className="sd-post-byline"><strong>美阳阳</strong><time>10:31</time></div><p>{ring ? "好。我想聊聊，为什么有时候读得慢，反而记得更清楚。" : "可能是因为，停下来的时候才开始和书里的话对话。"}</p></article>
        {(posts[value.id] ?? []).map((text, index) => <article className="sd-post" key={index}><div className="sd-post-byline"><strong>美阳阳</strong><small>模拟发送</small></div><p>{text}</p></article>)}
        <form className="sd-inline-compose" onSubmit={event => { event.preventDefault(); if (!draft.trim()) return; setPosts(previous => ({ ...previous, [value.id]: [...(previous[value.id] ?? []), draft] })); setPostDrafts(previous => ({ ...previous, [value.id]: "" })); setNotice("已模拟发布，没有对外发送。"); }}><textarea aria-label={ring ? "围炉发言" : "篝火发言"} placeholder="写一句…" value={draft} onChange={event => setPostDrafts(previous => ({ ...previous, [value.id]: event.target.value }))} /><footer><span>以美阳阳身份 · {ring ? "围炉成员可见" : "公开"}</span><button className="sd-primary" disabled={!draft.trim()}>发送</button></footer></form>
      </div>;
    }
    if (value.id === "reader-kit") return <div className="sd-detail"><div className="sd-kit-title"><BookOpen size={30} /><div><h1>共读工具</h1><p>Reader Kit · 示例工具</p></div></div><p>保存选中的摘录和出处，整理本机阅读笔记。</p>
      <div className="sd-kit-action">{install === "available" && <button className="sd-primary" onClick={() => setInstall("review")}>安装<ArrowRight size={14} /></button>}
        {install === "review" && <section className="sd-install-review" aria-label="安装审阅"><h2>安装到本机</h2><dl><dt>内容</dt><dd>共读工具 · 示例清单</dd><dt>依赖</dt><dd>此流程不下载依赖</dd></dl><div><button className="sd-primary" onClick={installKit}>模拟安装</button><button className="sw-text-button" onClick={() => setInstall("available")}>取消</button></div></section>}
        {install === "installing" && <p role="status" className="sd-install-status">正在模拟安装…<progress /></p>}
        {install === "installed" && <div className="sd-installed"><Check size={16} /><span>已安装 · 演示</span><button className="sd-link" onClick={() => context.open("local-tools")}>查看本机<ArrowUpRight size={13} /></button></div>}
      </div><h2>能力</h2><ul><li>摘录一段文字，保留原文链接。</li><li>把笔记保存到选定的本机目录。</li></ul><h2>来源</h2><p className="sd-note">这是用于验证安装往返的示例，不会运行安装命令。</p></div>;
    if (value.id === "local-tools") return <div className="sd-detail"><ToolScope selected="local" open={context.open} /><h1>本机工具</h1>{install === "installed" ? <button className="sd-list-row" onClick={() => context.open("reader-kit")}><PackageCheck size={20} /><span><strong>共读工具</strong><small>已安装 · 演示</small></span><ChevronRight size={15} /></button> : <p className="sd-note">{install === "installing" ? "共读工具正在模拟安装。" : "尚未安装示例工具。"}</p>}<button className="sd-link" onClick={() => context.open("reader-kit")}><ArrowLeft size={13} />返回安装来源</button></div>;
    if (value.id === "browser") return <div className="sd-detail"><div className="sd-address"><span>example.com</span><small>网页示例</small></div><h1>一起阅读的周末</h1><p>选一个下午，带一本书。不用准备完整的读书报告，带来想聊的那一段就好。</p><p className="sd-note">这里只展示网页阅读布局；真实浏览器保留在 Electron 客户端中。</p></div>;
    if (value.id === "preview") return <div className="sd-detail"><h1>交互预览</h1><p>示例数据，不连接真实 Being、不发送私信、不安装软件。</p><p>可以切换左侧功能和聊天场景、划词一起看、收起或恢复对话、交换左右位置，并体验私信回复和工具安装往返。</p></div>;
    if (value.id === "announcements") return <div className="sd-detail"><h1>公告</h1><article className="sd-post"><div className="sd-post-byline"><strong>周末共读</strong><time>9 月 27 日</time></div><p>这周从一篇短文开始。读到感兴趣的地方，可以去阅读小组继续聊。</p><button className="sd-link" onClick={() => context.open("fireside-reading")}>进入阅读小组<ArrowUpRight size={13} /></button></article></div>;
    const filterKey = `${context.scene.id}:${value.id}`;
    const filter = filters[filterKey] ?? { query: "", tab: "all" };
    const filterTabs = value.id === "inbox" ? [["all", "全部"], ["inbox", "收件箱"], ["sent", "已发送"]] : value.id === "scrolls" ? [["all", "全部"], ["public", "公开"], ["mine", "我的"]] : [];
    let entries = (rows[value.id] ?? []).filter(([, title, description]) => `${title}${description}`.toLowerCase().includes(filter.query.toLowerCase()));
    if (value.id === "inbox" && filter.tab === "sent") entries = sent ? [["mail-alice", "发给 Alice", sent]] : [];
    if (value.id === "scrolls" && filter.tab !== "all") entries = entries.filter(([id]) => filter.tab === "mine" ? id === "scene-notes" : id !== "scene-notes");
    return <div className="sd-detail">{value.id === "kits" && <ToolScope selected="grove" open={context.open} />}<div className="sd-list-heading"><h1>{value.title}</h1><div className="sd-list-search"><Search size={14} /><input placeholder="搜索" aria-label={`搜索${value.title}`} value={filter.query} onChange={event => setFilters(previous => ({ ...previous, [filterKey]: { ...filter, query: event.target.value } }))} /></div></div>
      {!!filterTabs.length && <div className="sd-filter-tabs">{filterTabs.map(([id, title]) => <button key={id} aria-pressed={filter.tab === id} onClick={() => setFilters(previous => ({ ...previous, [filterKey]: { ...filter, tab: id } }))}>{title}</button>)}</div>}
      <div className="sd-rows">{entries.map(([id, title, meta]) => <button className="sd-list-row" key={id} onClick={() => context.open(id)}>{value.id === "inbox" && <span className="sd-avatar">A</span>}<span><strong>{title}</strong><small>{meta}</small></span><ChevronRight size={15} /></button>)}{!entries.length && <p className="sd-note sd-list-empty">{filter.query ? "没有匹配的内容" : "暂无内容"}</p>}</div></div>;
  }
  return <div className={`sd-demo ${readable ? "sd-large-text" : ""}`}><SceneWorkspace state={state} dispatch={dispatch} resources={resources} being="美阳阳" notice={notice} sbs={sbs} onSbs={setSbs} renderResource={content} renderSettings={settings} onSubmit={submit} onSuggestion={adopt} /></div>;
}
function ToolScope({ selected, open }: { selected: string; open: (resource: string) => void }) { return <div className="sd-filter-tabs sd-tool-scope"><button aria-pressed={selected === "grove"} onClick={() => open("kits")}>工具库</button><button aria-pressed={selected === "local"} onClick={() => open("local-tools")}>本机</button></div>; }
function MailContent({ draft, onDraft, sent, pending, resolve, onSend }: { draft: string; onDraft: (text: string) => void; sent: string; pending: string | null; resolve: (action: "replace" | "append" | "cancel") => void; onSend: () => void }) {
  const [replyOpen, setReplyOpen] = useState(!!draft);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const previousDraft = useRef(draft);
  useEffect(() => { if (draft && !previousDraft.current) setReplyOpen(true); previousDraft.current = draft; }, [draft]);
  const show = replyOpen || !!pending;
  return <article className="sd-mail"><div className="sd-mail-meta"><div className="sd-avatar">A</div><div><strong>Alice</strong><small>发给美阳阳</small></div><time>今天 10:24</time></div><h1>一起读书的安排</h1>
    <div className="sd-mail-body"><p>美阳阳，</p><p>最近想和你一起慢慢读点东西。不用赶进度，每周选一小节，聊聊真正想继续想下去的问题。</p><p>我留了一篇短文，可以从它开始。如果你愿意，这个周末一起聊聊？</p><p>Alice</p></div>
    {!show && <button className="sd-reply-start" onClick={() => { setReplyOpen(true); requestAnimationFrame(() => textarea.current?.focus()); }}><Mail size={14} />{draft ? "继续回复 Alice" : "回复 Alice"}</button>}
    {show && <form className="sd-reply" onSubmit={event => { event.preventDefault(); if (!draft.trim()) return; onSend(); setReplyOpen(false); }}><div className="sd-reply-header"><span>回复 Alice</span><button type="button" aria-label="收起回复" onClick={() => setReplyOpen(false)} disabled={!!pending}><X size={14} /></button></div>
      {pending && <div className="sd-draft-choice"><span>已有回复草稿</span><div><button type="button" onClick={() => resolve("append")}>追加建议</button><button type="button" onClick={() => resolve("replace")}>替换草稿</button><button type="button" onClick={() => resolve("cancel")}>保留原文</button></div></div>}
      <textarea ref={textarea} aria-label="回复 Alice 的私信草稿" placeholder="写给 Alice…" value={draft} onChange={event => onDraft(event.target.value)} />
      <footer className="sd-reply-footer"><span>以美阳阳身份 · 仅 Alice 可见</span><button type="submit" className="sd-primary" disabled={!draft.trim()}>发送私信</button></footer></form>}
    {sent && <div className="sd-sent"><span><Check size={13} />已模拟发送</span><p>{sent}</p></div>}
  </article>;
}
createRoot(document.getElementById("root")!).render(<Demo />);
