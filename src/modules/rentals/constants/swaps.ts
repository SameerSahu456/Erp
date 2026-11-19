import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { humanizeEnum } from "@shared/lib/humanize-enum"

// Serial swap + billing adjustment display maps (return-by-count §7),
// keyed on the backend's SWAP_* / ADJUSTMENT_* literals.

export type SwapStatus = "pending" | "approved" | "rejected"

export const SWAP_STATUS_LABEL: Record<SwapStatus, string> = {
  pending: "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
}

export const SWAP_STATUS_VARIANT: Record<SwapStatus, StatusBadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
}

export type AdjustmentStatus = "pending_accounts" | "issued" | "cancelled"

export const ADJUSTMENT_STATUS_LABEL: Record<AdjustmentStatus, string> = {
  pending_accounts: "To issue",
  issued: "Credit note issued",
  cancelled: "Cancelled",
}

export const ADJUSTMENT_STATUS_VARIANT: Record<AdjustmentStatus, StatusBadgeVariant> = {
  pending_accounts: "warning",
  issued: "success",
  cancelled: "neutral",
}

// The wire field is a plain string: an unknown value reads humanized, on a
// neutral badge (PAGE-UI-RULES §0.8), never raw.
export const swapStatusLabel = (s: string) => SWAP_STATUS_LABEL[s as SwapStatus] ?? humanizeEnum(s)
export const swapStatusVariant = (s: string): StatusBadgeVariant => SWAP_STATUS_VARIANT[s as SwapStatus] ?? "neutral"
export const adjustmentStatusLabel = (s: string) =>
  ADJUSTMENT_STATUS_LABEL[s as AdjustmentStatus] ?? humanizeEnum(s)
export const adjustmentStatusVariant = (s: string): StatusBadgeVariant =>
  ADJUSTMENT_STATUS_VARIANT[s as AdjustmentStatus] ?? "neutral"
