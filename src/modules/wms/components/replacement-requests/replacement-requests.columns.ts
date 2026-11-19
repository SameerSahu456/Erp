import { formatIST_date } from "@shared/lib/date"
import type { ReplacementRequestListItemWire } from "@modules/crm"

import {
  REPLACEMENT_MODE_LABEL,
  REPLACEMENT_PRIORITY_LABEL,
  REPLACEMENT_STATUS_LABEL,
  type ReplacementMode,
  type ReplacementPriority,
  type ReplacementRequestStatus,
} from "../../constants/replacement-request-status"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

// Column config lives here, not in JSX (Coding-guideline §8.2 — a list page is
// ~40 lines; columns/filters/actions live in config files).
//
// Every column below maps to a field the list endpoint actually returns. The
// row carries `account_id` and `entity_id` (the sales order) but no account
// name or SO number, so neither is shown — resolving them per row would be an
// N+1 the list rule forbids. Surfacing them needs the backend to denormalize
// onto ReplacementRequestListItem; noted in the plan's follow-ups.

export const REPLACEMENT_COLUMNS = [
  // Only the columns the API can order server-side are marked sortable
  // (§16.7); sales order / customer / reason are joined or derived, so their
  // headers stay static. Priority sorts by SEVERITY, not alphabetically.
  {
    key: "request_number",
    label: S.list.columns.requestNumber,
    width: "15%",
    sortable: true,
  },
  // A list of request numbers with no order or customer against them is
  // unusable — you cannot tell whose problem any row is.
  { key: "sales_order", label: S.list.columns.salesOrder, width: "15%" },
  { key: "account", label: S.list.columns.customer, width: "16%" },
  { key: "reason", label: S.list.columns.reason, width: "16%" },
  { key: "mode", label: S.list.columns.mode, width: "10%" },
  { key: "priority", label: S.list.columns.priority, width: "10%", sortable: true },
  {
    key: "units",
    label: S.list.columns.lines,
    width: "10%",
    align: "right" as const,
    headerHelp: S.list.columns.linesHelp,
  },
  { key: "status", label: S.list.columns.status, width: "14%", sortable: true },
  // Dates right-align like amounts/quantities (§9 cell alignment).
  {
    key: "created",
    label: S.list.columns.created,
    width: "12%",
    align: "right" as const,
    sortable: true,
  },
]

// Table column key → backend `sort` field. Only sortable columns appear here;
// the page builds `sort` as `${dir === "desc" ? "-" : ""}${field}`.
export const REPLACEMENT_SORT_FIELD_MAP: Record<string, string> = {
  request_number: "request_number",
  priority: "priority",
  status: "status",
  created: "created_at",
}

/**
 * Flatten one wire row into the table's cell vocabulary.
 *
 * Enum values become their human label here so the table never renders a raw
 * wire literal like `pending_approval`; `_status` is kept alongside for the
 * badge-variant lookup and row navigation.
 */
export function toReplacementRow(
  rr: ReplacementRequestListItemWire,
): Record<string, unknown> {
  const approved = rr.counts?.approved_items_count ?? 0
  const total = rr.counts?.items_count ?? 0
  return {
    id: rr.id,
    request_number: rr.request_number,
    _isRental: rr.is_rental_order,
    sales_order: rr.sales_order_number ?? "—",
    account: rr.account_name ?? "—",
    reason: rr.reason,
    mode:
      REPLACEMENT_MODE_LABEL[rr.replacement_mode as ReplacementMode] ??
      rr.replacement_mode,
    priority:
      REPLACEMENT_PRIORITY_LABEL[rr.priority as ReplacementPriority] ?? rr.priority,
    // One line is one physical unit, so the item count IS the unit count.
    units: total ? `${approved}/${total}` : "—",
    status:
      REPLACEMENT_STATUS_LABEL[rr.status as ReplacementRequestStatus] ?? rr.status,
    // Wire timestamps are UTC; render IST (never toLocaleString).
    created: formatIST_date(rr.created_at),
    // Wire values kept alongside the labels so the cell formatter can pick a
    // badge variant without re-deriving the enum from the display string.
    _status: rr.status,
    _priority: rr.priority,
  }
}

// Tabs are server-side status filters, not client slices. "all" sends no
// status param; every other id is an API status literal.
export const REPLACEMENT_TABS = [
  { id: "all", label: S.list.tabs.all },
  { id: "pending_approval", label: S.list.tabs.pending_approval },
  { id: "partially_approved", label: S.list.tabs.partially_approved },
  { id: "approved", label: S.list.tabs.approved },
  { id: "in_progress", label: S.list.tabs.in_progress },
  { id: "completed", label: S.list.tabs.completed },
  { id: "rejected", label: S.list.tabs.rejected },
  { id: "cancelled", label: S.list.tabs.cancelled },
] as const
export const REPLACEMENT_STATUS_IDS = REPLACEMENT_TABS.map((t) => t.id)
export type ReplacementTabId = (typeof REPLACEMENT_STATUS_IDS)[number]

// KPI buckets, counted unfiltered so they don't move with search/filters.
export const REPLACEMENT_KPI_STATUS_IDS = [
  "pending_approval",
  "in_progress",
  "completed",
  "rejected",
] as const
