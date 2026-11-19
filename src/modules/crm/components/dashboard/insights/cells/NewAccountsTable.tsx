import { TablePagination } from "@/components/common/tables/TablePagination"
import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { NewAccountsParams } from "../../../../api/dashboard"
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging"
import { useNewAccounts } from "../../../../hooks/dashboard/useNewAccounts"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { RankingCol, RankingRow } from "../InsightRankingTable"
import { InsightRankingTable } from "../InsightRankingTable"
import { INSIGHT_PAGER_CLASS, type Span } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.newAccounts

// New Accounts — <current window>: the ranked table of this period's new
// logos. `GET /crm/dashboard/new-accounts` in its DRILL-DOWN mode (`page` +
// `page_size` → one page of the whole cohort + `pagination`), the same
// endpoint and cohort rule the dashboard tile reads in widget mode, so the
// two can never disagree on who is new. Facets and the caller's visibility
// narrow the cohort server-side, like every sibling.
//
// Columns follow the reference board's ranking table: First Order · Since ·
// Total (bar) · Orders, with the account type as the row sub-line. (The
// reference also prints the rep there; the row carries no owner today.)

const COLUMNS: RankingCol[] = [
  { key: "first", label: S.columnFirstOrder, align: "right" },
  { key: "since", label: S.columnSince },
  { key: "total", label: S.columnTotal, bar: true, emphasis: true },
  { key: "orders", label: S.columnOrders, align: "right" },
]

interface NewAccountsTableProps {
  /** Period / facet slice. `page` / `page_size` are set here from `paging`. */
  params: NewAccountsParams
  /** URL-backed page + page size — its own key. */
  paging: InsightPaging
  span?: Span
  title?: string
  why?: string
}

export function NewAccountsTable({ params, paging, span = 6, title, why }: NewAccountsTableProps) {
  const { data, isLoading, isFetching, isError, error } = useNewAccounts({
    ...params,
    page: paging.page,
    page_size: paging.pageSize,
  })

  const rows = data?.rows ?? []
  const maxTotal = Math.max(...rows.map((r) => r.revenue_in_window), 1)

  const rankingRows: RankingRow[] = rows.map((r) => ({
    name: r.account_name,
    sub: r.account_type ?? undefined,
    cells: {
      // Null together on an approved-but-not-yet-ordering row (Rule B).
      first: {
        text: r.first_order_value == null ? S.noFirstOrder : formatINRShort(r.first_order_value),
      },
      since: { text: r.first_order_month ?? S.noOrderYet },
      total: {
        text: formatINRShort(r.revenue_in_window),
        pct: (r.revenue_in_window / maxTotal) * 100,
      },
      orders: { text: String(r.order_count_in_window) },
    },
  }))

  return (
    <InsightRankingTable
      title={title ?? (data ? S.listTitle(data.current_window.label) : S.title)}
      why={why ?? S.whyList}
      span={span}
      columns={COLUMNS}
      nameLabel={S.columnAccount}
      // No server rank on this row shape — number across pages from the
      // pager, so page 2 starts at 11 rather than 1.
      rankOffset={(paging.page - 1) * paging.pageSize}
      rows={rankingRows}
      state={
        isLoading ? (
          <InsightShimmer />
        ) : isError ? (
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : undefined
      }
      footer={
        // Gated on `total > 0`, NOT on `page_count > 1`: the page-size
        // dropdown lives in the footer, so hiding it once everything fits one
        // page would strand the user at that size.
        data?.pagination && data.pagination.total > 0 ? (
          <TablePagination
            className={INSIGHT_PAGER_CLASS}
            scrollCardIntoView
            page={paging.page}
            pageSize={paging.pageSize}
            totalPages={data.pagination.page_count}
            total={data.pagination.total}
            isFetching={isFetching}
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
          />
        ) : undefined
      }
    />
  )
}
