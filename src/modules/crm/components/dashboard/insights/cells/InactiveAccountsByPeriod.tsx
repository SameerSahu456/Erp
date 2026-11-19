import { TablePagination } from "@/components/common/tables/TablePagination"
import { InsightShimmer } from "../InsightShimmer"
import { PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { InactiveAccountsByPeriodParams } from "../../../../api/dashboard"
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging"
import { useInactiveAccountsByPeriod } from "../../../../hooks/dashboard/useInactiveAccountsByPeriod"
import type { RateTone } from "../insights.format"
import { INSIGHTS_STRINGS } from "../insights.strings"
import type { RankingCol, RankingRow } from "../InsightRankingTable"
import { InsightRankingTable } from "../InsightRankingTable"
import { INSIGHT_PAGER_CLASS, type Span } from "../InsightWidget"

const S = INSIGHTS_STRINGS.inactiveAccounts
const S_MIX = INSIGHTS_STRINGS.conditionMix

// Active vs Inactive Buyers by Period — one row per bucket of the window:
//
//    Period · Active buyers · Inactive · Inactive %
//
// A table on the shared ranking-table chrome, like the condition / vertical
// mix cross-tabs, rather than the reference's bar + line chart: the page's
// other by-period cells are tables, and the two counts read side by side.
// LIVE off `/insights/inactive-accounts-by-period` on the SAME
// `PeriodBreakdownParams` slice every other by-period cell uses.

const COLUMNS: RankingCol[] = [
  { key: "active", label: S.columnActive, align: "right" },
  { key: "inactive", label: S.columnInactive, align: "right" },
  { key: "pct", label: S.columnInactivePct, align: "right", emphasis: true },
]

/** Over half of the buyers gone quiet reads as lost ground. */
const pctTone = (pct: number): RateTone => (pct >= 50 ? "bad" : "good")

interface InactiveAccountsByPeriodProps {
  params: InactiveAccountsByPeriodParams
  span?: Span
  title?: string
  why?: string
  paging?: InsightPaging
}

export function InactiveAccountsByPeriod({
  params,
  span = 6,
  title,
  why,
  paging,
}: InactiveAccountsByPeriodProps) {
  const { data, isLoading, isError, error } = useInactiveAccountsByPeriod(params)

  const allRows: RankingRow[] = (data?.rows ?? []).map((r) => ({
    name: r.bucket_label,
    cells: {
      active: { text: String(r.active_buyers) },
      inactive: { text: String(r.inactive_buyers) },
      pct: { text: `${r.inactive_pct}%`, tone: pctTone(r.inactive_pct) },
    },
  }))
  const page = paging?.page ?? 1
  const pageSize = paging?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  const total = allRows.length
  const rows = paging ? allRows.slice((page - 1) * pageSize, page * pageSize) : allRows
  const unit = data?.bucket_unit ?? "month"

  return (
    <InsightRankingTable
      title={title ?? S.byPeriodTitle[unit]}
      why={why ?? S.whyByPeriod}
      span={span}
      nameLabel={S_MIX.nameHeader[unit]}
      columns={COLUMNS}
      rows={rows}
      showRank={false}
      state={
        isError ? (
          <LoadErrorState error={error} fallback={S.byPeriodLoadError} compact />
        ) : isLoading ? (
          <InsightShimmer />
        ) : undefined
      }
      footer={
        paging && total > 0 ? (
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
