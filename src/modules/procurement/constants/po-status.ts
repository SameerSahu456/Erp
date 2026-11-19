import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { POStatus } from "../types"

// Domain label maps (Coding-guideline §16.12 bucket 2): single source for how
// a purchase-order wire value is shown to the user. Routing display through
// these maps means any future copy change lives in one place and can't drift
// across the list table badge, the detail header, and the form status pill.

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  Draft: "Draft",
  "Sent to Vendor": "Sent to Vendor",
  Acknowledged: "Acknowledged",
  "Partially Received": "Partially Received",
  "Fully Received": "Fully Received",
  Closed: "Closed",
  Cancelled: "Cancelled",
}

// StatusBadge tone per status — consolidated here so the list table, the
// detail header, and any future components all share one mapping.
export const PO_STATUS_VARIANT: Record<POStatus, StatusBadgeVariant> = {
  Draft: "neutral",
  "Sent to Vendor": "info",
  Acknowledged: "info",
  "Partially Received": "warning",
  "Fully Received": "success",
  Closed: "neutral",
  Cancelled: "error",
}

/** Returns the StatusBadge variant for a given PO status string. */
export function getPOStatusVariant(status: string): StatusBadgeVariant {
  return (PO_STATUS_VARIANT as Record<string, StatusBadgeVariant>)[status] ?? "neutral"
}
