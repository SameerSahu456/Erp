import { formatIST_date } from "@shared/lib/date"
import type { SalesReturnRequestWire } from "@modules/crm"

import {
  SALES_RETURN_REASON_LABEL,
  SALES_RETURN_STATUS_LABEL,
  type SalesReturnReason,
  type SalesReturnStatus,
} from "../../constants/sales-return-status"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

// Column config lives here, not in JSX (Coding-guideline §8.2 — a list page is
// ~40 lines; columns/filters/actions live in config files).

export const SALES_RETURN_COLUMNS = [
  // Sortable columns map to the BE `sort` param (request_number, created_at).
  {
    key: "request_number",
    label: S.list.columns.requestNumber,
    width: "15%",
    sortable: true,
  },
  { key: "sales_order", label: S.list.columns.salesOrder, width: "15%" },
  { key: "account", label: S.list.columns.customer, width: "18%" },
  { key: "reason", label: S.list.columns.reason, width: "14%" },
  // The old combined "received / authorised" cell split into two plain
  // quantity columns; both right-align like every count (§9).
  {
    key: "units_to_return",
    label: S.list.columns.unitsToReturn,
    width: "10%",
    align: "right" as const,
    headerHelp: S.list.columns.unitsToReturnHelp,
  },
  {
    key: "returned",
    label: S.list.columns.returned,
    width: "8%",
    align: "right" as const,
    headerHelp: S.list.columns.returnedHelp,
  },
  { key: "status", label: S.list.columns.status, width: "12%" },
  // Dates right-align like amounts/quantities (§9 cell alignment).
  {
    key: "raised",
    label: S.list.columns.raised,
    width: "8%",
    align: "right" as const,
    sortable: true,
  },
]

/**
 * Flatten one wire row into the table's cell vocabulary.
 *
 * Enum values become their human label here so the table never renders a raw
 * wire literal like `pending_approval`; `_status` is kept alongside for the
 * badge-variant lookup.
 */
export function toSalesReturnRow(
  sret: SalesReturnRequestWire,
): Record<string, unknown> {
  const items = sret.items ?? []
  // One line is one physical unit, so the item count IS the unit count.
  const toReturn = items.length
  const returned = items.filter((i) => i.receipt_status === "received").length
  return {
    id: sret.id,
    request_number: sret.request_number,
    sales_order: sret.order_number ?? "—",
    account: sret.account_name ?? "—",
    reason:
      SALES_RETURN_REASON_LABEL[sret.reason as SalesReturnReason] ?? sret.reason,
    // Split into two quantity columns: the request's authorised
    // total, and how many have physically come back (0 is meaningful — show it,
    // not a dash, whenever the request actually has units).
    units_to_return: toReturn ? toReturn : "—",
    returned: toReturn ? returned : "—",
    status:
      SALES_RETURN_STATUS_LABEL[sret.status as SalesReturnStatus] ?? sret.status,
    // Wire timestamps are UTC; render IST (never toLocaleString).
    raised: formatIST_date(sret.created_at),
    _status: sret.status,
  }
}

// Tabs are server-side status filters, not client slices. "all" sends no
// status param; every other id is an API status literal.
export const SALES_RETURN_TABS = [
  { id: "all", label: S.list.tabs.all },
  { id: "pending_approval", label: S.list.tabs.pending_approval },
  { id: "partially_approved", label: S.list.tabs.partially_approved },
  { id: "approved", label: S.list.tabs.approved },
  { id: "completed", label: S.list.tabs.completed },
  { id: "rejected", label: S.list.tabs.rejected },
  { id: "cancelled", label: S.list.tabs.cancelled },
] as const
export const SALES_RETURN_STATUS_IDS = SALES_RETURN_TABS.map((t) => t.id)
export type SalesReturnTabId = (typeof SALES_RETURN_STATUS_IDS)[number]

// The KPI stat strip's buckets — warehouse-scoped but filter/search-independent.
export const SALES_RETURN_KPI_STATUS_IDS = ["pending_approval", "approved", "completed", "rejected"] as const

// BMT column key → BE `sort` field. Only own-table, indexed columns sort.
export const SALES_RETURN_SORT_FIELD_MAP: Readonly<Record<string, string>> = {
  request_number: "request_number",
  raised: "created_at",
}
