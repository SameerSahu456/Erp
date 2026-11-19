import {
  type LucideIcon,
  Receipt,
  Monitor,
  RotateCcw,
  ArrowLeftRight,
  Clock,
} from "lucide-react";

import type { VariantListItem } from "@modules/ims";
import type { AvailableStockRow } from "../../api";
import { formatCondition } from "../../constants/condition";
import type { ScanOption } from "./ScanSelect";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

// ── Helpers ──────────────────────────────────────────────────────────────────

export const ISSUE_TYPE_ICON: Record<string, LucideIcon> = {
  sale_issue: Receipt,
  demo_issue: Monitor,
  replacement_issue: RotateCcw,
  internal_transfer_issue: ArrowLeftRight,
  rental_issue: Clock,
};

export function readTracking(item: VariantListItem): boolean {
  // `part_is_tracking` exists at runtime; the FE VariantListItem type is stale.
  return (item as { part_is_tracking?: boolean }).part_is_tracking ?? false;
}
/** The part a scanned unit is — the same "<part> — <variant> · <condition>"
 *  the variant picker shows, minus its live "avail" count. */
export function scannedVariantLabel(u: AvailableStockRow): string {
  const cond = u.condition ? ` · ${formatCondition(u.condition)}` : "";
  return `${u.display_title ?? u.part_number ?? u.part_variant_id}${cond}`;
}
export function unitLabel(u: AvailableStockRow): string {
  return u.manufacturer_serial
    ? `${u.internal_serial} · ${u.manufacturer_serial}`
    : u.internal_serial;
}

// GRN line grid: Part | Serial | Qty | ✕
export const LINE_GRID =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_4rem_2.25rem] items-start gap-2";

// ── Staged model ─────────────────────────────────────────────────────────────

// A part fitted into a line/unit. Serialized → one picked unit (its serial);
// non-serialized → a quantity.
export interface StagedComponent {
  key: string;
  variantOption: ScanOption | null;
  isTracking: boolean;
  quantity: number;
  serial: string;
}

// One line-item card = one unit to issue (serialized: qty 1 + serial) or one
// bulk line (non-serialized: qty). Add the same demand line again for another
// unit — each is its own card, so per-unit serial + components are unambiguous.
export interface IssueRow {
  key: string;
  sourceLineId: string;
  label: string;
  originalVariantId: string | null;
  variantOption: ScanOption | null;
  isTracking: boolean;
  // GRN-style: a serial (scan/type) — present → qty locks to 1; blank → qty
  // field drives it (tracked parts require one).
  serial: string;
  quantity: number;
  substitutionReason: string;
  components: StagedComponent[];
  /** The unit its replacement line points to, if any — drives the row hint. */
  suggestedUnit?: SuggestedUnit | null;
}

/** The unit a replacement line should issue (from the demand endpoint). */
export interface SuggestedUnit {
  stockItemId: string;
  serial: string;
  variantId: string;
  variantLabel: string;
  warehouseId: string | null;
  /** The customer's own device or repaired part: the only unit allowed. */
  mustIssue: boolean;
}

export interface DemandLine {
  sourceLineId: string;
  label: string;
  originalVariantId: string | null;
  /** "<variant name> · <Condition>" of the ordered variant — what the variant
   *  dropdown shows when a row is pre-filled. Null on a line with no variant. */
  variantLabel: string | null;
  orderedQty: number;
  issuedQty: number;
  suggestedUnit: SuggestedUnit | null;
}

let _seq = 0;
export function nextKey(prefix: string): string {
  _seq += 1;
  return `${prefix}-${_seq}`;
}
export function newComponent(): StagedComponent {
  return {
    key: nextKey("comp"),
    variantOption: null,
    isTracking: false,
    quantity: 1,
    serial: "",
  };
}
// Signature of the editable line-item state, used to tell whether the form has
// actually changed from what was loaded. Excludes volatile `key`/`label`. In
// edit mode `rows` is pre-seeded with the draft's existing lines, so comparing
// counts alone would read as "dirty" on load — this compares content instead.
export function rowsSignature(rows: IssueRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      s: r.sourceLineId,
      v: r.variantOption?.id ?? null,
      ser: r.serial.trim(),
      q: r.quantity,
      sr: r.substitutionReason.trim(),
      c: r.components.map((c) => ({
        v: c.variantOption?.id ?? null,
        ser: c.serial.trim(),
        q: c.quantity,
      })),
    })),
  );
}
export function newRow(
  line: DemandLine,
  quantity: number,
  opts: { prefillSuggested?: boolean } = {},
): IssueRow {
  const base: IssueRow = {
    key: nextKey("row"),
    sourceLineId: line.sourceLineId,
    label: line.label,
    originalVariantId: line.originalVariantId,
    variantOption: line.originalVariantId
      ? { id: line.originalVariantId, label: line.variantLabel ?? line.label }
      : null,
    isTracking: false,
    serial: "",
    quantity: Math.max(1, quantity),
    substitutionReason: "",
    components: [],
    suggestedUnit: line.suggestedUnit,
  };
  const unit = line.suggestedUnit;
  return unit && opts.prefillSuggested ? { ...base, ...suggestedUnitPatch(unit, line) } : base;
}

/** Fill a row with its suggested unit. A unit re-graded on return is a
 *  substitution, so its reason is filled in too. */
export function suggestedUnitPatch(
  unit: SuggestedUnit,
  line: Pick<DemandLine, "originalVariantId">,
): Partial<IssueRow> {
  const regraded = !!line.originalVariantId && unit.variantId !== line.originalVariantId;
  return {
    variantOption: { id: unit.variantId, label: unit.variantLabel },
    serial: unit.serial,
    quantity: 1,
    ...(regraded ? { substitutionReason: S.form.lines.suggestedUnitReason } : {}),
  };
}

// Units a row consumes against its demand line's pending count. A serialized
// part (or a picked serial) is one unit; otherwise the qty field applies.
export const rowQty = (r: IssueRow) =>
  r.isTracking || r.serial.trim() ? 1 : r.quantity;

// ── Inline validation anchors ────────────────────────────────────────────────

// Stable DOM ids for the controls a bad Save can point at, so we can scroll to
// + focus the first invalid one and render its message inline (§3/§6.4) instead
// of a toast. Row errors anchor to the offending line card.
export const FIELD_SOURCE = "mi-field-source";
export const FIELD_WAREHOUSE = "mi-field-warehouse";
export const FIELD_ENGINEER = "mi-field-engineer";
export const FIELD_LINES = "mi-field-lines";
export const rowAnchorId = (key: string) => `mi-row-${key}`;

export interface FormFieldError {
  /** The anchor id of the invalid control (a FIELD_* id or a row anchor). */
  target: string;
  message: string;
}

const FOCUSABLE_SELECTOR =
  'button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Bring the anchored control into view and move focus to it (or its first
// focusable descendant, e.g. a card's first field) after a blocked submit.
export function focusFormError(targetId: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = el.matches(FOCUSABLE_SELECTOR)
      ? el
      : el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    focusable?.focus({ preventScroll: true });
  });
}
