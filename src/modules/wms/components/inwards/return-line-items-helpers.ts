// Return-line state + pure builders, kept out of ReturnLineItems.tsx for fast refresh.
import { INWARDS_STRINGS } from './inwards.strings'
import type { GrnDraftLine, ExpectedLegacyUnit, ExpectedReturnLine } from '../../api'
import { CONDITION_LABELS } from '../../constants/condition'

/** One operator-added return line — same add-line shape as the PO flow. */
export interface ReturnLine {
  key: string
  variantId: string | null
  label: string
  tracked: boolean
  pending: number // dispatched-pending units of this variant
  serial: string // tracked: the returning unit's serial
  stockItemId: string | null // resolved from `serial` against the dispatched units
  qty: number // non-tracked: how many returning
  /** A migrated rental unit (no dispatch record, no catalog part), received
   *  by `serial` alone; finalize pairs it to the replacement line. */
  legacyDeviceId?: string
}

export type ReturnState = ReturnLine[]
export const emptyReturnState = (): ReturnState => []

/** Shared column template (mirrors the PO line-items table). */
export const RETURN_LINE_GRID = 'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_5rem_2.5rem] gap-3'

export const makeReturnLine = (): ReturnLine => ({
  key: crypto.randomUUID(),
  variantId: null,
  label: '',
  tracked: false,
  pending: 0,
  serial: '',
  stockItemId: null,
  qty: 0,
})

// ── The returnable variants on this source (what was dispatched) ──
export interface ReturnableVariant {
  variantId: string
  label: string
  tracked: boolean
  // Pending units; a scan matches the Comprint barcode or the manufacturer serial.
  units: {
    stockItemId: string
    serial: string
    manufacturerSerial: string
  }[]
}

// AsyncSelect keys rows by `id`; mirror `variantId` onto it.
export type ReturnVariantOption = ReturnableVariant & { id: string }

// The serial picker offers only these, so a non-returnable serial can't be entered.
export interface ReturnUnitOption {
  id: string
  serial: string
  manufacturerSerial: string
}

type ExpectedVariant = ExpectedReturnLine['expected_part_variant'] | ExpectedReturnLine['part_variant']

function newReturnableVariant(vid: string, pv: ExpectedVariant): ReturnableVariant {
  const cond = pv?.condition ? ` · ${CONDITION_LABELS[pv.condition] ?? pv.condition}` : ''
  return {
    variantId: vid,
    label: `${pv?.part_name ?? pv?.name ?? INWARDS_STRINGS.returnLineItems.unitFallback}${cond}`,
    tracked: pv?.is_tracking ?? false,
    units: [],
  }
}

// The maker's serial is what an operator usually reads off the box; the receive
// endpoint accepts either, so the picker matches both.
const returnableUnit = (l: ExpectedReturnLine, stockItemId: string) => ({
  stockItemId,
  serial: l.internal_serial ?? '',
  manufacturerSerial: l.manufacturer_serial ?? '',
})

export function returnableVariants(lines: ExpectedReturnLine[]): ReturnableVariant[] {
  const by = new Map<string, ReturnableVariant>()
  for (const l of lines) {
    const vid = l.expected_part_variant_id
    if (!vid) continue
    let g = by.get(vid)
    if (!g) {
      g = newReturnableVariant(vid, l.expected_part_variant ?? l.part_variant)
      by.set(vid, g)
    }
    if (l.stock_item_id) g.units.push(returnableUnit(l, l.stock_item_id))
  }
  return [...by.values()]
}

/** A migrated unit ticked as returning. */
export const legacyReturnLine = (unit: ExpectedLegacyUnit): ReturnLine => ({
  ...makeReturnLine(),
  label: unit.part_name ?? '',
  tracked: true,
  serial: unit.serial_number ?? '',
  legacyDeviceId: unit.rental_device_id,
})

export function lineUnits(l: ReturnLine): number {
  if (l.legacyDeviceId) return 1
  if (!l.variantId) return 0
  if (l.tracked) return l.stockItemId ? 1 : 0
  return Math.max(0, l.qty)
}

/** Units the operator has marked returning. */
export function returnUnitCount(state: ReturnState): number {
  return state.reduce((sum, l) => sum + lineUnits(l), 0)
}

/** Build the atomic return lines, grouped by variant: tracked → units[] of the
 *  resolved stock_item_ids; non-tracked → summed quantity (backend FIFO). */
export function buildReturnLines(state: ReturnState): GrnDraftLine[] {
  const tracked = new Map<string, string[]>() // variantId → stock_item_ids
  const qtyByVariant = new Map<string, number>() // variantId → qty
  for (const l of state) {
    if (!l.variantId) continue
    if (l.tracked) {
      if (!l.stockItemId) continue
      tracked.set(l.variantId, [...(tracked.get(l.variantId) ?? []), l.stockItemId])
    } else if (l.qty > 0) {
      qtyByVariant.set(l.variantId, (qtyByVariant.get(l.variantId) ?? 0) + l.qty)
    }
  }
  const out: GrnDraftLine[] = []
  for (const [variantId, ids] of tracked) {
    out.push({
      receive: {
        part_variant_id: variantId,
        expected_part_variant_id: variantId,
        units: ids.map((id) => ({ stock_item_id: id })),
      },
    })
  }
  for (const [variantId, qty] of qtyByVariant) {
    out.push({
      receive: { part_variant_id: variantId, expected_part_variant_id: variantId, quantity: qty },
    })
  }
  // Migrated units: serial only — they have no catalog part to name. The
  // serial the old rentals system recorded is the maker's, never one of our
  // barcodes, so it is staged as the manufacturer serial (finalize matches
  // either field).
  for (const l of state) {
    if (l.legacyDeviceId && l.serial) {
      out.push({
        receive: { source_type: 'dispatch_request_items', units: [{ manufacturer_serial: l.serial }] },
      })
    }
  }
  return out
}

type StagedReturn = NonNullable<GrnDraftLine['receive']>

function stagedReturnLines(rec: StagedReturn, vid: string, v: ReturnableVariant | undefined): ReturnLine[] {
  const base = {
    variantId: vid,
    label: v?.label ?? '',
    tracked: v?.tracked ?? false,
    pending: v?.units.length ?? 0,
  }
  const units = rec.units as { stock_item_id?: string }[] | undefined
  if (units && units.length) {
    return units.map((u) => ({
      ...makeReturnLine(),
      ...base,
      tracked: true,
      serial: v?.units.find((x) => x.stockItemId === u.stock_item_id)?.serial ?? '',
      stockItemId: u.stock_item_id ?? null,
      qty: 0,
    }))
  }
  const qty = rec.quantity ?? 0
  return qty > 0 ? [{ ...makeReturnLine(), ...base, tracked: false, qty }] : []
}

/** Rebuild editable return state from a draft batch's staged lines (Edit flow). */
export function hydrateReturnState(
  atomicLines: GrnDraftLine[],
  lines: ExpectedReturnLine[],
): ReturnState {
  const byId = new Map(returnableVariants(lines).map((v) => [v.variantId, v]))
  const out: ReturnState = []
  for (const al of atomicLines) {
    const rec = al.receive
    if (!rec) continue
    const vid = rec.expected_part_variant_id ?? rec.part_variant_id
    if (!vid) continue
    out.push(...stagedReturnLines(rec, vid, byId.get(vid)))
  }
  return out
}
