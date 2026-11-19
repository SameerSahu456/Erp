import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

import { AsyncSelect } from "@/components/ui/async-select"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { EntityRef } from "@/components/common/display/EntityRef"
import { ListPageShell } from "@/components/page-shells"
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable"

import { WMS_LIST_MAX_CELL_CHARS } from "../../constants"
import {
  SALES_RETURN_REASON_OPTIONS,
  SALES_RETURN_STATUS_VARIANT,
  type SalesReturnStatus,
} from "../../constants/sales-return-status"
import { useSalesReturnRequestsList } from "../../hooks/sales-return-requests/useSalesReturnRequestsList"
import { useSalesReturnSourceOrderOptions } from "../../hooks/sales-return-requests/useSalesReturnOrderOptions"
import { SALES_RETURN_COLUMNS, SALES_RETURN_TABS } from "./sales-return-requests.columns"
import { SalesReturnRequestStats } from "./SalesReturnRequestStats"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

const NEW_ROUTE = "/wms/sales-returns/new"

type EmptyAction = { label: string; onClick: () => void } | undefined

export function SalesReturnRequestsBody() {
  const navigate = useNavigate()
  const r = useSalesReturnRequestsList()
  const { lv, listQuery } = r
  const { search, sortColumn, sortDirection, page, pageSize, filters } = lv.view
  const searching = search.trim() !== ""

  // Reason and sales order are shared by every tab (they narrow each status bucket too).
  const toolbarFilters = [
    {
      key: "reason",
      label: S.list.filters.reason,
      allLabel: S.list.filters.allReasons,
      value: filters.reason,
      options: SALES_RETURN_REASON_OPTIONS,
    },
    {
      // Searchable picker via the render escape hatch; `value` stays populated
      // so "Clear filters" sees it as active.
      key: "salesOrder",
      label: S.list.filters.salesOrder,
      value: filters.salesOrder?.id ?? "",
      options: [],
      render: () => (
        <AsyncSelect
          value={filters.salesOrder}
          onValueChange={(next) => lv.setFilters({ salesOrder: next })}
          useOptions={useSalesReturnSourceOrderOptions}
          toLabel={(o) => o.order_number}
          placeholder={S.list.filters.allSalesOrders}
          searchPlaceholder={S.list.filters.salesOrderSearch}
          loadOnOpen
          clearable
          chevron="down"
          // `text-foreground` last so it wins over AsyncSelect's idle muted tint,
          // matching the reason filter beside it.
          className="h-9 w-auto text-foreground"
        />
      ),
    },
  ]

  const tabs: TabConfig[] = SALES_RETURN_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: r.counts[t.id] ?? 0,
    columns: SALES_RETURN_COLUMNS,
    // Only the active tab carries rows; the others render on demand.
    data: t.id === r.activeTab ? r.rows : [],
  }))

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "request_number") {
      // min-w-0 so a long number truncates instead of widening the row (§8.7).
      return {
        display: (
          <EntityRef kind="sales_return" id={String(row.id)} value={String(value)} className="min-w-0 truncate font-semibold">
            {String(value)}
          </EntityRef>
        ),
      }
    }
    if (key === "status") {
      const variant = SALES_RETURN_STATUS_VARIANT[row._status as SalesReturnStatus] ?? "neutral"
      return { display: <StatusBadge variant={variant}>{String(value)}</StatusBadge> }
    }
    return null
  }

  // Empty state: a failed load offers Retry (§12); a no-match search offers a
  // one-click reset (CP-325 #7); otherwise the create CTA for raisers (§0.9).
  let emptyTitle: string = S.list.empty.title
  let emptyDescription: string = S.list.empty.description
  let emptyAction: EmptyAction = r.canCreate
    ? { label: S.list.empty.action, onClick: () => navigate(NEW_ROUTE) }
    : undefined
  if (listQuery.isError) {
    emptyTitle = S.list.error.title
    emptyDescription = S.list.error.description
    emptyAction = { label: S.list.error.retry, onClick: () => void listQuery.refetch() }
  } else if (searching) {
    emptyTitle = S.list.empty.noMatchTitle
    emptyDescription = S.list.empty.noMatchDescription
    emptyAction = { label: S.list.empty.clearSearch, onClick: () => r.setSearch("") }
  }

  return (
    <ListPageShell
      title={S.list.title}
      subtitle={S.list.subtitle}
      stats={<SalesReturnRequestStats counts={r.statCounts} />}
      actions={
        r.canCreate ? (
          <Button onClick={() => navigate(NEW_ROUTE)}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.list.newRequest}
          </Button>
        ) : undefined
      }
    >
      <div className="bmt-search-md">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          tabs={tabs}
          activeTab={r.activeTab}
          onTabChange={r.setTab}
          cellFormatter={cellFormatter}
          persistKey="wms-sales-return-requests"
          onRowClick={(row) => navigate(`/wms/sales-returns/${String(row.id)}`)}
          searchPlaceholder={S.list.searchPlaceholder}
          searchValue={search}
          onSearchChange={r.setSearch}
          toolbarFilters={toolbarFilters}
          onToolbarFilterChange={(key, value) => {
            if (key === "reason") lv.setFilters({ reason: value })
          }}
          onClearFilters={lv.clearFilters}
          dateRange={{
            value: filters.dateRange,
            onChange: (range) => lv.setFilters({ dateRange: range }),
            placeholder: S.list.filters.anyDate,
          }}
          serverPagination={{
            page,
            pageSize,
            // `total` comes from the API, never rows.length (§16.7).
            total: listQuery.data?.total ?? 0,
            isFetching: listQuery.isFetching,
            onPageChange: lv.setPage,
            onPageSizeChange: lv.setPageSize,
            // Header clicks drive the BE `sort` param (§1.1.F).
            sort: { column: sortColumn, direction: sortDirection },
            onSortChange: lv.setSort,
          }}
          emptyState={{ title: emptyTitle, description: emptyDescription, action: emptyAction }}
        />
      </div>
    </ListPageShell>
  )
}
