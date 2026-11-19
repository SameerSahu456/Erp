/**
 * Shared demo-request line-item types and helpers.
 *
 * Demo-request items are part-variant-only — every row carries a real
 * `variant_id`; there are no ad-hoc/free-text rows and no per-line tax or
 * discount (unlike Sales Order items). Consumed by the standalone
 * `DemoRequestFormPage` and the Closed Won `ClosedWonDemoForm`, both of
 * which render the table via `DemoItemsCard`.
 *
 * BOM-component sub-rows were removed 2026-07: the old expander searched the
 * MOCK parts catalog and leaked mock part ids (e.g. "PART-007") into the real
 * create payload. Re-add the expander only once a real BOM-component search
 * endpoint exists to back it.
 */
import { type VariantListItem } from '@/modules/ims'

import type { DemoLineCondition, DemoRequestItemCreatePayload } from '../../api'

// ── Types ──

export interface DraftLine {
  id: string
  variantId: string
  partId: string
  partName: string
  partSku: string
  brand: string
  category: string
  subcategory?: string
  /** PM-routing dimensions, derived from the picked variant — see
   *  `DemoRequestItemCreatePayload.oem_id`. Demo lines are variant-only (no
   *  freeform rows), so unlike a Sales Order line these are never entered by
   *  hand: the variant IS the answer, and the UI renders them read-only. They
   *  stay optional because a line seeded from elsewhere (Closed Won) may not
   *  know them. */
  oemId?: string
  condition?: DemoLineCondition
  qty: number
  unitPrice: number
  /** GST % off the variant's HSN code — display only, a demo line has no tax
   *  of its own. Undefined when no HSN is linked. */
  taxRate?: number
}

// ── Helpers ──

export function genDemoLineId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Build a `DraftLine` from an IMS variant — used by the search picker. */
export function draftLineFromVariant(variant: VariantListItem): DraftLine {
  return {
    id: genDemoLineId('DRI'),
    variantId: variant.id,
    partId: variant.part_id,
    partName: variant.part_name,
    partSku: variant.part_number,
    brand: variant.oem_name,
    category: variant.category_name,
    subcategory: variant.parent_category_name ?? undefined,
    oemId: variant.oem_id || undefined,
    // `VariantListItem.condition` is typed `string` but carries the same IMS
    // wire values as a line condition (`new` / `refurbished` / `new_pull`).
    condition: (variant.condition || undefined) as DemoLineCondition | undefined,
    qty: 1,
    unitPrice: Number(variant.sell_price) || 0,
    taxRate: variant.hsn_gst_rate != null ? Number(variant.hsn_gst_rate) : undefined,
  }
}

export function demoLinesTotals(lines: DraftLine[]) {
  const totalQty = lines.reduce(
    (s, l) => s + (Number.isFinite(l.qty) ? l.qty : 0),
    0,
  )
  const totalAmount = lines.reduce(
    (s, l) =>
      s +
      (Number.isFinite(l.qty) ? l.qty : 0) *
        (Number.isFinite(l.unitPrice) ? l.unitPrice : 0),
    0,
  )
  return { totalQty, totalAmount }
}

/** Flatten draft lines into the demo-request item wire shape. Rows without a
 *  `variant_id` or with qty ≤ 0 are dropped — only real IMS variant ids ever
 *  reach the payload. */
export function buildDemoItems(lines: DraftLine[]): DemoRequestItemCreatePayload[] {
  const out: DemoRequestItemCreatePayload[] = []
  for (const l of lines) {
    if (!l.variantId || l.qty <= 0) continue
    out.push({
      variant_id: l.variantId,
      qty: l.qty,
      unit_price: Math.max(0, l.unitPrice),
      // Omitted rather than sent as null when unknown — the backend reads a
      // missing dimension as a WILDCARD, and `exclude_unset` on the Pydantic
      // side means an absent key and an explicit null are not the same thing.
      ...(l.oemId ? { oem_id: l.oemId } : {}),
      ...(l.condition ? { condition: l.condition } : {}),
    })
  }
  return out
}
