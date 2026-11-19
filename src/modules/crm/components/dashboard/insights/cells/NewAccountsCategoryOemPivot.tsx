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

const S = INSIGHTS_STRINGS.newAccounts

// What New Accounts Buy — Category & OEM: the Category × Brand pivot over the
// orders of this window's new accounts. `GET /crm/revenue/by-category-oem`
// with `cohort=new_accounts` — the SAME endpoint, params object and pager
// the dashboard's Category × Brand card uses, plus the one cohort flag, so
// every filter, the window and the caller's visibility behave identically.
//
// Rides the SAME `CategoryOemTilesRow` + `CategoryOemPivotTable` that card
// and the Account 360° tab render, so the Top Category / Top Brand tiles
// read the same here as on an account's 360° view. The tiles stay inert:
// the Category & OEM drill page has no cohort filter, so there is nowhere
// to carry "new accounts" TO.

interface NewAccountsCategoryOemPivotProps {
  /** The Category × Brand slice; `cohort`, `page` and `page_size` are set here. */
  params: RevenueByCategoryOemParams
  /** Pages the CATEGORY axis — the same key the dashboard pivot uses. */
  paging: InsightPaging
  span?: Span
  title?: string
  why?: string
}

export function NewAccountsCategoryOemPivot({
  params,
  paging,
  span = 6,
  title,
  why,
}: NewAccountsCategoryOemPivotProps) {
  const { data, isLoading, isFetching, isError, error } = useRevenueByCategoryOem({
    ...params,
    cohort: "new_accounts",
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
        <InsightEmptyState label={S.emptyState} />
      ) : (
        <>
          <div className="space-y-3">
            <CategoryOemTilesRow derived={data.derived} />
            <CategoryOemPivotTable pivot={data.pivot} />
          </div>
          {data.pagination.total > 0 ? (
            // `mt-0`: the pager's own rule closes the table — see the same
            // override on `CategoryOemMixWidget`.
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
