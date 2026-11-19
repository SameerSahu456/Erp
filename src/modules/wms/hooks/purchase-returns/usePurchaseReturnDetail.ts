import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { usePermission } from "@shared/rbac";
import { asUuid } from "@shared/lib/validation";
import { procurementPermissions } from "@modules/procurement";

import type { PurchaseReturnItem, PurchaseReturnSettle, PurchaseReturnWaive } from "../../api";
import type { DispatchChallan } from "../../components/purchase-returns/DispatchDialog";
import {
  dispatchBlockReason,
  potentialCreditOf,
  shippableUnitsOf,
} from "../../components/purchase-returns/purchase-return-detail-helpers";
import { usePurchaseReturnMutations, type DispatchDocUpload } from "./usePurchaseReturnMutations";
import { usePurchaseReturnDetailView } from "./usePurchaseReturnDetailView";

/** State + data owner for the Purchase Return detail page (§17). */
export function usePurchaseReturnDetail() {
  // §11.1 — the route `:id` is untrusted; malformed → '' (query disabled).
  const { id: rawId } = useParams();
  const id = asUuid(rawId) ?? "";
  const { can } = usePermission();
  const view = usePurchaseReturnDetailView(id);
  const pr = view.purchaseReturn;
  const { dispatch, settle, waive } = usePurchaseReturnMutations();

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<PurchaseReturnItem | null>(null);
  const [waiveTarget, setWaiveTarget] = useState<PurchaseReturnItem | null>(null);

  const shippableUnits = useMemo(() => (pr ? shippableUnitsOf(pr) : []), [pr]);
  const dispatchDisabledReason = pr
    ? dispatchBlockReason(pr, shippableUnits.length, view.undecidedCount)
    : null;

  const confirmDispatch = (challan: DispatchChallan, documents: DispatchDocUpload[]) => {
    if (!pr) return;
    // The dialog decides which units board this consignment; anything left
    // unticked stays for a later trip.
    dispatch.mutate(
      { pr, input: { warehouseId: pr.warehouse_id ?? "", ...challan }, documents },
      { onSuccess: () => setDispatchOpen(false) },
    );
  };
  const confirmSettle = (body: PurchaseReturnSettle) => {
    if (!pr || !settlementTarget) return;
    settle.mutate(
      { prId: pr.id, itemId: settlementTarget.id, body },
      { onSuccess: () => setSettlementTarget(null) },
    );
  };
  const confirmWaive = (body: PurchaseReturnWaive) => {
    if (!pr || !waiveTarget) return;
    waive.mutate(
      { prId: pr.id, itemId: waiveTarget.id, body },
      { onSuccess: () => setWaiveTarget(null) },
    );
  };

  return {
    ...view,
    canWrite: can(procurementPermissions.PO_RETURN_WRITE),
    canSettle: can(procurementPermissions.PO_RETURN_SETTLE),
    potentialCredit: pr ? potentialCreditOf(pr) : 0,
    shippableUnits,
    dispatchDisabledReason,
    dispatchPending: dispatch.isPending,
    settlePending: settle.isPending,
    waivePending: waive.isPending,
    dispatchOpen,
    setDispatchOpen,
    settlementTarget,
    setSettlementTarget,
    waiveTarget,
    setWaiveTarget,
    confirmDispatch,
    confirmSettle,
    confirmWaive,
  };
}
