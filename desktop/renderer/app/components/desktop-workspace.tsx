import { useState, type ReactNode } from "react";
import type { AppModel } from "../models/app";
import { Topbar } from "./topbar";
import { DesktopRail } from "./desktop-rail";
import { DesktopPanels } from "../../workspace/desktop-panels";
import { definitions } from "../../town/models/town";
import { PlaceHeading } from "./navigation";
import { Portal } from "../../portal/page";
import { Town } from "../../town/page";
import { TownComposer } from "../../town/components/composer";
import { Browser } from "../../browser/page";
import { useModel } from "../../shared/hooks/use-model";
import "../ia-layout.css";

/** Actual Desktop shell, also used by the transport-only browser fixture. */
export function DesktopWorkspace({ app, children }: { app: AppModel; children: ReactNode }) {
  const town = useModel(app.town);
  const beingName = town.displayName || app.snapshot?.settings.being || "Being";
  const [headingContainer, setHeadingContainer] = useState<HTMLDivElement | null>(null);
  const [triggerContainer, setTriggerContainer] = useState<HTMLDivElement | null>(null);
  return (
      <main id="client-main" className="desktop-ia" hidden={app.startup !== "ready"}>
        <div className="workspace-body">
          <div className="workspace-stage">
            <DesktopRail model={app} triggerRef={setTriggerContainer} />
            <Topbar model={app} headingContainer={headingContainer} triggerContainer={triggerContainer} />
            <p id="startup-notice" className="startup-notice" role="status" hidden={!app.snapshot?.notice}>{app.snapshot?.notice || ""}</p>
            <div className="desktop-panel-shell">
              <DesktopPanels placement={app.placement} onChange={app.setPlacement}
                hasContent={app.view !== "chat" || app.browserVisible}
                contentLabel={app.browserVisible ? "浏览器" : definitions[app.view]?.title || "本机 Portal"}
                chatLabel={app.snapshot?.chatScene?.scene_meta.scene_label || beingName}
                chatTitle={<div ref={setHeadingContainer} />}
                onCloseContent={app.closePlace}
                content={<>
                  <aside id="place-panel" className="place-surface" aria-labelledby="view-title" hidden={app.view === "chat" || app.browserVisible}>
                    <PlaceContent app={app} />
                  </aside>
                  <Browser model={app} embedded />
                </>}>
                {children}
              </DesktopPanels>
            </div>
          </div>
        </div>
      </main>
  );
}

function PlaceContent({ app }: { app: AppModel }) {
  return (
    <>
      <PlaceHeading model={app} />
      <Portal model={app} />
      <Town model={app.town} />
      {app.town.visible && <TownComposer model={app.town} inline />}
    </>
  );
}
