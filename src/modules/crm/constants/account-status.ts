import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { AccountStatus } from "../api"

// Domain label map (Coding-guideline §16.12 bucket 2): the single source for
// how an account `status` wire value is shown to the user. Today the label
// equals the wire value, but routing display through this map means any future
// copy change (e.g. "Inactive" → "Archived") lives in one place and can't drift
// across the table badge, detail header, and filter dropdown.
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  Active: "Active",
  Inactive: "Inactive",
}

// StatusBadge tone per status — consolidated here so the list table, the detail
// header, and the hierarchy cards all share one mapping (was previously
// duplicated as `statusVariant` in AccountsTable and `STATUS_VARIANT_BY_AC` in
// accountDetailHelpers).
export const ACCOUNT_STATUS_VARIANT: Record<AccountStatus, StatusBadgeVariant> = {
  Active: "success",
  Inactive: "error",
}
