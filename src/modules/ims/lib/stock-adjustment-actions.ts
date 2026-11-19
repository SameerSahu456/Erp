import type { StockAdjustment } from "../stock-adjustments.api";

export interface AdjustmentActionFlags {
  edit: boolean;
  submit: boolean;
  cancel: boolean;
  approve: boolean;
  reject: boolean;
  returnToDraft: boolean;
  printLabels: boolean;
  /** The approver is the creator — a super-admin self-approval (D9). */
  selfApproval: boolean;
}

/** Which actions the detail page offers. The response's `can_edit` /
 *  `can_approve` (computed server-side for THIS caller) lead; the permission
 *  codes only decide visibility where the backend sends no flag. The backend
 *  re-checks every transition. */
export function adjustmentActionFlags(
  a: StockAdjustment,
  me: { id: string | undefined; canApprove: boolean },
): AdjustmentActionFlags {
  const isCreator = !!me.id && a.created_by === me.id;
  const isDraft = a.status === "draft";
  const isSubmitted = a.status === "submitted";
  const addedUnits = a.lines.some((l) => l.direction === "add" && l.units.length > 0);
  return {
    edit: isDraft && a.can_edit,
    submit: isDraft && a.can_edit,
    cancel: isDraft && a.can_edit,
    approve: isSubmitted && a.can_approve,
    reject: isSubmitted && me.canApprove,
    returnToDraft: isSubmitted && (isCreator || me.canApprove),
    printLabels: a.status === "approved" && addedUnits,
    selfApproval: isSubmitted && a.can_approve && isCreator,
  };
}

/** Stock item ids of every unit the adjustment added (label printing). */
export function addedUnitIds(a: StockAdjustment): string[] {
  return a.lines
    .filter((l) => l.direction === "add")
    .flatMap((l) => l.units.map((u) => u.stock_item_id));
}
