import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { BrowserAction, BrowserState } from "../../shared/types";
import type { AppModel } from "../app/models/app";
import { useBrowserSplit } from "./hooks/use-browser-split";
import { unobscuredRect } from "../workspace/placement";
export function Browser({ model: app, embedded = false }: { model: AppModel; embedded?: boolean }) {
  const [state, setState] = useState<BrowserState>({
    open: false,
    title: "浏览器",
    address: "",
    loading: false,
    canGoBack: false,
    canGoForward: false,
  });
  const [address, setAddress] = useState("");
  const nativeOpen = useRef(false);
  const activation = useRef<number | undefined>(undefined);
  const visible = state.open && app.browserVisible;
  const panel = useRef<HTMLElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    divider = useRef<HTMLDivElement>(null),
    dragging = useRef(false);
  const sendBounds = useCallback(() => {
    if (!viewport.current || !app.api) return;
    const { x, y, width, height } = viewport.current.getBoundingClientRect();
    let bounds = { x, y, width, height };
    if (embedded) {
      for (const cover of document.querySelectorAll<HTMLElement>('.panel-layout[data-mode=floating] .placement-chat, .chat-session-panel[data-open=true]:not([data-pinned=true])')) {
        if (!cover.hidden) bounds = unobscuredRect(bounds, cover.getBoundingClientRect());
      }
    }
    void app.api
      .browserBounds({
        ...bounds,
        visible:
          !dragging.current &&
          !document.querySelector('[data-resizing=true], [data-sidebar-sizing=true]') &&
          !panel.current?.hidden &&
          bounds.width > 0 && bounds.height > 0 &&
          app.startup === "ready" &&
          !app.subagentSettingsOpen &&
          !document.querySelector("dialog[open]"),
      })
      .catch(app.toast);
  }, [app, embedded]);
  const setDragging = useCallback(
    (active: boolean) => {
      dragging.current = active;
      sendBounds();
    },
    [sendBounds],
  );
  const split = useBrowserSplit(panel, divider, visible && !embedded, setDragging);
  useEffect(() => {
    if (!app.api) return;
    let active = true,
      received = false;
    const render = (next: BrowserState, initial = false) => {
      if (!active) return;
      if (!initial && next.open && (!nativeOpen.current || next.activation !== activation.current)) app.revealBrowser();
      if (!next.open && nativeOpen.current) app.hideBrowser();
      nativeOpen.current = next.open;
      activation.current = next.activation;
      setState(next);
      if (document.activeElement !== input.current) setAddress(next.address);
    };
    const stop = app.api.onBrowser((next) => {
      received = true;
      render(next);
    });
    void app.api
      .browserState()
      .then((next) => {
        if (!received) render(next, true);
      })
      .catch(app.toast);
    return () => {
      active = false;
      stop();
    };
  }, [app]);
  useLayoutEffect(sendBounds, [sendBounds, visible, split.width, app.subagentSettingsOpen]);
  useEffect(() => {
    let scheduled = 0;
    const layout = () => {
      if (!scheduled)
        scheduled = requestAnimationFrame(() => {
          scheduled = 0;
          sendBounds();
        });
    };
    const resize = new ResizeObserver(layout);
    if (viewport.current) resize.observe(viewport.current);
    const mutation = new MutationObserver(layout);
    // Dynamic Kit dialogs must also hide the native WebContentsView.
    mutation.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open", "hidden", "data-open", "data-pinned", "data-sidebar-sizing"],
    });
    window.addEventListener("resize", layout);
    window.addEventListener("beings:panel-layout", layout);
    return () => {
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", layout);
      window.removeEventListener("beings:panel-layout", layout);
      cancelAnimationFrame(scheduled);
    };
  }, [sendBounds]);
  const act = (action: BrowserAction) =>
    void app.run(() => app.api.browserAction(action));
  return (
    <>
      <div
        id="browser-divider"
        ref={divider}
        role="separator"
        tabIndex={0}
        aria-label="调整浏览器宽度"
        aria-orientation="vertical"
        aria-controls="browser-panel"
        title="拖动调整宽度，双击恢复默认"
        hidden={!visible || embedded}
        {...split.props}
      />
      <aside
        id="browser-panel"
        ref={panel}
        aria-label="内置浏览器"
        hidden={!visible}
        style={embedded ? undefined : { flexBasis: split.width || undefined }}
      >
        <div className="browser-heading">
          <strong id="browser-title">{state.title}</strong>
          <button id="browser-hide" title="返回阅读，保留网页" aria-label="返回阅读，保留网页"
            onClick={app.hideBrowser}>−</button>
          <button
            id="browser-external"
            title="在系统浏览器打开"
            aria-label="在系统浏览器打开"
            disabled={!state.address}
            onClick={() => act("external")}
          >
            ↗
          </button>
          <button
            id="browser-close"
            title="关闭网页" aria-label="关闭网页"
            onClick={() => act("close")}
          >
            ×
          </button>
        </div>
        <form
          id="browser-address-form"
          onSubmit={(event) => {
            event.preventDefault();
            input.current?.blur();
            if (address === state.address) act("reload");
            else void app.openBrowser(address);
          }}
        >
          <button
            type="button"
            id="browser-back"
            aria-label="后退"
            disabled={!state.canGoBack}
            onClick={() => act("back")}
          >
            ←
          </button>
          <button
            type="button"
            id="browser-forward"
            aria-label="前进"
            disabled={!state.canGoForward}
            onClick={() => act("forward")}
          >
            →
          </button>
          <button
            type="button"
            id="browser-reload"
            aria-label={state.loading ? "停止加载" : "刷新网页"}
            onClick={() => act(state.loading ? "stop" : "reload")}
          >
            {state.loading ? "×" : "↻"}
          </button>
          <input
            id="browser-address"
            ref={input}
            aria-label="网页地址"
            placeholder="输入网址"
            autoComplete="off"
            spellCheck={false}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <button type="submit">前往</button>
        </form>
        <div id="browser-viewport" ref={viewport}>
          <p id="browser-message" role="status">
            {state.error ||
              (state.loading
                ? "正在加载网页…"
                : state.address
                  ? ""
                  : "输入网址，或从更多选项打开原版 Loom、小镇说明。")}
          </p>
        </div>
      </aside>
    </>
  );
}
