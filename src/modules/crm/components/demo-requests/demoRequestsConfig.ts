import { PAGINATION } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"

import type { DemoRequestSource, DemoRequestStatsWire, DemoRequestStatusWire } from "../../api"
import {
  DEMO_REQUEST_SOURCE_LABELS,
  type DemoStatusLabel,
} from "../../constants/demo-request-status"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

export const DEMO_REQUESTS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

export function formatDate(dateStr: string) {
  return formatIST_date(dateStr)
}

export type DemoRequestsTab =
  | "all"
  | "pending"
  | "partially-approved"
  | "approved"
  | "rejected"
  | "dispatched"
  | "with-customer"
  | "overdue"
  | "returned"
  | "closed"

export const DEMO_REQUESTS_TABS = [
  "all",
  "pending",
  "partially-approved",
  "approved",
  "rejected",
  "dispatched",
  "with-customer",
  "overdue",
  "returned",
  "closed",
] as const satisfies readonly DemoRequestsTab[]

export function parseTabParam(value: string | null): DemoRequestsTab {
  return (DEMO_REQUESTS_TABS as readonly string[]).includes(value ?? "")
    ? (value as DemoRequestsTab)
    : "all"
}

// Display-status union + badge-tone map live in
// `../../constants/demo-request-status` (single source shared with the detail
// page). Only the wire → label mapping stays here.
export function statusToLabel(status: DemoRequestStatusWire, isOverdue: boolean): DemoStatusLabel {
  if (isOverdue) return "Return Overdue"
  const labels: Record<DemoRequestStatusWire, DemoStatusLabel> = {
    Draft: "Draft",
    "Pending for Approval": "Pending PM Approval",
    PartiallyApproved: "Partially Approved",
    Approved: "PM Approved",
    Rejected: "PM Rejected",
    PartiallyDispatched: "Partially Dispatched",
    Dispatched: "Dispatched",
    WithCustomer: "With Customer",
    PartiallyReturned: "Partially Returned",
    Returned: "Returned",
    ConvertedToSO: "Converted to SO",
    Closed: "Closed",
    "Account Approval Pending": "Account Approval Pending",
    "Account Rejected": "Account Rejected",
  }
  return labels[status]
}

export function requestableTypeLabel(type: DemoRequestSource) {
  return DEMO_REQUEST_SOURCE_LABELS[type]
}

export function tabFilters(tab: DemoRequestsTab): {
  status?: DemoRequestStatusWire[]
  overdue?: boolean
} {
  switch (tab) {
    case "pending":
      return { status: ["Pending for Approval"] }
    case "partially-approved":
      return { status: ["PartiallyApproved"] }
    case "approved":
      return { status: ["Approved"] }
    case "rejected":
      return { status: ["Rejected"] }
    case "dispatched":
      // Both, so a partly-shipped demo doesn't fall out of the tab an
      // operator opens to find things that have gone out.
      return { status: ["PartiallyDispatched", "Dispatched"] }
    case "with-customer":
      return { status: ["WithCustomer", "PartiallyReturned"] }
    case "overdue":
      return { overdue: true }
    case "returned":
      return { status: ["Returned"] }
    case "closed":
      return { status: ["ConvertedToSO", "Closed"] }
    case "all":
    default:
      return {}
  }
}

// Status bucket → dropdown label. `all` is the dropdown's built-in reset option.
export const DEMO_REQUESTS_TAB_LABELS: Record<Exclude<DemoRequestsTab, "all">, string> = {
  pending: S.list.statusOptions.pending,
  "partially-approved": S.list.statusOptions.partiallyApproved,
  approved: S.list.statusOptions.approved,
  rejected: S.list.statusOptions.rejected,
  dispatched: S.list.statusOptions.dispatched,
  "with-customer": S.list.statusOptions.withCustomer,
  overdue: S.list.statusOptions.overdue,
  returned: S.list.statusOptions.returned,
  closed: S.list.statusOptions.closed,
}

export const sumStatuses = (stats: DemoRequestStatsWire | undefined, statuses: DemoRequestStatusWire[]) =>
  statuses.reduce((n, status) => n + (stats?.by_status[status] ?? 0), 0)

// Count for one status bucket, derived from the SAME status buckets `tabFilters` sends to
// the list — so a bucket's count always equals the rows it opens. `overdue` is its
// own counter (a flag on the demo, not a status).
export function tabCount(tab: DemoRequestsTab, stats: DemoRequestStatsWire | undefined) {
  if (!stats) return undefined
  if (tab === "all") return stats.total
  if (tab === "overdue") return stats.overdue
  return sumStatuses(stats, tabFilters(tab).status ?? [])
}

// Frontend column key → backend `sort=` field (`DR_LIST_SORTABLE_FIELDS`).
// Columns not listed here are not sortable.
export const DEMO_SORT_FIELD_BY_COLUMN: Record<string, string> = {
  demoNumber: "demo_number",
  returnDate: "expected_return_date",
  status: "status",
  created: "created_at",
}
export const DEMO_SORT_COLUMN_BY_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(DEMO_SORT_FIELD_BY_COLUMN).map(([column, field]) => [field, column]),
)
export const DEMO_DEFAULT_SORT = "-created_at"

export const demoRequestsColumns = [
  { key: "demoNumber", label: S.list.columns.demoNumber, sortable: true },
  { key: "requestType", label: S.list.columns.requestType },
  { key: "account", label: S.list.columns.account },
  { key: "requestedBy", label: S.list.columns.requestedBy },
  { key: "items", label: S.list.columns.items, align: "right" as const },
  { key: "returnDate", label: S.list.columns.returnDate, sortable: true },
  { key: "overdue", label: S.list.columns.overdue },
  { key: "status", label: S.list.columns.status, sortable: true },
  { key: "created", label: S.list.columns.created, sortable: true },
]
