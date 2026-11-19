import { TablePagination } from "@/components/common/tables/TablePagination"
import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { PeriodBreakdownParams } from "../../../../api/dashboard"
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging"
import { useNewAccountsByPeriod } from "../../../../hooks/dashboard/useNewAccountsByPeriod"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { RankingCol, RankingRow } from "../InsightRankingTable"
import { InsightRankingTable } from "../InsightRankingTable"
import { INSIGHT_PAGER_CLASS, type Span } from "../InsightWidget"
import { MIX_TABLE_PAGE_SIZE, MIX_TOTAL_KEY } from "./mix-table"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.newAccounts

// New vs Repeat Revenue — per bucket, the revenue from first-period buyers
// vs returning accounts. `GET /crm/dashboard/insights/new-accounts-by-period`,
// the SAME response the By Period list beside it reads (one request serves
// both cells). The reference's stacked bar; in table view it is a cross-tab
// (Period · New · Repeat · Total), the same shape — and the same
// `InsightRankingTable` ride — as Condition Mix / Vertical Mix by Period.
//
// `showRank={false}`: rows are a time series in calendar order, not an
// ordering, exactly as the two mix siblings reason. `Σ Total` reconciles
// with the period-wise breakdown for the same slice.
//
// PAGING re-slices rows already in hand — the endpoint returns every bucket
// at once (the `period-breakdown` exception).

const COLUMNS: RankingCol[] = [
  { key: "new", label: S.columnNew, align: "right" },
  { key: "repeat", label: S.columnRepeat, align: "right" },
  { key: MIX_TOTAL_KEY, label: S.columnTotal, align: "right", emphasis: true },
]

interface NewVsRepeatRevenueTableProps {
  params: PeriodBreakdownParams
  span?: Span
  title?: string
  why?: string
  paging?: InsightPaging
}

export function NewVsRepeatRevenueTable({
  params,
  span = 3,
  title,
  why,
  paging,
}: NewVsRepeatRevenueTableProps) {
  const { data, isLoading, isError, error } = useNewAccountsByPeriod(params)

  const all = data?.rows ?? []
  const total = all.length
  const page = paging?.page ?? 1
  const pageSize = paging?.pageSize ?? MIX_TABLE_PAGE_SIZE
  const pagedRows = paging ? all.slice((page - 1) * pageSize, page * pageSize) : all

  const rows: RankingRow[] = pagedRows.map((r) => ({
    name: r.bucket_label,
    cells: {
      new: { text: formatINRShort(r.new_value) },
      repeat: { text: formatINRShort(r.repeat_value) },
      [MIX_TOTAL_KEY]: { text: formatINRShort(r.total) },
    },
  }))

  return (
    <InsightRankingTable
      title={title ?? S.newVsRepeatTitle}
      why={why ?? S.whyNewVsRepeat}
      span={span}
      nameLabel={S.columnPeriod}
      columns={COLUMNS}
      rows={rows}
      showRank={false}
      state={
        isError ? (
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : isLoading ? (
          <InsightShimmer />
        ) : undefined
      }
      footer={
        paging && !isError && total > 0 ? (
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
        ) : undefined
      }
    />
  )
}
