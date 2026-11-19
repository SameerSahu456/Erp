import { EMPTY_VALUE } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"

import type { ActionRequest, ActionRequestStatus } from "../../api/action-requests"
import { APPROVALS_STRINGS } from "./approvals.strings"

const S = APPROVALS_STRINGS.actions

export const ACTION_REQUEST_TABS = [
  { id: "pending", label: S.tabs.pending, status: "pending" },
  { id: "approved", label: S.tabs.approved, status: "approved" },
  { id: "rejected", label: S.tabs.rejected, status: "rejected" },
  { id: "all", label: S.tabs.all, status: undefined },
] as const

export const ACTION_REQUEST_COLUMNS = [
  { key: "order", label: S.columns.order, width: "14%" },
  { key: "customer", label: S.columns.customer, width: "18%" },
  { key: "detail", label: S.columns.detail, width: "14%" },
  { key: "reason", label: S.columns.reason, width: "22%" },
  { key: "requestedBy", label: S.columns.requestedBy, width: "12%" },
  { key: "status", label: S.columns.status, width: "10%" },
  { key: "raised", label: S.columns.raised, width: "10%" },
]

const VARIANT: Record<ActionRequestStatus, "warning" | "success" | "error" | "info" | "neutral"> = {
  pending: "warning",
  scheduled: "info",
  approved: "success",
  rejected: "error",
  cancelled: "neutral",
}

export const actionRequestVariant = (status: string) =>
  VARIANT[status as ActionRequestStatus] ?? "neutral"

function detailOf(r: ActionRequest): string {
  if (r.subject === "terminate") {
    return S.terminationDetail(r.effective_date ? formatIST_date(r.effective_date) : EMPTY_VALUE)
  }
  return S.invoiceDetail(r.invoice_number ?? EMPTY_VALUE)
}

export function toActionRequestRow(r: ActionRequest): Record<string, unknown> {
  return {
    id: r.id,
    order: r.order_number ?? EMPTY_VALUE,
    customer: r.account_name ?? EMPTY_VALUE,
    detail: detailOf(r),
    reason: r.reason,
    requestedBy: r.requested_by_name ?? EMPTY_VALUE,
    status: S.status[r.status],
    raised: formatIST_date(r.created_at),
    _status: r.status,
    _row: r,
  }
}
