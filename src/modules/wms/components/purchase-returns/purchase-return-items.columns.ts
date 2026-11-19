/** Line-items header columns; the empty row's `colSpan` uses this length so it never drifts. */
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";

export type PurchaseReturnItemColumnKey =
  | "select"
  | "serial"
  | "part"
  | "reason"
  | "disposition"
  | "whereabouts"
  | "settlement"
  | "credit"
  | "actions";

export interface PurchaseReturnItemColumn {
  key: PurchaseReturnItemColumnKey;
  /** Header text; the select column renders a checkbox instead. */
  label: string;
  className?: string;
}

export function purchaseReturnItemColumns(opts: {
  canSettle: boolean;
  showActions: boolean;
}): PurchaseReturnItemColumn[] {
  return [
    // Tight checkbox gutter so Serial reads as the first real column.
    ...(opts.canSettle
      ? [{ key: "select" as const, label: "", className: "w-8 px-2" }]
      : []),
    { key: "serial", label: S.units.columns.serial },
    { key: "part", label: S.units.columns.part },
    { key: "reason", label: S.units.columns.reason },
    { key: "disposition", label: S.units.columns.disposition },
    { key: "whereabouts", label: S.units.columns.whereabouts },
    { key: "settlement", label: S.units.columns.settlement },
    { key: "credit", label: S.units.columns.credit, className: "text-right" },
    // pl-8 keeps Actions clear of the right-aligned Credit figure.
    ...(opts.showActions
      ? [{ key: "actions" as const, label: S.units.columns.actions, className: "w-44 pl-8" }]
      : []),
  ];
}
