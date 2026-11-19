import type {
  MaterialIssueLineInput,
  MaterialIssueLineResponse,
} from "../../api";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import {
  type StagedComponent,
  type IssueRow,
  type DemandLine,
  type FormFieldError,
  nextKey,
  rowQty,
  FIELD_SOURCE,
  FIELD_WAREHOUSE,
  FIELD_ENGINEER,
  FIELD_LINES,
  rowAnchorId,
} from "./material-issue-form-helpers";

// Pure, unit-testable form logic so the hook stays a thin state owner (§14 #9 / §17 S).

// A substitute (issued variant differs from the demand's original).
export const isSubstituteRow = (r: IssueRow): boolean =>
  !!r.originalVariantId && r.variantOption?.id !== r.originalVariantId;

// No silent default: a blank substitute reason is blocked in `validate`.
const subReason = (r: IssueRow): string | null =>
  r.substitutionReason.trim() || null;

// One line = one physical unit (D14): an untracked row's form-only quantity expands into N lines here,
// each with its own `ref` so components nest via `parent_ref`.
export function buildLineItems(rows: IssueRow[]): MaterialIssueLineInput[] {
  const lineItems: MaterialIssueLineInput[] = [];
  rows.forEach((r, i) => {
    const serial = r.serial.trim();
    const unitCount = r.isTracking || serial ? 1 : Math.max(1, r.quantity);
    for (let u = 0; u < unitCount; u++) {
      const ref = `p${i}u${u}`;
      lineItems.push({
        ref,
        source_line_id: r.sourceLineId,
        part_variant_id: r.variantOption?.id ?? "",
        serial: u === 0 && serial ? serial : undefined,
        substitution_reason: subReason(r),
      });
      r.components.forEach((c, ci) => {
        const cSerial = c.serial.trim();
        const compUnitCount = c.isTracking || cSerial ? 1 : Math.max(1, c.quantity);
        for (let cu = 0; cu < compUnitCount; cu++) {
          lineItems.push({
            ref: `${ref}c${ci}u${cu}`,
            parent_ref: ref,
            part_variant_id: c.variantOption?.id ?? "",
            serial: cu === 0 && cSerial ? cSerial : undefined,
          });
        }
      });
    }
  });
  return lineItems;
}

// Units already staged (new cards) + already on the draft (kept existing
// lines) per demand line — both consume the demand line's pending count.
export function stagedCountByLine(
  rows: IssueRow[],
  existingLines: MaterialIssueLineResponse[],
): Map<string, number> {
  const stagedByLine = new Map<string, number>();
  for (const r of rows)
    stagedByLine.set(
      r.sourceLineId,
      (stagedByLine.get(r.sourceLineId) ?? 0) + rowQty(r),
    );
  for (const l of existingLines) {
    if (!l.source_line_id) continue;
    // A line IS a unit — each existing primary line consumes exactly one
    // unit of its demand line's pending count.
    stagedByLine.set(
      l.source_line_id,
      (stagedByLine.get(l.source_line_id) ?? 0) + 1,
    );
  }
  return stagedByLine;
}

// Serials entered more than once, flagged inline before the backend rejects them.
export function findDuplicateSerials(rows: IssueRow[]): Set<string> {
  const counts = new Map<string, number>();
  const bump = (ser: string) => {
    const s = ser.trim();
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  };
  for (const r of rows) {
    bump(r.serial);
    for (const c of r.components) bump(c.serial);
  }
  return new Set(
    [...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s),
  );
}

// All picked serials, hidden from other dropdowns so a unit can't be issued twice.
export function collectSelectedSerials(rows: IssueRow[]): Set<string> {
  const s = new Set<string>();
  for (const r of rows) {
    if (r.serial.trim()) s.add(r.serial.trim());
    for (const c of r.components) if (c.serial.trim()) s.add(c.serial.trim());
  }
  return s;
}

// Rebuild a draft line as an editable row, using the response's denormalized labels.
export function buildRowFromExisting(
  l: MaterialIssueLineResponse,
  demandLines: DemandLine[],
  variantLabel: (id: string) => string,
): IssueRow {
  const demand = demandLines.find((d) => d.sourceLineId === l.source_line_id);
  return {
    key: nextKey("row"),
    sourceLineId: l.source_line_id ?? "",
    label:
      demand?.label ??
      l.part_variant_sku ??
      l.part_variant_name ??
      variantLabel(l.part_variant_id),
    // Keep the demand's ORIGINAL variant so a substitution still reads as one.
    originalVariantId: demand?.originalVariantId ?? l.part_variant_id,
    variantOption: {
      id: l.part_variant_id,
      label:
        l.part_variant_sku ??
        l.part_variant_name ??
        variantLabel(l.part_variant_id),
    },
    isTracking: !!l.serial,
    serial: l.serial ?? "",
    quantity: 1,
    substitutionReason: l.substitution_reason ?? "",
    components: (l.components ?? []).map((c) => ({
      key: nextKey("comp"),
      variantOption: {
        id: c.part_variant_id,
        label:
          c.part_variant_sku ??
          c.part_variant_name ??
          variantLabel(c.part_variant_id),
      },
      isTracking: !!c.serial,
      quantity: 1,
      serial: c.serial ?? "",
    })),
  };
}

function validateComponents(comps: StagedComponent[]): string | null {
  for (const c of comps) {
    if (!c.variantOption) return S.form.lines.componentVariantRequired;
    // Tracked parts need a serial; otherwise a qty ≥ 1.
    if (c.isTracking && !c.serial.trim())
      return S.form.lines.serialRequired;
    if (!c.serial.trim() && c.quantity < 1) return S.form.lines.qtyRequired;
  }
  return null;
}

export interface MaterialIssueValidationInput {
  isEdit: boolean;
  sourceEntityId: string;
  warehouseId: string;
  engineerId: string;
  rows: IssueRow[];
  existingLineCount: number;
  duplicateSerials: Set<string>;
  demandLines: DemandLine[];
}

// Source + warehouse lock after create, so they're only required while creating; engineer always.
function validateHeader(v: MaterialIssueValidationInput): FormFieldError | null {
  if (!v.isEdit) {
    if (!v.sourceEntityId)
      return {
        target: FIELD_SOURCE,
        message: S.form.validation.sourceRequired,
      };
    if (!v.warehouseId)
      return {
        target: FIELD_WAREHOUSE,
        message: S.form.validation.warehouseRequired,
      };
  }
  if (!v.engineerId)
    return {
      target: FIELD_ENGINEER,
      message: S.form.validation.issuedToRequired,
    };
  return null;
}

function validateRow(r: IssueRow): FormFieldError | null {
  const target = rowAnchorId(r.key);
  if (!r.variantOption)
    return { target, message: S.form.lines.variantRequired };
  if (r.isTracking && !r.serial.trim())
    return { target, message: S.form.lines.serialRequired };
  if (!r.serial.trim() && r.quantity < 1)
    return { target, message: S.form.lines.qtyRequired };
  // A substitute must carry a reason — the field is required, so block
  // submit until it's filled (the backend enforces the same rule).
  if (isSubstituteRow(r) && !r.substitutionReason.trim())
    return { target, message: S.form.lines.substitutionRequired };
  const err = validateComponents(r.components);
  if (err) return { target, message: err };
  return null;
}

export function validateMaterialIssueForm(
  v: MaterialIssueValidationInput,
): FormFieldError | null {
  const headerErr = validateHeader(v);
  if (headerErr) return headerErr;
  const { rows, duplicateSerials, demandLines } = v;
  // Edit mode may keep existing draft lines with no new rows added.
  if (rows.length === 0 && v.existingLineCount === 0)
    return { target: FIELD_LINES, message: S.form.validation.linesRequired };
  if (duplicateSerials.size > 0) {
    const dup = [...duplicateSerials][0];
    const offender = rows.find(
      (r) =>
        r.serial.trim() === dup ||
        r.components.some((c) => c.serial.trim() === dup),
    );
    return {
      target: offender ? rowAnchorId(offender.key) : FIELD_LINES,
      message: S.form.lines.duplicateSerial(dup),
    };
  }
  for (const r of rows) {
    const err = validateRow(r);
    if (err) return err;
  }
  // Don't exceed pending per demand line.
  for (const line of demandLines) {
    const staged = rows
      .filter((r) => r.sourceLineId === line.sourceLineId)
      .reduce((sum, r) => sum + rowQty(r), 0);
    if (staged > line.orderedQty - line.issuedQty) {
      const offender = rows.find((r) => r.sourceLineId === line.sourceLineId);
      return {
        target: offender ? rowAnchorId(offender.key) : FIELD_LINES,
        message: S.form.lines.exceedsPending,
      };
    }
  }
  return null;
}
