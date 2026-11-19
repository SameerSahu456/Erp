import { TablePagination } from "@/components/common/tables/TablePagination"
import { PAGINATION } from "@/shared/constants"

import type { PeriodBreakdownParams } from "../../../../api/dashboard"
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging"
import { useNewAccountsByPeriod } from "../../../../hooks/dashboard/useNewAccountsByPeriod"
import { INSIGHTS_STRINGS } from "../insights.strings"
import { InsightTrendList } from "../InsightTrendList"
import { INSIGHT_PAGER_CLASS, type Span } from "../InsightWidget"

const S = INSIGHTS_STRINGS.newAccounts

// New Accounts by Period — `GET /crm/dashboard/insights/new-accounts-by-period`,
// read as a list: one row per bucket, the count of accounts whose FIRST
// order landed in it. The reference draws a single-series bar chart; in
// table view that is the compact label + value list, which is exactly
// `InsightTrendList` (the same shape Month-on-Month Growth % uses).
//
// SAME params object as the period breakdown and the two mix cross-tabs
// (`periodBreakdown.params`), so this series describes the same window,
// bucket unit and facets as every other cell on the page — FY quarters and
// years, month-relative weeks, custom ranges and `months` narrowing included.
// The New vs Repeat table beside it reads the same response (one request).
//
// PAGING re-slices rows already in hand: the endpoint returns every bucket
// of the window at once, the same exception `period-breakdown` documents.

interface NewAccountsByPeriodListProps {
  params: PeriodBreakdownParams
  span?: Span
  title?: string
  why?: string
  paging?: InsightPaging
}

export function NewAccountsByPeriodList({
  params,
  span = 4,
  title,
  why,
  paging,
}: NewAccountsByPeriodListProps) {
  const { data, isLoading, isError, error } = useNewAccountsByPeriod(params)

  const all = data?.rows ?? []
  const total = all.length
  const page = paging?.page ?? 1
  const pageSize = paging?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  const rows = paging ? all.slice((page - 1) * pageSize, page * pageSize) : all

  return (
    <InsightTrendList
      title={title ?? S.byPeriodTitle}
      why={why ?? S.whyByPeriod}
      span={span}
      accent="indigo"
      points={rows.map((r) => ({ label: r.bucket_label, value: r.new_accounts }))}
      isLoading={isLoading}
      isError={isError}
      error={error}
      loadingLabel={S.loading}
      loadErrorLabel={S.loadError}
      emptyLabel={S.emptyState}
      footer={
        isError || total === 0 || !paging ? undefined : (
          <TablePagination
            className={INSIGHT_PAGER_CLASS}
            scrollCardIntoView
            page={page}
            pageSize={pageSize}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            total={total}
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
          />
        )
      }
    />
  )
}
