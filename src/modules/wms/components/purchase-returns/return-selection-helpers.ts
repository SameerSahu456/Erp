import type {
  PurchaseReturnCreate,
  PurchaseReturnItemCreate,
  ReturnableUnit,
} from "../../api";
import type { ReturnReasonCode } from "./purchase-returns.strings";
import type { ReturnSelection, ReturnSelections } from "./return-selection";

/** Select / deselect one unit (a fresh selection starts blank and unedited). */
export function toggleSelection(prev: ReturnSelections, unit: ReturnableUnit): ReturnSelections {
  const next = { ...prev };
  if (next[unit.stock_item_id]) {
    delete next[unit.stock_item_id];
  } else {
    next[unit.stock_item_id] = {
      reasonCode: "",
      notes: "",
      edited: false,
    };
  }
  return next;
}

/** Patch one selected row; a no-op when the unit isn't selected. */
export function patchSelection(
  prev: ReturnSelections,
  stockItemId: string,
  patch: Partial<ReturnSelection>,
): ReturnSelections {
  const cur = prev[stockItemId];
  if (!cur) return prev;
  return { ...prev, [stockItemId]: { ...cur, ...patch } };
}

/** Bulk apply: stamp every selected row with the same reason + notes. */
export function stampAllSelections(
  prev: ReturnSelections,
  reasonCode: ReturnReasonCode,
  notes: string,
): ReturnSelections {
  const next: ReturnSelections = {};
  for (const id of Object.keys(prev)) {
    next[id] = { reasonCode, notes, edited: false };
  }
  return next;
}

/** The create payload for the raise form. */
export function buildPurchaseReturnCreate(input: {
  poId: string;
  headerNotes: string;
  selectedIds: string[];
  selections: ReturnSelections;
}): PurchaseReturnCreate {
  const items: PurchaseReturnItemCreate[] = input.selectedIds.map((id) => {
    const sel = input.selections[id];
    return {
      stock_item_id: id,
      // Guarded by the caller: reasonCode is never "" here.
      reason_code: sel.reasonCode as ReturnReasonCode,
      reason_notes: sel.notes.trim() || undefined,
    };
  });
  return {
    purchase_order_id: input.poId,
    notes: input.headerNotes.trim() || undefined,
    items,
  };
}
