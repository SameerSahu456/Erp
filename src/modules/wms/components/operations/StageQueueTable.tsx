import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from '@/components/common/tables/BusinessMetricsTable'

import { type StageQueueView } from '../../hooks/operations/useStageQueue'
import { WMS_LIST_MAX_CELL_CHARS } from '../../constants'
import { DeviceQueueFilter } from '../shared/DeviceQueueFilter'

/** Empty + load-error copy for one queue. */
export interface StageQueueEmptyStrings {
  title: string
  description: string
  errorTitle: string
  errorDescription: string
}

interface StageQueueTableProps {
  view: StageQueueView
  tabs: TabConfig[]
  cellFormatter: CellFormatter
  persistKey: string
  searchPlaceholder: string
  empty: StageQueueEmptyStrings
  onRowClick: (row: Record<string, unknown>) => void
}

/** Server-paged device table shared by the Inspection / Repair / QC queues. */
export function StageQueueTable({
  view,
  tabs,
  cellFormatter,
  persistKey,
  searchPlaceholder,
  empty,
  onRowClick,
}: StageQueueTableProps) {
  return (
    <div className="bmt-search-md">
      <BusinessMetricsTable
        maxCellChars={WMS_LIST_MAX_CELL_CHARS}
        filterSize="default"
        showIndex
        searchPlaceholder={searchPlaceholder}
        tabs={tabs}
        activeTab={view.activeTab}
        onTabChange={view.setActiveTab}
        cellFormatter={cellFormatter}
        persistKey={persistKey}
        onRowClick={onRowClick}
        searchValue={view.search}
        onSearchChange={view.setSearch}
        dateRange={{ value: view.dateRange, onChange: view.setDateRange }}
        renderFilter={({ column, value, onChange }) => {
          const kind = view.controls.filterKindFor(column.key)
          return kind ? (
            <DeviceQueueFilter
              kind={kind}
              value={value}
              onChange={onChange}
              warehouseIds={view.selectedWarehouseIds}
              engineerNameHint={view.engineerNameHint}
            />
          ) : null
        }}
        onClearFilters={view.clearFilters}
        serverPagination={{
          page: view.page,
          pageSize: view.pageSize,
          total: view.total,
          isFetching: view.isFetching,
          onPageChange: view.setPage,
          onPageSizeChange: view.setPageSize,
          sort: { column: view.sortColumn, direction: view.sortDirection },
          onSortChange: view.setSort,
          filters: view.controls.filters,
          onFiltersChange: view.controls.onFiltersChange,
        }}
        emptyState={{ title: empty.title, description: empty.description }}
        error={
          view.isError
            ? { title: empty.errorTitle, description: empty.errorDescription, onRetry: view.refetch }
            : undefined
        }
      />
    </div>
  )
}
