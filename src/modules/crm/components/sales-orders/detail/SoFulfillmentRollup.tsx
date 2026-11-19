import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

import type { StageRollupWire } from "../../../api"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"
import { inProgressCount } from "./soFulfillment"

// A single fulfillment metric: a state-coloured dot + uppercase label over a
// prominent tabular number, so the three pipeline stages read at a glance.
function Stat({
  label,
  value,
  dot,
}: {
  label: string
  value: number
  dot: string
}) {
  return (
    <div className="flex min-w-[7.5rem] flex-1 flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3">
      <span className="flex items-center gap-1.5">
        <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden />
        <Typography
          variant="caption"
          tone="muted"
          className="uppercase tracking-wide"
        >
          {label}
        </Typography>
      </span>
      <Typography variant="card-title" className="tabular-nums leading-none">
        {value}
      </Typography>
    </div>
  )
}

// SO-wide fulfillment rollup strip. Same three terms as the per-line sub-row in
// SoItemsTable — Ordered · In progress · Dispatched — so the page never uses two
// words for one number, plus Returned and Replacements as first-class cards.
export function SoFulfillmentRollup({
  rollup,
  returnedUnits,
  replacementCount,
  isLoading,
  isError,
}: {
  rollup: StageRollupWire | undefined
  /** Returned units sourced from the SO's sales-return records (the stage
   *  rollup's own `returned` only counts stock-reconciled units). */
  returnedUnits?: number
  /** Number of replacement requests raised against this SO. */
  replacementCount?: number
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading && !rollup) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[4.75rem] min-w-[7.5rem] flex-1 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    )
  }
  if (isError || !rollup) {
    return (
      <Typography variant="helper" tone="muted">
        {S.detail.fulfillment.error}
      </Typography>
    )
  }

  const F = S.detail.fulfillment
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Stat label={F.ordered} value={rollup.ordered} dot="bg-muted-foreground/40" />
      <Stat
        label={F.inProgress}
        value={inProgressCount(rollup)}
        dot="bg-primary"
      />
      <Stat label={F.dispatched} value={rollup.dispatched} dot="bg-success" />
      {/* Returned units (summed from the SO lines' returned_qty) sit beside
          Dispatched as a first-class card, not a conditional chip. */}
      <Stat
        label={F.returned}
        value={returnedUnits ?? rollup.returned}
        dot="bg-warning"
      />
      {/* Replacement requests raised against this SO — counts request
          documents, not units (a request may swap one unit repeatedly). */}
      <Stat
        label={F.replacements}
        value={replacementCount ?? 0}
        dot="bg-violet"
      />
    </div>
  )
}
