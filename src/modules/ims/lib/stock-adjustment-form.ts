import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import type {
  StockAdjustment,
  StockAdjustmentCreate,
  StockAdjustmentDirection,
  StockAdjustmentKind,
  StockAdjustmentLine,
  StockAdjustmentLineInput,
  StockAdjustmentReason,
} from "../stock-adjustments.api";
import {
  adjustmentItemLabel,
  INTERNAL_SERIAL_MAX,
  MANUFACTURER_SERIAL_MAX,
  MAX_COUNT_PER_LINE,
  NOTES_MAX,
  OTHER_REASON_NOTES_MIN,
  DIRECTION_KINDS,
  REASON_DIRECTIONS,
  STOCK_ADJUSTMENT_DIRECTIONS,
  STOCK_ADJUSTMENT_KINDS,
  STOCK_ADJUSTMENT_REASONS,
} from "./stock-adjustment-labels";

// Zod messages stay with the schema (§16.12 #3).
const MSG = {
  warehouse: "Select a warehouse",
  reason: "Select a reason",
  notes: "Notes are required",
  notesOther: `At least ${OTHER_REASON_NOTES_MIN} characters for "Other"`,
  variant: "Select a variant",
  quantity: "Whole number, 1 or more",
  quantityMax: `At most ${MAX_COUNT_PER_LINE} per line`,
  manufacturerSerial: "Manufacturer serial is required",
  internalSerial: "Internal serial is required",
  eitherSerial: "Give the internal or manufacturer serial",
  lines: "Add at least one line",
  direction: "This reason doesn't allow this direction",
  inspectionRack: "A line that needs inspection can't have a rack",
  internalSerialMax: `At most ${INTERNAL_SERIAL_MAX} characters`,
  manufacturerSerialMax: `At most ${MANUFACTURER_SERIAL_MAX} characters`,
  notesMax: `At most ${NOTES_MAX} characters`,
} as const;

const lineSchema = z.object({
  direction: z.enum(STOCK_ADJUSTMENT_DIRECTIONS),
  kind: z.enum(STOCK_ADJUSTMENT_KINDS),
  variantId: z.string(),
  variantLabel: z.string(),
  quantity: z.string(),
  manufacturerSerial: z.string().max(MANUFACTURER_SERIAL_MAX, MSG.manufacturerSerialMax),
  internalSerial: z.string().max(INTERNAL_SERIAL_MAX, MSG.internalSerialMax),
  locationId: z.string(),
  locationLabel: z.string(),
  needsInspection: z.boolean(),
  notes: z.string().max(NOTES_MAX, MSG.notesMax),
});

export type AdjustmentLineForm = z.infer<typeof lineSchema>;

export const stockAdjustmentFormSchema = z
  .object({
    warehouseId: z.string().min(1, MSG.warehouse),
    warehouseName: z.string(),
    reason: z.union([z.enum(STOCK_ADJUSTMENT_REASONS), z.literal("")]),
    notes: z.string().trim().min(1, MSG.notes).max(NOTES_MAX, MSG.notesMax),
    lines: z.array(lineSchema).min(1, MSG.lines),
  })
  .superRefine((form, ctx) => {
    if (!form.reason) ctx.addIssue({ code: "custom", path: ["reason"], message: MSG.reason });
    if (form.reason === "other" && form.notes.trim().length < OTHER_REASON_NOTES_MIN) {
      ctx.addIssue({ code: "custom", path: ["notes"], message: MSG.notesOther });
    }
    form.lines.forEach((line, i) => {
      for (const issue of lineIssues(line, form.reason)) {
        ctx.addIssue({ code: "custom", path: ["lines", i, issue.field], message: issue.message });
      }
    });
  });

export type StockAdjustmentForm = z.infer<typeof stockAdjustmentFormSchema>;

interface LineIssue {
  field: keyof AdjustmentLineForm;
  message: string;
}

export const isPositiveInt = (v: string) => /^\d+$/.test(v) && Number(v) >= 1;

/** The kinds that name a variant (the rest derive it from the unit). */
export const kindNeedsVariant = (d: StockAdjustmentDirection, k: StockAdjustmentKind) =>
  k === "by_count" || (d === "add" && k === "by_serial");

/** Lines that may carry a rack/bin (D2, D5, D13). */
export const lineAllowsLocation = (line: Pick<AdjustmentLineForm, "direction" | "kind">) =>
  line.kind === "by_count" || (line.direction === "add" && line.kind === "by_serial");

type LineRule = (line: AdjustmentLineForm, reason: StockAdjustmentReason | "") => LineIssue | null;

const issue = (field: LineIssue["field"], message: string): LineIssue => ({ field, message });
const blank = (v: string) => !v.trim();

/** Each rule checks one thing (D3, D4, D13); the first failure per rule is reported. */
const LINE_RULES: readonly LineRule[] = [
  (l, reason) =>
    reason && !REASON_DIRECTIONS[reason].includes(l.direction) ? issue("direction", MSG.direction) : null,
  (l) => (kindNeedsVariant(l.direction, l.kind) && !l.variantId ? issue("variantId", MSG.variant) : null),
  (l) => (l.kind === "by_count" && !isPositiveInt(l.quantity) ? issue("quantity", MSG.quantity) : null),
  (l) =>
    l.kind === "by_count" && l.direction === "add" && Number(l.quantity) > MAX_COUNT_PER_LINE
      ? issue("quantity", MSG.quantityMax)
      : null,
  (l) =>
    l.direction === "add" && l.kind === "by_serial" && blank(l.manufacturerSerial)
      ? issue("manufacturerSerial", MSG.manufacturerSerial)
      : null,
  (l) => (l.kind === "restore" && blank(l.internalSerial) ? issue("internalSerial", MSG.internalSerial) : null),
  (l) =>
    l.direction === "remove" && l.kind === "by_serial" && blank(l.internalSerial) && blank(l.manufacturerSerial)
      ? issue("internalSerial", MSG.eitherSerial)
      : null,
  (l) => (l.needsInspection && l.locationId ? issue("locationId", MSG.inspectionRack) : null),
];

function lineIssues(line: AdjustmentLineForm, reason: StockAdjustmentReason | ""): LineIssue[] {
  return LINE_RULES.map((rule) => rule(line, reason)).filter((i): i is LineIssue => i !== null);
}

/** Set a line's direction and drop what the new direction can't carry: a kind
 *  it doesn't allow falls back to by-count, and only an add can need inspection. */
export function setLineDirection(
  form: UseFormReturn<StockAdjustmentForm>,
  index: number,
  next: StockAdjustmentDirection,
) {
  form.setValue(`lines.${index}.direction`, next, { shouldDirty: true, shouldValidate: true });
  if (!DIRECTION_KINDS[next].includes(form.getValues(`lines.${index}.kind`))) {
    form.setValue(`lines.${index}.kind`, "by_count");
  }
  if (next === "remove") form.setValue(`lines.${index}.needsInspection`, false);
}

export function emptyAdjustmentLine(direction: StockAdjustmentDirection): AdjustmentLineForm {
  return {
    direction,
    kind: "by_count",
    variantId: "",
    variantLabel: "",
    quantity: "1",
    manufacturerSerial: "",
    internalSerial: "",
    locationId: "",
    locationLabel: "",
    needsInspection: false,
    notes: "",
  };
}

const orNull = (v: string) => v.trim() || null;

/** One form row → the wire line. Fields the kind doesn't use are sent null. */
export function toLineInput(line: AdjustmentLineForm): StockAdjustmentLineInput {
  const isAdd = line.direction === "add";
  return {
    direction: line.direction,
    kind: line.kind,
    part_variant_id: kindNeedsVariant(line.direction, line.kind) ? line.variantId : null,
    quantity: line.kind === "by_count" ? Number(line.quantity) : 1,
    manufacturer_serial: line.kind === "restore" ? null : orNull(line.manufacturerSerial),
    internal_serial: line.kind === "by_count" ? null : orNull(line.internalSerial),
    warehouse_location_id: lineAllowsLocation(line) ? line.locationId || null : null,
    needs_inspection: isAdd && line.kind !== "restore" && line.needsInspection,
    notes: orNull(line.notes),
  };
}

export function toCreatePayload(form: StockAdjustmentForm): StockAdjustmentCreate {
  return {
    warehouse_id: form.warehouseId,
    reason: form.reason as StockAdjustmentReason,
    notes: form.notes.trim(),
    source: "form",
    lines: form.lines.map(toLineInput),
  };
}

function lineFromResponse(line: StockAdjustmentLine): AdjustmentLineForm {
  return {
    direction: line.direction,
    kind: line.kind,
    variantId: line.part_variant_id ?? "",
    variantLabel: adjustmentItemLabel(line.sku_code, line.part_name),
    quantity: String(line.quantity),
    manufacturerSerial: line.manufacturer_serial ?? "",
    internalSerial: line.internal_serial ?? "",
    locationId: line.warehouse_location_id ?? "",
    locationLabel: line.location_label ?? "",
    needsInspection: line.needs_inspection,
    notes: line.notes ?? "",
  };
}

export function formFromAdjustment(adjustment: StockAdjustment | undefined): StockAdjustmentForm {
  if (!adjustment) {
    return { warehouseId: "", warehouseName: "", reason: "", notes: "", lines: [] };
  }
  return {
    warehouseId: adjustment.warehouse_id,
    warehouseName: adjustment.warehouse_name ?? "",
    reason: adjustment.reason,
    notes: adjustment.notes,
    lines: adjustment.lines.map(lineFromResponse),
  };
}
