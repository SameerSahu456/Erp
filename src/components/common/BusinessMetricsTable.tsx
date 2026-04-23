import * as React from "react"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { BarcodeText } from "./BarcodeText"

interface ColumnDef {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  width?: string
  align?: "left" | "center" | "right"
}

interface TabConfig {
  id: string
  label: string
  columns: ColumnDef[]
  data: Record<string, unknown>[]
}

type CellFormatter = (
  value: unknown,
  key: string,
  row: Record<string, unknown>
) => {
  className?: string
  display?: React.ReactNode
} | null

interface BusinessMetricsTableProps {
  tabs: TabConfig[]
  cellFormatter?: CellFormatter
  pageSize?: number
  stickyHeader?: boolean
  searchable?: boolean
  className?: string
  onRowClick?: (row: Record<string, unknown>) => void
  /** When provided, tab/search/filter/sort/page state persists to sessionStorage under this key. */
  persistKey?: string
}

type SortDirection = "asc" | "desc" | null

function BusinessMetricsTable({
  tabs,
  cellFormatter,
  pageSize: initialPageSize = 10,
  stickyHeader = true,
  searchable = true,
  className,
  onRowClick,
  persistKey,
}: BusinessMetricsTableProps) {
  const pk = persistKey ? `bmt:${persistKey}` : ""
  const [activeTab, setActiveTab] = usePersistedState<string>(pk ? `${pk}:tab` : "", tabs[0]?.id ?? "")
  const [sortColumn, setSortColumn] = usePersistedState<string | null>(pk ? `${pk}:sortCol` : "", null)
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(pk ? `${pk}:sortDir` : "", null)
  const [currentPage, setCurrentPage] = usePersistedState<number>(pk ? `${pk}:page` : "", 0)
  const [pageSize, setPageSize] = usePersistedState<number>(pk ? `${pk}:pageSize` : "", initialPageSize)
  const [searchQuery, setSearchQuery] = usePersistedState<string>(pk ? `${pk}:search` : "", "")
  const [columnFilters, setColumnFilters] = usePersistedState<Record<string, string>>(
    pk ? `${pk}:colFilters` : "",
    {},
  )

  const activeTabConfig = tabs.find((t) => t.id === activeTab)

  const filterOptions = React.useMemo(() => {
    if (!activeTabConfig) return {}
    const options: Record<string, string[]> = {}
    for (const col of activeTabConfig.columns) {
      if (col.filterable) {
        const values = new Set<string>()
        for (const row of activeTabConfig.data) {
          const val = row[col.key]
          if (val != null && val !== '') values.add(String(val))
        }
        options[col.key] = [...values].sort()
      }
    }
    return options
  }, [activeTabConfig])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setSortColumn(null)
    setSortDirection(null)
    setCurrentPage(0)
    setSearchQuery("")
    setColumnFilters({})
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") setSortDirection("desc")
      else if (sortDirection === "desc") { setSortColumn(null); setSortDirection(null) }
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
    setCurrentPage(0)
  }

  const handleFilterChange = (columnKey: string, value: string) => {
    setColumnFilters((prev) => {
      if (value === '__all__') {
        const next = { ...prev }
        delete next[columnKey]
        return next
      }
      return { ...prev, [columnKey]: value }
    })
    setCurrentPage(0)
  }

  const processedData = React.useMemo(() => {
    if (!activeTabConfig) return []
    let data = [...activeTabConfig.data]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data.filter((row) =>
        activeTabConfig.columns.some((col) => {
          const val = row[col.key]
          return val != null && String(val).toLowerCase().includes(q)
        })
      )
    }

    for (const [key, filterValue] of Object.entries(columnFilters)) {
      data = data.filter((row) => String(row[key]) === filterValue)
    }

    if (sortColumn && sortDirection) {
      data.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal
        }
        const aStr = String(aVal)
        const bStr = String(bVal)
        return sortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      })
    }
    return data
  }, [activeTabConfig, sortColumn, sortDirection, searchQuery, columnFilters])

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize))
  const paginatedData = processedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  const filterableColumns = activeTabConfig?.columns.filter((c) => c.filterable) ?? []

  if (tabs.length === 0) {
    return <div className={cn("text-muted-foreground text-sm p-4", className)}>No data available</div>
  }

  return (
    <div className={cn("space-y-0", className)}>
      {/* Tabs */}
      <div className="cpt-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn("cpt-tab", activeTab === tab.id && "active")}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table wrap with toolbar */}
      <div className="cpt-table-wrap" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {/* Toolbar: search + filters */}
        {searchable && (
          <div className="cpt-table-toolbar">
            <div className="cpt-search-field">
              <Search className="size-[14px] opacity-60" />
              <input
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0) }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="opacity-40 hover:opacity-70 transition-opacity">
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Column filter dropdowns */}
            {filterableColumns.map((col) => {
              const options = filterOptions[col.key] ?? []
              if (options.length === 0) return null
              return (
                <select
                  key={col.key}
                  className="cpt-filter-chip"
                  value={columnFilters[col.key] ?? '__all__'}
                  onChange={(e) => handleFilterChange(col.key, e.target.value)}
                >
                  <option value="__all__">All {col.label}</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )
            })}

            <div style={{ marginLeft: 'auto' }} />
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="cpt-tbl">
            <thead>
              <tr>
                {activeTabConfig?.columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(col.align === "right" && "right", col.align === "center" && "text-center")}
                    style={{ cursor: col.sortable ? 'pointer' : undefined, width: col.width }}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    {col.label}
                    {col.sortable && (
                      <span className={cn(
                        "ml-1 text-[10px] transition-opacity",
                        sortColumn === col.key ? "opacity-80" : "opacity-30"
                      )}>
                        {sortColumn === col.key && sortDirection === "asc" ? "↑" :
                         sortColumn === col.key && sortDirection === "desc" ? "↓" : "↕"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIdx) => (
                  <tr key={rowIdx} onClick={onRowClick ? () => onRowClick(row) : undefined} style={onRowClick ? { cursor: 'pointer' } : undefined} className={onRowClick ? 'hover:bg-accent/50 transition-colors' : undefined}>
                    {activeTabConfig?.columns.map((col) => {
                      const value = row[col.key]
                      const formatted = cellFormatter ? cellFormatter(value, col.key, row) : null
                      const rendered = formatted?.display !== undefined
                        ? formatted.display
                        : value != null ? String(value) : ""
                      const isBarcodeCol = col.key === "barcode" && value != null && value !== ""
                      const model = (row.model ?? row.deviceModel) as string | undefined
                      const serial = (row.serialNumber ?? row.serial) as string | undefined
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            col.align === "right" && "right",
                            col.align === "center" && "text-center",
                            formatted?.className
                          )}
                        >
                          {isBarcodeCol ? (
                            <BarcodeText model={model} serial={serial}>
                              {rendered}
                            </BarcodeText>
                          ) : (
                            rendered
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={activeTabConfig?.columns.length ?? 1}
                    className="text-center text-muted-foreground"
                    style={{ padding: '56px 24px' }}
                  >
                    {searchQuery.trim() || Object.keys(columnFilters).length > 0
                      ? 'No results match your search'
                      : 'No data available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="cpt-table-footer">
          <div className="tabular-nums">Showing {paginatedData.length} of {processedData.length}</div>
          <div className="flex items-center gap-1">
            <button
              className="cpt-pg-btn"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = totalPages <= 5 ? i : (
                currentPage < 3 ? i :
                currentPage > totalPages - 3 ? totalPages - 5 + i :
                currentPage - 2 + i
              )
              if (page < 0 || page >= totalPages) return null
              return (
                <button
                  key={page}
                  className={cn("cpt-pg-btn", currentPage === page && "active")}
                  onClick={() => setCurrentPage(page)}
                >
                  {page + 1}
                </button>
              )
            })}
            <button
              className="cpt-pg-btn"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { BusinessMetricsTable }
export type {
  BusinessMetricsTableProps,
  TabConfig,
  ColumnDef,
  CellFormatter,
}
