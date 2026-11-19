import {
  generateChecklistKey,
  type ChecklistItemInput,
} from "../../schemas";

// ─── Shared kind metadata ───────────────────────────────────────────────────
//
// `boolean` is intentionally absent from the picker — backend still accepts
// it for legacy templates so the label exists for read-side rendering, but
// new items can't choose it.

// ─── Preset Pass / Fail / N/A ───────────────────────────────────────────────
//
// A backend `select` item whose options are exactly Pass / Fail / N/A is
// treated by the editor as the "preset" variant ("Pass/Fails" in the
// picker) — the options list is locked and rendered read-only. Any other
// option set is the plain "Single Select" variant with the full editor.
// The distinction is purely UI; on the wire both shapes are kind="select"
// with an `options` array.

export const PRESET_SELECT_OPTIONS = ["Pass", "Fail", "N/A"] as const;

export function isPresetSelect(item: {
  kind: ChecklistItemInput["kind"];
  options?: string[] | null;
}): boolean {
  if (item.kind !== "select") return false;
  const opts = item.options ?? [];
  return (
    opts.length === 3 &&
    opts[0] === PRESET_SELECT_OPTIONS[0] &&
    opts[1] === PRESET_SELECT_OPTIONS[1] &&
    opts[2] === PRESET_SELECT_OPTIONS[2]
  );
}

// UI-level kind enum. `select_preset` is a UI-only variant — it serialises
// as backend kind="select" with options locked to PASS / FAIL / N/A.
export type UiKind =
  | "boolean"
  | "text"
  | "numeric"
  | "select_preset"
  | "select"
  | "multi_select"
  | "photo";

export const UI_KIND_LABEL: Record<UiKind, string> = {
  boolean: "Yes / No",
  text: "Short text",
  numeric: "Number",
  select_preset: "Pass/Fails",
  select: "Single Select",
  multi_select: "Multiple Select",
  photo: "Media",
};

export const UI_KIND_BLURB: Record<UiKind, string> = {
  boolean: "Inspector picks Yes or No.",
  text: "Inspector types a free-form response.",
  numeric: "Inspector enters a number.",
  select_preset:
    "Inspector picks Pass, Fail, or N/A. The three options are fixed.",
  select: "Inspector picks one option from a custom list you define.",
  multi_select: "Inspector ticks one or more options from a fixed list.",
  photo: "Inspector uploads images or videos.",
};

// `boolean` is intentionally absent from the picker — backend still accepts
// it for legacy templates so the label exists for read-side rendering, but
// new items can't choose it.
export const SELECTABLE_UI_KINDS: UiKind[] = [
  "text",
  "numeric",
  "select_preset",
  "select",
  "multi_select",
  "photo",
];

export function uiKindFromItem(item: ChecklistItemInput | undefined): UiKind {
  if (!item) return "text";
  if (isPresetSelect(item)) return "select_preset";
  return item.kind;
}

export function makeBlankChecklistItem(): ChecklistItemInput {
  return {
    key: generateChecklistKey(),
    label: "",
    kind: "text",
    required: true,
    integer_only: false,
  };
}

// The editor doesn't care what other fields the surrounding form holds —
// only that it has `items: ChecklistItemInput[]`. RHF generics are awkward
// across components, so callers cast their typed form objects to the shape
// below at the boundary.
export interface ChecklistFormShape {
  items: ChecklistItemInput[];
}

export type ItemErrorMap =
  | Partial<Record<keyof ChecklistItemInput, { message?: string }>>
  | undefined;
