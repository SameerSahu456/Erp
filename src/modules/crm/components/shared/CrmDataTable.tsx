/**
 * CrmDataTable — CRM-owned fork of `components/common/BusinessMetricsTable`.
 *
 * Owned by the CRM module so CRM list pages can evolve their table independently
 * of the non-CRM pages still on the shared component. Decomposed (§14/§17/§18)
 * into a logic hook + presenter sub-components under `./crm-data-table/`; this
 * file is the thin presenter that composes them. Make CRM table changes here or
 * in that folder, not in the shared BusinessMetricsTable.
 */
import { cn } from "@/lib/utils"
import { TablePagination } from "@/components/common/tables/TablePagination"

import { CrmTableGrid } from "./crm-data-table/CrmTableGrid"
import { CrmTableToolbar } from "./crm-data-table/CrmTableToolbar"
import { useCrmDataTable } from "./crm-data-table/useCrmDataTable"
import type { CrmDataTableProps } from "./crm-data-table/types"
import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

function CrmDataTable(props: CrmDataTableProps) {
  const {
    tabs,
    className,
    stickyHeader = true,
    searchable = true,
    onRowClick,
    cellFormatter,
    emptyState,
    emptyNode,
    serverPagination,
    renderFilter,
    useAsyncFilterDropdowns = false,
    toolbarFilters,
    onToolbarFilterChange,
    onToolbarDateRangeChange,
    toolbarLayout = "wrap",
    extraFilters,
    trailingFilters,
    leadingFilters,
    dateRangePlacement = "end",
  } = props

  const controller = useCrmDataTable(props)

  if (tabs.length === 0) {
    return (
      <div className={cn("text-muted-foreground text-sm p-4", className)}>
        {CRM_SHARED_STRINGS.dataTable.noDataAvailable}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "crm-data-table space-y-0",
        toolbarLayout === "inline" && "crm-data-table-toolbar-inline",
        className,
      )}
    >
      {/* Tabs — only rendered when there are multiple, so single-tab pages
          (Accounts, Vendors, Contacts, etc.) don't show a redundant pill. */}
      {controller.showsTabs && (
        <div className="cpt-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn("cpt-tab", controller.activeTab === tab.id && "active")}
              onClick={() => controller.handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div
        className="cpt-table-wrap"
        style={
          controller.showsTabs
            ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 }
            : undefined
        }
      >
        {/* Toolbar renders when EITHER search is on or any column is filterable
            — gating both on `searchable` would hide the filter dropdowns on
            pages that opted out of free-text search. */}
        {controller.showToolbar && (
          <CrmTableToolbar
            controller={controller}
            searchable={searchable}
            renderFilter={renderFilter}
            useAsyncFilterDropdowns={useAsyncFilterDropdowns}
            toolbarFilters={toolbarFilters}
            onToolbarFilterChange={onToolbarFilterChange}
            onToolbarDateRangeChange={onToolbarDateRangeChange}
            extraFilters={extraFilters}
            trailingFilters={trailingFilters}
            leadingFilters={leadingFilters}
            dateRangePlacement={dateRangePlacement}
          />
        )}

        <CrmTableGrid
          controller={controller}
          stickyHeader={stickyHeader}
          onRowClick={onRowClick}
          cellFormatter={cellFormatter}
          emptyNode={emptyNode}
          emptyState={emptyState}
        />

        {/* Pagination footer — uses the shared TablePagination so CRM list
         *  pages render the exact same pager + page-size selector as the IMS
         *  BusinessMetricsTable. */}
        <TablePagination
          page={controller.effectiveCurrentPage + 1}
          totalPages={controller.totalPages}
          pageSize={controller.effectivePageSize}
          total={controller.effectiveTotalRows}
          isFetching={serverPagination?.isFetching}
          onPageChange={(p) => controller.goToPage(p - 1)}
          onPageSizeChange={controller.handlePageSizeChange}
          pageSizeOptions={serverPagination?.pageSizeOptions}
        />
      </div>
    </div>
  )
}

export { CrmDataTable }
export type {
  CrmDataTableProps,
  TabConfig,
  ColumnDef,
  CellFormatter,
  EmptyStateConfig,
  ToolbarFilter,
} from "./crm-data-table/types"
