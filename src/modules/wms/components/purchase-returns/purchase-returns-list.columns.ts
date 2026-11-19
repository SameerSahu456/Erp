/** Column + tab config for the purchase-returns list (§8.2). */
import type { DateRange } from "@/components/common/pickers/DateRangePicker";

import type { PurchaseReturnStatus } from "../../api";
import { PURCHASE_RETURNS_LIST_STRINGS as S } from "./purchase-returns.strings";

const C = S.columns;

export const PURCHASE_RETURN_LIST_COLUMNS = [
  { key: "pret_number", label: C.pretNumber, sortable: true },
  // PO numbers are fixed-length: size the column to them so it doesn't sit
  // half empty while the other columns share the rest.
  { key: "purchase_order_label", label: C.po, width: "180px" },
  { key: "vendor_label", label: C.vendor },
  { key: "units", label: C.units, align: "right" as const },
  { key: "status", label: C.status },
  { key: "awaiting", label: C.awaiting, align: "right" as const },
  { key: "credit_pending", label: C.creditPending, align: "right" as const },
  // Dates right-align like amounts/quantities (§9 cell alignment).
  { key: "created_at", label: C.created, align: "right" as const, sortable: true },
];

// Table column key → API sort field. Only the two columns the returns endpoint
// can order by (backend `_SORTABLE`); the rest render unsortable.
export const PURCHASE_RETURN_SORT_FIELD_MAP: Record<string, "pret_number" | "created_at"> = {
  pret_number: "pret_number",
  created_at: "created_at",
};

// One tab per status plus "all"; badge counts come from the stats endpoint.
export type PurchaseReturnTabId = "all" | PurchaseReturnStatus;
export const PURCHASE_RETURN_STATUS_TABS: PurchaseReturnTabId[] = [
  "all",
  "raised",
  "dispatched",
  "closed",
  "cancelled",
];
/** Per-tab filter bag for the list view (§1.1). */
export type PurchaseReturnListFilters = {
  dateRange: DateRange | undefined;
  poId: string | undefined;
  vendorId: string | undefined;
};
