import type { PurchaseReturn, PurchaseReturnStatus } from "../../api";
import { getPurchaseReturnItemLabel } from "../../hooks/purchase-returns/usePurchaseReturnDetailView";
import type { ShippableUnit } from "./DispatchDialog";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";

const DASH = "—";

// Statuses that can still ship units.
const DISPATCHABLE_STATUSES = new Set<PurchaseReturnStatus>(["raised", "partially_dispatched"]);

export function isDispatchableStatus(status: PurchaseReturnStatus): boolean {
  return DISPATCHABLE_STATUSES.has(status);
}

/** Units a consignment can carry: decided and not yet dispatched. */
export function shippableUnitsOf(pr: PurchaseReturn): ShippableUnit[] {
  return pr.items
    .filter((item) => item.status !== "cancelled" && item.dispatch_status === "pending" && item.disposition != null)
    .map((item) => ({
      id: item.id,
      serial: item.internal_serial ?? DASH,
      partLabel: getPurchaseReturnItemLabel(item),
      disposition: item.disposition,
    }));
}

/** Why Dispatch is disabled, or null when it can run. */
export function dispatchBlockReason(
  pr: PurchaseReturn,
  shippableCount: number,
  undecidedCount: number,
): string | null {
  if (shippableCount === 0) {
    return undecidedCount > 0 ? S.dispatchBlocked(undecidedCount) : S.allDispatched;
  }
  if (pr.warehouse_id == null) return S.noWarehouse;
  return null;
}

/** Credit owed if every non-rejected unit were refunded (`credit_total` counts decided refunds only). */
export function potentialCreditOf(pr: PurchaseReturn): number {
  return pr.items.reduce(
    (sum, item) => (item.status === "cancelled" ? sum : sum + Number(item.credit_total ?? 0)),
    0,
  );
}
