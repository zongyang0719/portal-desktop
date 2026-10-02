import { defaultPlacement, readPlacement, type Placement, type ChatPlacement } from "./placement";
/** A scene is a conversation. Reading state remembers its place without owning content. */
export type ReadingRoute = { destination: string; resource: string };
export type WorkspaceReference = {
  id: string;
  title: string;
  text: string;
  resource?: string;
  message?: { scene: string; id: string };
};
export type WorkspaceMessage = {
  id: string;
  role: "human" | "being";
  text: string;
  references?: WorkspaceReference[];
  suggestion?: string;
};
export type WorkspaceScene = {
  id: string;
  title: string;
  draft: string;
  references: WorkspaceReference[];
  messages: WorkspaceMessage[];
  scroll: Record<string, number>;
  placement: Placement;
  reading: {
    route: ReadingRoute | null;
    back: Array<ReadingRoute | null>;
    forward: Array<ReadingRoute | null>;
    locations: Record<string, ReadingRoute>;
  };
};
export type WorkspaceState = {
  version: 3;
  currentScene: string;
  scenes: Record<string, WorkspaceScene>;
  sceneOrder?: string[];
  hiddenSceneIds?: string[];
  /** One reply per source object, even when discussed in several conversations. */
  drafts: Record<string, string>;
};
export type WorkspaceAction =
  | { type: "switch"; scene: string }
  | { type: "create"; value: WorkspaceScene }
  | { type: "rename"; scene: string; title: string }
  | { type: "order"; ids: string[] }
  | { type: "hide-scenes"; ids: string[]; fallback: WorkspaceScene }
  | { type: "navigate"; scene: string; destination: string; resource: string }
  | { type: "open"; scene: string; route: ReadingRoute }
  | { type: "back" | "forward" | "chat-only"; scene: string }
  | { type: "chat-visible"; visible: boolean; temporaryContent?: boolean }
  | { type: "swap-chat" }
  | { type: "chat-placement"; scene: string; chat: ChatPlacement }
  | { type: "draft"; scene: string; text: string }
  | { type: "resource-draft"; resource: string; text: string }
  | { type: "quote"; scene: string; reference: WorkspaceReference }
  | { type: "remove-reference"; scene: string; id: string }
  | { type: "message"; scene: string; message: WorkspaceMessage; clearComposer?: boolean }
  | { type: "scroll"; scene: string; resource: string; top: number };

const unique = (values: string[]) => [...new Set(values)];
const sameRoute = (a: ReadingRoute | null, b: ReadingRoute | null) => a?.resource === b?.resource && a?.destination === b?.destination;
export function visibleWorkspaceScenes(state: WorkspaceState): WorkspaceScene[] {
  return unique([...(state.sceneOrder ?? []), ...Object.keys(state.scenes)])
    .filter(id => state.scenes[id] && !state.hiddenSceneIds?.includes(id))
    .map(id => state.scenes[id]);
}
export function emptyWorkspaceScene(id: string, title: string): WorkspaceScene {
  return { id, title, draft: "", references: [], messages: [], scroll: {}, placement: defaultPlacement(), reading: { route: null, back: [], forward: [], locations: {} } };
}
function withRoute(scene: WorkspaceScene, route: ReadingRoute | null): WorkspaceScene {
  if (sameRoute(scene.reading.route, route)) return scene;
  return { ...scene, placement: { ...scene.placement, content: route ? { view: route.destination, id: route.resource } : null }, reading: { route, back: [...scene.reading.back, scene.reading.route].slice(-40), forward: [],
    locations: route ? { ...scene.reading.locations, [route.destination]: route } : scene.reading.locations } };
}
export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  const current = state.scenes[state.currentScene];
  if (action.type === "swap-chat" || action.type === "chat-visible") {
    const chat = current.placement.chat;
    return workspaceReducer(state, { type: "chat-placement", scene: current.id, chat: action.type === "swap-chat"
      ? { ...chat, side: chat.side === "right" ? "left" : "right" }
      : { ...chat, mode: action.visible ? chat.mode === "edge" ? "docked" : chat.mode : "edge" } });
  }
  if (action.type === "resource-draft") return { ...state, drafts: { ...state.drafts, [action.resource]: action.text } };
  if (action.type === "order") return { ...state, sceneOrder: unique([...action.ids.filter(id => state.scenes[id]), ...Object.keys(state.scenes)]) };
  if (action.type === "create") return { ...state, currentScene: action.value.id,
    scenes: { ...state.scenes, [action.value.id]: action.value }, hiddenSceneIds: state.hiddenSceneIds?.filter(id => id !== action.value.id),
    sceneOrder: unique([...(state.sceneOrder ?? Object.keys(state.scenes)), action.value.id]) };
  if (action.type === "hide-scenes") {
    const hiddenSceneIds = unique([...(state.hiddenSceneIds ?? []), ...action.ids]);
    const visible = visibleWorkspaceScenes(state).filter(scene => !hiddenSceneIds.includes(scene.id));
    const scenes = visible.length ? state.scenes : { ...state.scenes, [action.fallback.id]: action.fallback };
    const currentScene = hiddenSceneIds.includes(state.currentScene) ? (visible[0]?.id ?? action.fallback.id) : state.currentScene;
    return { ...state, scenes, currentScene, hiddenSceneIds };
  }
  if (action.type === "switch") {
    if (!state.scenes[action.scene]) return state;
    return { ...state, currentScene: action.scene };
  }
  let scene = state.scenes[action.scene];
  if (!scene) return state;
  switch (action.type) {
    case "chat-placement": scene = { ...scene, placement: { ...scene.placement, chat: readPlacement({ ...scene.placement, chat: action.chat }).chat } }; break;
    case "rename": scene = { ...scene, title: action.title }; break;
    case "navigate": scene = withRoute(scene, scene.reading.locations[action.destination] ?? { destination: action.destination, resource: action.resource }); break;
    case "open": scene = withRoute(scene, action.route); break;
    case "chat-only": scene = withRoute(scene, null); break;
    case "back":
    case "forward": {
      const source = scene.reading[action.type];
      if (!source.length) return state;
      const route = source.at(-1)!;
      const opposite = action.type === "back" ? "forward" : "back";
      scene = { ...scene, placement: { ...scene.placement, content: route ? { view: route.destination, id: route.resource } : null }, reading: { ...scene.reading, route, [action.type]: source.slice(0, -1),
        [opposite]: [...scene.reading[opposite], scene.reading.route],
        locations: route ? { ...scene.reading.locations, [route.destination]: route } : scene.reading.locations } };
      break;
    }
    case "draft": scene = { ...scene, draft: action.text }; break;
    case "quote":
      // A stale selection cannot silently land in a different conversation.
      if (action.scene !== state.currentScene || !action.reference.text.trim()) return state;
      scene = { ...scene, references: scene.references.some(ref => ref.text === action.reference.text && ref.resource === action.reference.resource && ref.message?.id === action.reference.message?.id && ref.message?.scene === action.reference.message?.scene)
        ? scene.references : [...scene.references, structuredClone(action.reference)] };
      if (scene.placement.chat.mode === "edge") scene = { ...scene, placement: { ...scene.placement, chat: { ...scene.placement.chat, mode: "docked" } } };
      break;
    case "remove-reference": scene = { ...scene, references: scene.references.filter(ref => ref.id !== action.id) }; break;
    case "message": scene = { ...scene, messages: [...scene.messages, structuredClone(action.message)],
      ...(action.clearComposer ? { draft: "", references: [] } : {}) }; break;
    case "scroll": scene = { ...scene, scroll: { ...scene.scroll, [action.resource]: action.top } }; break;
  }
  return { ...state, scenes: { ...state.scenes, [scene.id]: scene } };
}
export function captureMessage(scene: WorkspaceScene, id: string): WorkspaceMessage {
  return { id, role: "human", text: scene.draft.trim(), references: structuredClone(scene.references) };
}

/** Upgrade the earlier preview without changing its stored copy or inventing excerpts. */
export function migrateWorkspaceState(value: unknown, destinations: Record<string, string>): WorkspaceState | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as any;
  if (!saved.scenes || !saved.scenes[saved.currentScene] || !saved.drafts || typeof saved.drafts !== "object") return null;
  const refs = (values: any[]) => values.flatMap(ref => {
    if (typeof ref === "string") return [{ id: `legacy-${ref}`, title: ref, text: "", resource: ref }];
    return ref && typeof ref.id === "string" && typeof ref.title === "string" && typeof ref.text === "string" ? [ref] : [];
  });
  const scenes: Record<string, WorkspaceScene> = {};
  for (const [id, raw] of Object.entries(saved.scenes) as Array<[string, any]>) {
    if (raw.id !== id || typeof raw.title !== "string" || typeof raw.draft !== "string" || !Array.isArray(raw.messages) || !Array.isArray(raw.references)) return null;
    // Older previews mixed authored presets and manual placement without provenance.
    // Preserve all conversation/reply data, but start their placement from the same factory default.
    const active = saved.version === 3 ? raw.reading?.route?.resource : undefined;
    const route = active && destinations[active] ? { resource: active, destination: destinations[active] } : null;
    scenes[id] = { ...emptyWorkspaceScene(id, raw.title), draft: raw.draft, scroll: raw.scroll ?? {}, references: refs(raw.references),
      messages: raw.messages.filter((message: any) => message && typeof message.id === "string" && typeof message.text === "string" && ["human", "being"].includes(message.role))
        .map((message: any) => ({ ...message, references: Array.isArray(message.references) ? refs(message.references) : undefined })),
      placement: saved.version === 3 ? { ...readPlacement(raw.placement), content: route ? { view: route.destination, id: route.resource } : null } : defaultPlacement(),
      reading: saved.version === 3 && raw.reading && Array.isArray(raw.reading.back) && Array.isArray(raw.reading.forward) && raw.reading.locations
        ? { ...raw.reading, route } : { route, back: [], forward: [], locations: route ? { [route.destination]: route } : {} } };
  }
  return { version: 3, currentScene: saved.currentScene, scenes, sceneOrder: Array.isArray(saved.sceneOrder) ? saved.sceneOrder : undefined,
    hiddenSceneIds: Array.isArray(saved.hiddenSceneIds) ? saved.hiddenSceneIds : [],
    drafts: Object.fromEntries(Object.entries(saved.drafts).filter(([, text]) => typeof text === "string")) as Record<string, string> };
}
