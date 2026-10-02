import { BookOpen, Globe, MessageSquare, Settings2, Wrench, Map } from "lucide-react";
import type { AppModel } from "../models/app";
import { groupForView, placeGroups, type PlaceGroup } from "../models/navigation";
import { useModel } from "../../shared/hooks/use-model";

const icons = { social: MessageSquare, reading: BookOpen, tools: Wrench };
export function WorkspaceNavigation({ model }: { model: AppModel }) {
  const app = useModel(model), town = useModel(app.town);
  const active = app.browserVisible ? undefined : groupForView(app.view);
  const unread = ["mail", "firesides", "bonfire"].some(channel => town.unread(channel as "mail" | "firesides" | "bonfire"));
  return <nav className="workspace-navigation" aria-label="小镇与阅读">
    <div className="workspace-section-label"><span>小镇</span>
      <button type="button" aria-label="小镇概览" title="小镇概览" onClick={() => app.navigate("town")}><Map size={14} /></button>
    </div>
    {(Object.keys(placeGroups) as PlaceGroup[]).map(group => {
      const Icon = icons[group];
      return <button key={group} type="button" className="workspace-destination"
        aria-current={active === group ? "location" : undefined}
        onClick={() => app.openPlaceGroup(group)}>
        <Icon size={17} aria-hidden="true" /><span>{placeGroups[group].title}</span>
        {group === "social" && unread && <span className="destination-unread" aria-label="有新动态" />}
        {active === group && <span className="destination-open" aria-label="右侧已打开">›</span>}
      </button>;
    })}
  </nav>;
}

export function WorkspaceFooter({ model }: { model: AppModel }) {
  const app = useModel(model);
  return <div className="workspace-sidebar-footer">
    <label className="chat-session-context-toggle">
      <input type="checkbox" checked={app.chatHistoryScope === "all"}
        disabled={!app.chatHistoryScopeKnown || app.chatLoading || !app.snapshot?.chatScene}
        onChange={event => app.changeChatHistoryScope(event.target.checked ? "all" : "current")} />
      <span>显示全部场景记录</span>
    </label>
    <div className="workspace-utilities">
      <button type="button" onClick={() => void app.openClientSettings()}><Settings2 size={16} aria-hidden="true" />设置与连接</button>
      <button type="button" aria-label="打开浏览器" title="浏览器" onClick={() => void app.openBrowser()}><Globe size={16} /></button>
    </div>
  </div>;
}
