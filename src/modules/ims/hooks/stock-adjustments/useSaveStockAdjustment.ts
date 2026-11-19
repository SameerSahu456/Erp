import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createStockAdjustment,
  updateStockAdjustment,
  type StockAdjustmentCreate,
} from "../../stock-adjustments.api";
import { invalidateStockAdjustment } from "./invalidateStockAdjustment";
import { notifyUnlessListed } from "./listed-errors";
import { STOCK_ADJUSTMENT_HOOK_STRINGS as S } from "./stock-adjustment-hooks.strings";

/** Create a draft (no id) or replace a draft's header + lines (id). A failure
 *  carrying an error list (`lines.N`, `notes`, …) is left to the form, which
 *  renders it inline — one surface, never a toast as well. */
export function useSaveStockAdjustment(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StockAdjustmentCreate) => {
      if (!id) return createStockAdjustment(body);
      const { warehouse_id, reason, notes, lines } = body;
      return updateStockAdjustment(id, { warehouse_id, reason, notes, lines });
    },
    onSuccess: (saved) => {
      // A new draft adds to the Draft / All counts; an edit moves no status.
      invalidateStockAdjustment(qc, saved.id, { statusChanged: !id });
      toast.success(id ? S.updated : S.created);
    },
    onError: notifyUnlessListed,
  });
}
