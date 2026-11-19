import { Typography } from "@/components/ui/typography"

import type { DemoStageRollupWire } from "../../api"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"
// import { inProgressCount } from "./demoFulfillment"

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-2.5">
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      <Typography variant="card-title" className="tabular-nums">
        {value}
      </Typography>
    </div>
  )
}

function Chip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Typography variant="caption" className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${tone}`} asChild>
      <span>
        <span className="tabular-nums">{value}</span> {label}
      </span>
    </Typography>
  )
}

// Demo-wide fulfillment strip. Same vocabulary as the per-line chips in
// DemoDetailItemsCard, so the page never uses two words for one number.
//
// Six stats, more than the SO page's three, because a demo's interesting
// states are all AFTER dispatch: "Dispatched" is cumulative units that left
// the building, "With Customer" is what is still out — the number a
// salesperson chasing an overdue demo actually acts on.
//
// The exceptional outcomes are chips that appear only when non-zero. A demo
// with nothing rejected and no return in flight stays clean, and a
// permanently-zero card reads as a broken page rather than as information.
export function DemoFulfillmentRollup({
  rollup,
  isLoading,
  isError,
}: {
  rollup: DemoStageRollupWire | undefined
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading && !rollup) {
    return <div className="h-16 animate-pulse rounded-lg bg-muted" />
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
      {/* <Stat label={F.requested} value={rollup.requested} /> */}
      {/* <Stat label={F.pendingDispatch} value={rollup.pending_dispatch} /> */}
      {/* <Stat label={F.inProgress} value={inProgressCount(rollup)} /> */}
      {/* <Stat label={F.dispatched} value={rollup.dispatched} /> */}
      {/* <Stat label={F.withCustomer} value={rollup.with_customer} /> */}
      {/* <Stat label={F.returned} value={rollup.returned} /> */}
      {rollup.under_return > 0 && (
        <Chip label={F.underReturn} value={rollup.under_return} tone="bg-warning-soft text-warning" />
      )}
      {rollup.sold > 0 && (
        <Chip label={F.converted} value={rollup.sold} tone="bg-info-soft text-info" />
      )}
      {rollup.rejected > 0 && (
        <Chip label={F.rejected} value={rollup.rejected} tone="bg-destructive-soft text-destructive" />
      )}
      {rollup.qc_failed > 0 && (
        <Chip label={F.qcFailed} value={rollup.qc_failed} tone="bg-destructive-soft text-destructive" />
      )}
    </div>
  )
}
