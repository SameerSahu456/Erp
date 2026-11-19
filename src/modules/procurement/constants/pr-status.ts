import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { PRStatus } from "../types"

// Domain label maps (Coding-guideline §16.12 bucket 2): single source for how
// a purchase-request wire value is shown to the user.

export const PR_STATUS_LABELS: Record<PRStatus, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  "Under Review": "Under Review",
  Approved: "Approved",
  "Partially Approved": "Partially Approved",
  Rejected: "Rejected",
  "Converted to PO": "Converted to PO",
}

// StatusBadge tone per PR status — shared across the list table, the detail
// header, and any other surface that renders a PR status badge.
export const PR_STATUS_VARIANT: Record<PRStatus, StatusBadgeVariant> = {
  Draft: "neutral",
  Submitted: "info",
  "Under Review": "warning",
  Approved: "success",
  "Partially Approved": "warning",
  Rejected: "error",
  "Converted to PO": "success",
}
