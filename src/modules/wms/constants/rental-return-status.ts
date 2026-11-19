import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

// Rental Return Request display maps, keyed on the API's own literals
// (Coding-guideline §16.12 — enum display via a label map, never a naked
// string in JSX).

export type RentalReturnStatus =
  | "pending_approval"
  | "partially_approved"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled"
  | "closed_short"

export const RENTAL_RETURN_STATUS_LABEL: Record<RentalReturnStatus, string> = {
  pending_approval: "Pending approval",
  // Reachable and meaningful: a PM deciding 2 of 3 lines lands here, and the
  // warehouse CAN receive against it — an approved line's units must not wait
  // on a sibling line's PM. Never fold it into "Approved".
  partially_approved: "Partially approved",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
  // Settled with fewer units than asked for — the rest stopped being
  // expected (by hand, or auto-closed after N days without a receipt).
  closed_short: "Closed short",
}

export const RENTAL_RETURN_STATUS_VARIANT: Record<
  RentalReturnStatus,
  StatusBadgeVariant
> = {
  pending_approval: "warning",
  partially_approved: "warning",
  approved: "info",
  rejected: "error",
  completed: "success",
  cancelled: "neutral",
  closed_short: "warning",
}

// ── Per-line ───────────────────────────────────────────────────────

export type RentalReturnLineApproval = "pending" | "approved" | "rejected"

export const RENTAL_RETURN_APPROVAL_LABEL: Record<
  RentalReturnLineApproval,
  string
> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}

export const RENTAL_RETURN_APPROVAL_VARIANT: Record<
  RentalReturnLineApproval,
  StatusBadgeVariant
> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
}

export type RentalReturnLineReceipt =
  | "pending"
  | "partially_received"
  | "received"
  | "closed_short"

export const RENTAL_RETURN_RECEIPT_LABEL: Record<RentalReturnLineReceipt, string> =
  {
    pending: "Awaiting units",
    partially_received: "Partially received",
    received: "Received",
    closed_short: "Closed short",
  }

export const RENTAL_RETURN_RECEIPT_VARIANT: Record<
  RentalReturnLineReceipt,
  StatusBadgeVariant
> = {
  pending: "neutral",
  partially_received: "info",
  received: "success",
  closed_short: "warning",
}

/** Receipt statuses a line can still take units on (and be closed short). */
export const RENTAL_RETURN_OPEN_RECEIPTS: ReadonlySet<string> = new Set([
  "pending",
  "partially_received",
])

// ── Line origin ────────────────────────────────────────────────────
//
// `declared` is what sales asked for. The other two record a receipt nobody
// asked for: a different model than declared (substitute), or more than
// declared / no request at all (received_unrequested).

export type RentalReturnLineOrigin = "declared" | "substitute" | "received_unrequested"

export const RENTAL_RETURN_LINE_ORIGIN_LABEL: Record<RentalReturnLineOrigin, string> = {
  declared: "Requested",
  substitute: "Substitute model",
  received_unrequested: "Not requested",
}

export const RENTAL_RETURN_LINE_ORIGIN_VARIANT: Record<
  RentalReturnLineOrigin,
  StatusBadgeVariant
> = {
  declared: "neutral",
  substitute: "warning",
  received_unrequested: "info",
}

// ── Reason ─────────────────────────────────────────────────────────
//
// What a new return may carry — mirrors the backend's `RRET_REASONS`
// (approvals spec D7). A faulty unit going home on a swap, or one damaged in
// transit, is a REPLACEMENT, not a return, so neither is offered any more;
// both stay labelled because older requests still carry them.

export type RentalReturnNewReason = "tenure_over" | "not_wanted" | "quality_issue" | "other"

export type RentalReturnReason =
  | RentalReturnNewReason
  | "replacement_return"
  | "damage_in_transit"

export const RENTAL_RETURN_REASON_LABEL: Record<RentalReturnReason, string> = {
  tenure_over: "Tenure over",
  not_wanted: "Not wanted",
  quality_issue: "Quality issue",
  other: "Other",
  replacement_return: "Replacement return",
  damage_in_transit: "Damaged in transit",
}

/** The form's choices — new reasons only. */
export const RENTAL_RETURN_REASON_OPTIONS = [
  { value: "tenure_over", label: RENTAL_RETURN_REASON_LABEL.tenure_over },
  { value: "not_wanted", label: RENTAL_RETURN_REASON_LABEL.not_wanted },
  { value: "quality_issue", label: RENTAL_RETURN_REASON_LABEL.quality_issue },
  { value: "other", label: RENTAL_RETURN_REASON_LABEL.other },
]

/** The register's filter — also finds requests raised with a retired reason. */
export const RENTAL_RETURN_REASON_FILTER_OPTIONS = [
  ...RENTAL_RETURN_REASON_OPTIONS,
  { value: "replacement_return", label: RENTAL_RETURN_REASON_LABEL.replacement_return },
  { value: "damage_in_transit", label: RENTAL_RETURN_REASON_LABEL.damage_in_transit },
]

// ── Logistics ──────────────────────────────────────────────────────

export type RentalReturnPickupBy = "us" | "customer"

export const RENTAL_RETURN_PICKUP_LABEL: Record<RentalReturnPickupBy, string> = {
  us: "Self pick",
  customer: "Customer delivery",
}

export const RENTAL_RETURN_PICKUP_OPTIONS = [
  { value: "us", label: RENTAL_RETURN_PICKUP_LABEL.us },
  { value: "customer", label: RENTAL_RETURN_PICKUP_LABEL.customer },
]
