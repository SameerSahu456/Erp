import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { QuotableType, QuoteRentalPeriod, QuoteStatus } from "../api"

// Domain label maps (Coding-guideline §16.12 bucket 2) for the CRM › quotes
// sub-feature. The single source for how a quote's `status`, `quotable_type`,
// and rental-period wire values are shown to the user — feeds the list table
// badge, the detail header status, the embedded QuoteSection table, and the
// quote-builder dropdowns. Today most labels equal the wire value, but routing
// display through these maps means any future copy change lives in one place
// and can't drift across views.
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  "Pending Approval": "Pending Approval",
  "Partially Approved": "Partially Approved",
  "Partially Rejected": "Partially Rejected",
  Approved: "Approved",
  Sent: "Sent",
  Accepted: "Accepted",
  Rejected: "Rejected",
  Amend: "Amend",
}

// Statuses offered in the Status FILTER dropdowns (Quotes list + the Lead / Deal /
// Account Quotes tab). `Sent` and `Accepted` are retired from the lifecycle — no
// quote reaches them any more — so they are not offered as filters. They stay in
// QUOTE_STATUS_LABELS/VARIANT so any legacy row still renders its badge.
const RETIRED_QUOTE_FILTER_STATUSES: readonly QuoteStatus[] = ["Sent", "Accepted"]
export const QUOTE_FILTER_STATUSES = (
  Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]
).filter((s) => !RETIRED_QUOTE_FILTER_STATUSES.includes(s))

// StatusBadge tone per quote status — consolidated here so the list table
// (QuotesTable), the embedded QuoteSection table, and the detail header
// (QuoteFormPage) all share one mapping (was previously duplicated three
// times as `STATUS_VARIANT`).
//
// QUOTE-APPR-T11 — tones mirror ``SO_STATUS_VARIANT`` for the parallel
// statuses so a user who sees both surfaces reads them as the same
// shade:
//   Submitted / Pending Approval → info    (quote awaiting a decision)
//   Partially Approved           → warning (mixed outcome, amber)
//   Partially Rejected           → error   (≥1 line rejected — needs fixing)
//   Approved                     → success (green)
//   Rejected                     → error   (red)
//   Amend                        → neutral (superseded)
export const QUOTE_STATUS_VARIANT: Record<QuoteStatus, StatusBadgeVariant> = {
  Draft: "neutral",
  Submitted: "info",
  "Pending Approval": "info",
  "Partially Approved": "warning",
  "Partially Rejected": "error",
  Approved: "success",
  Sent: "info",
  Accepted: "success",
  Rejected: "error",
  // Superseded/archived old version (frozen on amend) — grey it out, mirroring
  // SO_STATUS_VARIANT.Amend.
  Amend: "neutral",
}

// Statuses the quote builder may edit IN PLACE (the `/edit` route). A
// subset of the backend `QUOTE_EDITABLE_STATUSES`: `Submitted` (legacy
// pre-approval status) and `Partially Approved` are left out on purpose —
// the UI offers Amend (new version) there instead, per the 2026-10-16
// product call. Pending Approval is editable: the backend resets any
// reviewed line whose approval-relevant fields (qty / rate / category /
// variant / rental dates) change back to Draft and re-resolves it on the
// next Submit, while untouched Approved / Rejected lines keep their decision.
export const QUOTE_INLINE_EDITABLE_STATUSES: readonly QuoteStatus[] = [
  "Draft",
  "Pending Approval",
]

// Display labels for the quotable-type toggle + record-picker label in the
// quote builder.
export const QUOTABLE_TYPE_LABELS: Record<QuotableType, string> = {
  account: "Account",
  lead: "Lead",
  deal: "Deal",
}

// Display labels for the (currently hidden) rental-period dropdown.
export const QUOTE_RENTAL_PERIOD_LABELS: Record<QuoteRentalPeriod, string> = {
  day: "Day",
  month: "Month",
}
