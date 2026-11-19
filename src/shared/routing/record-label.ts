import { useLocation } from "react-router-dom";

// A detail page reached by id can't name a record that doesn't exist — on a
// 404 the backend only has the id, which means nothing to a user. But the LIST
// row the user came from already knows the human number (DSP-2026-…, an MI
// number, a warehouse name). We thread that label through the navigation so a
// "not found" / load-error state can say WHICH record instead of a bare
// "not found". This is per-viewer navigation context only — never trusted as
// data, never sent to the API.

export interface RecordLabelState {
  /** Human identifier (document number / name) of the record being opened. */
  recordLabel?: string;
}

/** Build the router `state` a list passes when opening a detail route. Takes
 *  `unknown` because table row values are loosely typed; a non-string label is
 *  simply dropped (the detail then shows its generic fallback). */
export function recordLabelState(label: unknown): RecordLabelState {
  return { recordLabel: typeof label === "string" && label ? label : undefined };
}

/** The human label the list row carried in, or `undefined` on a cold/deep load
 *  (where there is no list context — the generic fallback copy is used then). */
export function useRecordLabel(): string | undefined {
  const state = useLocation().state as RecordLabelState | null;
  return state?.recordLabel ?? undefined;
}

/**
 * Title for a detail page's not-found / load-error state. Names the record when
 * the list handed us its number, otherwise the page's own generic fallback.
 * "Couldn't load DSP-2026-09-29-00001" beats a bare "Not found".
 */
export function recordNotFoundTitle(
  label: string | undefined,
  fallbackTitle: string,
): string {
  return label ? `Couldn't load ${label}` : fallbackTitle;
}
