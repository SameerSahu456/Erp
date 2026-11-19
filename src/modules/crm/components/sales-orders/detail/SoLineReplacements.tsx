import { CornerDownRight } from "lucide-react"

import { StatusBadge, type StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"

import type { SalesOrderLineReplacementWire } from "../../../api"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

const R = S.detail.items

type Stage = keyof typeof R.replacementStatus

/** Where the swap stands: approved and waiting to ship, shipped while the old
 *  unit is still out, or done. */
function stageOf(r: SalesOrderLineReplacementWire): Stage {
  if (r.dispatch_status === "not_needed") return "notNeeded"
  if (r.dispatch_status !== "dispatched") return "awaitingDispatch"
  return r.return_status === "pending" ? "dispatched" : "completed"
}

const STAGE_VARIANT: Record<Stage, StatusBadgeVariant> = {
  awaitingDispatch: "info",
  dispatched: "warning",
  completed: "success",
  notNeeded: "neutral",
}

/** The approved replacements of ONE SO line, appended under it. The line keeps
 *  what was ordered; these are the parts swapped in against it. */
export function SoLineReplacements({
  replacements,
  isRental,
}: {
  replacements: SalesOrderLineReplacementWire[]
  /** A rental rate is per month; a sale's is a one-off price. */
  isRental: boolean
}) {
  return (
    <ul className="space-y-1.5">
      {replacements.map((r) => {
        const stage = stageOf(r)
        const part = r.part_number ?? r.part_name
        return (
          <li
            key={`${r.replacement_request_id}-${part}`}
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
          >
            <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <Typography variant="helper" tone="muted" className="shrink-0">
              {R.replacedBy}
            </Typography>
            <Typography variant="body-strong" className="min-w-0 break-words">
              {part}
            </Typography>
            <Typography variant="helper" tone="muted" numeric>
              {R.replacementQty(r.quantity)}
            </Typography>
            {r.replacement_rate != null ? (
              <Typography variant="helper" tone="muted" numeric>
                {isRental
                  ? R.replacementRate(formatINR(Number(r.replacement_rate)))
                  : formatINR(Number(r.replacement_rate))}
              </Typography>
            ) : null}
            <Typography variant="helper" tone="muted" numeric>
              {r.request_number}
            </Typography>
            <StatusBadge variant={STAGE_VARIANT[stage]}>{R.replacementStatus[stage]}</StatusBadge>
          </li>
        )
      })}
    </ul>
  )
}
