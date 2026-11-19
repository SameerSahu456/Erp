import { useMemo } from "react"

import { TablePagination } from "@/components/common/tables/TablePagination"
import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { ConditionMixByPeriodParams } from "../../../../api/dashboard"
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging"
import { useConditionMixByPeriod } from "../../../../hooks/dashboard/useConditionMixByPeriod"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { RankingCol, RankingRow } from "../InsightRankingTable"
import { InsightRankingTable } from "../InsightRankingTable"
import { INSIGHT_PAGER_CLASS, type Span } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.conditionMix

// Condition Mix by Period — `GET /crm/dashboard/insights/condition-mix-by-period`.
//
// A CROSS-TAB: one row per bucket, one column per condition, plus a row total.
// The same slice the period-wise breakdown shows, pivoted so the mix is read
// across a row instead of reconstructed from several cards.
//
// A TABLE, not a chart, and deliberately so. Every "chart" on this board is a
// list (`InsightTrendList`, `InsightDonutList`) — the chart view was never
// ported — so a stacked bar chart here would have been the board's only
// Recharts widget. It rides the shared `InsightRankingTable`, which already
// takes a DYNAMIC `columns` array, so the whole cell is a data transform with
// no bespoke table markup. The backend agrees: its schema comment says the
// canonical condition order "matches the FE table order in the Revenue by
// Condition screenshot".
//
// `showRank={false}`: the rows are a time SERIES, not an ordering. A "#1 / #2"
// gutter would invent a ranking and read as "January beat February". Same flag,
// same reason, as `SalesFunnelCard`.
//
// THREE contract rules this cell exists to honour:
//
//   1. The column set is DYNAMIC. `data.conditions` is the authority — with a
//      `conditions` filter active it is exactly those, and with none it is the
//      full enum PLUS `no_condition` when freeform lines contributed revenue.
//      Hardcoding three conditions would silently drop a column.
//   2. The title keys off the RESPONSE's `bucket_unit`, never the toolbar's
//      period. Keying off the toolbar makes the header describe the fetch in
//      flight while the rows still show the previous one.
//   3. `bucket_label` is server-formatted; render it verbatim.
//
// PAGING: the endpoint takes no `page` / `page_size` and returns every bucket
// in one response, so the pager slices rows already in hand instead of
// refetching — the same exception `PeriodicBreakdown` and `SalesFunnelCard`
// make. That is NOT the §16.7 anti-pattern: the rule forbids slicing a cached
// fetch that is only PART of the data, and here there is no unfetched
// remainder. It earns a pager because `period=weekly` over a year-to-date
// window is ~31 buckets, which is a long table even at full width.

/** The row-total column, appended after the dynamic condition columns. Its key
 *  cannot collide with a condition wire key (`new`, `new_pull`, …). */
const TOTAL_KEY = "__total"

export function ConditionMixByPeriod({
  params,
  span = 6,
  title,
  why,
  paging,
}: {
  params: ConditionMixByPeriodParams
  span?: Span
  title?: string
  why?: string
  /** Own pager, namespaced `condition-mix` — paging this table must not move
   *  the period breakdown sitting on the same page. */
  paging?: InsightPaging
}) {
  const { data, isLoading, isError, error } = useConditionMixByPeriod(params)

  // Wire key → display label, resolved once per response. `CONDITION_ACCENT`
  // is not consulted here: this is a table, and the toned/bar cell treatments
  // belong to ranked values, not to a mix where every column is peer to the
  // others.
  const columns = useMemo<RankingCol[]>(() => {
    const cols: RankingCol[] = (data?.conditions ?? []).map((key) => ({
      key,
      label:
        INSIGHTS_STRINGS.conditionLabels[
          key as keyof typeof INSIGHTS_STRINGS.conditionLabels
        ] ?? key,
      align: "right",
    }))
    return [...cols, { key: TOTAL_KEY, label: S.columnTotal, align: "right", emphasis: true }]
  }, [data?.conditions])

  const allRows = useMemo<RankingRow[]>(
    () =>
      (data?.rows ?? []).map((row) => ({
        name: row.bucket_label,
        // Rows are rectangular and zero-filled server-side, so `?? 0` guards a
        // contract change rather than a real sparse row.
        cells: {
          ...Object.fromEntries(
            (data?.conditions ?? []).map((key) => [
              key,
              { text: formatINRShort(row.conditions[key] ?? 0) },
            ]),
          ),
          [TOTAL_KEY]: { text: formatINRShort(row.total) },
        },
      })),
    [data?.rows, data?.conditions],
  )

  // Slice for the current page. An out-of-range `?condition-mixPage` (a stale
  // URL after a filter change) yields an empty slice and the table's own empty
  // state rather than a crash — same behaviour as `PeriodicBreakdown`.
  const page = paging?.page ?? 1
  const pageSize = paging?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  const total = allRows.length
  const rows = paging ? allRows.slice((page - 1) * pageSize, page * pageSize) : allRows

  const heading = title ?? (data ? S.title[data.bucket_unit] : S.title.month)

  return (
    <InsightRankingTable
      title={heading}
      why={why ?? S.why}
      span={span}
      nameLabel={data ? S.nameHeader[data.bucket_unit] : S.nameHeader.month}
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
        // Pager only — the window-totals line was removed on request, matching
        // the Vertical Mix table. The Total COLUMN already carries each row's
        // sum; `data.totals` is still the reconciliation point against
        // `/period-wise-breakdown`, it is simply not printed.
        //
        // Gated on rows existing, NOT on `page_count > 1`: the page-size
        // dropdown lives in the footer, so hiding it once everything fits one
        // page would strand the user at that size.
        paging && total > 0 ? (
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
        ) : undefined
      }
    />
  )
}
