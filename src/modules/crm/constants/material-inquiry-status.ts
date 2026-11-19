import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { MaterialInquiryStatus } from "../api"

// Domain label map (Coding-guideline §16.12 bucket 2): the single source for
// how a material-inquiry `status` wire value is shown to the user. Routing
// display through this map means a future copy change lives in one place and
// can't drift across the list table badge, detail header, form status chip,
// the embedded Lead/Deal section, and the status filter dropdown.
export const MATERIAL_INQUIRY_STATUS_LABELS: Record<MaterialInquiryStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  partially_responded: "Partially Responded",
  fully_responded: "Fully Responded",
  partially_approved: "Partially Approved",
  fully_approved: "Fully Approved",
  closed: "Closed",
}

// StatusBadge tone per status — consolidated here so every view shares one
// mapping (was previously duplicated as `miStatusVariant` in `miStatus.ts`
// and `statusVariant` in MaterialInquirySection).
export const MATERIAL_INQUIRY_STATUS_VARIANT: Record<MaterialInquiryStatus, StatusBadgeVariant> = {
  draft: "neutral",
  submitted: "info",
  partially_responded: "warning",
  fully_responded: "success",
  partially_approved: "warning",
  fully_approved: "success",
  closed: "neutral",
}
