import * as React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

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

  // Build unique values for filterable columns
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

  // Reset sort, page, search, filters when switching tabs
  const handleTabChange = (value: unknown) => {
    const tabValue = value as string | number
    const tab = tabs[tabValue as number] ?? tabs.find((t) => t.id === String(tabValue))
    if (tab) {
      setActiveTab(tab.id)
    }
    setSortColumn(null)
    setSortDirection(null)
    setCurrentPage(0)
    setSearchQuery("")
    setColumnFilters({})
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection(null)
      }
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

  // Filter + search + sort
  const processedData = React.useMemo(() => {
    if (!activeTabConfig) return []
    let data = [...activeTabConfig.data]

    // Apply search across all string columns
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data.filter((row) =>
        activeTabConfig.columns.some((col) => {
          const val = row[col.key]
          return val != null && String(val).toLowerCase().includes(q)
        })
      )
    }

    // Apply column filters
    for (const [key, filterValue] of Object.entries(columnFilters)) {
      data = data.filter((row) => String(row[key]) === filterValue)
    }

    // Apply sort
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
        return sortDirection === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr)
      })
    }
    return data
  }, [activeTabConfig, sortColumn, sortDirection, searchQuery, columnFilters])

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize))
  const paginatedData = processedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  )

  const handlePageSizeChange = (value: unknown) => {
    setPageSize(Number(value))
    setCurrentPage(0)
  }

  const alignClass = (align?: "left" | "center" | "right") => {
    if (align === "center") return "text-center"
    if (align === "right") return "text-right"
    return "text-left"
  }

  const hasActiveFilters = searchQuery.trim() !== '' || Object.keys(columnFilters).length > 0
  const filterableColumns = activeTabConfig?.columns.filter((c) => c.filterable) ?? []

  if (tabs.length === 0) {
    return (
      <div className={cn("text-muted-foreground text-sm p-4", className)}>
        No data available
      </div>
    )
  }

  return (
    <div className={cn("space-y-0", className)}>
      <Tabs defaultValue={0} onValueChange={handleTabChange}>
        <TabsList>
          {tabs.map((tab, index) => (
            <TabsTrigger key={tab.id} value={index}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab, index) => (
          <TabsContent key={tab.id} value={index}>
            {/* Search + Filters bar */}
            {searchable && activeTab === tab.id && (
              <div className="flex flex-wrap items-center gap-2 py-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0) }}
                    className="h-8 pl-8 pr-8 text-[13px]"
                  />
                  {searchQuery && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Column filters */}
                {filterableColumns.map((col) => {
                  const options = filterOptions[col.key] ?? []
                  if (options.length === 0) return null
                  return (
                    <Select
                      key={col.key}
                      value={columnFilters[col.key] ?? '__all__'}
                      onValueChange={(v) => handleFilterChange(col.key, v)}
                    >
                      <SelectTrigger className="h-8 w-auto min-w-[120px] text-[13px]">
                        <SelectValue placeholder={col.label} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All {col.label}</SelectItem>
                        {options.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                })}

                {/* Clear filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => { setSearchQuery(""); setColumnFilters({}); setCurrentPage(0) }}
                  >
                    <X className="size-3 mr-1" />
                    Clear
                  </Button>
                )}

                {/* Result count */}
                <span className="text-xs text-muted-foreground ml-auto">
                  {processedData.length} of {activeTabConfig?.data.length ?? 0}
                  {hasActiveFilters && ' (filtered)'}
                </span>
              </div>
            )}

            <div
              className={cn(
                "relative overflow-x-auto rounded-md border",
                stickyHeader && "max-h-[500px] overflow-y-auto"
              )}
            >
              <Table>
                <TableHeader
                  className={cn(
                    stickyHeader &&
                      "sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]"
                  )}
                >
                  <TableRow>
                    {tab.columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={cn(
                          alignClass(col.align),
                          col.sortable && "cursor-pointer select-none",
                          col.width && `w-[${col.width}]`
                        )}
                        style={col.width ? { width: col.width } : undefined}
                        onClick={
                          col.sortable ? () => handleSort(col.key) : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.sortable && (
                            <span className="inline-flex size-4 items-center justify-center">
                              {sortColumn === col.key && activeTab === tab.id ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="size-3.5" />
                                ) : (
                                  <ArrowDown className="size-3.5" />
                                )
                              ) : (
                                <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
                              )}
                            </span>
                          )}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTab === tab.id && paginatedData.length > 0 ? (
                    paginatedData.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {tab.columns.map((col) => {
                          const value = row[col.key]
                          const formatted = cellFormatter
                            ? cellFormatter(value, col.key, row)
                            : null
                          return (
                            <TableCell
                              key={col.key}
                              className={cn(
                                alignClass(col.align),
                                formatted?.className
                              )}
                            >
                              {formatted?.display !== undefined
                                ? formatted.display
                                : value != null
                                  ? String(value)
                                  : ""}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  ) : activeTab === tab.id ? (
                    <TableRow>
                      <TableCell
                        colSpan={tab.columns.length}
                        className="py-8 text-center text-muted-foreground"
                      >
                        {hasActiveFilters ? 'No results match your search' : 'No data available'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {activeTab === tab.id && (
              <div className="flex items-center justify-between gap-4 px-2 pt-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows per page</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger size="sm" className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={currentPage >= totalPages - 1}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
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
