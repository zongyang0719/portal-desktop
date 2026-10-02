/** A quotation belongs to a scene draft, independently of its editable text. */
export interface ChatReference {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  text: string;
}
type ReferenceState = {
  currentScene: { sceneId?: string };
  draftReferences?: Record<string, ChatReference[]>;
};
export const MAX_DRAFT_REFERENCES = 3;
export function draftReferences(state: ReferenceState): ChatReference[] {
  return state.draftReferences?.[state.currentScene.sceneId || ""] || [];
}
export function setDraftReferences(state: ReferenceState, references: ChatReference[]) {
  state.draftReferences = { ...state.draftReferences, [state.currentScene.sceneId || ""]: references };
}
export function referenceSignature(state: ReferenceState) {
  return draftReferences(state).map(reference => reference.id).join("|");
}
export function withDraftReferences(text: string, state: ReferenceState) {
  const references = draftReferences(state);
  return references.length
    ? [...references.map(reference => reference.text), text.trim()].filter(Boolean).join("\n\n")
    : text;
}
export function validChatReference(value: unknown): value is ChatReference {
  if (!value || typeof value !== "object") return false;
  const ref = value as ChatReference;
  return typeof ref.id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(ref.id) &&
    ([['title', 160], ['source', 240], ['excerpt', 12000], ['text', 16000]] as const)
      .every(([key, limit]) => typeof ref[key] === "string" && ref[key].trim().length > 0 && ref[key].length <= limit);
}
