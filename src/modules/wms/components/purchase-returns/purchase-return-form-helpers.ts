import {
  useReturnablePurchaseOrderOptions,
  type PurchaseOrderListItem,
} from "@modules/procurement";

import { useWarehouseScope } from "../../context/warehouse-scope";
import { PURCHASE_RETURN_STRINGS as S } from "./purchase-returns.strings";
import type { ReturnSelections } from "./return-selection";

// AsyncSelect calls `useOptions` as a hook, so the adapter is a named hook that
// maps the picker's `(search, opts)` contract onto the procurement PO-options
// infinite hook. `po_number` (with supplier) is the label.
export function usePurchaseOrderPickerOptions(
  search: string,
  opts?: { enabled?: boolean },
) {
  // Honour the navbar warehouse scope — the picker lists only in-scope POs.
  const { selectedWarehouseIds } = useWarehouseScope();
  return useReturnablePurchaseOrderOptions(search, {
    enabled: opts?.enabled,
    warehouseIds: selectedWarehouseIds,
  });
}

export function poLabel(po: PurchaseOrderListItem): string {
  return po.supplier?.name
    ? `${po.po_number} · ${po.supplier.name}`
    : po.po_number;
}

/** First unmet submit gate (null = submittable). Shared by the §0.9 tooltip and
 *  submit()'s toast so they never disagree. */
export function firstBlockReason(
  selectedIds: string[],
  selections: ReturnSelections,
): string | null {
  if (selectedIds.length === 0) return S.guard.noUnits;
  if (selectedIds.some((id) => selections[id].reasonCode === "")) {
    return S.guard.missingReason;
  }
  if (
    selectedIds.some(
      (id) =>
        selections[id].reasonCode === "other" &&
        selections[id].notes.trim() === "",
    )
  ) {
    return S.guard.missingNotes;
  }
  return null;
}
