import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { PAGINATION } from "@/shared/constants"

import type { PurchaseOrderApprovalStatus, PurchaseOrderStatus } from "./api"

// Single source of truth for the procurement-vendor list page size
// (Coding-guideline §16.6 — never hardcode a literal at a call-site).
export const VENDOR_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

// PO list page size — same single-source rule (§16.6).
export const PURCHASE_ORDER_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

// Backend PO status code → human label. The wire carries the snake_case
// code (draft / issued / partially_received / …); the UI shows the label.
// Screen labels. The wire keeps its codes (issued / received); the UI shows the
// business-facing wording from the reference design: an approved, vendor-placed
// PO reads "Open", and a fully-received one reads "Fully Received". (A real
// `submitted` status is a pending backend addition — its label slots in here.)
export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  issued: "Open",
  partially_received: "Partially Received",
  received: "Fully Received",
  closed: "Closed",
  cancelled: "Cancelled",
}

// Status → badge variant, keyed on the BACKEND code (not the label).
export const PO_STATUS_VARIANTS: Record<PurchaseOrderStatus, StatusBadgeVariant> = {
  draft: "neutral",
  issued: "info",
  partially_received: "warning",
  received: "success",
  closed: "neutral",
  cancelled: "error",
}

export function poStatusLabel(status: PurchaseOrderStatus): string {
  return PO_STATUS_LABELS[status] ?? status
}

export function poStatusVariant(status: PurchaseOrderStatus): StatusBadgeVariant {
  return PO_STATUS_VARIANTS[status] ?? "neutral"
}

// ── Approval status (maker-checker, Tier A) ─────────────────────────────

export const PO_APPROVAL_LABELS: Record<PurchaseOrderApprovalStatus, string> = {
  not_required: "No approval",
  pending: "Pending approval",
  partially_approved: "Partially approved",
  approved: "Approved",
  rejected: "Rejected",
}

export const PO_APPROVAL_VARIANTS: Record<PurchaseOrderApprovalStatus, StatusBadgeVariant> = {
  not_required: "neutral",
  pending: "warning",
  partially_approved: "info",
  approved: "success",
  rejected: "error",
}

export function approvalLabel(s: PurchaseOrderApprovalStatus): string {
  return PO_APPROVAL_LABELS[s] ?? s
}

export function approvalVariant(s: PurchaseOrderApprovalStatus): StatusBadgeVariant {
  return PO_APPROVAL_VARIANTS[s] ?? "neutral"
}

// ── PO list-page tabs ───────────────────────────────────────────────────
//
// A tab is NOT a lifecycle status. The list page partitions POs across two
// orthogonal backend columns:
//
//   status           draft | issued | partially_received | received | closed | cancelled
//   approval_status  not_required | pending | partially_approved | approved | rejected
//
// A PM rejection sets approval_status='rejected' and leaves status='draft'
// (backend: `_recompute_approval_status`). So "Rejected" is a real work queue
// for the maker, but it has no lifecycle status of its own. We model each tab
// as the pair of filters it sends, which keeps the buckets mutually exclusive:
// the Draft tab explicitly excludes rejected POs, and the Rejected tab keys off
// approval_status alone (rejected ⟹ draft, so no status filter is needed).
//
// Counts follow the same partition — see `poTabCount` below.

/** Every approval status except `rejected` — what the Draft tab admits. */
export const PO_UNREJECTED_APPROVAL_STATUSES: readonly PurchaseOrderApprovalStatus[] = (
  Object.keys(PO_APPROVAL_LABELS) as PurchaseOrderApprovalStatus[]
).filter((s) => s !== "rejected")

export const PO_REJECTED_TAB_ID = "rejected" as const

// Issued POs whose amendment was (partially or fully) rejected and needs
// re-amendment — a work queue distinct from the Tier-A `rejected` DRAFT bucket
// above (which keys on approval_status). This one keys on the orthogonal
// `has_rejected_amendment` flag, so a flagged PO keeps its lifecycle status.
export const PO_AMEND_REJECTED_TAB_ID = "amend_rejected" as const
export const PO_AMEND_REJECTED_TAB_LABEL = "Amendments rejected"

/** Tab id = a lifecycle status, or a synthetic approval bucket. */
export type PurchaseOrderTabId =
  | PurchaseOrderStatus
  | typeof PO_REJECTED_TAB_ID
  | typeof PO_AMEND_REJECTED_TAB_ID

export interface PurchaseOrderTab {
  id: PurchaseOrderTabId
  label: string
  /** Query filters this tab sends to `GET /purchase-orders`. */
  filters: {
    status?: PurchaseOrderStatus
    approval_status?: PurchaseOrderApprovalStatus[]
    has_rejected_amendment?: boolean
  }
}

// Order mirrors the reference design: the active working set (Open) leads,
// then Draft and its rework queue, then the rest of the lifecycle.
export const PO_TABS: readonly PurchaseOrderTab[] = [
  { id: "issued", label: PO_STATUS_LABELS.issued, filters: { status: "issued" } },
  {
    id: "draft",
    label: PO_STATUS_LABELS.draft,
    // Excludes rejected drafts — they live in their own tab.
    filters: { status: "draft", approval_status: [...PO_UNREJECTED_APPROVAL_STATUSES] },
  },
  {
    id: PO_REJECTED_TAB_ID,
    label: PO_APPROVAL_LABELS.rejected,
    // No status filter: a rejected PO is always a draft.
    filters: { approval_status: ["rejected"] },
  },
  {
    id: PO_AMEND_REJECTED_TAB_ID,
    label: PO_AMEND_REJECTED_TAB_LABEL,
    // Keys on the orthogonal amendment flag — NOT approval_status (which the
    // Rejected tab above owns). A flagged PO keeps its lifecycle status.
    filters: { has_rejected_amendment: true },
  },
  {
    id: "partially_received",
    label: PO_STATUS_LABELS.partially_received,
    filters: { status: "partially_received" },
  },
  { id: "received", label: PO_STATUS_LABELS.received, filters: { status: "received" } },
  { id: "closed", label: PO_STATUS_LABELS.closed, filters: { status: "closed" } },
  { id: "cancelled", label: PO_STATUS_LABELS.cancelled, filters: { status: "cancelled" } },
]

/**
 * Badge count for a tab, from the two rollups on `GET /purchase-orders/stats`.
 *
 * `by_status` and `by_approval_status` each independently sum to `total`, so
 * they can't simply be concatenated. The Draft tab nets out the rejected rows
 * it no longer displays — exact, because `rejected` implies `status='draft'`
 * on the backend. Every other tab reads `by_status` straight through.
 */
export function poTabCount(
  tabId: PurchaseOrderTabId,
  stats:
    | {
        by_status: Record<string, number>
        by_approval_status: Record<string, number>
        amend_rejected?: number
      }
    | undefined,
): number | undefined {
  if (!stats) return undefined
  const rejected = stats.by_approval_status.rejected ?? 0
  if (tabId === PO_REJECTED_TAB_ID) return rejected
  if (tabId === PO_AMEND_REJECTED_TAB_ID) return stats.amend_rejected ?? 0
  if (tabId === "draft") return Math.max(0, (stats.by_status.draft ?? 0) - rejected)
  return stats.by_status[tabId]
}
