import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { VendorStatus } from "../api"

// Domain label maps (Coding-guideline §16.12 bucket 2): single source for how
// a vendor wire value is shown to the user.

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  active: "Active",
  inactive: "Inactive",
}

// StatusBadge tone per vendor status — shared across the list table, the
// detail header, and the form status select.
export const VENDOR_STATUS_VARIANT: Record<VendorStatus, StatusBadgeVariant> = {
  active: "success",
  inactive: "neutral",
}
