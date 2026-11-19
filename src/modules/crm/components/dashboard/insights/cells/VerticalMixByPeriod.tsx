import { useMemo } from "react"

import { TablePagination } from "@/components/common/tables/TablePagination"
import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { VerticalMixByPeriodParams } from "../../../../api/dashboard"
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging"
import { useVerticalMixByPeriod } from "../../../../hooks/dashboard/useVerticalMixByPeriod"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { RankingCol, RankingRow } from "../InsightRankingTable"
import { InsightRankingTable } from "../InsightRankingTable"
import { INSIGHT_PAGER_CLASS, type Span } from "../InsightWidget"
import { MIX_TABLE_PAGE_SIZE, MIX_TOTAL_KEY } from "./mix-table"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.verticalMix

// Vertical Mix by Period — `GET /crm/dashboard/insights/vertical-mix-by-period`.
//
// A CROSS-TAB: one row per bucket, one column per vertical, plus a row total.
// The sibling of `ConditionMixByPeriod`, over the account-type dimension.
//
// A TABLE, not a chart, deliberately. The insights board is chart-free — every
// "chart" here is a list — and a cross-tab also reads better for this question:
// the page is "Channel vs End Customer", so the value of ONE vertical is what
// you came for, and exact figures beat estimated segment heights. It rides the
// shared `InsightRankingTable`, whose `columns` array is already dynamic, so
// this cell is a data transform with no bespoke table markup.
//
// SIMPLER than the condition sibling in three ways, all from the backend:
//
//   * Column keys are DISPLAY LABELS already ("End Customer"), not wire enums —
//     no label map, nothing to keep in sync.
//   * The column set is STABLE: always the full `ACCOUNT_TYPES` domain, emitted
//     even when a vertical earned nothing, so the header does not move as data
//     changes.
//   * No sentinel column. `accounts.account_type` is NOT NULL and
//     CHECK-constrained, so there is no `no_vertical` counterpart to
//     `no_condition`.
//
// `showRank={false}`: the rows are a time SERIES in calendar order, not an
// ordering. A "#1 / #2" gutter would read as "January beat February". Same call
// `PeriodicBreakdown` makes.
//
// PAGING re-slices rows already in hand — the endpoint has no `page` /
// `page_size` and returns every bucket at once. That is NOT the §16.7
// anti-pattern (which forbids slicing a cached fetch that is only PART of the
// data): there is no unfetched remainder. It is required rather than optional
// because `period=custom` buckets by MONTH over a user-chosen range, so a
// three-year window is 36 rows.

export function VerticalMixByPeriod({
  params,
  span = 6,
  title,
  why,
  paging,
}: {
  params: VerticalMixByPeriodParams
  span?: Span
  title?: string
  why?: string
  /** Own pager, namespaced `vertical-mix` — paging this table must not move the
   *  period breakdown sitting on the same page. */
  paging?: InsightPaging
}) {
  const { data, isLoading, isError, error } = useVerticalMixByPeriod(params)

  const unit = data?.bucket_unit ?? "month"
  const verticals = useMemo(() => data?.verticals ?? [], [data?.verticals])
  const allRows = useMemo(() => data?.rows ?? [], [data?.rows])

  // Slice for the current page. `total` / `totalPages` are computed from
  // `allRows`, never the slice. An out-of-range page (a stale URL after a
  // filter change) yields an empty slice and the table's own empty state.
  const page = paging?.page ?? 1
  const pageSize = paging?.pageSize ?? MIX_TABLE_PAGE_SIZE
  const total = allRows.length
  const pagedRows = paging
    ? allRows.slice((page - 1) * pageSize, page * pageSize)
    : allRows

  // Column keys ARE the vertical names — safe, because they are stable
  // server-controlled strings. `MIX_TOTAL_KEY` is prefixed so it can never
  // collide with one, and goes last so it reads as the row sum.
  const columns = useMemo<RankingCol[]>(
    () => [
      ...verticals.map((v) => ({ key: v, label: v, align: "right" as const })),
      { key: MIX_TOTAL_KEY, label: S.columnTotal, align: "right" as const, emphasis: true },
    ],
    [verticals],
  )

  const rows = useMemo<RankingRow[]>(
    () =>
      pagedRows.map((row) => ({
        name: row.bucket_label,
        // Rows are rectangular and zero-filled server-side, so `?? 0` guards a
        // contract change rather than a real sparse row.
        cells: {
          ...Object.fromEntries(
            verticals.map((v) => [v, { text: formatINRShort(row.verticals[v] ?? 0) }]),
          ),
          [MIX_TOTAL_KEY]: { text: formatINRShort(row.total) },
        },
      })),
    [pagedRows, verticals],
  )

  return (
    <InsightRankingTable
      title={title ?? S.title[unit]}
      why={why ?? S.why}
      span={span}
      nameLabel={S.nameHeader[unit]}
      columns={columns}
      rows={rows}
      // A time series, not a ranking — see the note above.
      showRank={false}
      state={
        isError ? (
          // 403 → "no access", not "failed to load": an out-of-scope `user_ids`
          // is a permission answer, not a broken request.
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : isLoading ? (
          <InsightShimmer />
        ) : undefined
      }
      footer={
        // Pager only. The window-totals and per-vertical-totals lines that used
        // to sit here were removed on request: the Total COLUMN already carries
        // the per-row sum, and `totals.by_vertical` restated the same figures
        // the body shows. `data.totals` is still the reconciliation point
        // against `/period-wise-breakdown` — it is simply not printed.
        //
        // Gated on `paging`, NOT on `totalPages > 1`: the page-size dropdown
        // lives in the footer, so hiding it once everything fits one page would
        // strand the user at that size.
        paging ? (
          <TablePagination
            className={INSIGHT_PAGER_CLASS}
            scrollCardIntoView
            page={page}
            pageSize={pageSize}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            total={total}
            // No `isFetching`: re-slicing rows in hand never puts a page in
            // flight.
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
          />
        ) : undefined
      }
    />
  )
}
