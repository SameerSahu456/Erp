import type { PartLineFieldsValue } from "@modules/crm"

import type { BomComponent } from "./POBomPanel"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

const S = PURCHASE_ORDERS_STRINGS.form

export interface POLine {
  key: string
  part: PartLineFieldsValue
  // Parent part's number + the variant's own name, kept raw so the Part No
  // column can read "<part_number> - <variant_name>" (distinct from Part Name,
  // which shows the composed part_name — variant_name). Populated from the
  // picker on pick and from the PO item response (part_number / variant_name)
  // on edit-mode hydration; undefined for free-text (description-only) lines.
  partNumber?: string
  variantName?: string
  // Condition of the picked catalog variant (new / refurbished / new_pull),
  // captured so the form can block saving a line whose condition differs from
  // the PO header condition. Undefined for free-text (description-only) lines.
  partCondition?: string
  qty: number
  unitPrice: number
  taxRate: number
  // The picked part's HSN rate, which locks taxRate. Undefined for a free-text
  // line or a part with no HSN code; taxRate is then the operator's to change.
  hsnGstRate?: number
  // The line's category (IMS nested picker). Auto-filled from the picked part,
  // editable for free-text lines, and drives the BOM-eligibility check
  // (`category.is_bom_eligible`).
  categoryId: string
  // Bill-of-materials editor state. Captured in the UI for BOM-eligible parts;
  // not persisted by the create API yet (assembly happens at WMS inward).
  bomOpen: boolean
  bomComponents: BomComponent[]
}


export const LINE_COLS: { label: string; cls: string; required?: boolean }[] = [
  { label: S.columns.srNo, cls: "w-[64px]" },
  { label: S.columns.partNo, cls: "w-[190px]" },
  { label: S.columns.partName, cls: "w-[190px]" },
  { label: S.columns.category, cls: "w-[150px]", required: true },
  { label: S.columns.description, cls: "w-[274px]" },
  { label: S.columns.qty, cls: "w-[72px] text-right" },
  { label: S.columns.unitPrice, cls: "w-[110px] text-right" },
  { label: S.columns.tax, cls: "w-[96px] text-right" },
  { label: S.columns.amount, cls: "w-[130px] text-right" },
  { label: "", cls: "w-[44px]" },
]

// Part No column value: "<part_number> - <variant_name>" once a catalog
// variant is picked — distinct from Part Name, which shows the composed
// part_name — variant_name. Falls back to the unique SKU, then the name, for
// lines where the raw part_number / variant_name aren't both known.
export function partNoDisplay(line: POLine): string | undefined {
  return line.partNumber && line.variantName
    ? `${line.partNumber} - ${line.variantName}`
    : (line.part.partSku ?? line.part.partName)
}

// Where a line's tax starts when it has no part, or its part has no HSN code.
export const DEFAULT_TAX_RATE = 18

/** Tax on one line, rounded the way the backend rounds it. */
export function lineTax(qty: number, unitPrice: number, taxRate: number): number {
  return Math.round(qty * unitPrice * taxRate) / 100
}

interface PricedLine {
  qty: number
  unitPrice: number
  taxRate: number
}

/** The order summary's figures. A preview: the backend works out what is saved. */
export function orderTotals(lines: (PricedLine & { bomComponents: PricedLine[] })[]) {
  const priced = lines.flatMap((l) => [l, ...l.bomComponents])
  const subtotal = priced.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const tax = priced.reduce((s, l) => s + lineTax(l.qty, l.unitPrice, l.taxRate), 0)
  return { subtotal, tax, total: subtotal + tax }
}

/** A saved line's tax in the forms: its part's HSN rate when it has one, so an
 *  older line saved without tax picks it up, else what was saved, else the default. */
export function taxFieldsFromSaved(line: {
  hsn_gst_rate?: string | null
  tax_rate: string | null
}): { hsnGstRate?: number; taxRate: number } {
  const hsnGstRate = line.hsn_gst_rate != null ? Number(line.hsn_gst_rate) : undefined
  const saved = line.tax_rate != null ? Number(line.tax_rate) : DEFAULT_TAX_RATE
  return { hsnGstRate, taxRate: hsnGstRate ?? saved }
}

/** A line's tax after its part changes: the new part's HSN rate; with none, the
 *  default if the old rate was locked, otherwise whatever the operator typed. */
export function taxFieldsForPart(
  line: { taxRate: number; hsnGstRate?: number },
  hsnGstRate: number | undefined,
): { hsnGstRate?: number; taxRate: number } {
  const unlocked = line.hsnGstRate != null ? DEFAULT_TAX_RATE : line.taxRate
  return { hsnGstRate, taxRate: hsnGstRate ?? unlocked }
}

export function newLine(): POLine {
  return {
    key: `line-${crypto.randomUUID()}`,
    part: { description: "" },
    qty: 1,
    unitPrice: 0,
    taxRate: DEFAULT_TAX_RATE,
    categoryId: "",
    bomOpen: false,
    bomComponents: [],
  }
}
