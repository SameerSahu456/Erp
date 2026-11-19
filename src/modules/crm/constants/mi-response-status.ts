import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { ProcMIResponsePMStatus } from "@modules/procurement"

// Domain label map (Coding-guideline §16.12 bucket 2) for a procurement
// response's PM decision (`pm_status`). Backend wire is lowercase. Single
// source for the response-detail status chip and the per-item response rows.
export const MI_RESPONSE_PM_STATUS_LABELS: Record<ProcMIResponsePMStatus, string> = {
  pending: "Pending PM review",
  approved: "Approved by PM",
  rejected: "Rejected by PM",
}

export const MI_RESPONSE_PM_STATUS_VARIANT: Record<ProcMIResponsePMStatus, StatusBadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
}
