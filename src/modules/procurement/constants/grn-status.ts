import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { GRNMatchEntry } from "../types"

// Domain label maps (Coding-guideline §16.12 bucket 2): single source for how
// a GRN match status wire value is shown to the user. Routing display through
// these maps means any future copy change lives in one place and can't drift
// across the list table badge and the detail header.

export type GRNStatus = GRNMatchEntry["status"]

export const GRN_STATUS_LABELS: Record<GRNStatus, string> = {
  Matched: "Matched",
  Partial: "Partial",
  Pending: "Pending",
  "Over Received": "Over Received",
  Discrepancy: "Discrepancy",
}

// StatusBadge tone per status — consolidated here so the list table and the
// detail header share one mapping.
export const GRN_STATUS_VARIANT: Record<GRNStatus, StatusBadgeVariant> = {
  Matched: "success",
  Partial: "warning",
  Pending: "info",
  "Over Received": "error",
  Discrepancy: "error",
}

/** Returns the StatusBadge variant for a given GRN status string. */
export function getGRNStatusVariant(status: string): StatusBadgeVariant {
  return (GRN_STATUS_VARIANT as Record<string, StatusBadgeVariant>)[status] ?? "neutral"
}
