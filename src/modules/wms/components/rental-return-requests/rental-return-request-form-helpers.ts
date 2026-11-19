import type {
  RentalReturnEligibleUnitWire,
  RentalReturnEligibleVariantWire,
  RentalReturnVariantOrderWire,
} from "@modules/crm"

import type { RentalReturnUnitPick } from "./rental-return-form.schema"

/** A unit's identity on the form: its dispatch record, or — for a migrated
 *  unit with none — its rental device. Prefixed so the two never collide. */
export function unitKey(unit: RentalReturnEligibleUnitWire): string {
  return unit.dispatch_request_item_id
    ? `dri:${unit.dispatch_request_item_id}`
    : `dev:${unit.rental_device_id ?? ""}`
}

/** The form's record of a ticked unit — exactly what its request line pins. */
export function toUnitPick(unit: RentalReturnEligibleUnitWire): RentalReturnUnitPick {
  return {
    key: unitKey(unit),
    salesOrderItemId: unit.sales_order_item_id,
    partVariantId: unit.part_variant_id ?? null,
    dispatchRequestItemId: unit.dispatch_request_item_id ?? null,
    rentalDeviceId: unit.no_dispatch_record ? (unit.rental_device_id ?? null) : null,
    generation: unit.generation === "replacement" ? "replacement" : "sales_order",
  }
}

/** One request line per ticked unit, pinned to it (the sales-return shape). */
export function toRequestItems(picks: readonly RentalReturnUnitPick[]) {
  return picks.map((p) => ({
    sales_order_item_id: p.salesOrderItemId,
    part_variant_id: p.partVariantId,
    quantity: 1,
    pinned_dispatch_request_item_id: p.dispatchRequestItemId,
    pinned_rental_device_id: p.rentalDeviceId,
    generation: p.generation,
  }))
}

/** Every order holding any of the account's models, once each — the
 *  choices for the order picker. */
export function holdingOrders(
  variants: readonly RentalReturnEligibleVariantWire[],
): RentalReturnVariantOrderWire[] {
  const byId = new Map<string, RentalReturnVariantOrderWire>()
  for (const v of variants) {
    for (const o of v.orders) {
      const seen = byId.get(o.sales_order_id)
      byId.set(
        o.sales_order_id,
        seen ? { ...seen, units_out: seen.units_out + o.units_out } : o,
      )
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.order_number.localeCompare(b.order_number),
  )
}

export function hasSerial(unit: RentalReturnEligibleUnitWire, wanted: string): boolean {
  return [unit.internal_serial, unit.manufacturer_serial].some(
    (s) => s?.toLowerCase() === wanted,
  )
}

/**
 * The units a Return deep link ticks once the order's units have loaded:
 * - `all` — every unit (the order's Return, or after Terminate);
 * - `lineId` — that order line's units (a line's Return);
 * - `serial` — the one unit carrying it (a device's Return).
 * `null` when the link names nothing on this list.
 */
export function deepLinkPicks(
  units: readonly RentalReturnEligibleUnitWire[],
  link: { all: boolean; lineId: string | null; serial: string | null },
): RentalReturnUnitPick[] | null {
  let picked: readonly RentalReturnEligibleUnitWire[] = []
  if (link.serial) {
    const wanted = link.serial.toLowerCase()
    picked = units.filter((u) => hasSerial(u, wanted)).slice(0, 1)
  } else if (link.lineId) {
    picked = units.filter((u) => u.sales_order_item_id === link.lineId)
  } else if (link.all) {
    picked = units
  }
  return picked.length > 0 ? picked.map(toUnitPick) : null
}

/** Client-side search over one order's units (the list arrives whole). */
export function matchesUnitSearch(unit: RentalReturnEligibleUnitWire, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [unit.internal_serial, unit.manufacturer_serial, unit.part_name, unit.variant_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q)
}
