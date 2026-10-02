import { useState, type ReactNode } from "react";
import type { AppModel } from "../models/app";
import { Topbar } from "./topbar";
import { DesktopRail } from "./desktop-rail";
import { PanelLayout } from "../../workspace/panel-layout";
import { PlaceHeading } from "./navigation";
import { Portal } from "../../portal/page";
import { Town } from "../../town/page";
import { TownComposer } from "../../town/components/composer";
import { Browser } from "../../browser/page";
import "../ia-layout.css";

/** Actual Desktop shell, also used by the transport-only browser fixture. */
export function DesktopWorkspace({ app, children }: { app: AppModel; children: ReactNode }) {
  const [headingContainer, setHeadingContainer] = useState<HTMLDivElement | null>(null);
  const [triggerContainer, setTriggerContainer] = useState<HTMLDivElement | null>(null);
  return (
      <main id="client-main" className="desktop-ia" hidden={app.startup !== "ready"}>
        <div className="workspace-body">
          <DesktopRail model={app} triggerRef={setTriggerContainer} />
          <div className="workspace-stage">
            <Topbar model={app} headingContainer={headingContainer} triggerContainer={triggerContainer} />
            <p id="startup-notice" className="startup-notice" role="status" hidden={!app.snapshot?.notice}>{app.snapshot?.notice || ""}</p>
            <div className="desktop-panel-shell">
              <PanelLayout placement={app.placement.chat} onChange={app.setChatPlacement}
                hasContent={app.view !== "chat" || app.browserVisible}
                label={app.snapshot?.chatScene?.scene_meta.scene_label || app.snapshot?.settings.being || "Being"}
                title={<><strong>{app.snapshot?.settings.being || "Being"}</strong><div ref={setHeadingContainer} /></>}
                content={<>
                  <aside id="place-panel" className="place-surface" aria-labelledby="view-title" hidden={app.view === "chat" || app.browserVisible}>
                    <PlaceContent app={app} />
                  </aside>
                  <Browser model={app} embedded />
                </>}>
                {children}
              </PanelLayout>
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
