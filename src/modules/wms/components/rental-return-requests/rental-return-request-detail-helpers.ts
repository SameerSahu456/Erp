import type { RentalReturnRequestItemWire } from "@modules/crm"

import { RENTAL_RETURN_OPEN_RECEIPTS } from "../../constants/rental-return-status"

export const LIST_ROUTE = "/wms/rental-returns"
export const NEW_ROUTE = `${LIST_ROUTE}/new`
export const rentalReturnDetailPath = (id: string) => `${LIST_ROUTE}/${id}`

/** Units a line still expects — zero once received in full or closed. */
export function outstandingOf(item: RentalReturnRequestItemWire): number {
  if (!RENTAL_RETURN_OPEN_RECEIPTS.has(item.receipt_status)) return 0
  return Math.max(item.quantity - item.received_quantity, 0)
}

/** A line can be closed short while it is approved and still open. */
export function isClosable(item: RentalReturnRequestItemWire): boolean {
  return item.approval_status === "approved" && outstandingOf(item) > 0
}

export function modelLabel(item: RentalReturnRequestItemWire, unknown: string): string {
  const name = [item.part_name, item.variant_name].filter(Boolean).join(" · ")
  return name || unknown
}

export interface ModelVariance {
  /** The model, or the order line for a legacy line with no model. */
  key: string
  label: string
  requested: number
  received: number
  substituted: number
  unrequested: number
  outstanding: number
}

/**
 * Requested vs received per model (spec §5 variance summary).
 *
 * `received` counts the declared lines' receipts; a box of a different model
 * lands on a `substitute` line and one nobody asked for on a
 * `received_unrequested` line, so they are shown apart from it.
 */
export function varianceByModel(
  items: readonly RentalReturnRequestItemWire[],
  unknown: string,
): ModelVariance[] {
  const rows = new Map<string, ModelVariance>()
  for (const item of items) {
    const key = item.part_variant_id ?? item.sales_order_item_id ?? item.id
    const row = rows.get(key) ?? {
      key,
      label: modelLabel(item, unknown),
      requested: 0,
      received: 0,
      substituted: 0,
      unrequested: 0,
      outstanding: 0,
    }
    if (item.line_origin === "substitute") row.substituted += item.received_quantity
    else if (item.line_origin === "received_unrequested") row.unrequested += item.received_quantity
    else {
      row.requested += item.quantity
      row.received += item.received_quantity
    }
    row.outstanding += outstandingOf(item)
    rows.set(key, row)
  }
  return [...rows.values()]
}
