import { useMemo } from "react"
import { useParams } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/common/tables/TablePagination"
import { PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { PageHeader } from "@/components/page-shells"

import { InsightEmptyState } from "../../components/dashboard/insights/InsightEmptyState"
import { InsightScopeToggle } from "../../components/dashboard/insights/InsightScopeToggle"
import { InsightViewNotice } from "../../components/dashboard/insights/InsightViewNotice"
import {
  TABLE_SURFACE_CLASS,
  TABLE_WRAP_CLASS,
} from "../../components/dashboard/insights/insight-table"
import { RecordsFilterBar } from "../../components/dashboard/insights/RecordsFilterBar"
import { RecordsTable } from "../../components/dashboard/insights/RecordsTable"
import { INSIGHTS_STRINGS } from "../../components/dashboard/insights/insights.strings"
import { RECORDS_FILTER_STRINGS } from "../../components/dashboard/insights/records-filter.strings"
import {
  isDrillable,
  recordsExtraFacets,
} from "../../components/dashboard/insights/summary-drilldown.config"
import type { SummaryTileKey } from "../../components/dashboard/insights/InsightSummaryCard"
import { toSummaryParams } from "../../hooks/dashboard/insight-query-params"
import { useInsightPaging } from "../../hooks/dashboard/useInsightPaging"
import { useInsightScope } from "../../hooks/dashboard/useInsightScope"
import { useInsightView } from "../../hooks/dashboard/useInsightView"
import { useRecords } from "../../hooks/dashboard/useRecords"
import { useRecordsPageFilters } from "../../hooks/dashboard/useRecordsPageFilters"

// The records behind a summary tile — `/crm/insights/records/:tile`.
//
// PAGE-LEVEL FILTER BAR — `<RecordsFilterBar>` sits above the table: search
// (`q`), status (SO panels only), account, owner, and the product facets the
// tile's rows really honour (`recordsExtraFacets`: Channel Type, Condition,
// Category, OEM). Every filter that narrows the list is VISIBLE as a removable
// chip — including Month, which arrives from the dashboard and has no pill here
// (CP-756 #4). The chrome is deliberately the same as the shared
// `<InsightsToolbar>` the dashboard mounts.
//
// Period still arrives on the URL from the tile and stays URL-only.
//
// NO BACK BUTTON — the history stack is empty in a fresh tab (the tile opens
// this page in a new one), so the control either dead-ends or navigates to a
// board this tab never showed. Closing the tab is the way back.

function CrmRecordsPage() {
  const S = INSIGHTS_STRINGS.records
  const { tile = "" } = useParams()

  const view = useInsightView()
  const pageFilters = useRecordsPageFilters()
  const { showToggle, scope, currentUserId } = useInsightScope(view.scope)
  const paging = useInsightPaging("records")

  // A tile with no Owner control must not carry a stale `?owner=` from the URL
  // into the request — the user could not see or clear it.
  const hasOwner = !RECORDS_FILTER_STRINGS.noOwnerTiles.includes(tile)
  const query = useMemo(
    () => ({
      ...view,
      filters: hasOwner ? view.filters : { ...view.filters, owner: undefined },
      scope,
      currentUserId,
    }),
    [view, hasOwner, scope, currentUserId],
  )
  const summaryParams = useMemo(() => toSummaryParams(query), [query])

  const { data, isLoading, isFetching, isError, error } = useRecords(
    tile,
    summaryParams,
    paging.page,
    paging.pageSize,
    { q: pageFilters.q, status: pageFilters.status },
  )

  const total = data?.pagination.total ?? 0
  const totalPages = data?.pagination.page_count ?? 1

  // A tile with no `(type, metric)` mapping has no rows to show. Mirrors
  // `CrmInsightDetailPage`'s unknown-metric branch.
  if (!isDrillable(tile as SummaryTileKey)) {
    return <PageHeader title={S.notFoundTitle} subtitle={S.notFoundSubtitle(tile)} />
  }

  const subtitle = data
    ? data.header.total_value != null
      ? `${data.header.subtitle}`
      : data.header.subtitle
    : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title={data?.header.title ?? S.tileTitle[tile] ?? S.notFoundTitle}
        subtitle={subtitle}
        actions={
          showToggle ? (
            <InsightScopeToggle scope={scope} onScopeChange={view.setScope} />
          ) : undefined
        }
        className="mb-1.5"
      />

      <RecordsFilterBar
        tile={tile}
        q={pageFilters.q}
        onQChange={pageFilters.setQ}
        status={pageFilters.status}
        onStatusChange={pageFilters.setStatus}
        filters={view.filters}
        onFiltersChange={view.setFilters}
        extraFacetFields={recordsExtraFacets(tile)}
      />

      <InsightViewNotice repairs={view.repairs} />

      {/* Same two-element surface CrmDataTable renders on the list pages. */}
      <div className={TABLE_WRAP_CLASS}>
        <div className={TABLE_SURFACE_CLASS}>
          {/* `overflow-x-auto` on the table wrapper only — §8.7 exception for
              genuinely wide 2-D data. */}
          <div className="overflow-x-auto">
            {isError ? (
              <div className="flex min-h-[12rem] items-center justify-center p-5">
                <LoadErrorState error={error} fallback={S.loadError} compact />
              </div>
            ) : isLoading || !data ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : total === 0 ? (
              <InsightEmptyState label={S.empty} className="min-h-96" />
            ) : (
              <RecordsTable data={data} />
            )}
          </div>

          {total > 0 && (
            <TablePagination
              page={paging.page}
              totalPages={totalPages}
              pageSize={paging.pageSize}
              total={total}
              isFetching={isFetching}
              onPageChange={paging.setPage}
              onPageSizeChange={paging.setPageSize}
              pageSizeOptions={PAGINATION.PAGE_SIZE_OPTIONS}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default CrmRecordsPage
