import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { TablePagination } from '@/components/common/tables/TablePagination'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import { formatINRShort } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'

import type {
  CategoryPeriodColumn as Column,
  CategoryPeriodComparisonParams,
  CategoryPeriodComparisonResponse as Response,
  CategoryPeriodRow as Row,
} from '../../../../api/dashboard'
import type { FacetValue } from '../../../../data/insights/records'
import { useCategoryPeriodComparison } from '../../../../hooks/dashboard/useCategoryPeriodComparison'
import type { InsightPaging } from '../../../../hooks/dashboard/useInsightPaging'
import { PivotMiniScrollbar } from '../../../shared/PivotMiniScrollbar'
import { usePivotScroll } from '../../../shared/pivot-scroll'
import { InsightEmptyState } from '../InsightEmptyState'
import { INSIGHT_PAGER_CLASS, InsightWidget, type Span } from '../InsightWidget'
import { CATEGORY_COMPARISON_STRINGS as S } from './category-period-comparison.strings'
import { ShimmerBar } from "../InsightShimmer"

// "Category — Period Comparison" on the /crm board.
//
// Data: `GET /crm/dashboard/insights/category-period-comparison`
// (`useCategoryPeriodComparison`) — columns follow the board period, newest
// first.
//
// No KPI tiles: the won / total strip above the table was removed (product
// request) — the Sales Team card already carries those figures, and "SO 1/3"
// beside a row reading "SO 1" looked like a mismatch.
//
// Styled like the rest of the board, not the erp-demo it came from:
//   - table = the Category × Brand pivot rhythm (table-header heads,
//     table-name / table-cell / table-figure cells, `cpt-pivot-row` hover);
//   - change = green / red arrow text, as on the Growing / Declining cards.

type Metric = 'leads' | 'deals' | 'so' | 'revenue'
type MetricChoice = Metric | 'all'

const METRICS: { key: Metric; fmt: (v: number) => string }[] = [
  { key: 'leads', fmt: (v) => v.toLocaleString('en-IN') },
  { key: 'deals', fmt: (v) => v.toLocaleString('en-IN') },
  { key: 'so', fmt: (v) => v.toLocaleString('en-IN') },
  { key: 'revenue', fmt: (v) => formatINRShort(v) },
]
const METRIC_OPTIONS: MetricChoice[] = ['all', 'leads', 'deals', 'so', 'revenue']

const NOUN: Record<Response['bucket_unit'], string> = {
  week: S.nouns.weekly,
  month: S.nouns.monthly,
  quarter: S.nouns.quarterly,
  year: S.nouns.yearly,
}

// Pivot rhythm (CategoryOemPivotTable): one cell recipe for every td/th.
const CELL = 'whitespace-nowrap px-2.5 py-2 first:pl-0 last:pr-0'
const NUM = 'text-right tabular-nums'
/** Separator between period groups + the current period's quiet tint. */
const GROUP_EDGE = 'border-l border-border'
const CURRENT = 'bg-muted/40'
/** # and Category stay put while the periods pan under them — the Category ×
 *  Brand pivot's frozen column. `bg-inherit` takes the row's OPAQUE fill
 *  (`bg-card` / `cpt-pivot-row`) so scrolled figures pass behind the names. */
const FROZEN_RANK = 'cpt-pivot-frozen sticky left-0 z-10 w-10 min-w-10 bg-inherit'
const FROZEN_NAME = 'cpt-pivot-frozen sticky left-10 z-10 bg-inherit'
/** Opaque fill for the header rows the frozen cells run through. */
const ROW = 'bg-card'

const pctChange = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null)

/** Change vs the previous period — green / red arrow text (Growing / Declining
 *  cards). Nothing when there is no previous base. */
function Delta({ cur, prev }: { cur: number; prev: number | undefined }) {
  const d = prev == null ? null : pctChange(cur, prev)
  if (d == null) return null
  const flat = Math.abs(d) < 0.5
  const up = d >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <Typography
      variant="caption"
      tone={flat ? 'muted' : up ? 'success' : 'danger'}
      numeric
      className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap"
    >
      {!flat && <Icon className="size-3" aria-hidden />}
      {`${flat ? 0 : Math.abs(d).toFixed(0)}%`}
    </Typography>
  )
}

// Trend column hidden for now — restore with it.
// /** 4-point line, oldest → latest, toned by overall direction. */
// function Sparkline({ values }: { values: number[] }) {
//   const w = 64
//   const h = 20
//   const pad = 3
//   if (values.length < 2) return null
//   const max = Math.max(...values)
//   const min = Math.min(...values)
//   const span = max - min || 1
//   const pts = values.map((v, i) => ({
//     x: pad + (i / (values.length - 1)) * (w - pad * 2),
//     y: h - pad - ((v - min) / span) * (h - pad * 2),
//   }))
//   const first = values[0] ?? 0
//   const last = values[values.length - 1] ?? 0
//   const tone = last > first * 1.005 ? 'text-success' : last < first * 0.995 ? 'text-destructive' : 'text-muted-foreground'
//   const end = pts[pts.length - 1]
//   return (
//     <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={cn('shrink-0', tone)} aria-hidden>
//       <polyline
//         points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
//         fill="none"
//         stroke="currentColor"
//         strokeWidth={1.5}
//         strokeLinejoin="round"
//         strokeLinecap="round"
//       />
//       <circle cx={end.x} cy={end.y} r={2} fill="currentColor" />
//     </svg>
//   )
// }

// ── table ──────────────────────────────────────────────────────────────

function Head({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Typography variant="table-header" className={cn('block truncate', className)}>
      {children}
    </Typography>
  )
}

function PeriodHead({ col, current }: { col: Column; current: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Typography variant="table-header" tone="default">
        {col.label}
      </Typography>
      {current && col.partial && (
        <Badge variant="grey" className="h-auto px-1.5 py-px">
          {S.columns.toDate}
        </Badge>
      )}
    </span>
  )
}

function ComparisonTable({
  data,
  focus,
  onRowClick,
  rankOffset,
}: {
  data: Response
  focus: (typeof METRICS)[number] | null
  onRowClick?: (category: FacetValue) => void
  /** Ranks continue across pages (page 2 starts at 11). */
  rankOffset: number
}) {
  const { columns: cols, rows } = data
  const maxFocus = focus ? Math.max(1, ...rows.flatMap((r) => cols.map((c) => r.cells[c.key]?.[focus.key] ?? 0))) : 1
  // Trend column hidden for now — restore with it.
  // const trendKey: Metric = focus ? focus.key : 'revenue'
  // const chrono = (cells: Record<string, Cell | undefined>) => [...cols].reverse().map((c) => cells[c.key]?.[trendKey] ?? 0)
  const tint = (i: number) => (i === 0 ? CURRENT : '')
  // The Category × Brand pivot's scroll: native bar hidden, frozen # +
  // Category, right-edge fade, divider once columns slide under, slim thumb.
  const { ref: scrollRef, edges, thumb, measure } = usePivotScroll<HTMLDivElement>()

  return (
    <div className="min-w-0 space-y-2">
      <div className="cpt-pivot-scroll min-w-0">
        <div
          ref={scrollRef}
          onScroll={measure}
          className="cpt-pivot-snap no-scrollbar min-w-0 overflow-x-auto"
          style={{ scrollPaddingLeft: thumb.inset }}
        >
      <table
        className={cn('cpt-pivot w-full border-collapse', focus ? 'min-w-[720px]' : 'min-w-[960px]')}
        data-scrolled={edges.left}
      >
        <thead>
          {focus ? (
            <tr className={cn(ROW, 'border-b border-border')}>
              <th className={cn(CELL, FROZEN_RANK, 'z-20 text-left font-normal')}>
                <Head>{S.columns.rank}</Head>
              </th>
              <th className={cn(CELL, FROZEN_NAME, 'z-20 text-left font-normal')}>
                <Head>{S.columns.category}</Head>
              </th>
              {cols.map((c, i) => (
                <th key={c.key} className={cn(CELL, GROUP_EDGE, tint(i), 'text-left font-normal')}>
                  <PeriodHead col={c} current={i === 0} />
                </th>
              ))}
              {/* Trend column hidden for now (product request) — uncomment to restore.
              <th className={cn(CELL, GROUP_EDGE, 'text-left font-normal')}>
                <Head>{S.columns.trend}</Head>
              </th>
              */}
            </tr>
          ) : (
            <>
              <tr className={ROW}>
                <th rowSpan={2} className={cn(CELL, FROZEN_RANK, 'z-20 text-left align-bottom font-normal')}>
                  <Head>{S.columns.rank}</Head>
                </th>
                <th rowSpan={2} className={cn(CELL, FROZEN_NAME, 'z-20 text-left align-bottom font-normal')}>
                  <Head>{S.columns.category}</Head>
                </th>
                {cols.map((c, i) => (
                  <th key={c.key} colSpan={METRICS.length} className={cn(CELL, GROUP_EDGE, tint(i), 'text-center font-normal')}>
                    <PeriodHead col={c} current={i === 0} />
                  </th>
                ))}
                {/* Trend column hidden for now (product request) — uncomment to restore.
                <th rowSpan={2} className={cn(CELL, GROUP_EDGE, 'text-left align-bottom font-normal')}>
                  <Head>{S.columns.trend}</Head>
                </th>
                */}
              </tr>
              <tr className={cn(ROW, 'border-b border-border')}>
                {cols.map((c, i) =>
                  METRICS.map((m, mi) => (
                    // `first:pl-2.5` — # and Category span both header rows, so
                    // this row's FIRST cell is the current period's LEADS, and
                    // CELL's `first:pl-0` would butt it against the divider.
                    <th
                      key={`${c.key}-${m.key}`}
                      className={cn(CELL, NUM, mi === 0 && GROUP_EDGE, tint(i), 'font-normal first:pl-2.5')}
                    >
                      <Head>{S.metrics[m.key]}</Head>
                    </th>
                  )),
                )}
              </tr>
            </>
          )}
        </thead>
        <tbody>
          {rows.map((r: Row, i) => {
            const clickable = Boolean(onRowClick && r.category_id)
            return (
              <tr
                key={r.category_id ?? r.category_name}
                // stopPropagation is load-bearing: a <tr> is not in the host
                // card's click ignore-list, so without it the click bubbles to
                // `InsightWidget` and its own unfiltered `detailHref` navigation
                // immediately overwrites the filtered one from this row.
                onClick={
                  clickable
                    ? (e) => {
                        e.stopPropagation()
                        onRowClick!({ id: r.category_id!, label: r.category_name })
                      }
                    : undefined
                }
                // `last:border-b-0`: `TablePagination` below draws its own
                // `border-t`; with the last row's hairline that read as a
                // double rule around the mini scrollbar.
                className={cn(
                  'cpt-pivot-row border-b border-border/50 last:border-b-0',
                  clickable && 'cursor-pointer',
                )}
              >
                <td className={cn(CELL, FROZEN_RANK)}>
                  <Typography variant="table-cell" tone="muted" numeric>
                    {rankOffset + i + 1}
                  </Typography>
                </td>
                <td className={cn(CELL, FROZEN_NAME, 'max-w-[13rem]')}>
                  <Typography variant="table-name" className="block truncate" title={r.category_name}>
                    {r.category_name}
                  </Typography>
                </td>
                {focus
                  ? cols.map((c, ci) => {
                      const v = r.cells[c.key]?.[focus.key] ?? 0
                      const older = cols[ci + 1] ? r.cells[cols[ci + 1].key]?.[focus.key] : undefined
                      return (
                        <td key={c.key} className={cn(CELL, GROUP_EDGE, tint(ci))}>
                          <div className="flex items-center justify-between gap-2">
                            <Typography variant={ci === 0 ? 'table-figure' : 'table-cell'} numeric>
                              {focus.fmt(v)}
                            </Typography>
                            <Delta cur={v} prev={older} />
                          </div>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn('h-full rounded-full', ci === 0 ? 'bg-primary' : 'bg-primary/30')}
                              style={{ width: `${Math.max(2, (v / maxFocus) * 100)}%` }}
                            />
                          </div>
                        </td>
                      )
                    })
                  : cols.map((c, ci) => {
                      const cell = r.cells[c.key]
                      const prevCell = cols[ci + 1] ? r.cells[cols[ci + 1].key] : undefined
                      return METRICS.map((m, mi) => (
                        <td key={`${c.key}-${m.key}`} className={cn(CELL, NUM, mi === 0 && GROUP_EDGE, tint(ci), 'align-top')}>
                          <Typography variant={m.key === 'revenue' ? 'table-figure' : 'table-cell'} numeric>
                            {cell ? m.fmt(cell[m.key]) : S.noValue}
                          </Typography>
                          {ci === 0 && m.key === 'revenue' && cell && (
                            <div className="flex justify-end">
                              <Delta cur={cell.revenue} prev={prevCell?.revenue} />
                            </div>
                          )}
                        </td>
                      ))
                    })}
                {/* Trend column hidden for now (product request) — uncomment to restore.
                <td className={cn(CELL, GROUP_EDGE)}>
                  <Sparkline values={chrono(r.cells)} />
                </td>
                */}
              </tr>
            )
          })}
        </tbody>
      </table>
        </div>
        <span className="cpt-pivot-fade cpt-pivot-fade-right" data-on={edges.right} />
        <span className="cpt-pivot-divider" data-on={edges.left} style={{ left: thumb.inset - 1 }} />
      </div>
      {thumb.size < 1 ? <PivotMiniScrollbar scrollRef={scrollRef} thumb={thumb} /> : null}
    </div>
  )
}

// ── metric switch (the board's pager look: navy fill when active) ─────────

function MetricTabs({ value, onChange }: { value: MetricChoice; onChange: (v: MetricChoice) => void }) {
  return (
    <div role="tablist" aria-label={S.metricLabel} className="inline-flex gap-1">
      {METRIC_OPTIONS.map((key) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={cn(
              'h-8 rounded-md border px-3 transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <Typography variant="helper" tone="inherit" className="font-medium">
              {S.metrics[key]}
            </Typography>
          </button>
        )
      })}
    </div>
  )
}

// ── widget ─────────────────────────────────────────────────────────────────

export function CategoryPeriodComparisonTile({
  span = 6,
  params,
  paging,
  onRowClick,
  detailHref,
}: {
  span?: Span
  params: CategoryPeriodComparisonParams
  /** Category rows page through the API (§16.7) — page index lives in the URL. */
  paging: InsightPaging
  /** Narrow the board to the clicked category. */
  onRowClick?: (category: FacetValue) => void
  detailHref?: string
}) {
  const [metric, setMetric] = useState<MetricChoice>('all')
  const { data, isLoading, isFetching, isError, error } = useCategoryPeriodComparison({
    ...params,
    page: paging.page,
    page_size: paging.pageSize,
  })
  const noun = NOUN[data?.bucket_unit ?? 'month']
  const focus = useMemo(() => (metric === 'all' ? null : (METRICS.find((m) => m.key === metric) ?? null)), [metric])
  // Only categories with closed revenue get a row, so `rows` can be empty.
  const hasRows = Boolean(data?.rows.length)

  return (
    <InsightWidget span={span} title={S.title} why={S.why(noun)} detailHref={detailHref}>
      {isError ? (
        <LoadErrorState error={error} fallback={S.loadError} compact />
      ) : isLoading || !data ? (
        <ShimmerBar className="h-48 w-full rounded-md" />
      ) : (
        <>
          {hasRows ? (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <MetricTabs value={metric} onChange={setMetric} />
              </div>

              <ComparisonTable
                data={data}
                focus={focus}
                onRowClick={onRowClick}
                rankOffset={(paging.page - 1) * paging.pageSize}
              />
            </>
          ) : (
            // Headers over zero rows read as a broken table — the board's
            // shared "No records found." instead.
            <InsightEmptyState />
          )}

          {data.pagination.total > 0 && (
            <TablePagination
              className={cn(INSIGHT_PAGER_CLASS, 'mt-0')}
              scrollCardIntoView
              page={paging.page}
              pageSize={paging.pageSize}
              totalPages={data.pagination.page_count}
              total={data.pagination.total}
              isFetching={isFetching}
              onPageChange={paging.setPage}
              onPageSizeChange={paging.setPageSize}
            />
          )}
        </>
      )}
    </InsightWidget>
  )
}
