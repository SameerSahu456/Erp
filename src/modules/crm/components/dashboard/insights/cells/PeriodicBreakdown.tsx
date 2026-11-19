import { TablePagination } from '@/components/common/tables/TablePagination'
import { Typography } from '@/components/ui/typography'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { PAGINATION } from '@/shared/constants'
import { formatINRShort } from '@/lib/currency'

import type { BucketUnit, PeriodBreakdownParams } from '../../../../api/dashboard'
import { monthFacet } from '../../../../data/insights/month-facet'
import type { FacetValue } from '../../../../data/insights/records'
import type { InsightPaging } from '../../../../hooks/dashboard/useInsightPaging'
import { usePeriodBreakdown } from '../../../../hooks/dashboard/usePeriodBreakdown'
// Share column hidden (product request) — commented out, not deleted.
// import { formatSharePct } from '../insights.format'
import { INSIGHTS_STRINGS } from '../insights.strings'
import { InsightRankingTable } from '../InsightRankingTable'
import { INSIGHT_PAGER_CLASS, type Span } from '../InsightWidget'
import { InsightShimmer } from "../InsightShimmer"

// Period-wise breakdown — live on
// `GET /crm/dashboard/insights/period-wise-breakdown`.
//
// One row per time bucket in the window: revenue, orders, change vs the
// previous bucket, and share of the window total. Replaces the seeded
// `MonthlyBreakdown`, which derived the same table from demo records.
//
// Period-ADAPTIVE, and driven by the RESPONSE: the server picks the bucket unit
// from `period` (monthly/custom → month, quarterly → quarter, yearly → year,
// weekly → month-relative W1..W5) and echoes it as `bucket_unit`. Titles and
// headers key off that, never off the toolbar — reading the request instead
// would let the header say "Quarterly" while the rows on screen are still the
// previous fetch's months.

const S = INSIGHTS_STRINGS.periodBreakdown

// While the first response is in flight there is no `bucket_unit` yet. Month is
// the toolbar default and the most common case, so the card renders "Monthly
// Breakdown" rather than an empty header that pops into place.
const FALLBACK_UNIT: BucketUnit = 'month'

/** Which columns the table carries. One endpoint, one component, two reads:
 *
 *  • `full`   — Revenue / Orders / Change% / Share. The Monthly Revenue page's
 *               bucket table, unchanged.
 *  • `ledger` — `full` PLUS the change in RUPEES, titled "Growth Ledger". The
 *               percentage alone hides that +200% on a ₹5k bucket is ₹10k, so
 *               the money column sits beside it.
 *
 *  A variant rather than two components: the fetch, the bucket-unit adaptation,
 *  the row-click facet, the empty/error states and the pager are identical in
 *  both — only the `columns` array differs.
 *
 *  The Growth page's third read of this endpoint — bucket + percentage, no
 *  headers — is NOT a variant here: it renders as a trend list, not a table.
 *  See `GrowthDeltaList`. */
export type PeriodBreakdownVariant = 'full' | 'ledger'

interface PeriodicBreakdownProps {
  /** Period / range / facet slice. Never carries `page` / `page_size` — the
   *  endpoint has neither (see `toPeriodBreakdownParams`). */
  params: PeriodBreakdownParams
  variant?: PeriodBreakdownVariant
  /** Heading override. Defaults to the period-keyed breakdown title (or the
   *  fixed "Growth Ledger" for the `ledger` variant). */
  title?: string
  /** Sub-copy override. Defaults to the variant's own `why`. */
  why?: string
  span?: Span
  /** URL-backed page + page size. Pages over rows already in hand — see the
   *  footer note. Omitted → all rows, no pager. */
  paging?: InsightPaging
  /** Row click for MONTH buckets only: `bucket_key` is the `YYYY-MM` wire token
   *  the `months` facet wants, so a click composes into the board's filters
   *  exactly like a breakdown row does. Quarter / week / year buckets have no
   *  facet to drill into, so the rows are inert there rather than clickable and
   *  silently doing nothing. */
  onRefineMonth?: (month: FacetValue) => void
}

export function PeriodicBreakdown({
  params,
  variant = 'full',
  title,
  why,
  span = 6,
  paging,
  onRefineMonth,
}: PeriodicBreakdownProps) {
  const { data, isLoading, isError, error } = usePeriodBreakdown(params)

  const unit = data?.bucket_unit ?? FALLBACK_UNIT
  const allRows = data?.rows ?? []
  const total = allRows.length

  const page = paging?.page ?? 1
  const pageSize = paging?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  // Slice rows already in hand — the response IS the whole set (the endpoint
  // has no `page` / `page_size`). An out-of-range `?period-breakdownPage=` in
  // the URL yields an empty slice and the table's own empty state, exactly as a
  // server-paged cell would return an empty page.
  const rows = paging ? allRows.slice((page - 1) * pageSize, page * pageSize) : allRows

  const canRefine = unit === 'month' && !!onRefineMonth

  // Column order per variant. Both headers are period-keyed off the RESPONSE's
  // bucket unit, so a quarterly board reads "QoQ" rather than a stale "MoM".
  const changeCol = { key: 'change', label: S.changeHeader[unit], align: 'right' } as const
  const revenueCol = { key: 'revenue', label: S.columnRevenue, align: 'right', emphasis: true } as const
  const ordersCol = { key: 'orders', label: S.columnOrders, align: 'right' } as const
  // const shareCol = { key: 'share', label: S.columnShare, align: 'right', bar: true } as const
  const deltaCol = { key: 'delta', label: S.columnDelta, align: 'right' } as const
  // The ledger's percent column sits beside a rupee change, so it says which
  // unit it carries — see `changePctHeader`.
  const changePctCol = { key: 'change', label: S.changePctHeader[unit], align: 'right' } as const

  // The ledger is Month / Revenue / Δ Value / MoM % — no Orders, no Share. It
  // answers "how did revenue MOVE"; a count and a share of total are a different
  // question and stay on the Monthly Breakdown (`full`). The Share column is
  // currently commented out there too (product request).
  const columns =
    variant === 'ledger'
      ? [revenueCol, deltaCol, changePctCol]
      : [revenueCol, ordersCol, changeCol /* , shareCol */]

  return (
    <InsightRankingTable
      title={title ?? (variant === 'ledger' ? S.ledgerTitle : S.title[unit])}
      why={why ?? (variant === 'ledger' ? S.ledgerWhy : S.why)}
      span={span}
      nameLabel={S.nameHeader[unit]}
      // A contiguous time series is a SET in calendar order, not an ordering by
      // merit — numbering it "#1, #2" would invent a ranking that isn't there
      // and read as "January beat February". Same call as the Sales Funnel's
      // two-population table.
      showRank={false}
      columns={columns}
      state={
        isLoading ? (
          <InsightShimmer />
        ) : isError ? (
          // Out-of-scope `user_ids` is a 403 here, not an empty result — it must
          // read as "you don't have permission", not "failed to load".
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : undefined
      }
      rows={rows.map((r) => ({
        name: r.bucket_label,
        cells: {
          // Money is a NUMBER on this endpoint (`DecimalAsFloat`), unlike the
          // Sales Team rows where it is a decimal string.
          revenue: { text: formatINRShort(r.revenue) },
          orders: { text: String(r.count) },
          // `direction` is the server's verdict, flat band included, and it
          // drives BOTH the glyph and the tone — `S.change` takes it rather than
          // re-deriving an arrow from `delta_pct >= 0`, which disagreed with it
          // on every flat bucket (0 → 0 is `delta_pct: 0` + `direction: "flat"`,
          // and used to render the growth arrow "▲ +0.0%"). Row 0 has no
          // previous bucket at all — `direction: "none"` — and stays "—".
          change: {
            text:
              r.direction === 'none'
                ? S.changeNone
                : S.change(r.delta_pct, r.direction),
            tone:
              r.direction === 'up' ? 'good' : r.direction === 'down' ? 'bad' : undefined,
          },
          // The same move in RUPEES, rendered only by the `ledger` variant.
          // Formatted from the MAGNITUDE with the sign prepended off
          // `direction` — `formatINRShort(-45000)` yields "₹-45,000", with the
          // minus stranded inside the amount.
          delta: {
            text:
              r.direction === 'none'
                ? S.changeNone
                : S.delta(formatINRShort(Math.abs(r.delta)), r.direction),
            tone:
              r.direction === 'up' ? 'good' : r.direction === 'down' ? 'bad' : undefined,
          },
          // share: { text: formatSharePct(r.share_pct), pct: r.share_pct },
        },
      }))}
      onRowClick={
        canRefine
          ? (name) => {
              // The table hands back the row NAME, so resolve it to the row for
              // its `bucket_key`. Labels are unique within a window — a
              // year-to-date range never repeats a month.
              const row = allRows.find((r) => r.bucket_label === name)
              if (row) onRefineMonth(monthFacet(row.bucket_key))
            }
          : undefined
      }
      footer={
        // Pager only — the window-totals line was removed on request, matching
        // the two mix tables. The server's `total_revenue` / `total_count` are
        // still what this table reconciles against; they are simply not
        // printed.
        //
        // Gated on `total > 0`, NOT on `page_count > 1` — the page-size
        // dropdown lives in the footer, so hiding it once everything fits one
        // page would strand the user at that size. Same rule as the Sales
        // Funnel card and the by-source cells.
        isError || total === 0 || !paging ? undefined : (
          <TablePagination
            className={INSIGHT_PAGER_CLASS}
            scrollCardIntoView
            page={page}
            pageSize={pageSize}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            total={total}
            // No `isFetching`: paging re-slices rows already in hand rather
            // than firing a request, so there is never a page in flight.
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
          />
        )
      }
    />
  )
}
