import type { PurchaseReturnItem } from "../../api"

/** Per-unit disposition tally for a set of return items. Cancelled units drop
 *  out; a unit with no decision yet counts as `undecided`. Shared by the
 *  Returns tab and the PO line table's per-line `Returned` split. */
export interface DispositionCounts {
  refund: number
  replace: number
  undecided: number
  total: number
}

export function countDispositions(
  items: PurchaseReturnItem[],
): DispositionCounts {
  let refund = 0
  let replace = 0
  let undecided = 0
  for (const it of items) {
    if (it.status === "cancelled") continue
    if (it.disposition === "refund") refund += 1
    else if (it.disposition === "replace") replace += 1
    else undecided += 1
  }
  return { refund, replace, undecided, total: refund + replace + undecided }
}
