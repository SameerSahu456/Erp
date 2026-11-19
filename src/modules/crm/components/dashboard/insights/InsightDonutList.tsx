import { CHART_COLORS, type ChartAccent } from '@/components/common/display/chartTheme'
import { Typography } from '@/components/ui/typography'
import { formatINRShort } from '@/lib/currency'

import { InsightEmptyState } from './InsightEmptyState'
import { formatSharePct, shareBarWidthPct } from './insights.format'
import { INSIGHTS_STRINGS } from './insights.strings'
import { InsightWidget, type Span } from './InsightWidget'

// The TABLE form of the reference's `DonutChart` — dot + label + value + share,
// each with a proportional bar, and a Total footer. Used for Revenue by
// Condition while chart view is off.
//
// The dot/bar colour comes from `chartTheme`'s CHART_COLORS, which §8.5 names
// as the sanctioned chart-palette exception. This repo's chartTheme is
// byte-identical to the reference's, so the accents match exactly.

export interface DonutSlice {
  label: string
  value: number
  accent: ChartAccent
  /** Share of the WHOLE result set, as the server computed it. REQUIRED —
   *  deriving it here from the slices on screen makes the percentage change
   *  meaning whenever the page or page size changes. */
  share: number
}

interface InsightDonutListProps {
  title: string
  why?: string
  span?: Span
  data: DonutSlice[]
  unit?: 'currency' | 'count'
  onSliceClick?: (label: string) => void
  /** Card-click drill-through, forwarded to `InsightWidget`. */
  detailHref?: string
  /** Rendered below the Total row — the pagination footer for a paged list.
   *  Mirrors `InsightRankingTable`'s `footer`, so a donut and a table on the
   *  same board page identically. */
  footer?: React.ReactNode
  /** Total across the WHOLE result set, from the server (`totals.value_closed`).
   *  REQUIRED — summing the slices on screen reports the current page's total,
   *  so page 2 of 3 would claim a third of the real figure. */
  total: number
}

export function InsightDonutList({
  title,
  why,
  span = 3,
  data,
  unit = 'currency',
  onSliceClick,
  footer,
  total,
  detailHref,
}: InsightDonutListProps) {
  // NO arithmetic on the figures: `total` and every slice's `share` come from
  // the API. Sorting is presentation, not derivation — it reorders rows, it
  // does not compute a number.
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const fmt = (v: number) => (unit === 'currency' ? formatINRShort(v) : v.toLocaleString('en-IN'))

  // This card had NO empty branch at all: a zero-slice response rendered an
  // empty `<ul>` above a "Total ₹0" footer — a card that looks populated and
  // reports a real-looking zero, which is worse than saying it is empty. The
  // Total row goes with the slices, so the empty state REPLACES both.
  const isEmpty = sorted.length === 0

  if (isEmpty) {
    return (
      <InsightWidget title={title} why={why} span={span} detailHref={detailHref}>
        <InsightEmptyState />
      </InsightWidget>
    )
  }

  return (
    <InsightWidget
      title={title}
      why={why}
      span={span}
      detailHref={detailHref}
    >
      <ul className="space-y-2">
        {sorted.map((d) => {
          // Server-computed, measured against the full result set — so it
          // does not shift when the page or page size does.
          const pct = d.share
          const color = CHART_COLORS[d.accent].solid
          return (
            <li
              key={d.label}
              className={onSliceClick ? 'cursor-pointer space-y-1' : 'space-y-1'}
              // See the note in `InsightRankingTable`: without this the click
              // also reaches the card's `detailHref` and drops the filter.
              onClick={
                onSliceClick
                  ? (e) => {
                      e.stopPropagation()
                      onSliceClick(d.label)
                    }
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-2">
                {/* min-w-0 so a long label truncates rather than widening (§8.7). */}
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: color }}
                    aria-hidden
                  />
                  {/* Labels and values are CONTENT — dark (`tone="default"`).
                      `helper` alone defaults to muted, which faded the whole
                      list; only the share % stays secondary. */}
                  <Typography variant="helper" tone="default" className="truncate font-medium">
                    {d.label}
                  </Typography>
                </span>
                <span className="shrink-0 tabular-nums">
                  <Typography variant="helper" tone="default" asChild>
                    <span className="font-semibold">{fmt(d.value)}</span>
                  </Typography>
                  <Typography variant="helper" tone="muted" asChild>
                    <span className="ml-1.5">{formatSharePct(pct)}</span>
                  </Typography>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  // Literal share — see `shareBarWidthPct`. This was
                  // `Math.max(pct, 2)`, which floored every bar at 2% of the
                  // track, so a 0.01% slice drew the same block as a 0.38% one
                  // and the chart overstated both. The floor is now 2 PIXELS:
                  // enough that a non-zero share is never invisible, small
                  // enough that it never reads as a real quantity.
                  style={{
                    width: `${shareBarWidthPct(pct)}%`,
                    minWidth: pct > 0 ? '2px' : undefined,
                    background: color,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {/* `mt-auto` on the TOTAL row — the Total and the pager under it are ONE
          bottom block, so pinning only the pager would strand this line against
          the list. `mt-2.5` stays the minimum gap in content-height cards. */}
      <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-2">
        <Typography variant="helper" tone="label" className="font-semibold">
          {INSIGHTS_STRINGS.breakdowns.total}
        </Typography>
        <Typography variant="helper" tone="default" asChild>
          <span className="font-semibold tabular-nums">{fmt(total)}</span>
        </Typography>
      </div>
      {footer}
    </InsightWidget>
  )
}
