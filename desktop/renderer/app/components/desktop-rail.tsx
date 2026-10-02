import { BookOpen, BookText, Compass, ContactRound, Flame, Globe, Mail, Megaphone, Settings, Sprout, Users, Wrench } from "lucide-react";
import { townPlaces } from "../../shared/components/town-icons";
import type { AppModel } from "../models/app";
import { useModel } from "../../shared/hooks/use-model";

const destinations = [
  ["town", "小镇", Compass], ["mail", "私信", Mail], ["firesides", "围炉", Users], ["bonfire", "篝火", Flame],
  ["seeds", "花园", Sprout], ["embers", "书架", BookOpen], ["scrolls", "卷轴", BookText],
  ["kits", "工具库", Wrench], ["contacts", "通讯录", ContactRound], ["announcements", "公告", Megaphone],
] as const;
export function DesktopRail({ model, triggerRef }: { model: AppModel; triggerRef: (element: HTMLDivElement | null) => void }) {
  const app = useModel(model), town = useModel(app.town);
  return <nav className="desktop-rail" aria-label="功能导航">
    <div ref={triggerRef} className="desktop-scene-trigger" />
    <div className="desktop-rail-links">
      {destinations.map(([view, label, Icon]) => {
        const original = townPlaces.find(place => place.view === view);
        return <button type="button" key={view} aria-label={label}
        aria-current={!app.browserVisible && app.view === view ? "page" : undefined} onClick={() => app.navigate(view)}>
        {original ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{original.icon}</svg> : <Icon size={19} />}<span className="desktop-rail-label">{label}</span>
        {(["mail", "firesides", "bonfire"] as string[]).includes(view) && town.unread(view as "mail" | "firesides" | "bonfire") && <i className="destination-unread" aria-label="有新动态" />}
      </button>;
      })}
      <button type="button" aria-label="浏览器" aria-current={app.browserVisible ? "page" : undefined} onClick={() => void app.openBrowser()}><Globe size={19} /><span className="desktop-rail-label">浏览器</span></button>
    </div>
    <button type="button" aria-label="设置" onClick={() => void app.openClientSettings()}><Settings size={19} /><span className="desktop-rail-label">设置</span></button>
  </nav>;
}
