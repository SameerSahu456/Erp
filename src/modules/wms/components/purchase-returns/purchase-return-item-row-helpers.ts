import type { PurchaseReturnItem } from "../../api";
import { isUndecided } from "./purchase-return-items-helpers";

/** Which actions one purchase-return line offers the current user. */
export function itemRowFlags(
  item: PurchaseReturnItem,
  ctx: { canSettle: boolean; canWrite: boolean; isRaised: boolean; isDispatched: boolean },
) {
  const undecidedRow = isUndecided(item);
  // Procurement decides; the warehouse raiser may only remove an undecided unit.
  const canDecideRow = undecidedRow && ctx.canSettle;
  const canRemoveRow = undecidedRow && ctx.canWrite && ctx.isRaised;
  const canSettleRow =
    !undecidedRow &&
    ctx.canSettle &&
    ctx.isDispatched &&
    item.settlement_status === "pending";
  // Reject and Remove have the same effect, so show one: Reject wins if the user can settle.
  const showReject = canDecideRow && ctx.isRaised;
  const showRemove = canRemoveRow && !showReject;
  const hasRowAction = canDecideRow || canRemoveRow || canSettleRow;
  return { undecidedRow, canDecideRow, canSettleRow, showReject, showRemove, hasRowAction };
}

export type ItemRowFlags = ReturnType<typeof itemRowFlags>;
