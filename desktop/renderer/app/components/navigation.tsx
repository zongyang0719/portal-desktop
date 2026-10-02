import { ArrowLeft, X } from "lucide-react";
import type { AppModel } from "../models/app";
import { definitions } from "../../town/models/town";
import { useModel } from "../../shared/hooks/use-model";
import { NavigationControls } from "../../shared/components/navigation-controls";

export function PlaceHeading({ model }: { model: AppModel }) {
  const app = useModel(model), town = useModel(app.town);
  const title = definitions[app.view]?.title || "本机 Portal";
  const detail = town.visible && Boolean(town.directId || town.selectedId || (app.view === "firesides" && town.selectedRing));
  const listLabel = app.view === "kits" ? town.tab === "local" ? "本机工具" : "工具库" : definitions[app.view]?.title || title;
  return <header className="place-sheet-heading">
    <div className="place-sheet-title-row">
      <div className="place-sheet-title-main">
        <h1 id="view-title">{title}</h1>
        {!town.hasInstallationSource && (app.settingsRoute === "portal" || town.returnView || town.forwardView) && <NavigationControls
          back={app.settingsRoute === "portal" || town.returnView ? app.returnFromPlace : undefined}
          forward={town.forwardView ? app.forwardFromPlace : undefined} />}
      </div>
      <div className="place-sheet-actions">
        <button id="back-to-chat" className="icon-button" aria-label="收起阅读面板" title="收起阅读面板" onClick={app.closePlace}><X size={17} /></button>
      </div>
    </div>
    {(detail || town.hasInstallationSource) && <div className="reading-breadcrumbs">
      {town.hasInstallationSource && <button type="button" className="reading-back" onClick={app.returnFromPlace}><ArrowLeft size={14} />返回安装来源</button>}
      {detail && <button type="button" className="reading-back" onClick={() => town.closeDetail()}>{!town.hasInstallationSource && <ArrowLeft size={14} />}返回{listLabel}列表</button>}
    </div>}
  </header>;
}
