import type { AsyncSelectOption } from "@/components/ui/async-select"

import { PURCHASE_ORDER_PAGE_SIZE, PO_TABS } from "../../constants"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

export const LIST_S = PURCHASE_ORDERS_STRINGS.list

// Table column key → API sort field. Only columns the PO list endpoint can
// order by are here (backend `_PO_SORTABLE_FIELDS`); others aren't sortable.
// The quantity columns (items/ordered/received/pending/returned) are rolled up
// from line items and sorted in SQL server-side — the column key and
// the API sort field are the same string.
export const SORT_FIELD_MAP: Record<
  string,
  | "po_number"
  | "status"
  | "expected_delivery_date"
  | "created_at"
  | "items"
  | "ordered"
  | "received"
  | "pending"
  | "returned"
> = {
  po_number: "po_number",
  status: "status",
  expected_delivery_date: "expected_delivery_date",
  // Created At is server-sortable (created_by is not); the default sort is
  // already -created_at, so this just lets the header toggle its direction.
  created_at: "created_at",
  items: "items",
  ordered: "ordered",
  received: "received",
  pending: "pending",
  returned: "returned",
}

// The tab strip and the filters each tab sends live in ../../constants (PO_TABS)
// — a tab is not a lifecycle status. "Rejected" keys off the orthogonal
// approval_status column, and the Draft tab excludes rejected POs so the
// buckets stay mutually exclusive. See the PO_TABS comment for the full model.
export const TAB_IDS = PO_TABS.map((t) => t.id)

// Columns the slim list endpoint can't fill (no line items / PR ref / creator
// on `PurchaseOrderListItem`) render an em-dash. See the PO backend gap list.
export const DASH = "—"

// Per-tab view state (persisted). Each tab keeps its own search, filters, sort,
// and page so switching tabs restores that tab exactly as it was left.
export type PoTabView = {
  search: string
  vendor: AsyncSelectOption | null
  conditionFilter: string
  sortColumn: string | null
  sortDirection: "asc" | "desc" | null
  page: number
  pageSize: number
}
export const emptyPoView = (): PoTabView => ({
  search: "",
  vendor: null,
  conditionFilter: "",
  sortColumn: null,
  sortDirection: null,
  page: 1,
  pageSize: PURCHASE_ORDER_PAGE_SIZE,
})
