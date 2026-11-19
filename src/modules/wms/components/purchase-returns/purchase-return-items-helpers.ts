import { type StatusBadgeVariant } from "@/components/common/display/StatusBadge";
import { formatINRCompact } from "@/lib/currency";

import type {
  PurchaseReturnDisposition,
  PurchaseReturnItem,
} from "../../api";
import {
  PURCHASE_RETURN_DETAIL_STRINGS as S,
  type PurchaseReturnSettlementStatus,
} from "./purchase-returns.strings";

export function money(v: string | number) {
  return formatINRCompact(Number(v));
}

export const DISPOSITION_OPTIONS: { value: PurchaseReturnDisposition; label: string }[] = [
  { value: "replace", label: S.units.replace },
  { value: "refund", label: S.units.refund },
];

// A rejected item is `status === "cancelled"` with `disposition === null` — the
// unit was restored to its prior inward/stock state, not left undecided. Show
// "Rejected", never "Awaiting decision" (which only applies to live, pending items).
export function dispositionMeta(item: PurchaseReturnItem): { label: string; variant: StatusBadgeVariant } {
  if (item.status === "cancelled") return { label: S.units.rejected, variant: "neutral" };
  if (item.disposition === "replace") return { label: S.units.replace, variant: "info" };
  if (item.disposition === "refund") return { label: S.units.refund, variant: "info" };
  return { label: S.units.awaitingDecision, variant: "warning" };
}

// The complete, fixed set of disposition labels the items-table filter offers,
// in a stable order. Deriving the options from the labels PRESENT in the
// current items hid a status whenever no item had it yet — e.g. once every
// unit was set to Replace, "Refund" and "Awaiting Decision" vanished from the
// filter. This list is always the same regardless of the data.
export const DISPOSITION_FILTER_LABELS: readonly string[] = [
  S.units.awaitingDecision,
  S.units.replace,
  S.units.refund,
  S.units.rejected,
];

export const SETTLEMENT_VARIANT: Record<PurchaseReturnSettlementStatus, StatusBadgeVariant> = {
  pending: "warning",
  settled: "success",
  waived: "neutral",
};

export function isUndecided(item: PurchaseReturnItem): boolean {
  return item.status !== "cancelled" && item.disposition == null;
}
