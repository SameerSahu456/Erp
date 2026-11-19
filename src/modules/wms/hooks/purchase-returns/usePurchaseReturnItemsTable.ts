import { useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  PurchaseReturn,
  PurchaseReturnDisposition,
  PurchaseReturnItem,
} from "../../api";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "../../components/purchase-returns/purchase-returns.strings";
import { isUndecided } from "../../components/purchase-returns/purchase-return-items-helpers";
import { makeRowRunner } from "../../components/purchase-returns/purchase-return-row-runner-helpers";
import { purchaseReturnItemColumns } from "../../components/purchase-returns/purchase-return-items.columns";
import { usePurchaseReturnMutations } from "./usePurchaseReturnMutations";
import { usePurchaseReturnItemsFilter } from "./usePurchaseReturnItemsFilter";

/** State, derivations and row / bulk actions for `PurchaseReturnItemsTable`. */
export function usePurchaseReturnItemsTable({
  purchaseReturn,
  canSettle,
  canWrite,
}: {
  purchaseReturn: PurchaseReturn;
  canSettle: boolean;
  canWrite: boolean;
}) {
  const {
    setDisposition,
    setDispositionsBulk,
    reject,
    rejectItemsBulk,
    cancelItem,
  } = usePurchaseReturnMutations();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDisposition, setBulkDisposition] = useState<PurchaseReturnDisposition | "">("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  // The unit awaiting reject confirmation, or null when the dialog is closed.
  const [rejectTarget, setRejectTarget] = useState<PurchaseReturnItem | null>(null);
  // The unit awaiting remove confirmation, or null when the dialog is closed.
  const [removeTarget, setRemoveTarget] = useState<PurchaseReturnItem | null>(null);
  // Whether the bulk "reject selected" confirmation is open.
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  // Whether the bulk "apply disposition" confirmation is open (§12 — a bulk
  // action confirms before running, like its sibling reject).
  const [bulkApplyOpen, setBulkApplyOpen] = useState(false);
  const items = purchaseReturn.items;
  const filter = usePurchaseReturnItemsFilter(items, selectedIds, setSelectedIds);
  const undecided = useMemo(() => items.filter(isUndecided), [items]);
  const selectedUndecided = undecided.filter((item) => selectedIds.includes(item.id));
  const isRaised = purchaseReturn.status === "raised";
  // Settle/waive is allowed only once the whole return is dispatched (backend rule).
  const isDispatched = purchaseReturn.status === "dispatched";

  const runRow = makeRowRunner({ setRowErrors, setPendingIds });

  // `silent` lets a bulk loop fire one toast + one invalidation; returns success.
  function applyOne(
    itemId: string,
    disposition: PurchaseReturnDisposition,
    silent = false,
  ): Promise<boolean> {
    return runRow(itemId, S.units.setDispositionFailed, () =>
      setDisposition.mutateAsync({
        prId: purchaseReturn.id,
        itemId,
        disposition,
        silent,
      }),
    );
  }

  function rejectOne(itemId: string, silent = false): Promise<boolean> {
    return runRow(itemId, S.units.rejectFailed, () =>
      reject.mutateAsync({ prId: purchaseReturn.id, itemId, silent }),
    );
  }

  async function removeOne(itemId: string) {
    await runRow(itemId, S.units.removeFailed, () =>
      cancelItem.mutateAsync({ prId: purchaseReturn.id, itemId }),
    );
  }

  async function applyBulk() {
    if (bulkDisposition === "") return;
    const ids = selectedUndecided.map((item) => item.id);
    if (ids.length === 0) return;
    // ONE request for the whole selection — the backend applies every item in a
    // single transaction. The old per-item loop fired N sequential calls and,
    // on a large return, looked like it never finished and never refreshed the
    // page (CP-344). The mutation refreshes once on success.
    try {
      await setDispositionsBulk.mutateAsync({
        prId: purchaseReturn.id,
        itemIds: ids,
        disposition: bulkDisposition,
      });
      toast.success(S.units.bulkApplied(ids.length));
      setSelectedIds([]);
      setBulkDisposition("");
    } catch {
      // The mutation's onError already surfaced why; keep the selection so the
      // operator can retry without re-picking every unit.
    }
  }

  async function rejectSelected() {
    const ids = selectedUndecided.map((item) => item.id);
    if (ids.length === 0) return;
    // ONE request for the whole selection (CP-344) — the old per-item loop fired
    // N sequential calls and refreshed only at the very end.
    try {
      await rejectItemsBulk.mutateAsync({ prId: purchaseReturn.id, itemIds: ids });
      toast.success(S.units.bulkRejected(ids.length));
      setSelectedIds([]);
    } catch {
      // The mutation's onError surfaced why; keep the selection to retry.
    }
  }

  function toggleRow(itemId: string, checked: boolean) {
    setSelectedIds((prev) =>
      checked ? [...prev, itemId] : prev.filter((id) => id !== itemId),
    );
  }

  // The Actions column shows for procurement (decide/settle/waive/reject) OR the
  // warehouse raiser (remove). Bulk-select + bulk bar stay procurement-only.
  const showActions = canSettle || canWrite;
  const showBulkBar = canSettle && undecided.length > 0;
  const columns = purchaseReturnItemColumns({ canSettle, showActions });

  // §0.9: disabled bulk buttons name the unmet condition in a tooltip. A missing
  // disposition isn't one: Apply stays enabled and flags the field instead.
  const rejectBlockReason =
    selectedUndecided.length === 0 ? S.units.selectUndecided : null;
  const applyBlockReason = rejectBlockReason;

  return {
    items,
    visibleItems: filter.visibleItems,
    selectableVisible: filter.selectableVisible,
    allVisibleSelected: filter.allVisibleSelected,
    toggleAllVisible: filter.toggleAllVisible,
    selectedIds,
    toggleRow,
    selectedUndecided,
    isRaised,
    isDispatched,
    pendingIds,
    rowErrors,
    bulkDisposition,
    setBulkDisposition,
    itemSearch: filter.itemSearch,
    setItemSearch: filter.setItemSearch,
    dispositionFilter: filter.dispositionFilter,
    setDispositionFilter: filter.setDispositionFilter,
    rejectTarget,
    setRejectTarget,
    removeTarget,
    setRemoveTarget,
    bulkRejectOpen,
    setBulkRejectOpen,
    bulkApplyOpen,
    setBulkApplyOpen,
    applyOne,
    rejectOne,
    removeOne,
    applyBulk,
    rejectSelected,
    showActions,
    showBulkBar,
    columns,
    applyBlockReason,
    rejectBlockReason,
  };
}

export type PurchaseReturnItemsTableState = ReturnType<typeof usePurchaseReturnItemsTable>;
