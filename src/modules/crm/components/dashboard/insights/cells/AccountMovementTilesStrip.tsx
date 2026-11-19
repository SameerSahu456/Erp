import { ArrowUpDown, Trophy, TrendingDown, TrendingUp } from "lucide-react"

import { DataCard, type DataCardAccent } from "@/components/common/display/DataCard"
import { formatINRShort } from "@/lib/currency"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { AccountMovementParams } from "../../../../api/dashboard"
import { useAccountMovement } from "../../../../hooks/dashboard/useAccountMovement"
import { INSIGHTS_STRINGS } from "../insights.strings"
import { ShimmerBar } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.accountMovementTiles

// Account Movement — the 4 top summary tiles on the insights page.
//
//    [ Growing Accounts ]  [ Declining Accounts ]  [ Net Movement ]  [ Biggest Mover ]
//
// Uses the same `DataCard` chrome + strip layout as `InsightTilesStrip` (the
// Revenue by Month KPI strip), so these four tiles share the accent bar, icon
// chip and spacing of every other insights-page KPI strip. One component means
// a theme change in `DataCard` lands here for free.
//
// All four read ONE response — the widget-mode `summary` field. No separate
// fetch; the same TanStack Query cache key the two bucket cards use serves
// this strip too, so visiting the insights page costs one network request
// across all three account-movement cells together.
//
// Column counts in the mock:
//   growing_count   +  new_count        → "Growing Accounts" tile
//   declining_count +  lapsed_count     → "Declining Accounts" tile
//
// (`_split_and_sort` on the backend folds the two edge cases into their
// natural bucket; the tiles summarise what the user actually sees in the
// Top Growing / Top Declining tables below.)

// Shared layout classes with `InsightTilesStrip` so the two strips sit on
// the same grid tracks and wrap identically — see the sibling for the
// reasoning behind each one.
const STRIP_CLASS = "lg:col-span-12"
const GRID_CLASS = "cpt-kpi-strip flex flex-wrap gap-3.5"
const CARD_CLASS = "min-w-[13.75rem] flex-1"
const TILE_COUNT = 4

export function AccountMovementTilesStrip({ params }: { params: AccountMovementParams }) {
  const { data, isLoading, isError, error } = useAccountMovement(params)

  if (isError) {
    return (
      <div className={STRIP_CLASS}>
        <LoadErrorState error={error} fallback={S.loadError} compact />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className={STRIP_CLASS}>
        <div className={GRID_CLASS}>
          {Array.from({ length: TILE_COUNT }, (_, i) => (
            <div key={i} className={`cpt-kpi ${CARD_CLASS}`} data-accent="primary">
              <div className="space-y-2">
                <ShimmerBar className="h-3 w-24" />
                <ShimmerBar className="h-7 w-28" />
                <ShimmerBar className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const { summary } = data
  const growingTotal = summary.growing_count + summary.new_count
  const decliningTotal = summary.declining_count + summary.lapsed_count
  const windowLabel = `${data.current_window.label} vs ${data.previous_window.label}`

  // Bucket aggregates — mock reads `+₹2.9Cr` / `-₹1.4Cr` under the two
  // count tiles. Backend returns `growing_delta` positive (sum of growing +
  // new deltas) and `declining_delta` negative (sum of declining + lapsed).
  const growingSub = S.bucketDeltaSubline("+", formatINRShort(summary.growing_delta))
  const decliningSub = S.bucketDeltaSubline(
    summary.declining_delta <= 0 ? "-" : "+",
    formatINRShort(Math.abs(summary.declining_delta)),
  )

  // Net movement — accent follows the sign so the visual story is consistent
  // with every other +/- figure on the page. Green on positive net growth,
  // red on net decline, neutral at zero. ``danger`` is the sanctioned
  // red-coded accent for the `cpt-kpi` component.
  const netAccent: DataCardAccent =
    summary.net_delta > 0 ? "success" : summary.net_delta < 0 ? "danger" : "primary"
  const netSign = summary.net_delta > 0 ? "+" : summary.net_delta < 0 ? "-" : ""
  const netValue = `${netSign}${formatINRShort(Math.abs(summary.net_delta))}`
  // Also recolour the value TEXT (not just the accent bar / icon chip) so
  // "+₹3.4Cr" / "-₹1.2Cr" reads green / red at a glance. `DataCard` renders
  // the value in `.cpt-kpi-value` with `color: var(--foreground)` by
  // default; targeting the descendant via Tailwind's child-selector keeps
  // the override scoped to this one tile without touching the shared
  // primitive or the global stylesheet. Tokens only (§8.5).
  const netValueColorClass =
    summary.net_delta > 0
      ? "[&_.cpt-kpi-value]:text-success"
      : summary.net_delta < 0
        ? "[&_.cpt-kpi-value]:text-destructive"
        : ""

  const biggest = summary.biggest_mover
  const biggestAccent: DataCardAccent =
    biggest == null ? "primary" : biggest.delta >= 0 ? "success" : "danger"
  const biggestSub =
    biggest != null
      ? S.biggestMoverSubline(
          biggest.delta >= 0 ? "+" : "-",
          formatINRShort(Math.abs(biggest.delta)),
          biggest.status,
        )
      : windowLabel

  return (
    <div className={STRIP_CLASS}>
      <div className={GRID_CLASS}>
        <DataCard
          label={S.growingAccountsLabel}
          value={String(growingTotal)}
          sub={growingSub}
          accent="success"
          icon={TrendingUp}
          className={CARD_CLASS}
        />
        <DataCard
          label={S.decliningAccountsLabel}
          value={String(decliningTotal)}
          sub={decliningSub}
          accent="danger"
          icon={TrendingDown}
          className={CARD_CLASS}
        />
        <DataCard
          label={S.netMovementLabel}
          value={netValue}
          sub={windowLabel}
          accent={netAccent}
          icon={ArrowUpDown}
          className={`${CARD_CLASS} ${netValueColorClass}`}
        />
        <DataCard
          label={S.biggestMoverLabel}
          value={biggest?.account_name ?? S.biggestMoverNone}
          sub={biggestSub}
          accent={biggestAccent}
          icon={Trophy}
          className={CARD_CLASS}
        />
      </div>
    </div>
  )
}
