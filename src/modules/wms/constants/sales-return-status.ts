import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

// Sales Return Request display maps, keyed on the API's own literals
// (Coding-guideline §16.12 — enum display via a label map, never a naked
// string in JSX).

export type SalesReturnStatus =
  | "pending_approval"
  | "partially_approved"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled"

export const SALES_RETURN_STATUS_LABEL: Record<SalesReturnStatus, string> = {
  pending_approval: "Pending approval",
  // Reachable and meaningful: a PM deciding 2 of 3 lines lands here, and the
  // warehouse CAN receive against it — an approved line's units must not wait
  // on a sibling line's PM. Never fold it into "Approved".
  partially_approved: "Partially approved",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const SALES_RETURN_STATUS_VARIANT: Record<
  SalesReturnStatus,
  StatusBadgeVariant
> = {
  pending_approval: "warning",
  partially_approved: "warning",
  approved: "info",
  rejected: "error",
  completed: "success",
  cancelled: "neutral",
}

// ── Per-line ───────────────────────────────────────────────────────

export type SalesReturnLineApproval = "pending" | "approved" | "rejected"

export const SALES_RETURN_APPROVAL_LABEL: Record<
  SalesReturnLineApproval,
  string
> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}

export const SALES_RETURN_APPROVAL_VARIANT: Record<
  SalesReturnLineApproval,
  StatusBadgeVariant
> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
}

export type SalesReturnLineReceipt = "pending" | "received"

export const SALES_RETURN_RECEIPT_LABEL: Record<SalesReturnLineReceipt, string> =
  {
    pending: "Awaiting unit",
    received: "Received",
  }

export const SALES_RETURN_RECEIPT_VARIANT: Record<
  SalesReturnLineReceipt,
  StatusBadgeVariant
> = {
  pending: "neutral",
  received: "success",
}

// ── Reason ─────────────────────────────────────────────────────────
//
// `wrong_item_shipped` is deliberately absent: "you sent the wrong thing,
// send me the right one" is a Replacement Request, which dispatches against
// the RR and so never consumes the sales order's capacity.

export type SalesReturnReason = "customer_return" | "damage_in_transit"

export const SALES_RETURN_REASON_LABEL: Record<SalesReturnReason, string> = {
  customer_return: "Customer return",
  damage_in_transit: "Damaged in transit",
}

// One-line descriptions shown under each reason tile on the raise form.
export const SALES_RETURN_REASON_HINT: Record<SalesReturnReason, string> = {
  customer_return: "The customer is sending working units back.",
  damage_in_transit: "The units reached the customer damaged.",
}

export const SALES_RETURN_REASON_OPTIONS = [
  {
    value: "customer_return",
    label: SALES_RETURN_REASON_LABEL.customer_return,
    hint: SALES_RETURN_REASON_HINT.customer_return,
  },
  {
    value: "damage_in_transit",
    label: SALES_RETURN_REASON_LABEL.damage_in_transit,
    hint: SALES_RETURN_REASON_HINT.damage_in_transit,
  },
]

// ── Logistics ──────────────────────────────────────────────────────

export type SalesReturnPickupBy = "us" | "customer"

export const SALES_RETURN_PICKUP_LABEL: Record<SalesReturnPickupBy, string> = {
  us: "We collect",
  customer: "Customer ships",
}

// One-line descriptions shown under each pickup tile on the raise form.
export const SALES_RETURN_PICKUP_HINT: Record<SalesReturnPickupBy, string> = {
  us: "Our team or courier collects from the customer.",
  customer: "The customer ships the units to our warehouse.",
}

// The customer's shipping paperwork, filed on the return when they ship it.
export const SALES_RETURN_DOC_TYPES = [
  { value: "delivery_challan", label: "Delivery challan" },
  { value: "courier_receipt", label: "Courier receipt" },
  { value: "other", label: "Other" },
] as const

export const SALES_RETURN_PICKUP_OPTIONS = [
  {
    value: "us",
    label: SALES_RETURN_PICKUP_LABEL.us,
    hint: SALES_RETURN_PICKUP_HINT.us,
  },
  {
    value: "customer",
    label: SALES_RETURN_PICKUP_LABEL.customer,
    hint: SALES_RETURN_PICKUP_HINT.customer,
  },
]
