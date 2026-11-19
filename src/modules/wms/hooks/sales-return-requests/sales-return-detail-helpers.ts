import type { SalesReturnRequestItemWire, SalesReturnRequestWire } from "@modules/crm"

/** Header-level gates for the detail page, derived from the request + its lines. */
export function salesReturnHeaderGates(
  sret: SalesReturnRequestWire | undefined,
  items: SalesReturnRequestItemWire[],
) {
  // Cancel is refused once any unit is received (409 SRET_ALREADY_RECEIVED).
  const anyReceived = items.some((i) => i.receipt_status === "received")
  const canCancel =
    !!sret &&
    !anyReceived &&
    ["pending_approval", "partially_approved", "approved"].includes(sret.status)

  // Cancelled is terminal: pending badges and the PM name no longer apply.
  const isCancelled = sret?.status === "cancelled"
  // No decisions on a terminal header.
  const isTerminal =
    !!sret && ["cancelled", "rejected", "completed"].includes(sret.status)
  // Hide selection when nothing is decidable: terminal, or fully approved.
  const hideSelection = isTerminal || sret?.status === "approved"
  // Logistics is recorded, not editable, once the return is cancelled or
  // rejected.
  const logisticsEditable =
    !!sret && !["cancelled", "rejected"].includes(sret.status)
  return { canCancel, isCancelled, isTerminal, hideSelection, logisticsEditable }
}
