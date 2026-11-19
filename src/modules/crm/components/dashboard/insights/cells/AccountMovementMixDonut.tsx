import type { ChartAccent } from "@/components/common/display/chartTheme"
import { Typography } from "@/components/ui/typography"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type {
  AccountMovementParams,
  AccountMovementStatus,
  AccountMovementSummary,
} from "../../../../api/dashboard"
import { useAccountMovement } from "../../../../hooks/dashboard/useAccountMovement"
import { INSIGHTS_STRINGS } from "../insights.strings"
import { InsightDonutList, type DonutSlice } from "../InsightDonutList"
import { InsightEmptyState } from "../InsightEmptyState"
import { InsightWidget, type Span } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.accountMovement

// Account Movement Mix — the count donut on the insights page.
//
// Reads `summary` off the SAME widget-mode `/dashboard/account-movement`
// response the tiles strip and the two bucket cards use, so it adds no
// network request: TanStack Query serves all four cells from one key.
//
// Five slices, in the reference board's order and palette: Growing, Declining,
// Lapsed, Flat, New. Growing here is the PURE growing count — `new` is its own
// slice — unlike the tiles strip, which folds new into growing so its number
// agrees with the Top Growing card. The donut's job is to show the split, the
// strip's is to agree with the cards; both read the same five counts.
//
// Zero-count slices are dropped (the reference does the same), so a quiet
// period shows two or three slices rather than five with three empty legends.
//
// `share` / `total` are computed HERE, which the board's rule normally forbids
// (deriving a share from the rows on screen breaks under pagination). It is
// safe for this cell because `summary` is the whole classified set — the
// backend counts every account, never a page — so there is no unfetched
// remainder to misreport.

const MIX_ORDER: ReadonlyArray<{ status: AccountMovementStatus; accent: ChartAccent }> = [
  { status: "growing", accent: "emerald" },
  { status: "declining", accent: "rose" },
  { status: "lapsed", accent: "slate" },
  { status: "flat", accent: "amber" },
  { status: "new", accent: "indigo" },
]

function countOf(summary: AccountMovementSummary, status: AccountMovementStatus): number {
  return summary[`${status}_count`]
}

interface AccountMovementMixDonutProps {
  /** The widget-mode slice — no `movement` / `page`, same object the bucket
   *  cards receive, so the query key matches and the fetch is shared. */
  params: AccountMovementParams
  span?: Span
  title?: string
  why?: string
}

export function AccountMovementMixDonut({
  params,
  span = 2,
  title,
  why,
}: AccountMovementMixDonutProps) {
  const { data, isLoading, isError, error } = useAccountMovement(params)

  const resolvedTitle = title ?? S.mixTitle
  const resolvedWhy = why ?? S.whyMix

  if (isLoading || isError || !data) {
    return (
      <InsightWidget title={resolvedTitle} why={resolvedWhy} span={span}>
        {isError ? (
          // An out-of-scope `user_ids` is a 403 here — it must read as "no
          // access", not "failed to load".
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : (
          <InsightShimmer />
        )}
      </InsightWidget>
    )
  }

  const { summary } = data
  const total = MIX_ORDER.reduce((acc, m) => acc + countOf(summary, m.status), 0)
  const slices: DonutSlice[] = MIX_ORDER.map(({ status, accent }) => ({
    label: S.statusLabel[status],
    value: countOf(summary, status),
    accent,
    share: total > 0 ? (countOf(summary, status) / total) * 100 : 0,
  })).filter((slice) => slice.value > 0)

  if (slices.length === 0) {
    return (
      <InsightWidget title={resolvedTitle} why={resolvedWhy} span={span}>
        <InsightEmptyState label={S.emptyMix} />
      </InsightWidget>
    )
  }

  return (
    <InsightDonutList
      title={resolvedTitle}
      why={resolvedWhy}
      span={span}
      unit="count"
      data={slices}
      total={total}
    />
  )
}
