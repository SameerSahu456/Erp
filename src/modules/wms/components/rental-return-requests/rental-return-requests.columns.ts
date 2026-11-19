import { formatIST_date } from "@shared/lib/date"
import type { RentalReturnRequestWire } from "@modules/crm"

import {
  RENTAL_RETURN_REASON_LABEL,
  RENTAL_RETURN_STATUS_LABEL,
  type RentalReturnReason,
  type RentalReturnStatus,
} from "../../constants/rental-return-status"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"

// Column config lives here, not in JSX (Coding-guideline §8.2 — a list page is
// ~40 lines; columns/filters/actions live in config files).

// Tabs are server-side status filters, not client slices. "all" sends no
// status param; every other id is an API status literal.
export const RENTAL_RETURN_TABS = [
  { id: "all", label: S.list.tabs.all },
  { id: "pending_approval", label: S.list.tabs.pending_approval },
  { id: "partially_approved", label: S.list.tabs.partially_approved },
  { id: "approved", label: S.list.tabs.approved },
  { id: "completed", label: S.list.tabs.completed },
  { id: "closed_short", label: S.list.tabs.closed_short },
  { id: "rejected", label: S.list.tabs.rejected },
  { id: "cancelled", label: S.list.tabs.cancelled },
] as const
export const RENTAL_RETURN_STATUS_IDS = RENTAL_RETURN_TABS.map((t) => t.id)

export const RENTAL_RETURN_COLUMNS = [
  { key: "request_number", label: S.list.columns.requestNumber, width: "16%" },
  { key: "sales_order", label: S.list.columns.salesOrder, width: "16%" },
  { key: "account", label: S.list.columns.customer, width: "20%" },
  { key: "reason", label: S.list.columns.reason, width: "16%" },
  {
    key: "units",
    label: S.list.columns.units,
    width: "10%",
    align: "right" as const,
    headerHelp: S.list.columns.unitsHelp,
  },
  { key: "status", label: S.list.columns.status, width: "12%" },
  { key: "raised", label: S.list.columns.raised, width: "10%" },
]

/**
 * Flatten one wire row into the table's cell vocabulary.
 *
 * Enum values become their human label here so the table never renders a raw
 * wire literal like `pending_approval`; `_status` is kept alongside for the
 * badge-variant lookup.
 */
export function toRentalReturnRow(
  rret: RentalReturnRequestWire,
): Record<string, unknown> {
  const items = rret.items ?? []
  // Lines carry a count (return by count), so units are summed, not counted.
  const asked = items.reduce((n, i) => n + i.quantity, 0)
  const received = items.reduce((n, i) => n + i.received_quantity, 0)
  return {
    id: rret.id,
    request_number: rret.request_number,
    sales_order: rret.order_number ?? S.list.none,
    account: rret.account_name ?? S.list.none,
    reason:
      RENTAL_RETURN_REASON_LABEL[rret.reason as RentalReturnReason] ?? rret.reason,
    units: asked || received ? S.list.unitsCell(received, asked) : S.list.none,
    status:
      RENTAL_RETURN_STATUS_LABEL[rret.status as RentalReturnStatus] ?? rret.status,
    // Wire timestamps are UTC; render IST (never toLocaleString).
    raised: formatIST_date(rret.created_at),
    _status: rret.status,
  }
}
