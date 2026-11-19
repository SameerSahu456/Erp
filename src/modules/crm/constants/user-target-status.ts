import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { TargetStatus } from "../api"

// Domain label map (Coding-guideline §16.12 bucket 2). ``PendingApproval`` is
// the wire value — the label here is the human form ("Pending Approval"). The
// map is the single source for how the status renders anywhere in the UI.
export const TARGET_STATUS_LABELS: Record<TargetStatus, string> = {
  Draft: "Draft",
  PendingApproval: "Pending Approval",
  Approved: "Approved",
  Rejected: "Rejected",
}

// StatusBadge tone per status. ``Approved`` → success (green), ``Rejected`` →
// error (red). ``PendingApproval`` → warning (amber) because it's blocking an
// admin action. ``Draft`` → neutral (grey) — it's an editable state, nothing
// to flag.
export const TARGET_STATUS_VARIANT: Record<TargetStatus, StatusBadgeVariant> = {
  Draft: "neutral",
  PendingApproval: "warning",
  Approved: "success",
  Rejected: "error",
}
