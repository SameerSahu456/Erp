import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { ContactStatus } from "../api"

// Domain label map (Coding-guideline §16.12 bucket 2): the single source for
// how a contact `status` wire value is shown to the user. Today the label
// equals the wire value, but routing display through this map means any future
// copy change lives in one place and can't drift across the table badge and the
// detail header.
export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  Active: "Active",
  Inactive: "Inactive",
}

// StatusBadge tone per status — consolidated here so the list table and the
// detail header share one mapping (was previously duplicated as `statusVariant`
// in both ContactsTable and ContactDetailPage).
export const CONTACT_STATUS_VARIANT: Record<ContactStatus, StatusBadgeVariant> = {
  Active: "success",
  Inactive: "neutral",
}
