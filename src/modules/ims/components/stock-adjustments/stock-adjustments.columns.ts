import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

// Keys are the list item's wire fields, so rows go to the table untouched.
// The two long text columns are capped (they truncate) so the register fits the page.
export const ADJUSTMENT_COLUMNS = [
  { key: "adjustment_number", label: S.columns.number },
  { key: "warehouse_name", label: S.columns.warehouse, width: "140px" },
  { key: "reason", label: S.columns.reason, width: "140px" },
  { key: "units_to_add", label: S.columns.addedUnit, align: "right" as const },
  { key: "units_to_remove", label: S.columns.removedUnit, align: "right" as const },
  { key: "status", label: S.columns.status },
  { key: "created_by_name", label: S.columns.createdBy },
  { key: "created_at", label: S.columns.created, align: "right" as const },
  { key: "decided_at", label: S.columns.decided, align: "right" as const },
];

/** Date columns rendered as IST timestamps. */
export const ADJUSTMENT_DATE_KEYS = new Set(["created_at", "decided_at"]);
