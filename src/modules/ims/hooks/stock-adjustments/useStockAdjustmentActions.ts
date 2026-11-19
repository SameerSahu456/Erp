import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  approveStockAdjustment,
  cancelStockAdjustment,
  rejectStockAdjustment,
  returnStockAdjustmentToDraft,
  submitStockAdjustment,
} from "../../stock-adjustments.api";
import { invalidateStockAdjustment } from "./invalidateStockAdjustment";
import { notifyAlways, notifyUnlessListed } from "./listed-errors";
import { STOCK_ADJUSTMENT_HOOK_STRINGS as S } from "./stock-adjustment-hooks.strings";

/** The state transitions of one adjustment (spec D9). Submit and approve
 *  failures that carry a per-line list are rendered by the detail page. */
export function useStockAdjustmentActions(id: string) {
  const qc = useQueryClient();
  const settle = (stockChanged = false) => () =>
    invalidateStockAdjustment(qc, id, { statusChanged: true, stockChanged });
  // Any transition moves the status on, so an earlier blocked list is stale.
  const succeeded = (message: string) => () => {
    submit.reset();
    approve.reset();
    toast.success(message);
  };

  const submit = useMutation({
    mutationFn: () => submitStockAdjustment(id),
    onSuccess: succeeded(S.submitted),
    onError: notifyUnlessListed,
    onSettled: settle(),
  });
  const cancel = useMutation({
    mutationFn: () => cancelStockAdjustment(id),
    onSuccess: succeeded(S.cancelled),
    onError: notifyAlways,
    onSettled: settle(),
  });
  const returnToDraft = useMutation({
    mutationFn: () => returnStockAdjustmentToDraft(id),
    onSuccess: succeeded(S.returnedToDraft),
    onError: notifyAlways,
    onSettled: settle(),
  });
  const approve = useMutation({
    mutationFn: (notes: string | null) => approveStockAdjustment(id, { notes }),
    onSuccess: succeeded(S.approved),
    onError: notifyUnlessListed,
    onSettled: settle(true),
  });
  const reject = useMutation({
    mutationFn: (notes: string) => rejectStockAdjustment(id, { notes }),
    onSuccess: succeeded(S.rejected),
    onError: notifyAlways,
    onSettled: settle(),
  });

  const isPending =
    submit.isPending ||
    cancel.isPending ||
    returnToDraft.isPending ||
    approve.isPending ||
    reject.isPending;
  /** The latest failure that carries a list the page shows in place. */
  const listedError = submit.error ?? approve.error;

  return { submit, cancel, returnToDraft, approve, reject, isPending, listedError };
}

export type StockAdjustmentActions = ReturnType<typeof useStockAdjustmentActions>;
