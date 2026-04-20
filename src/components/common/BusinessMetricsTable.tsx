import * as React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

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
}

type SortDirection = "asc" | "desc" | null

function BusinessMetricsTable({
  tabs,
  cellFormatter,
  pageSize: initialPageSize = 10,
  stickyHeader = true,
  searchable = true,
  className,
}: BusinessMetricsTableProps) {
  const [activeTab, setActiveTab] = React.useState(tabs[0]?.id ?? "")
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(initialPageSize)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [columnFilters, setColumnFilters] = React.useState<Record<string, string>>({})

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
      {/* Comprint Tabs */}
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
      <div className="cpt-table-wrap">
        {/* Toolbar: search + filters */}
        {searchable && (
          <div className="cpt-table-toolbar">
            <div className="cpt-search-field">
              <Search className="size-[14px]" />
              <input
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0) }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ opacity: 0.5 }}>
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
                  style={{ cursor: 'pointer' }}
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
                      <span style={{ marginLeft: 4, opacity: sortColumn === col.key ? 1 : 0.3, fontSize: 10 }}>
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
                  <tr key={rowIdx}>
                    {activeTabConfig?.columns.map((col) => {
                      const value = row[col.key]
                      const formatted = cellFormatter ? cellFormatter(value, col.key, row) : null
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            col.align === "right" && "right",
                            col.align === "center" && "text-center",
                            formatted?.className
                          )}
                        >
                          {formatted?.display !== undefined
                            ? formatted.display
                            : value != null ? String(value) : ""}
                        </td>
                      )
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={activeTabConfig?.columns.length ?? 1}
                    style={{ padding: '56px 24px', textAlign: 'center', color: '#667085' }}
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
          <div>Showing {paginatedData.length} of {processedData.length}</div>
          <div className="cpt-row" style={{ gap: 4 }}>
            <button
              className="cpt-btn cpt-btn-sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="size-3" />
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
                  className="cpt-btn cpt-btn-sm"
                  style={currentPage === page ? { background: '#0F1B2D', color: '#fff', borderColor: '#0F1B2D' } : undefined}
                  onClick={() => setCurrentPage(page)}
                >
                  {page + 1}
                </button>
              )
            })}
            <button
              className="cpt-btn cpt-btn-sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="size-3" />
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
