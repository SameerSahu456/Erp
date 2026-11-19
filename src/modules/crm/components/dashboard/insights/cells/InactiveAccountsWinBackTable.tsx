import { TablePagination } from "@/components/common/tables/TablePagination"
import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { InactiveAccountsParams } from "../../../../api/dashboard"
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging"
import { useInactiveAccounts } from "../../../../hooks/dashboard/useInactiveAccounts"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { RankingCol, RankingRow } from "../InsightRankingTable"
import { InsightRankingTable } from "../InsightRankingTable"
import { INSIGHT_PAGER_CLASS, type Span } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.inactiveAccounts

// Inactive Accounts — <window> — THE list of dormant accounts on the insight
// page, laid out as a win-back plan:
//
//    Account · Rep · Last Order · Idle · Avg Order
//
// `/dashboard/inactive-accounts` in drill-down mode, server-paginated over the
// whole inactive set, so the pager's total is the summary tile's number.
//
// `Rep` is the rep who submitted the account's last order (accounts carry no
// owner of their own); `Avg Order` is lifetime revenue over counted orders.
// Either prints "—" when the row has nothing to show.


const COLUMNS: RankingCol[] = [
  { key: "rep", label: S.columnRep },
  { key: "last", label: S.columnLastOrder },
  { key: "idle", label: S.columnIdle, align: "right" },
  { key: "avg", label: S.columnAvgOrder, align: "right" },
]

interface InactiveAccountsWinBackTableProps {
  params: InactiveAccountsParams
  paging: InsightPaging
  span?: Span
  title?: string
  why?: string
}

export function InactiveAccountsWinBackTable({ params, paging, span = 6, title, why }: InactiveAccountsWinBackTableProps) {
  const { data, isLoading, isFetching, isError, error } = useInactiveAccounts({
    ...params,
    page: paging.page,
    page_size: paging.pageSize,
  })

  const rows = data?.rows ?? []
  const unit = data?.summary.idle_unit ?? "month"

  const rankingRows: RankingRow[] = rows.map((r) => ({
    name: r.account_name,
    sub: r.account_type ?? undefined,
    cells: {
      rep: { text: r.rep_name ?? S.pending },
      last: { text: r.last_order_label },
      idle: { text: S.idleIn(r.idle_units, unit) },
      avg: { text: r.avg_order_value == null ? S.pending : formatINRShort(r.avg_order_value) },
    },
  }))

  return (
    <InsightRankingTable
      title={title ?? (data ? S.listTitle(data.current_window.label) : S.title)}
      why={why ?? S.whyWinBack}
      span={span}
      columns={COLUMNS}
      nameLabel={S.columnAccount}
      showRank={false}
      rows={rankingRows}
      state={
        isLoading ? (
          <InsightShimmer />
        ) : isError ? (
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : undefined
      }
      footer={
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
