import { TablePagination } from "@/components/common/tables/TablePagination"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import { CategoryOemPivotTable } from "../../../accounts/CategoryOemPivotTable"
import type { RevenueByCategoryOemParams } from "../../../../api/dashboard"
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging"
import { useRevenueByCategoryOem } from "../../../../hooks/dashboard/useRevenueByCategoryOem"
import { CategoryOemTilesRow } from "../CategoryOemMixWidget"
import { INSIGHTS_STRINGS } from "../insights.strings"
import { InsightEmptyState } from "../InsightEmptyState"
import { INSIGHT_PAGER_CLASS, InsightWidget, type Span } from "../InsightWidget"
import { InsightShimmer } from "../InsightShimmer"

const S = INSIGHTS_STRINGS.inactiveAccounts

// What Inactive Accounts Used to Buy — Category & OEM: the Category × Brand
// pivot over the PAST orders of the accounts the page's tile counts as
// inactive. `GET /crm/revenue/by-category-oem` with `cohort=inactive_accounts`
// — the SAME endpoint, params object and pager the dashboard's Category ×
// Brand card uses, plus the one cohort flag. Server-side the page's period /
// range / months are read as the inactivity window (the widget's own rule),
// the cohort is the buyers that window finds inactive, and the pivot sums
// everything they bought BEFORE it — inactive accounts have, by definition,
// nothing inside it, which is why the plain pivot sat empty on this page.
//
// Twin of `NewAccountsCategoryOemPivot`; same tiles row + pivot table.

interface InactiveAccountsCategoryOemPivotProps {
  /** The Category × Brand slice; `cohort`, `page` and `page_size` are set here. */
  params: RevenueByCategoryOemParams
  /** Pages the CATEGORY axis — the same key the dashboard pivot uses. */
  paging: InsightPaging
  span?: Span
  title?: string
  why?: string
}

export function InactiveAccountsCategoryOemPivot({
  params,
  paging,
  span = 6,
  title,
  why,
}: InactiveAccountsCategoryOemPivotProps) {
  const { data, isLoading, isFetching, isError, error } = useRevenueByCategoryOem({
    ...params,
    cohort: "inactive_accounts",
    page: paging.page,
    page_size: paging.pageSize,
  })

  return (
    <InsightWidget title={title ?? S.categoryOemTitle} why={why ?? S.whyCategoryOem} span={span}>
      {isLoading ? (
        <InsightShimmer />
      ) : isError || !data ? (
        <LoadErrorState error={error} fallback={S.loadError} compact />
      ) : data.totals.row_count === 0 ? (
        <InsightEmptyState label={S.categoryOemEmpty} />
      ) : (
        <>
          <div className="space-y-3">
            <CategoryOemTilesRow derived={data.derived} />
            <CategoryOemPivotTable pivot={data.pivot} />
          </div>
          {data.pagination.total > 0 ? (
            <TablePagination
              className={cn(INSIGHT_PAGER_CLASS, "mt-0")}
              scrollCardIntoView
              page={paging.page}
              pageSize={paging.pageSize}
              totalPages={data.pagination.page_count}
              total={data.pagination.total}
              isFetching={isFetching}
              onPageChange={paging.setPage}
              onPageSizeChange={paging.setPageSize}
            />
          ) : null}
        </>
      )}
    </InsightWidget>
  )
}
