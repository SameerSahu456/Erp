import { TablePagination } from '@/components/common/tables/TablePagination'
import { PAGINATION } from '@/shared/constants'

import type { BucketUnit, PeriodBreakdownParams } from '../../../../api/dashboard'
import type { InsightPaging } from '../../../../hooks/dashboard/useInsightPaging'
import { usePeriodBreakdown } from '../../../../hooks/dashboard/usePeriodBreakdown'
import { INSIGHTS_STRINGS } from '../insights.strings'
import { InsightTrendList } from '../InsightTrendList'
import { INSIGHT_PAGER_CLASS, type Span } from '../InsightWidget'

// Month-on-Month Growth % — the Growth page's compact read of
// `GET /crm/dashboard/insights/period-wise-breakdown`.
//
// Same endpoint and same params as the Growth Ledger below it (React Query
// serves both from one response), rendered as a TREND LIST rather than a table:
// a dot, the bucket label, and the bare percentage. No column headers, no
// arrows, no revenue — the card's title already says what the number is, and a
// header row over a single column is chrome restating it.
//
// Why `InsightTrendList` and not a one-column `InsightRankingTable`: this is the
// shape every other single-series cell on the board already uses (Revenue Trend,
// the funnel tiles), so the growth series reads as one of them instead of as a
// table that lost its columns.
//
// Period-ADAPTIVE like the ledger: the server picks the bucket unit from
// `period` and echoes it as `bucket_unit`, so the title follows the rows on
// screen (Month-on-Month / Quarter-on-Quarter / …), never the toolbar — reading
// the request instead lets the header disagree with the rows mid-refetch.

const S = INSIGHTS_STRINGS.periodBreakdown

/** No `bucket_unit` until the first response lands. Month is the toolbar
 *  default, so the card opens on "Month-on-Month Growth %" rather than an empty
 *  header that pops into place. */
const FALLBACK_UNIT: BucketUnit = 'month'

interface GrowthDeltaListProps {
  /** Period / range / facet slice. No `page` / `page_size` — the endpoint has
   *  neither (see `toPeriodBreakdownParams`). */
  params: PeriodBreakdownParams
  span?: Span
  title?: string
  why?: string
  /** URL-backed page + page size. Pages over rows already in hand — the
   *  response IS the whole set. Omitted → every bucket, no pager. */
  paging?: InsightPaging
}

export function GrowthDeltaList({ params, span = 3, title, why, paging }: GrowthDeltaListProps) {
  const { data, isLoading, isError, error } = usePeriodBreakdown(params)

  const unit = data?.bucket_unit ?? FALLBACK_UNIT
  const allRows = data?.rows ?? []
  const total = allRows.length

  const page = paging?.page ?? 1
  const pageSize = paging?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  const rows = paging ? allRows.slice((page - 1) * pageSize, page * pageSize) : allRows

  // One decimal, and the SIGN is the value's own — no arrow glyph and no tone
  // here, unlike the ledger's change column. This card is the percentage on its
  // own, so `-33.4` carries the direction without a second signal to keep in
  // agreement. Row 0 has no previous bucket and the server sends `delta_pct: 0`
  // with `direction: "none"`; it reads as 0, the same as a genuinely flat
  // bucket, which is what a series baseline should look like.
  const points = rows.map((r) => ({
    label: r.bucket_label,
    value: Number(r.delta_pct.toFixed(1)),
  }))

  return (
    <InsightTrendList
      title={title ?? S.changeTitle[unit]}
      why={why ?? S.whyChange}
      span={span}
      points={points}
      isLoading={isLoading}
      isError={isError}
      error={error}
      loadingLabel={S.loading}
      loadErrorLabel={S.loadError}
      footer={
        // Gated on `total > 0`, NOT on `page_count > 1` — the page-size dropdown
        // lives in the footer, so hiding it once everything fits one page would
        // strand the user at that size. Same rule as the ledger below.
        isError || total === 0 || !paging ? undefined : (
          <TablePagination
            className={INSIGHT_PAGER_CLASS}
            scrollCardIntoView
            page={page}
            pageSize={pageSize}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            total={total}
            // No `isFetching`: paging re-slices rows already in hand rather than
            // firing a request, so there is never a page in flight.
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
          />
        )
      }
    />
  )
}
