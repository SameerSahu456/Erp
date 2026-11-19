import type { GrnDraftLine } from '../../../api'
import {
  lineSerialMode,
  lineUnitCount,
  type BomComponentDraft,
  type ManualLine,
} from '../inward-lines/model'

type DraftComponent = NonNullable<NonNullable<GrnDraftLine['components']>['added']>[number]

/** The operator's component list for one unit, missing rows and alternatives
 *  included (inward-verification D1/D7). An alternative points at its missing
 *  row by that row's index in this same list. */
function componentPayload(components: BomComponentDraft[]): DraftComponent[] {
  const kept = components.filter((c) => c.componentVariantId && c.quantity > 0)
  const indexByKey = new Map(kept.map((c, i) => [c.rowKey, i]))
  return kept.map((c) => ({
    component_part_variant_id: c.componentVariantId,
    manufacturer_serial: (!c.missing && c.serial.trim()) || null,
    quantity: c.quantity,
    position: c.position,
    missing: c.missing === true,
    instead_of_index: c.insteadOfKey ? (indexByKey.get(c.insteadOfKey) ?? null) : null,
  }))
}

/** Build the atomic receive-lines for a PO inward from the editor's ManualLines.
 *  Serial mode (tracked, or non-tracked with a serial) ships one identified unit
 *  via units[]; quantity mode ships a count. On-PO lines bind to their PO line
 *  via source_id; off-PO lines carry only part_variant_id (finalize rejects them
 *  until added to the PO). Inline BOM components ride on single-unit lines. */
export function buildPoLines(lines: ManualLine[]): GrnDraftLine[] {
  const out: GrnDraftLine[] = []
  for (const l of lines) {
    if (!l.variantId) continue
    if (lineUnitCount(l) <= 0) continue
    let line: GrnDraftLine
    const serialMode = lineSerialMode(l)
    if (l.onPo && l.sourceId) {
      // part_variant_id is the operator-identified part. The backend ignores it
      // when the PO line carries its own variant, and uses it when the PO line
      // is description-only — so always sending it is safe.
      line = serialMode
        ? {
            receive: {
              source_type: 'purchase_order_items',
              source_id: l.sourceId,
              part_variant_id: l.variantId,
              units: [{ manufacturer_serial: l.serial.trim() }],
            },
          }
        : {
            receive: {
              source_type: 'purchase_order_items',
              source_id: l.sourceId,
              part_variant_id: l.variantId,
              quantity: l.qty,
            },
          }
    } else {
      // Off-PO "unexpected" item — recorded by part_variant_id with no PO source.
      line = serialMode
        ? { receive: { part_variant_id: l.variantId, units: [{ manufacturer_serial: l.serial.trim() }] } }
        : { receive: { part_variant_id: l.variantId, quantity: l.qty } }
    }
    // A single unit sends the operator's list — even an empty one, which means
    // "nothing inside". A bulk line, or a single unit whose BOM the editor never
    // knew, sends nothing and the server applies the BOM to every unit (D1).
    const knowsComposition = l.bom.length > 0 || l.components.length > 0
    if (lineUnitCount(l) === 1 && knowsComposition) {
      line.components = { added: componentPayload(l.components) }
    }
    out.push(line)
  }
  return out
}
