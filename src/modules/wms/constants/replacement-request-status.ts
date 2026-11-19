import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

// Replacement Request display maps, keyed on the API's own literals.
//
// The mock module these once came from used title-case labels ("Pending",
// "Replacement Issued") that no server status matches. Keys here are the wire
// values; the human label lives beside the variant so a status is rendered the
// same way everywhere (Coding-guideline §16.12 — enum display via a label map,
// not a naked string in JSX).

export type ReplacementRequestStatus =
  | "pending_approval"
  | "partially_approved"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled"

export const REPLACEMENT_STATUS_LABEL: Record<ReplacementRequestStatus, string> = {
  pending_approval: "Pending approval",
  // Reachable and meaningful: a PM approving 2 of 3 lines lands here, so it
  // must never be folded into "Approved".
  partially_approved: "Partially approved",
  approved: "Approved",
  rejected: "Rejected",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const REPLACEMENT_STATUS_VARIANT: Record<
  ReplacementRequestStatus,
  StatusBadgeVariant
> = {
  pending_approval: "warning",
  partially_approved: "warning",
  approved: "success",
  rejected: "error",
  in_progress: "info",
  completed: "success",
  cancelled: "neutral",
}

export type ReplacementMode = "normal" | "advance"

export const REPLACEMENT_MODE_LABEL: Record<ReplacementMode, string> = {
  // Return-first: the old unit must be received before the new one ships.
  normal: "Normal Replacement",
  // Ship-first: the replacement goes out and the old unit is chased after.
  advance: "Advance Replacement",
}

export const REPLACEMENT_MODE_VARIANT: Record<ReplacementMode, StatusBadgeVariant> = {
  normal: "neutral",
  advance: "info",
}

// Toolbar filter options — value is the API literal, label the human word.
export const REPLACEMENT_MODE_OPTIONS = (
  Object.keys(REPLACEMENT_MODE_LABEL) as ReplacementMode[]
).map((value) => ({ value, label: REPLACEMENT_MODE_LABEL[value] }))

export type ReplacementPriority = "low" | "medium" | "high" | "urgent"

export const REPLACEMENT_PRIORITY_LABEL: Record<ReplacementPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

export const REPLACEMENT_PRIORITY_VARIANT: Record<
  ReplacementPriority,
  StatusBadgeVariant
> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "error",
}

export const REPLACEMENT_PRIORITY_OPTIONS = (
  Object.keys(REPLACEMENT_PRIORITY_LABEL) as ReplacementPriority[]
).map((value) => ({ value, label: REPLACEMENT_PRIORITY_LABEL[value] }))

export type ReplacementDecision = "same_part" | "different_part" | "to_be_decided" | "repair"

export const REPLACEMENT_DECISION_LABEL: Record<ReplacementDecision, string> = {
  same_part: "Same part",
  different_part: "Different part",
  // In house: the engineer picks the part after inspecting (spec D14).
  to_be_decided: "Engineer decides",
  // In house, the part alone came in: it is repaired and goes back (spec D15).
  repair: "Repair",
}

export type ReplacementGeneration = "sales_order" | "replacement"

export const REPLACEMENT_GENERATION_LABEL: Record<ReplacementGeneration, string> = {
  sales_order: "Original unit",
  // A unit an earlier replacement shipped, now itself being replaced.
  replacement: "Replacement unit",
}

export type ItemApprovalStatus = "pending" | "approved" | "rejected"

export const ITEM_APPROVAL_LABEL: Record<ItemApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}

/** A cancelled request's lines read "Cancelled" wherever they were still open
 *  (decision, status, and a return / dispatch that never happened). Display
 *  only: the backend keeps each line's last real state. */
export const ITEM_CANCELLED_LABEL = "Cancelled"
export const ITEM_CANCELLED_VARIANT: StatusBadgeVariant = "neutral"

export const ITEM_APPROVAL_VARIANT: Record<ItemApprovalStatus, StatusBadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
}

export type ItemReturnStatus = "pending" | "received" | "waived"

export const ITEM_RETURN_LABEL: Record<ItemReturnStatus, string> = {
  pending: "Awaited",
  received: "Received",
  // Written off — the customer keeps the old unit and nothing is owed back.
  waived: "Written off",
}

export const ITEM_RETURN_VARIANT: Record<ItemReturnStatus, StatusBadgeVariant> = {
  pending: "warning",
  received: "success",
  waived: "neutral",
}

export type ItemDispatchStatus = "pending" | "dispatched" | "not_needed"

export const ITEM_DISPATCH_LABEL: Record<ItemDispatchStatus, string> = {
  pending: "Not shipped",
  dispatched: "Shipped",
  // A component line closed without a swap (spec D13).
  not_needed: "Not needed",
}

export const ITEM_DISPATCH_VARIANT: Record<ItemDispatchStatus, StatusBadgeVariant> = {
  pending: "warning",
  dispatched: "success",
  not_needed: "neutral",
}

/** Why a component line was closed as not needed (spec D13). */
export const REPLACEMENT_NOT_NEEDED_REASON_LABEL = {
  component_ok: "Component was OK",
  not_required: "Not needed",
  other: "Other",
} as const

export type ReplacementNotNeededReason = keyof typeof REPLACEMENT_NOT_NEEDED_REASON_LABEL

/** Where a component replacement is swapped (component replacement, spec D10). */
export const REPLACEMENT_SWAP_LOCATION_LABEL = {
  on_site: "At the customer's site",
  in_house: "Comes in to us",
} as const

export type ReplacementSwapLocation = keyof typeof REPLACEMENT_SWAP_LOCATION_LABEL

/** In house: what comes to us — the whole device or only the part (spec D15). */
export const REPLACEMENT_IN_HOUSE_RETURN_LABEL = {
  device: "Whole device comes in",
  part: "Only the part comes in",
} as const

export type ReplacementInHouseReturn = keyof typeof REPLACEMENT_IN_HOUSE_RETURN_LABEL

/** Who fits a part shipped to the customer's device (spec D15). */
export const REPLACEMENT_PART_FITTED_BY_LABEL = {
  engineer: "Our engineer",
  customer: "Shipped to the customer",
} as const

export type ReplacementPartFittedBy = keyof typeof REPLACEMENT_PART_FITTED_BY_LABEL
