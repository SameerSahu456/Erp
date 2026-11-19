import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { GrowthDirection, GrowthParams } from "../../../../api/dashboard"
import { useGrowth } from "../../../../hooks/dashboard/useGrowth"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { Span } from "../InsightWidget"
import { InsightWidget } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.growth

// Growth — `GET /crm/dashboard/growth`.
//
// A SCALAR stat card: this period's revenue against the previous full one.
//
//         ▲ +12.4%        ← the server's verdict, toned
//        Jun → Jul        ← both labels pre-formatted server-side
//           ₹4.2L         ← current revenue
//      +₹460K vs Jun      ← the absolute change
//
// ONE component, TWO callers — the same split as `SalesFunnelCard`:
//   * the dashboard tile passes `detailHref` → the whole card drills into
//     `/crm/insights/growth`;
//   * that page's `growth-hero` cell passes none (it IS the page it would
//     drill to).
//
// No pager: the endpoint is scalar, so there are no rows to slice.
//
// THE RULE THIS CARD EXISTS TO GET RIGHT: `direction` is the server's, and both
// the glyph and the tone are keyed off it — never off the sign of `delta_pct`.
// `flat` is a BAND (|delta_pct| < 0.05), so a 0 → 0 period carries
// `delta_pct: 0` with `direction: "flat"`; keying the arrow off `pct >= 0`
// would render "▲ +0.0%", an up-arrow claiming growth that did not happen.
// That is the bug already fixed once in `PeriodicBreakdown`, which is why the
// formatter here is literally the same function (`INSIGHTS_STRINGS.growth.delta`
// and `periodBreakdown.change` both point at `directionalPct`).

/** Tone follows `direction`, so colour can never disagree with the glyph.
 *  Flat keeps the default foreground — a non-event should not be coloured like
 *  a result. Token pair is the sanctioned one from `RATE_TEXT_CLASS` (§8.5 —
 *  no raw hex). */
const DIRECTION_TEXT_CLASS: Record<GrowthDirection, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  flat: "text-foreground",
}

/** Period → the title's unit key. The card must not say "This Month" while it
 *  is comparing quarters. */
const PERIOD_UNIT: Record<GrowthParams["period"], keyof typeof S.title> = {
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
}

export function GrowthTile({
  params,
  span = 3,
  title,
  why,
  detailHref,
  /** True when the board's period was `custom` and `toGrowthParams` had to
   *  substitute `monthly`. Surfaced as a muted note: the endpoint accepts no
   *  custom range, and a silently swapped window would leave the card
   *  answering a different question than the toolbar claims. */
  periodCoerced = false,
}: {
  params: GrowthParams
  span?: Span
  title?: string
  why?: string
  detailHref?: string
  periodCoerced?: boolean
}) {
  const { data, isLoading, isError, error } = useGrowth(params)

  const heading = title ?? S.title[PERIOD_UNIT[params.period]]

  return (
    <InsightWidget span={span} title={heading} why={why ?? S.why} detailHref={detailHref}>
      {isError ? (
        // 403 → "no access", not "failed to load" — an out-of-scope `user_ids`
        // is a permission answer, not a broken request.
        <LoadErrorState error={error} fallback={S.loadError} compact />
      ) : isLoading || !data ? (
        // Centred like every other widget's loading line.
        <InsightShimmer />
      ) : (
        <GrowthStat data={data} periodCoerced={periodCoerced} />
      )}
    </InsightWidget>
  )
}

function GrowthStat({
  data,
  periodCoerced,
}: {
  data: NonNullable<ReturnType<typeof useGrowth>["data"]>
  periodCoerced: boolean
}) {
  const { current, previous, delta, delta_pct, direction } = data

  // The previous window earned nothing. The backend encodes that as
  // `delta_pct: +100`, which read on its own says "we doubled" when the truth
  // is "we started from nothing" — so the absolute-change line is replaced by
  // copy that says which of the two it is. The headline percentage is left
  // exactly as the server computed it.
  const fromZero = previous.revenue === 0 && current.revenue > 0

  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-1 py-3 text-center">
      {/* ONE arrow, not two. `S.delta` already emits the ▲ / ▼ glyph (and
          nothing at all when the server says flat), so an icon beside it
          rendered "↗ ▲ +12.4%". The glyph stays and the icon is gone: the
          formatter is the single source of the direction marker, shared with
          the breakdown table, and a second marker could only ever agree with
          it by luck. */}
      {/* `kpi-value` (24px/650), the dashboard's hero figure — not
          `page-title`, which rendered a second <h1> on the page. */}
      <Typography
        variant="kpi-value"
        tone="inherit"
        className={`min-w-0 break-all ${DIRECTION_TEXT_CLASS[direction]}`}
      >
        {S.delta(delta_pct, direction)}
      </Typography>

      <Typography variant="helper" tone="muted" className="min-w-0">
        {S.window(previous.label, current.label)}
      </Typography>

      <Typography variant="table-cell" numeric className="min-w-0 font-semibold">
        {formatINRShort(current.revenue)}
      </Typography>

      <Typography variant="helper" className="min-w-0">
        {fromZero
          ? S.fromZero
          : S.deltaVs(
              // Sign comes from `direction` too, so it cannot contradict the
              // glyph above it; `formatINRShort` renders the magnitude.
              `${direction === "up" ? "+" : direction === "down" ? "-" : ""}${formatINRShort(Math.abs(delta))}`,
              previous.label,
            )}
      </Typography>

      <Typography variant="helper" className="min-w-0">
        {S.orders(current.count)}
      </Typography>

      {periodCoerced && (
        <Typography variant="helper" className="min-w-0 italic">
          {S.customNote}
        </Typography>
      )}
    </div>
  )
}
