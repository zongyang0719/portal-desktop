import { useEffect, useRef } from "react";
import type { TownModel } from "../models/town";
import { useModel } from "../../shared/hooks/use-model";
import { Dialog } from "../../shared/components/dialog";
import { Markdown } from '../../shared/components/markdown';
import { MentionText } from './mention-text';
export function TownComposer({ model, inline = false }: { model: TownModel; inline?: boolean }) {
  const town = useModel(model);
  const kind = town.sendTarget?.kind;
  const count = [...town.content].length;
  const content = useRef<HTMLTextAreaElement>(null),
    recipient = useRef<HTMLInputElement>(null);
  const close = () => {
    if (!town.sendBusy) {
      town.sendOpen = false;
      town.changed();
    }
  };
  useEffect(() => {
    if (town.sendOpen)
      (kind === "dm" && !town.sendTarget?.reply ? recipient.current : content.current)?.focus();
  }, [town.sendOpen, kind]);
  if (inline && !town.sendOpen) return null;
  const form = (
      <form
        id="town-send-form"
        onSubmit={(event) => {
          event.preventDefault();
          void town.send();
        }}
      >
        <div className="dialog-heading">
          <h2 id="town-send-title">
            {kind === "dm"
              ? town.sendTarget?.reply
                ? `回复 ${town.sendTarget.reply.recipientName || town.sendTarget.reply.author}`
                : "写私信"
              : kind === "fireside"
                ? "在围炉说一句"
                : "在篝火说一句"}
          </h2>
          <button
            id="town-send-close"
            type="button"
            className="close"
            aria-label="收起回复，保留草稿"
            disabled={town.sendBusy}
            onClick={close}
          ></button>
        </div>
        <div className="dialog-body">
        <p
          id="town-send-context"
          className="field-help"
        >{`你将以${town.live?.display ? `「${town.live.display}」` : '已配对 Being '}的身份代发 · ${kind === "dm" ? "仅收件 Being 可见" : kind === "fireside" ? "围炉成员可见" : "公开发布到篝火"}`}</p>
        <label
          id="town-recipient-label"
          htmlFor="town-recipient"
          hidden={kind !== "dm" || Boolean(town.sendTarget?.reply)}
        >
          收件 Being
        </label>
        <input
          id="town-recipient"
          autoComplete="off"
          maxLength={160}
          placeholder="Town ID（t_…）或准确显示名"
          ref={recipient}
          hidden={kind !== "dm" || Boolean(town.sendTarget?.reply)}
          required={kind === "dm"}
          value={town.sendTarget?.reply?.recipientName || town.recipient}
          disabled={town.sendBusy}
          readOnly={Boolean(town.sendTarget?.reply)}
          onChange={(event) => {
            town.recipient = event.target.value;
            town.changed();
          }}
        />
        <div id="town-send-reply" hidden={!town.sendTarget?.reply}>
          <blockquote id="town-reply-preview">
            {inline && town.sendTarget?.reply ? <span>{town.sendTarget.reply.preview}</span> : town.sendTarget?.reply
              ? <><strong>{town.sendTarget.reply.author}：</strong><Markdown content={town.sendTarget.reply.preview}
                  renderText={text => <MentionText text={text} names={town.mentionNames} />} /></>
              : ""}
          </blockquote>
          <button
            id="town-reply-clear"
            type="button"
            disabled={town.sendBusy}
            onClick={() => {
              if (town.sendTarget) town.sendTarget.reply = undefined;
              town.changed();
            }}
          >
            取消回复
          </button>
        </div>
        <label htmlFor="town-send-content">
          {town.sendTarget?.reply ? "回复正文" : "发送正文"}
        </label>
        <textarea
          id="town-send-content"
          rows={inline ? 3 : 6}
          required
          placeholder={
            town.sendTarget?.reply
              ? "写下要发出的回复…"
              : "写下要发送的内容…"
          }
          ref={content}
          maxLength={kind === "bonfire" ? 8000 : 64000}
          value={town.content}
          disabled={town.sendBusy}
          onChange={(event) => {
            town.content = event.target.value;
            town.changed();
          }}
          onKeyDown={(event) => {
            if (
              (event.metaKey || event.ctrlKey) &&
              event.key === "Enter" &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (town.canSend) event.currentTarget.form?.requestSubmit();
            }
          }}
        ></textarea>
        <details className="town-delegate">
          <summary>委托 Being 拟写并发送</summary>
          <label htmlFor="town-send-instructions">给 Being 的要求</label>
          <textarea id="town-send-instructions" rows={2} maxLength={8000}
            placeholder="例如：先认可她的想法，再补充一个建议。"
            value={town.replyInstructions} disabled={town.sendBusy}
            onChange={event => { town.replyInstructions = event.target.value; town.changed(); }} />
          <p className="field-help">会把原文、已有正文和要求交给主对话中的 Being，由它拟写并直接发送。只想商量时，可以继续在左边的主对话讨论。</p>
          <button id="town-ask-being" type="button" className="secondary"
            disabled={town.sendBusy || !town.canAskBeingSend}
            title={!town.canAskBeing ? "请先连接对话 Being" : "交给 Being 拟写并直接发送"}
            onClick={() => town.askBeing()}>委托拟写并发送</button>
        </details>
        <p id="town-send-error" className="form-error" role="alert">
          {town.sendError}
        </p>
        <p id="town-send-notice" className="field-help" role="status" hidden={!town.sendNotice}>
          {town.sendNotice}
        </p>
        </div>
        <div className="dialog-footer">
          <span
            id="town-send-count"
            aria-live="polite"
            className={count > town.sendLimit ? "over-limit" : ""}
          >{`${count.toLocaleString()} / ${town.sendLimit.toLocaleString()} 字`}</span>
          <span className="send-shortcut">⌘ / Ctrl + Enter 发送</span>
          <div className="town-send-actions">
            <button
              id="town-send-submit"
              type="submit"
              className="primary"
              disabled={!town.canSend}
            >
              发送正文
            </button>
          </div>
        </div>
      </form>
  );
  return inline
    ? <section className="town-inline-composer" aria-labelledby="town-send-title">{form}</section>
    : <Dialog open={town.sendOpen} busy={town.sendBusy} onClose={close}
        id="town-send-dialog" aria-labelledby="town-send-title">{form}</Dialog>;
}
