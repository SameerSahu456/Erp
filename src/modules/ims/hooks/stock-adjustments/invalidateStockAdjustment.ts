import type { QueryClient } from "@tanstack/react-query";

import { imsKeys } from "../keys";

const K = imsKeys.stockAdjustments;

export interface AdjustmentChange {
  /** The status moved (or a record was created), so the tab counts shift. */
  statusChanged?: boolean;
  /** Approval moved stock: the stock/variant views and the removable units. */
  stockChanged?: boolean;
}

/** What one adjustment write changes: its detail and the list pages always;
 *  the tab counts only when a status moved; stock only on approval. */
export function invalidateStockAdjustment(
  qc: QueryClient,
  id: string | null,
  change: AdjustmentChange = {},
): void {
  if (id) void qc.invalidateQueries({ queryKey: K.detail(id) });
  void qc.invalidateQueries({ queryKey: K.lists() });
  if (change.statusChanged) void qc.invalidateQueries({ queryKey: K.counts() });
  if (change.stockChanged) {
    void qc.invalidateQueries({ queryKey: imsKeys.stock });
    void qc.invalidateQueries({ queryKey: imsKeys.variants });
    void qc.invalidateQueries({ queryKey: K.removableUnitsAll() });
  }
}
