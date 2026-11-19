import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { countDispositions } from "./poReturns"
import type { PurchaseReturnItem } from "../../api"
import { DASH, RET_S } from "./po-detail-helpers"

/** Live refunded-unit count for one PO line. Replace / undecided units still
 *  matter to the Returns tab, but they do not reduce the contract on their own,
 *  so the line table surfaces the refund count only. */
export function RefundedCell({
  items,
}: {
  items: PurchaseReturnItem[] | undefined
}) {
  const counts = countDispositions(items ?? [])
  if (counts.refund === 0) {
    return (
      <span className="tabular-nums text-muted-foreground">{DASH}</span>
    )
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="cursor-default font-medium tabular-nums" />
          }
        >
          {counts.refund}
        </TooltipTrigger>
        <TooltipContent>
          {RET_S.lineTooltip(counts.refund, counts.replace, counts.undecided)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
