import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type {
  SOLineCondition,
  SOLineStatus,
  SOOrderableType,
  SOOrderType,
  SOStatus,
} from "../api"

// Domain label maps (Coding-guideline §16.12 bucket 2): the single source for
// how a sales-order wire value is shown to the user. Today most labels equal
// the wire value, but routing display through these maps means any future copy
// change lives in one place and can't drift across the list table badge, the
// detail header, the approval queue, and the form status pill.

export const SO_STATUS_LABELS: Record<SOStatus, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  PartiallyApproved: "Partially Approved",
  Approved: "Approved",
  Rejected: "Rejected",
  Amend: "Amend",
  "Account Approval Pending": "Account Approval Pending",
  "Account Rejected": "Account Rejected",
  Cancelled: "Cancelled",
  PartiallyDispatched: "Partially Dispatched",
  Dispatched: "Dispatched",
  PartiallyReturned: "Partially Returned",
  Returned: "Returned",
}

// Short status label used by the list table's tab strip ("Partial" instead of
// the full "PartiallyApproved").
export const SO_STATUS_TAB_LABELS: Record<SOStatus, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  PartiallyApproved: "Partial",
  Approved: "Approved",
  Rejected: "Rejected",
  Amend: "Amend",
  "Account Approval Pending": "Acct. Pending",
  "Account Rejected": "Acct. Rejected",
  Cancelled: "Cancelled",
  PartiallyDispatched: "Part. Dispatched",
  Dispatched: "Dispatched",
  PartiallyReturned: "Part. Returned",
  Returned: "Returned",
}

// StatusBadge tone per status — consolidated here so the list table, the detail
// header, and the form status pill all share one mapping (was previously
// duplicated as `STATUS_VARIANT` in SalesOrdersTable, SoDetailHeader, and
// form/shared.ts).
export const SO_STATUS_VARIANT: Record<SOStatus, StatusBadgeVariant> = {
  Draft: "neutral",
  Submitted: "info",
  PartiallyApproved: "warning",
  Approved: "success",
  Rejected: "error",
  // Amend is the superseded/archived old version (frozen on revise) — grey it
  // out as inactive rather than amber, so it reads distinctly from the amber
  // "pending/blocked" states like Account Approval Pending.
  Amend: "neutral",
  "Account Approval Pending": "warning",
  "Account Rejected": "error",
  // Terminal — the parent business context was reversed (a lead moved back
  // out of closed_won). Inactive rather than alarming.
  Cancelled: "neutral",
  // Sale fulfilment trail. A rental never reaches these — its lifecycle is
  // on `so_configure.status`.
  PartiallyDispatched: "info",
  Dispatched: "success",
  PartiallyReturned: "warning",
  Returned: "neutral",
}

// Per-line decision status label map — feeds the approval row / panel status
// pills (Pending / Approved / Rejected).
export const SO_LINE_STATUS_LABELS: Record<SOLineStatus, string> = {
  Pending: "Pending",
  Approved: "Approved",
  Rejected: "Rejected",
}

// Orderable-source label map — feeds the list "For" column link title and the
// detail "Source" InfoRow.
export const SO_ORDERABLE_LABELS: Record<SOOrderableType, string> = {
  lead: "Lead",
  deal: "Deal",
  account: "Account",
}

// Order-type label map — feeds the create-form Order Type dropdown options.
export const SO_ORDER_TYPE_LABELS: Record<SOOrderType, string> = {
  New: "New",
  Refurb: "Refurb",
  Rental: "Rental",
}

// Per-line condition labels — display for the lowercase wire values the
// backend stores. Distinct from SO_ORDER_TYPE_LABELS above; don't merge them.
export const SO_LINE_CONDITION_LABELS: Record<SOLineCondition, string> = {
  new: "New",
  refurbished: "Refurbished",
  new_pull: "New Pull",
}
