import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import type { DemoRequest } from "@/modules/crm/types"

/**
 * Status badge tones for the PM Approvals detail page header. Kept out of the
 * component files so they only export components (fast refresh).
 */
// §0.8 — the inquiry `status` is a free wire string; map it through a known
// badge-variant lookup and fall back to a neutral grey badge for any value we
// don't recognise (never a hard-coded `info` on an unknown status). Covers both
// the title-case display forms and the lowercase enum wire values.
export const MI_DETAIL_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  Draft: "neutral",
  Submitted: "info",
  "Partially Responded": "warning",
  "Fully Responded": "success",
  "Partially Approved": "warning",
  "Fully Approved": "success",
  Closed: "neutral",
  draft: "neutral",
  submitted: "info",
  partially_responded: "warning",
  fully_responded: "success",
  partially_approved: "warning",
  fully_approved: "success",
  closed: "neutral",
}

/** Badge tone for a demo request's UI status — used by the page header. */
export function demoStatusVariant(status: DemoRequest["status"]): StatusBadgeVariant {
  return status === "PM Approved"
    ? "success"
    : status === "PM Rejected"
    ? "error"
    : status === "Pending PM Approval"
    ? "warning"
    : "info"
}
