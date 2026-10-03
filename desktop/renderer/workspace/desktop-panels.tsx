import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeftRight, GripVertical, MoreHorizontal, PanelBottomClose, PanelBottomOpen, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PanelTopClose, PanelTopOpen, X } from "lucide-react";
import { Group, Handle, Panel, Separator } from "motion-panels/react";
import { floatingRect, resizeFloating } from "./placement";
import type { DesktopPlacement, PanelId } from "./desktop-placement";
import "./desktop-panels.css";

type Props = {
  placement: DesktopPlacement;
  onChange: (placement: DesktopPlacement) => void;
  onCloseContent: () => void;
  hasContent: boolean;
  contentLabel: string;
  chatLabel: string;
  chatTitle: ReactNode;
  content: ReactNode;
  children: ReactNode;
};
type FloatGesture = { id: PanelId; kind: "move" | "resize"; x: number; y: number; start: DesktopPlacement; element: HTMLElement; pointer: number };
const field = (id: PanelId) => id === "chat" ? "chat" : "contentPanel";
const other = (id: PanelId): PanelId => id === "chat" ? "content" : "chat";

/** Docked resizing, folding and handle reordering use motion-panels itself. */
export function DesktopPanels({ placement, onChange, onCloseContent, hasContent, contentLabel, chatLabel, chatTitle, content, children }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const chat = useRef<HTMLElement>(null), reading = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 700 });
  const [preview, setPreview] = useState<DesktopPlacement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [menu, setMenu] = useState<PanelId | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<FloatGesture | null>(null);
  const current = preview ?? placement;
  const latest = useRef(current);
  latest.current = current;
  const stacked = hasContent && size.width < 600;
  const floated = (id: PanelId) => hasContent && current[field(id)].mode === "floating";
  const collapsed = (id: PanelId) => hasContent && (current[field(id)].mode === "edge" || current.focused === other(id));
  const hidden = (id: PanelId) => id === "content" && !hasContent || collapsed(id);
  const split = hasContent && !floated("chat") && !floated("content") && !collapsed("chat") && !collapsed("content");
  const side = (id: PanelId) => id === "chat" ? current.chat.side : current.chat.side === "left" ? "right" : "left";
  const leading: PanelId = !hasContent || floated("content") || collapsed("content") ? "chat"
    : floated("chat") || collapsed("chat") ? "content"
    : current.chat.side === "left" ? "chat" : "content";

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(element); measure();
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => { window.dispatchEvent(new Event("beings:panel-layout")); }, [current, size]);
  const cancel = () => {
    const active = gesture.current;
    gesture.current = null;
    setPreview(null); setDragging(false);
    if (active?.element.hasPointerCapture(active.pointer)) active.element.releasePointerCapture(active.pointer);
  };
  useEffect(() => { if (gesture.current) cancel(); }, [placement]);
  useEffect(() => {
    if (!dragging) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); cancel(); } };
    window.addEventListener("keydown", key, true);
    window.addEventListener("blur", cancel);
    return () => { window.removeEventListener("keydown", key, true); window.removeEventListener("blur", cancel); };
  }, [dragging]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: Event) => {
      if (!(event.target as Element).closest?.(".desktop-pane-menu,.desktop-more")) setMenu(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault(); setMenu(null);
      root.current?.querySelector<HTMLButtonElement>(`[data-panel-id="${menu}"] .desktop-more`)?.focus();
    };
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    window.addEventListener("pointerdown", outside); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("pointerdown", outside); window.removeEventListener("keydown", key); };
  }, [menu]);

  const save = (next: DesktopPlacement) => { setMenu(null); onChange(next); };
  const reveal = (id: PanelId) => {
    save({ ...placement, focused: null, [field(id)]: { ...placement[field(id)], mode: "docked" } });
    requestAnimationFrame(() => (id === "chat" ? chat : reading).current?.focus({ preventScroll: true }));
  };
  const collapse = (id: PanelId) => {
    const peer = other(id);
    save({ ...placement, focused: null, [field(id)]: { ...placement[field(id)], mode: "edge" },
      [field(peer)]: { ...placement[field(peer)], mode: "docked" } });
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(`[data-reopen="${id}"]`)?.focus());
  };
  const float = (id: PanelId) => {
    const peer = other(id);
    save({ ...placement, focused: null, [field(id)]: { ...placement[field(id)], mode: placement[field(id)].mode === "floating" ? "docked" : "floating" },
      [field(peer)]: { ...placement[field(peer)], mode: "docked" } });
  };
  const swap = () => save({ ...placement, chat: { ...placement.chat, side: placement.chat.side === "left" ? "right" : "left" } });
  const startFloat = (event: React.PointerEvent<HTMLElement>, id: PanelId, kind: FloatGesture["kind"]) => {
    if (event.button !== 0 || !floated(id)) return;
    event.preventDefault(); event.stopPropagation();
    gesture.current = { id, kind, x: event.clientX, y: event.clientY, start: placement, element: event.currentTarget, pointer: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId); setDragging(true);
  };
  const moveFloat = (event: React.PointerEvent<HTMLElement>) => {
    const active = gesture.current;
    if (!active || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - active.x, dy = event.clientY - active.y;
    const next = structuredClone(active.start);
    const box = floatingRect(active.start[field(active.id)], size.width, size.height);
    if (active.kind === "resize") next[field(active.id)].floating = resizeFloating(next[field(active.id)], box.width + dx, box.height + dy, size);
    else {
      next[field(active.id)].floating.x = Math.max(0, Math.min(1, (box.x - 8 + dx) / Math.max(1, size.width - box.width - 16)));
      next[field(active.id)].floating.y = Math.max(0, Math.min(1, (box.y - 8 + dy) / Math.max(1, size.height - box.height - 16)));
    }
    latest.current = next; setPreview(next);
  };
  const finishFloat = () => {
    if (!gesture.current) return;
    const result = latest.current;
    cancel(); onChange(result);
  };
  const floatProps = { onPointerMove: moveFloat, onPointerUp: finishFloat, onPointerCancel: cancel, onLostPointerCapture: cancel };
  const floatingStyle = (id: PanelId): CSSProperties | undefined => {
    if (!floated(id)) return;
    const box = floatingRect(current[field(id)], size.width, size.height);
    return { left: id === "chat" && side(id) === "right" ? box.x - size.width : box.x,
      top: box.y, width: box.width, height: box.height };
  };
  const pane = (id: PanelId, title: ReactNode, body: ReactNode) => {
    const label = id === "chat" ? "对话" : contentLabel;
    const Close = stacked ? side(id) === "left" ? PanelTopClose : PanelBottomClose
      : side(id) === "left" ? PanelLeftClose : PanelRightClose;
    return <section ref={id === "chat" ? chat : reading} className={`desktop-pane placement-${id}`}
      data-panel-id={id} data-pane-hidden={hidden(id)} data-floating={floated(id)} data-leading={id === leading} style={floatingStyle(id)}
      aria-label={id === "chat" ? chatLabel : contentLabel} aria-hidden={hidden(id)} inert={hidden(id)} tabIndex={-1}>
      <header className="desktop-pane-header" data-movable={floated(id)}
        onPointerDown={event => { if (!(event.target as Element).closest("button")) startFloat(event, id, "move"); }} {...floatProps}>
        {split && <Handle className="desktop-panel-grip" aria-label={`拖动${label}面板调整顺序`} title="向另一面板拖动换位；方向键换位"><GripVertical size={14} /></Handle>}
        {floated(id) && <button type="button" className="desktop-panel-grip" aria-label={`移动${label}浮窗`} title="拖动移动浮窗"
          onPointerDown={event => startFloat(event, id, "move")} {...floatProps}><GripVertical size={14} /></button>}
        <div className="desktop-pane-title">{title}</div>
        {hasContent && <div className="desktop-pane-actions">
          <button type="button" className="placement-button" aria-label={`收起${label}面板`} title="收起面板" onClick={() => collapse(id)}><Close size={16} /></button>
          {id === "content" && <button type="button" className="placement-button desktop-close" aria-label={`关闭${label}面板`} title="关闭面板" onClick={onCloseContent}><X size={16} /></button>}
          <button type="button" className="placement-button desktop-more" aria-label={`${label}面板更多操作`} title="面板更多操作" aria-expanded={menu === id} onClick={() => setMenu(menu === id ? null : id)}><MoreHorizontal size={16} /></button>
        </div>}
        {menu === id && <div ref={menuRef} className="desktop-pane-menu" aria-label={`${label}面板操作`}>
          <button type="button" onClick={() => float(id)}>{floated(id) ? "停靠为分栏" : "浮动此面板"}</button>
        </div>}
      </header>
      <div className="desktop-pane-body">{body}</div>
      {floated(id) && <div className="desktop-float-resize" role="button" tabIndex={0} aria-label={`调整${label}浮窗大小`}
        onPointerDown={event => startFloat(event, id, "resize")} {...floatProps} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault(); const f = current[field(id)].floating;
          save({ ...placement, [field(id)]: { ...current[field(id)], floating: resizeFloating(current[field(id)],
            f.width + (event.key === "ArrowLeft" ? -24 : event.key === "ArrowRight" ? 24 : 0),
            f.height + (event.key === "ArrowUp" ? -24 : event.key === "ArrowDown" ? 24 : 0), size) } });
        }} />}
    </section>;
  };
  const chatFull = !hasContent || collapsed("content") || floated("content");
  const chatFolded = collapsed("chat");
  const panelSize: number | `${number}%` = floated("chat") ? 0 : chatFull ? "100%" : stacked ? `${Math.round(current.stackedRatio * 100)}%` : current.chat.width;
  const panelMax: number | `${number}%` = floated("chat") ? 0 : chatFull ? "100%" : stacked ? "75%" : Math.max(280, Math.min(960, size.width - 280));
  const chatPanel = <Panel key="chat" value="chat" className="desktop-chat-slot" data-floating={floated("chat")} style={{ height: "100%" }}
    size={panelSize} minSize={floated("chat") ? 0 : stacked ? "25%" : 280} maxSize={panelMax} collapsed={chatFolded} keepMounted
    onSizeChange={value => {
      if (!split) return;
      if (stacked) {
        const ratio = Number.parseFloat(String(value)) / 100;
        if (Number.isFinite(ratio) && Math.abs(ratio - placement.stackedRatio) > .002)
          onChange({ ...placement, stackedRatio: Math.max(.25, Math.min(.75, ratio)) });
      } else if (typeof value === "number" && Math.abs(value - placement.chat.width) >= 1)
        onChange({ ...placement, chat: { ...placement.chat, width: Math.round(value) } });
    }}
    onCollapsedChange={value => { if (split && value) collapse("chat"); }}>
    {pane("chat", chatTitle, children)}
  </Panel>;
  const contentPanel = <Panel key="content" value="content" className="desktop-content-slot" style={{ overflow: floated("content") ? "visible" : "clip" }}>
    {pane("content", <strong>{contentLabel}</strong>, content)}
  </Panel>;
  const divider = split && <Separator key="divider" className="desktop-divider" aria-label="拖动调整面板比例" style={{ width: stacked ? "100%" : 7, height: stacked ? 7 : "100%" }} />;
  return <div ref={root} className="desktop-panels panel-layout" data-side={current.chat.side} data-stacked={stacked}
    data-resizing={dragging} data-floating={floated("chat") || floated("content")}>
    <Group key={stacked ? "vertical" : "horizontal"} orientation={stacked ? "vertical" : "horizontal"}
      order={current.chat.side === "left" ? ["chat", "content"] : ["content", "chat"]}
      onOrderChange={order => {
        if (split && order[0] !== (placement.chat.side === "left" ? "chat" : "content")) swap();
      }}
      style={{ overflow: floated("chat") || floated("content") ? "visible" : "clip" }}>
      {current.chat.side === "left" ? [chatPanel, divider, contentPanel] : [contentPanel, divider, chatPanel]}
    </Group>
    {split && <button type="button" className="desktop-swap" aria-label={stacked ? "交换上下两个面板" : "交换左右两个面板"}
      title="交换两个面板" style={stacked ? { left: "50%", top: `${(current.chat.side === "left" ? current.stackedRatio : 1 - current.stackedRatio) * 100}%` }
        : { left: current.chat.side === "left" ? current.chat.width : size.width - current.chat.width, top: "50%" }} onClick={swap}>
      <ArrowLeftRight size={14} />
    </button>}
    {(["chat", "content"] as const).map(id => {
      const Open = stacked ? side(id) === "left" ? PanelTopOpen : PanelBottomOpen
        : side(id) === "left" ? PanelLeftOpen : PanelRightOpen;
      return <button type="button" key={id} className="desktop-folded" data-side={side(id)} data-reopen={id}
        hidden={!collapsed(id)} aria-label={`展开${id === "chat" ? "对话" : contentLabel}面板`} onClick={() => reveal(id)}>
        <Open size={16} /><span>{id === "chat" ? chatLabel : contentLabel}</span>
      </button>;
    })}
    {dragging && <div className="placement-drag-shield" />}
  </div>;
}
