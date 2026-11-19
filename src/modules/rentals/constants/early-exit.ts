import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { humanizeEnum } from "@shared/lib/humanize-enum"

// Early-exit + waiver display maps (return-by-count §11), keyed on the
// backend's EARLY_EXIT_* / WAIVER_* literals.

export type EarlyExitStatus = "pending" | "billed" | "waiver_pending" | "waived" | "cancelled"

export const EARLY_EXIT_STATUS_LABEL: Record<EarlyExitStatus, string> = {
  pending: "On next invoice",
  billed: "Billed",
  waiver_pending: "Waiver pending",
  waived: "Waived",
  cancelled: "Cancelled",
}

export const EARLY_EXIT_STATUS_VARIANT: Record<EarlyExitStatus, StatusBadgeVariant> = {
  pending: "warning",
  billed: "info",
  waiver_pending: "warning",
  waived: "neutral",
  cancelled: "neutral",
}

export type WaiverStatus = "pending" | "approved" | "rejected"

export const WAIVER_STATUS_LABEL: Record<WaiverStatus, string> = {
  pending: "Awaiting decision",
  approved: "Approved",
  rejected: "Rejected",
}

export const WAIVER_STATUS_VARIANT: Record<WaiverStatus, StatusBadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
}

export type WaiverSubject = "early_exit_charge" | "account_terms"

export const WAIVER_SUBJECT_LABEL: Record<WaiverSubject, string> = {
  early_exit_charge: "Early-exit charge",
  account_terms: "Customer's early-exit terms",
}

// The wire fields are plain strings: an unknown value reads humanized, on a
// neutral badge (PAGE-UI-RULES §0.8), never raw.
export const earlyExitStatusLabel = (s: string) =>
  EARLY_EXIT_STATUS_LABEL[s as EarlyExitStatus] ?? humanizeEnum(s)
export const earlyExitStatusVariant = (s: string): StatusBadgeVariant =>
  EARLY_EXIT_STATUS_VARIANT[s as EarlyExitStatus] ?? "neutral"
export const waiverStatusLabel = (s: string) => WAIVER_STATUS_LABEL[s as WaiverStatus] ?? humanizeEnum(s)
export const waiverStatusVariant = (s: string): StatusBadgeVariant =>
  WAIVER_STATUS_VARIANT[s as WaiverStatus] ?? "neutral"
export const waiverSubjectLabel = (s: string) => WAIVER_SUBJECT_LABEL[s as WaiverSubject] ?? humanizeEnum(s)

// The two states a rental return can be in while an early line waits on the
// rental manager (approvals spec D1) — all the early-exit returns queue shows.
type QueuedReturnStatus = "pending_approval" | "partially_approved"

const QUEUED_RETURN_STATUS_LABEL: Record<QueuedReturnStatus, string> = {
  pending_approval: "Pending approval",
  partially_approved: "Partially approved",
}

export const queuedReturnStatusLabel = (s: string) =>
  QUEUED_RETURN_STATUS_LABEL[s as QueuedReturnStatus] ?? humanizeEnum(s)
