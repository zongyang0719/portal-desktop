import { ArrowUpRight, ChevronDown, X } from "lucide-react";
import type { ChatReference } from "../models/references";
import "./composer-references.css";

export function ComposerReferences({ references, onRemove, onSource }: {
  references: ChatReference[];
  onRemove: (id: string) => void;
  onSource: (id: string) => void;
}) {
  if (!references.length) return null;
  return <div className="composer-references" aria-label="随这条消息发送的引用">
    {references.map(reference => <div className="composer-reference" key={reference.id}>
      <details>
        <summary title="展开引用全文">
          <span className="reference-origin">{reference.source}</span>
          <span className="reference-title">{reference.title}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <blockquote>{reference.excerpt}</blockquote>
      </details>
      <div className="reference-actions">
        <button type="button" aria-label={`回到出处：${reference.title}`} title="回到出处" onClick={() => onSource(reference.id)}><ArrowUpRight size={15} aria-hidden="true" /></button>
        <button type="button" aria-label={`移除引用：${reference.title}`} title="移除引用" onClick={() => onRemove(reference.id)}><X size={14} aria-hidden="true" /></button>
      </div>
    </div>)}
  </div>;
}
