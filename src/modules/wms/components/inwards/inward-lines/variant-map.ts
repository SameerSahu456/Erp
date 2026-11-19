import type { VariantListItem } from '@modules/ims'

import type { POExpectedLine } from '../../../api'
import { componentsFromTemplate, type ManualLine } from './model'

/** "<part name> — <variant>": the title the catalog picker shows on
 *  description-only POs, so both PO kinds read the same. */
export function poLineTitle(l: {
  part_name?: string | null
  part_number?: string | null
  variant_name?: string | null
}): string {
  const part = l.part_name || l.part_number || ''
  return l.variant_name ? `${part} — ${l.variant_name}` : part
}

/** Project a PO pending line into the `VariantListItem` shape the part-picker
 *  consumes, so the part-number picker can be a static PO-only dropdown (no
 *  catalog search). Only the fields `lineFromVariant` + `renderItem` read are
 *  meaningful; the rest are inert defaults. */
export function poLineToOption(l: POExpectedLine): VariantListItem {
  const partNumber = l.part_number ?? ''
  const variantName = l.variant_name ?? ''
  const partVariant = l.part_variant as { aliases?: string[] | null } | null | undefined
  return {
    id: l.part_variant_id as string,
    part_id: l.part_variant?.part_id ?? '',
    part_name: l.part_name ?? '',
    part_number: partNumber,
    name: variantName,
    display_title: poLineTitle(l),
    aliases: partVariant?.aliases ?? null,
    // Inert default — a PO line carries no part-level aliases, and the
    // part-picker doesn't render them.
    part_aliases: null,
    condition: l.condition ?? '',
    // Inert defaults — the three fields each branch added to `VariantListItem`
    // (`sku_code`, `part_description`, `part_is_tracking`). This projection
    // feeds the inward part-picker, which reads none of them; real tracking for
    // a PO line comes from `part_variant.is_tracking` in `lineFromVariant`.
    sku_code: '',
    part_description: null,
    part_is_tracking: false,
    category_id: l.part_variant?.category_id ?? '',
    is_bom_eligible: (l as { is_bom_eligible?: boolean }).is_bom_eligible ?? false,
    oem_name: '',
    oem_id: '',
    parent_category_name: null,
    parent_category_id: null,
    category_name: '',
    is_active: true,
    is_default: false,
    // The PO line's description — searchable in the PO-only part picker.
    description: l.description ?? null,
    currency: 'INR',
    sell_price: '0',
    // Inert default — this projection feeds the inward part-picker, which
    // never offers price editing.
    can_edit_price: false,
    available_stock_qty: 0,
    stock_summary: {
      available: 0,
      in_operations: 0,
      reserved: 0,
      damaged: 0,
      installed: 0,
      total_units: 0,
    },
    // Inert default alongside the zeroed stock counts — the inward
    // part-picker shows neither stock levels nor inbound quantities.
    expected_qty: 0,
    hsn_code_id: null,
    hsn_gst_rate: null,
    created_at: '',
    updated_at: '',
  }
}

// On-PO lines take their part fields (incl. BOM eligibility) from the PO row;
// an off-PO catalog pick takes them from the variant itself.
function poBoundFields(match: POExpectedLine | undefined, item: VariantListItem) {
  if (!match) {
    return {
      sourceId: null,
      pending: 0,
      partNumber: item.part_number,
      variantName: item.name,
      condition: item.condition,
      bomEligible: item.is_bom_eligible,
      bom: [],
    } satisfies Partial<ManualLine>
  }
  return {
    sourceId: match.source_line_entity_id ?? null,
    pending: match.pending_quantity ?? 0,
    partNumber: match.part_number ?? item.part_number,
    variantName: match.variant_name ?? item.name,
    condition: match.condition ?? item.condition,
    bomEligible: match.is_bom_eligible ?? item.is_bom_eligible,
    bom: match.bom ?? [],
  } satisfies Partial<ManualLine>
}

/** Map a picked IMS variant to the PO pending line that carries it. The same
 *  part may be added on multiple lines (one serial each), so no dedup. */
export function lineFromVariant(
  item: VariantListItem,
  pendingLines: POExpectedLine[],
): Partial<ManualLine> {
  const match = pendingLines.find((l) => l.part_variant_id === item.id)
  const tracked = match?.part_variant?.is_tracking ?? false
  const bound = poBoundFields(match, item)
  return {
    variantId: item.id,
    label: item.display_title || item.part_number,
    onPo: !!match,
    tracked,
    categoryId: item.category_id,
    ...bound,
    serial: '',
    // Quantity-driven lines start at 1 unit (editable); on-PO tracked stays
    // serial-driven (qty 0).
    qty: match && tracked ? 0 : 1,
    // The BOM is pre-filled, not loaded by hand (inward-verification D1).
    components: bound.bomEligible ? componentsFromTemplate(bound.bom) : [],
  }
}

/** Pick a part for a description-only PO line. Keeps the line bound to its PO
 *  line (onPo + sourceId stay); tracking and the BOM are resolved later from
 *  the part (useDescTrackingSync / useDescBomSync). */
export function descLineFromVariant(item: VariantListItem): Partial<ManualLine> {
  return {
    variantId: item.id,
    partId: item.part_id,
    label: item.display_title || item.part_number,
    partNumber: item.part_number,
    variantName: item.name,
    condition: item.condition,
    categoryId: item.category_id,
    bomEligible: item.is_bom_eligible,
    bom: [],
    serial: '',
    qty: 1,
    components: [],
  }
}
