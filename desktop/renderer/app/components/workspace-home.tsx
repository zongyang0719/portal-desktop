import { useEffect, useRef, useState, type ReactNode } from "react";
import type { EditorView } from "@codemirror/view";
import { ArrowLeft, ArrowUp, ArrowUpRight, Files, MoreHorizontal, X } from "lucide-react";
import { ComposerField } from "../../chat/components/composer-field";
import { Dialog } from "../../shared/components/dialog";
import "./workspace.css";

export type WorkspacePresence = "idle" | "thinking" | "streaming" | "error" | "unknown";
export const presenceLabels: Record<WorkspacePresence, string> = {
  idle: "在场", thinking: "正在思考", streaming: "正在回复", error: "操作失败", unknown: "状态未知",
};

/** Presentation only. The host owns sessions, persistence, events and sending. */
export function Workspace({ navigation, home, title, excerpt, unread, children, draft, quote,
  presence, presenceDescription, outputPulse = 0, connectionNotice, feedback, submitLabel,
  onHome, onContinue, onObjects, onMore, onPresence, onDraft, onSubmit, onRemoveQuote,
}: {
  navigation: ReactNode; home: boolean; title: string;
  excerpt?: { author: string; time: string; text: string };
  unread?: { source: string; summary: string; time: string; onOpen: () => void };
  children: ReactNode; draft: string; quote?: string; presence: WorkspacePresence;
  presenceDescription: string; outputPulse?: number; connectionNotice?: ReactNode;
  feedback?: string; submitLabel: string;
  onHome: () => void; onContinue: () => void; onObjects: () => void;
  onMore: () => void; onPresence: () => void; onDraft: (text: string) => void;
  onSubmit: () => void; onRemoveQuote: () => void;
}) {
  const editor = useRef<EditorView | null>(null);
  const [paused, setPaused] = useState(true);
  useEffect(() => {
    const update = () => setPaused(document.hidden || !document.hasFocus());
    update();
    window.addEventListener("focus", update); window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update); window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return <main id="client-main" className="workspace-shell" data-paused={paused}>
    <div className="workspace-body"><div className="workspace-stage">
      <header className="topbar">
        {navigation}
        <div className="topbar-actions">
          {!home && <button className="ws-icon" onClick={onObjects} aria-label="打开当前场景物件" title="场景物件"><Files /></button>}
          <button className="ws-icon" onClick={onMore} aria-label="更多与预览设置" title="更多"><MoreHorizontal /></button>
        </div>
      </header>
      <section id="chat-view" className="ws-view" aria-label={home ? "进门页" : title}>
        {connectionNotice && <div className="ws-connection" role="status">{connectionNotice}</div>}
        <div className="ws-reading">
          {home ? <section className="ws-landing" aria-label="上次聊到这里">
            {excerpt && <p className="ws-signature">{excerpt.author}<time>{excerpt.time}</time></p>}
            <p className="ws-excerpt">{excerpt?.text ?? "从一个念头开始。"}</p>
            <button className="ws-continue" onClick={onContinue}>{excerpt ? "接着聊" : "开始聊"}<ArrowUpRight /></button>
            {unread && <button className="ws-unread" onClick={unread.onOpen} aria-label={`未读消息：${unread.summary}`}>
              <span className="ws-unread-dot" aria-hidden="true" /><span>{unread.source}</span>
              <span className="ws-unread-summary">{unread.summary}</span><time>{unread.time}</time>
            </button>}
          </section> : <section className="ws-conversation" aria-label="对话内容">
            <button className="ws-back" onClick={onHome}><ArrowLeft />进门页</button>
            {children}
          </section>}
          <form className="ws-composer" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
            {quote && <div className="ws-quote"><span>引用：{quote}</span><button className="ws-icon" type="button" onClick={onRemoveQuote} aria-label="移除引用"><X /></button></div>}
            <div className="ws-input-row">
              <button type="button" className="ws-presence" onClick={onPresence} aria-label={presenceDescription} title={presenceDescription}>
                <span key={presence === "streaming" ? outputPulse : presence} className="ws-presence-dot" data-state={presence} data-pulse={outputPulse > 0} aria-hidden="true" />
              </button>
              <ComposerField editorRef={editor} id="workspace-input" value={draft} placeholder="说点什么…" onChange={onDraft}
                onCompositionStart={() => {}} onCompositionEnd={() => {}}
                onKeyDown={event => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.isComposing && event.keyCode !== 229) {
                    event.preventDefault(); onSubmit();
                  }
                }} />
              <button className="ws-submit" type="submit" aria-label={submitLabel} title={submitLabel}><ArrowUp /></button>
            </div>
            <p className="ws-feedback" role="status">{feedback}</p>
          </form>
        </div>
      </section>
    </div></div>
  </main>;
}

export function WorkspaceSheet({ title, open, kind = "drawer", onClose, children }: {
  title: string; open: boolean; kind?: "drawer" | "menu" | "settings";
  onClose: () => void; children: ReactNode;
}) {
  return <Dialog className={`workspace-sheet ws-sheet-${kind}`} open={open} onClose={onClose} aria-labelledby="ws-sheet-title" dismissOnBackdrop>
    <header className="ws-sheet-heading"><h2 id="ws-sheet-title">{title}</h2><button className="ws-icon" aria-label="关闭" onClick={onClose}><X /></button></header>
    <div className="ws-sheet-content">{children}</div>
  </Dialog>;
}
