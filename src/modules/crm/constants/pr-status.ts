import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

// Domain label maps (Coding-guideline §16.12 bucket 2): the single source for
// how a purchase-request status value is shown to the user and which
// StatusBadge tone it maps to. Previously the variant map was duplicated as a
// local `statusVariant` in PurchaseRequestsTable and as `getStatusVariant` in
// usePurchaseRequestForm; consolidating here keeps the list badge and the form
// status pill in sync.

// Workflow statuses shown in the list table badge (multi-PM approval flow).
export const PR_WORKFLOW_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  Draft: "neutral",
  Submitted: "info",
  "Pending PM Approval": "warning",
  "Partially Approved": "warning",
  "All PMs Approved": "success",
  "Final Approved": "success",
  Rejected: "error",
  "Sent to Procurement": "success",
}

// Form status pill tone per editable PR status (the create/edit dropdown set).
export const PR_FORM_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  Draft: "neutral",
  Submitted: "info",
  "Under Review": "warning",
  "Pricing Confirmed": "success",
  Approved: "success",
  Rejected: "error",
}
