import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, BookText, MessageCircle, Compass, ContactRound, Flame, Globe, Mail, Megaphone, Search, Settings, Sprout, Users, Wrench } from "lucide-react";
import { townPlaces } from "../../shared/components/town-icons";
import type { AppModel } from "../models/app";
import { useModel } from "../../shared/hooks/use-model";

export const destinations = [
  ["town", "小镇", Compass], ["mail", "私信", Mail], ["firesides", "围炉", Users], ["bonfire", "篝火", Flame],
  ["seeds", "花园", Sprout], ["embers", "书架", BookOpen], ["scrolls", "卷轴", BookText],
  ["kits", "工具库", Wrench], ["contacts", "通讯录", ContactRound], ["announcements", "公告", Megaphone], ["browser", "浏览器", Globe],
] as const;
export function DesktopRail({ model, triggerRef }: { model: AppModel; triggerRef: (element: HTMLDivElement | null) => void }) {
  const app = useModel(model), town = useModel(app.town);
  return <nav className="desktop-rail" aria-label="功能导航">
    <div ref={triggerRef} className="desktop-scene-trigger" />
    <div className="desktop-rail-links">
      {destinations.map(([view, label, Icon]) => {
        const original = townPlaces.find(place => place.view === view);
        return <button type="button" key={view} aria-label={label}
        aria-current={(view === "browser" ? app.browserVisible : !app.browserVisible && app.view === view) ? "page" : undefined} onClick={() => app.openFeature(view)}>
        {original ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{original.icon}</svg> : <Icon size={19} />}<span className="desktop-rail-label">{label}</span>
        {(["mail", "firesides", "bonfire"] as string[]).includes(view) && town.unread(view as "mail" | "firesides" | "bonfire") && <i className="destination-unread" aria-label="有新动态" />}
      </button>;
      })}
    </div>
    <button type="button" aria-label="查找对话" title="查找对话" disabled={!app.snapshot?.settings.hasToken}
      onClick={() => app.openSearch()}><Search size={19} /></button>
    <button type="button" aria-label="设置" onClick={() => void app.openClientSettings()}><Settings size={19} /><span className="desktop-rail-label">设置</span></button>
  </nav>;
}


/** The same destinations become labelled groups when the sidebar expands. */
export function WorkspaceNavigation({ model }: { model: AppModel }) {
  const app = useModel(model), town = useModel(app.town);
  const [menu, setMenu] = useState<{ kind: "view" | "scene"; id: string; label: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); setMenu(null); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [menu]);
  const showMenu = (event: React.MouseEvent | React.KeyboardEvent, kind: "view" | "scene", id: string, label: string) => {
    event.preventDefault(); event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = "clientX" in event && event.clientX ? event.clientX : rect.left;
    const y = "clientY" in event && event.clientY ? event.clientY : rect.bottom;
    setMenu({ kind, id, label, x: Math.max(8, Math.min(x, window.innerWidth - 200)), y: Math.max(8, Math.min(y, window.innerHeight - 48)) });
  };
  const pinned = app.favorites.flatMap(item => {
    if (item.kind === "scene") {
      const scene = app.snapshot?.chatSessions?.find(scene => scene.scene_id === item.id);
      return scene ? [{ ...item, label: scene.scene_meta.scene_label, Icon: MessageCircle }] : [];
    }
    const destination = destinations.find(([id]) => id === item.id);
    return destination ? [{ ...item, label: destination[1], Icon: destination[2] }] : [];
  });
  const active = (view: string) => view === "browser" ? app.browserVisible : !app.browserVisible && app.view === view;
  const messages = new Set(["mail", "firesides", "bonfire", "announcements"]);
  return <nav className="workspace-navigation" aria-label="功能与置顶">
    {pinned.length > 0 && <section className="workspace-favorites" aria-label="置顶">
      <div className="workspace-section-label">置顶</div>
      {pinned.map(({ kind, id, label, Icon }) => <div className="workspace-nav-row" key={`${kind}:${id}`}>
        <button type="button" className="workspace-nav-link" title={label}
          aria-label={`打开置顶${kind === "scene" ? "场景" : "功能"}：${label}`}
          aria-haspopup="menu" aria-keyshortcuts="Shift+F10 ContextMenu"
          onContextMenu={event => showMenu(event, kind, id, label)}
          onKeyDown={event => { if (event.key === "ContextMenu" || event.shiftKey && event.key === "F10") showMenu(event, kind, id, label); }}
          aria-current={(kind === "scene" ? app.snapshot?.chatScene?.scene_id === id : active(id)) ? "true" : undefined}
          onClick={() => {
            if (kind === "view") app.openFeature(id);
            else { app.revealChat(); void app.run(() => app.changeChatSession("select", id)); }
          }}><Icon size={15} /><span>{label}</span></button>
      </div>)}
    </section>}
    {[{ title: "消息", views: destinations.filter(([id]) => messages.has(id)) },
      { title: "功能", views: destinations.filter(([id]) => !messages.has(id)) }].map(group =>
      <details className="workspace-nav-section" key={group.title} open>
        <summary className="workspace-section-label">{group.title}</summary>
        <div className="workspace-nav-grid">{group.views.map(([view, label, Icon]) => <div className="workspace-nav-row" key={view}>
          <button type="button" className="workspace-nav-link" aria-label={label} aria-current={active(view) ? "page" : undefined}
            aria-haspopup="menu" aria-keyshortcuts="Shift+F10 ContextMenu"
            onContextMenu={event => showMenu(event, "view", view, label)}
            onKeyDown={event => { if (event.key === "ContextMenu" || event.shiftKey && event.key === "F10") showMenu(event, "view", view, label); }}
            onClick={() => app.openFeature(view)}>
            <Icon size={15} /><span>{label}</span>
            {(["mail", "firesides", "bonfire"] as string[]).includes(view) && town.unread(view as "mail" | "firesides" | "bonfire") && <i className="destination-unread" aria-label="有新动态" />}
          </button>
        </div>)}</div>
      </details>)}
    {menu && createPortal(<div ref={menuRef} className="chat-session-context-menu" role="menu" aria-label={`${menu.label}操作`}
      style={{ left: menu.x, top: menu.y }} onContextMenu={event => event.preventDefault()}>
      <button type="button" role="menuitem" onClick={() => { app.toggleFavorite(menu.kind, menu.id); setMenu(null); }}>
        {app.isFavorite(menu.kind, menu.id) ? "取消置顶" : menu.kind === "scene" ? "置顶场景" : "置顶功能"}
      </button>
    </div>, document.body)}
  </nav>;
}
