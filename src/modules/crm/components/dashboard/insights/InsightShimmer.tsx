// `InsightShimmer` — the ONE loading placeholder for insight widgets.
//
// Every card used to invent its own: a centred "Loading…" line, a pulsing
// block, or an em-dash with "Loading…" underneath. They all collapsed to a
// different height than the populated card, so the layout jumped on arrival.
// This renders placeholder shapes at roughly the populated size instead.
//
// It fills a card BODY — the surrounding card (title, "why", actions) is still
// the widget's own `InsightWidget`, so only the content shimmers.
//
// Variants:
//   rows  — ranked rows / trend list / period breakdown (the default)
//   mix   — two summary chips over a table block (Category & Brand mix)
//   kpi   — a strip of KPI cards (`cpt-kpi` shell, same as `DataCard`)

import { cn } from '@/lib/utils'

import { INSIGHTS_STRINGS } from './insights.strings'

type InsightShimmerVariant = 'rows' | 'mix' | 'kpi'

interface InsightShimmerProps {
  variant?: InsightShimmerVariant
  /** `rows`: placeholder rows. `kpi`: placeholder cards. Ignored by `mix`. */
  count?: number
  className?: string
}

const ROWS_DEFAULT = 5
const KPI_DEFAULT = 5

// Row widths cycle so the block reads as text, not a barcode.
const NAME_WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2', 'w-[45%]', 'w-[55%]']

export function ShimmerBar({ className }: { className?: string }) {
  return <div className={cn('insight-shimmer rounded-md', className)} />
}

function Rows({ count }: { count: number }) {
  return (
    <div className="space-y-2.5 py-1">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <ShimmerBar className={cn('h-3.5', NAME_WIDTHS[i % NAME_WIDTHS.length])} />
          <ShimmerBar className="h-3.5 w-14 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function Mix() {
  return (
    <div className="space-y-3">
      {/* Mirrors the two Top Category / Top Brand chips. */}
      <div className="grid grid-cols-2 gap-2">
        <ShimmerBar className="h-[70px] rounded-xl" />
        <ShimmerBar className="h-[70px] rounded-xl" />
      </div>
      <ShimmerBar className="h-48" />
    </div>
  )
}

function Kpi({ count }: { count: number }) {
  // `cpt-kpi-grid` / `cpt-kpi` are the same shells `StatsRow` / `DataCard`
  // render, so the placeholder cards size and space exactly like the real ones.
  // `mb-0!` for the same unlayered-CSS reason noted in `AccountKpiStrip`.
  return (
    <div className="cpt-kpi-grid mb-0!">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="cpt-kpi space-y-2">
          <ShimmerBar className="h-3 w-20" />
          <ShimmerBar className="h-7 w-28" />
          <ShimmerBar className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

export function InsightShimmer({ variant = 'rows', count, className }: InsightShimmerProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={className}
    >
      <span className="sr-only">{INSIGHTS_STRINGS.widget.loading}</span>
      {variant === 'mix' ? (
        <Mix />
      ) : variant === 'kpi' ? (
        <Kpi count={count ?? KPI_DEFAULT} />
      ) : (
        <Rows count={count ?? ROWS_DEFAULT} />
      )}
    </div>
  )
}
