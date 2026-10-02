import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeftRight, GripHorizontal, Maximize2, MessageCircle, PanelLeftClose, PanelRightClose, PanelRightOpen } from "lucide-react";
import { dockWidth, floatingRect, resizeFloating, type ChatPlacement } from "./placement";
import "./panel-layout.css";

type Props = {
  placement: ChatPlacement;
  onChange: (placement: ChatPlacement) => void;
  title: ReactNode;
  label: string;
  hasContent: boolean;
  content: ReactNode;
  children: ReactNode;
};
export function PanelLayout({ placement, onChange, title, label, hasContent, content, children }: Props) {
  const root = useRef<HTMLDivElement>(null), edge = useRef<HTMLButtonElement>(null), panel = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 700 });
  const [resizing, setResizing] = useState(false);
  const [preview, setPreview] = useState<ChatPlacement | null>(null);
  const gesture = useRef<{ x: number; y: number; start: ChatPlacement; kind: "resize" | "move" | "float-size"; element: HTMLElement; pointer: number } | null>(null);
  const latest = useRef(placement); latest.current = preview ?? placement;
  const restoreFocus = useRef(false);
  const shown = preview ?? placement;
  const floating = floatingRect(shown, size.width, size.height);
  const stacked = hasContent && size.width < 600;
  // Empty content needs no split; preserve the saved arrangement for its return.
  const mode = hasContent ? shown.mode : "docked";
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(measure); observer.observe(element); measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setPreview(null); gesture.current = null; setResizing(false); }, [placement]);
  useEffect(() => {
    if (!resizing) return;
    const cancel = () => {
      const current = gesture.current;
      gesture.current = null; setPreview(null); setResizing(false);
      if (current?.element.hasPointerCapture(current.pointer)) current.element.releasePointerCapture(current.pointer);
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); cancel(); } };
    window.addEventListener("keydown", key); window.addEventListener("blur", cancel);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("blur", cancel); };
  }, [resizing]);
  useLayoutEffect(() => {
    window.dispatchEvent(new Event("beings:panel-layout"));
    if (mode === "edge" && restoreFocus.current) { edge.current?.focus(); restoreFocus.current = false; }
  }, [shown, size, resizing, mode, hasContent]);
  const changeMode = (mode: ChatPlacement["mode"]) => {
    restoreFocus.current = mode === "edge";
    onChange({ ...placement, mode });
    if (mode !== "edge") requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
  };
  const start = (event: React.PointerEvent<HTMLElement>, kind: NonNullable<typeof gesture.current>["kind"]) => {
    if (event.button !== 0) return;
    event.preventDefault();
    gesture.current = { x: event.clientX, y: event.clientY, start: placement, kind, element: event.currentTarget, pointer: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId); setResizing(true);
  };
  const move = (event: React.PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    const next = structuredClone(current.start);
    if (current.kind === "resize") next.width = Math.max(280, Math.min(960, dockWidth(current.start.width, size.width) + dx * (next.side === "right" ? -1 : 1)));
    else if (current.kind === "float-size") {
      const origin = floatingRect(current.start, size.width, size.height);
      next.floating = resizeFloating(current.start, origin.width + dx, origin.height + dy, size);
    } else {
      const box = floatingRect(current.start, size.width, size.height);
      next.floating.x = Math.max(0, Math.min(1, (box.x - 8 + dx) / Math.max(1, size.width - box.width - 16)));
      next.floating.y = Math.max(0, Math.min(1, (box.y - 8 + dy) / Math.max(1, size.height - box.height - 16)));
    }
    latest.current = next; setPreview(next);
  };
  const finish = (event: React.PointerEvent<HTMLElement>, cancel = false) => {
    if (!gesture.current) return;
    if (!cancel) onChange(latest.current);
    gesture.current = null; setPreview(null); setResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const gestureProps = { onPointerMove: move, onPointerUp: (event: React.PointerEvent<HTMLElement>) => finish(event),
    onPointerCancel: (event: React.PointerEvent<HTMLElement>) => finish(event, true),
    onLostPointerCapture: () => { gesture.current = null; setPreview(null); setResizing(false); } };
  const button = (name: string, icon: ReactNode, action: () => void) =>
    <button type="button" className="placement-button" aria-label={name} title={name} onClick={action}>{icon}</button>;
  return <div ref={root} className="panel-layout" data-mode={mode} data-single={!hasContent} data-side={shown.side} data-stacked={stacked} data-resizing={resizing}
    style={{ "--chat-width": `${dockWidth(shown.width, size.width)}px` } as CSSProperties}>
    <section className="placement-content" aria-label="内容面板" hidden={!hasContent}>{content}</section>
    <div className="placement-divider" role="separator" tabIndex={0} aria-label="调整对话宽度" aria-orientation="vertical"
      aria-valuemin={280} aria-valuemax={Math.min(960, Math.max(280, size.width - 280))} aria-valuenow={Math.round(dockWidth(shown.width, size.width))}
      hidden={!hasContent || mode !== "docked" || stacked} onPointerDown={event => start(event, "resize")} {...gestureProps}
      onDoubleClick={() => onChange({ ...placement, width: 420 })} onKeyDown={event => {
        let width = dockWidth(placement.width, size.width);
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") width += (event.shiftKey ? 64 : 24) * (event.key === "ArrowLeft" ? -1 : 1) * (placement.side === "right" ? -1 : 1);
        else if (event.key === "Home") width = 280;
        else if (event.key === "End") width = size.width - 280;
        else return;
        event.preventDefault(); onChange({ ...placement, width: Math.max(280, Math.min(960, dockWidth(width, size.width))) });
      }} />
    {/* This DOM stays mounted when docking, collapsing or floating; iframe state survives. */}
    <section ref={panel} className="placement-chat" tabIndex={-1} aria-label={label} hidden={mode === "edge"}
      style={mode === "floating" ? { left: floating.x, top: floating.y, width: floating.width, height: floating.height } : undefined}>
      <header className="placement-chat-header">
        {mode === "floating" && <div className="placement-move" role="button" tabIndex={0} aria-label="移动浮动对话" title="拖动移动；方向键微调"
          onPointerDown={event => start(event, "move")} {...gestureProps} onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault(); const f = { ...placement.floating };
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") f.x = Math.max(0, Math.min(1, f.x + (event.key === "ArrowLeft" ? -.05 : .05)));
            else f.y = Math.max(0, Math.min(1, f.y + (event.key === "ArrowUp" ? -.05 : .05)));
            onChange({ ...placement, floating: f });
          }}><GripHorizontal size={14} /></div>}
        <div className="placement-chat-title">{title}</div>
        <div className="placement-chat-actions" hidden={!hasContent}>
          {mode === "docked" && button(shown.side === "right" ? "对话移到左侧" : "对话移到右侧", <ArrowLeftRight size={15} />, () => onChange({ ...placement, side: placement.side === "right" ? "left" : "right" }))}
          {button(mode === "floating" ? "停靠对话" : "浮动对话", mode === "floating" ? <PanelRightOpen size={15} /> : <Maximize2 size={15} />, () => changeMode(mode === "floating" ? "docked" : "floating"))}
          {button("贴边收起对话", shown.side === "right" ? <PanelRightClose size={15} /> : <PanelLeftClose size={15} />, () => changeMode("edge"))}
        </div>
      </header>
      <div className="placement-chat-body">{children}</div>
      {mode === "floating" && <div className="placement-float-resize" role="button" tabIndex={0} aria-label="调整浮动对话大小"
        onPointerDown={event => start(event, "float-size")} {...gestureProps} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault(); const f = { ...placement.floating };
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") f.width = Math.max(280, Math.min(960, f.width + (event.key === "ArrowLeft" ? -24 : 24)));
          else f.height = Math.max(240, Math.min(1200, f.height + (event.key === "ArrowUp" ? -24 : 24)));
          onChange({ ...placement, floating: resizeFloating(placement, f.width, f.height, size) });
        }} />}
    </section>
    <button ref={edge} className="placement-edge" hidden={mode !== "edge"} aria-label={`展开对话：${label}`} title={`展开对话：${label}`} onClick={() => changeMode("docked")}>
      <MessageCircle size={18} /><span>{label}</span><PanelRightOpen size={16} />
    </button>
    {resizing && <div className="placement-drag-shield" />}
  </div>;
}
