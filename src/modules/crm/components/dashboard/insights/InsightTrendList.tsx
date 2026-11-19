import { type ChartAccent } from '@/components/common/display/chartTheme'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/ui/typography'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { formatINRShort } from '@/lib/currency'

import { InsightEmptyState } from './InsightEmptyState'
import { InsightShimmer } from './InsightShimmer'
import { INSIGHTS_STRINGS } from './insights.strings'
import { InsightWidget, type Span } from './InsightWidget'

// The TABLE form of the reference's `TrendChart` — a single-series trend read
// as a compact list: an accent dot, the period label, and the value.
//
// That is ALL the reference renders here. There is deliberately NO share /
// progress bar: an earlier version of this file invented one, which is not in
// the reference and made every trend cell look like a ranked breakdown.
//
// The chart branch (Recharts line/bar) is not ported while chart view is
// disabled. Used by every trend cell: Revenue Trend, Leads, Deals Closed,
// SO Closed Value, and the Revenue by Month hero + dashboard widget.
//
// The accent dot renders in the theme foreground (`bg-foreground`) so it
// re-skins with the theme instead of using a fixed chart-palette hue. The
// `accent` prop is retained for API compatibility (callers still pass it) but
// no longer drives the dot colour.

export interface TrendPoint {
  label: string
  value: number
}

interface InsightTrendListProps {
  title: string
  why?: string
  points: TrendPoint[]
  span?: Span
  /** Format values as INR rather than a plain count. */
  currency?: boolean
  accent?: ChartAccent
  actions?: React.ReactNode
  detailHref?: string
  /** Copy shown when the period has no records. */
  emptyLabel?: string
  /** Rendered below the list — the pagination footer for a paged series. */
  footer?: React.ReactNode
  /** Top gap over the footer. The dashboard hero passes `pt-4` as deliberate
   *  height-tuning (Revenue by Month's full list + this gap = Sales Team's
   *  card height); everywhere else keeps the compact default. */
  footerGap?: string
  // ── Live-query states. Mock-fed cells omit all three. ──────────────────
  isLoading?: boolean
  isError?: boolean
  error?: unknown
  loadingLabel?: string
  /** Non-403 fallback copy for the error slot. */
  loadErrorLabel?: string
}

export function InsightTrendList({
  title,
  why,
  points,
  span = 3,
  currency = false,
  actions,
  detailHref,
  emptyLabel = INSIGHTS_STRINGS.revenueByMonth.empty,
  footer,
  footerGap = 'pt-1.5',
  isLoading = false,
  isError = false,
  error,
  loadErrorLabel = INSIGHTS_STRINGS.widget.loadError,
}: InsightTrendListProps) {
  const fmt = (v: number) => (currency ? formatINRShort(v) : v.toLocaleString('en-IN'))

  const body = () => {
    if (isLoading) return <InsightShimmer />
    // A 403 must read as "you don't have permission", not "failed to load".
    if (isError) return <LoadErrorState error={error} fallback={loadErrorLabel} compact />
    if (points.length === 0) return <InsightEmptyState label={emptyLabel} />
    return (
      <ul className="divide-y divide-border/20 overflow-x-hidden">
        {points.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-2 py-0.5">
            {/* min-w-0 lets the label truncate rather than widen the row (§8.7). */}
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="size-1.5 shrink-0 rounded-full bg-foreground"
                aria-hidden
              />
              {/* 12px rows, label 500 / value 600, both dark — the same row
                  treatment as the donut list beside it. */}
              <Typography variant="helper" tone="default" className="truncate font-medium">
                {p.label}
              </Typography>
            </span>
            <Typography variant="helper" tone="default" numeric className="shrink-0 font-semibold">
              {fmt(p.value)}
            </Typography>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <InsightWidget
      title={title}
      why={why}
      span={span}
      actions={actions}
      detailHref={detailHref}
    >
      {/* NO window/date-range line above the list — removed per product call.
          It repeated the toolbar's period on every trend card. */}
      {body()}
      {/* `mt-auto` pins the footer ("Show all N →" / pagination) to the card
          floor. The gap above it comes from `footerGap` — see the prop doc. */}
      {footer && <div className={cn('mt-auto', footerGap)}>{footer}</div>}
    </InsightWidget>
  )
}
