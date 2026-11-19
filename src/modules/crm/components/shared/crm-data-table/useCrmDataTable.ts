import * as React from "react"

import { usePersistedState } from "@/hooks/use-persisted-state"

import { applySearchSortFilter, buildFilterOptions } from "./tableData"
import type { CrmDataTableProps, SortDirection } from "./types"

/**
 * All CrmDataTable state + business logic: tab/search/sort/filter/pagination,
 * the server-vs-client mode resolution, and the derived row set. The presenter
 * components stay pure UI (§17-S, §18.1). Returns a state bag consumed by the
 * presenter, toolbar, and grid.
 */
export function useCrmDataTable(props: CrmDataTableProps) {
  const {
    tabs,
    pageSize: initialPageSize = 10,
    searchable = true,
    className,
    persistKey,
    serverPagination,
    onSearchChange,
    onTabChange,
    onColumnFiltersChange,
    renderFilter,
    searchableFilterColumns,
    searchValue,
    toolbarFilters,
    onClearFilters: parentOnClearFilters,
    activeTab: controlledActiveTab,
  } = props

  const isServerPaged = !!serverPagination
  const isPremiumTable = className?.includes("crm-premium-table") ?? false
  const showsTabs = tabs.length > 1 && !className?.includes("cpt-compact")
  const showIndexColumn = isPremiumTable
  const pk = persistKey ? `bmt:${persistKey}` : ""

  const [internalActiveTab, setInternalActiveTab] = usePersistedState<string>(
    pk ? `${pk}:tab` : "",
    tabs[0]?.id ?? "",
  )
  const isTabControlled = controlledActiveTab !== undefined
  const activeTab = isTabControlled ? controlledActiveTab : internalActiveTab
  const [sortColumn, setSortColumn] = usePersistedState<string | null>(pk ? `${pk}:sortCol` : "", null)
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(pk ? `${pk}:sortDir` : "", null)
  const [currentPage, setCurrentPage] = usePersistedState<number>(pk ? `${pk}:page` : "", 0)
  const [pageSize, setPageSize] = usePersistedState<number>(pk ? `${pk}:pageSize` : "", initialPageSize)
  const [searchQuery, setSearchQuery] = usePersistedState<string>(pk ? `${pk}:search` : "", "")
  const [columnFilters, setColumnFilters] = usePersistedState<Record<string, string>>(
    pk ? `${pk}:colFilters` : "",
    {},
  )

  // The built-in search can run controlled (page owns the string — e.g. to
  // persist it and drive a server query) or uncontrolled (BMT-local state).
  const isSearchControlled = searchValue !== undefined
  const effectiveSearch = isSearchControlled ? searchValue : searchQuery

  // Memoize the lookup so downstream `useMemo`s aren't invalidated on every
  // render by a fresh object reference from `tabs.find(...)`.
  const activeTabConfig = React.useMemo(
    () => tabs.find((t) => t.id === activeTab),
    [tabs, activeTab],
  )

  const filterOptions = React.useMemo(() => {
    if (!activeTabConfig) return {}
    // Server-paged mode: rely on the caller-supplied option list (if any).
    // Computing distinct values from `data` would be wrong because `data`
    // only holds the current page slice.
    if (isServerPaged) return serverPagination?.filterOptions ?? {}
    return buildFilterOptions(activeTabConfig)
  }, [activeTabConfig, isServerPaged, serverPagination?.filterOptions])

  // Effective sort/filter state — pulled from the parent in server-paged mode,
  // local persisted state otherwise.
  const effectiveSortColumn = isServerPaged
    ? (serverPagination?.sort?.column ?? null)
    : sortColumn
  const effectiveSortDirection = isServerPaged
    ? (serverPagination?.sort?.direction ?? null)
    : sortDirection
  const effectiveColumnFilters = isServerPaged
    ? (serverPagination?.filters ?? {})
    : columnFilters

  const handleTabChange = (tabId: string) => {
    if (!isTabControlled) setInternalActiveTab(tabId)
    onTabChange?.(tabId)
    setSortColumn(null)
    setSortDirection(null)
    setCurrentPage(0)
    setSearchQuery("")
    setColumnFilters({})
  }

  const handleSort = (columnKey: string) => {
    // Compute next sort state from the currently-effective values so server
    // mode and client mode behave identically — three-stage cycle (asc → desc
    // → off) on repeat clicks of the same column.
    let nextColumn: string | null
    let nextDirection: SortDirection
    if (effectiveSortColumn === columnKey) {
      if (effectiveSortDirection === "asc") {
        nextColumn = columnKey
        nextDirection = "desc"
      } else if (effectiveSortDirection === "desc") {
        nextColumn = null
        nextDirection = null
      } else {
        nextColumn = columnKey
        nextDirection = "asc"
      }
    } else {
      nextColumn = columnKey
      nextDirection = "asc"
    }

    if (isServerPaged && serverPagination?.onSortChange) {
      serverPagination.onSortChange(nextColumn, nextDirection)
      return
    }
    setSortColumn(nextColumn)
    setSortDirection(nextDirection)
    setCurrentPage(0)
  }

  const handleFilterChange = (columnKey: string, value: string) => {
    if (isServerPaged && serverPagination?.onFiltersChange) {
      const next = { ...(serverPagination.filters ?? {}) }
      if (value === "__all__") delete next[columnKey]
      else next[columnKey] = value
      serverPagination.onFiltersChange(next)
      return
    }
    setColumnFilters((prev) => {
      const next =
        value === "__all__"
          ? (() => {
              const n = { ...prev }
              delete n[columnKey]
              return n
            })()
          : { ...prev, [columnKey]: value }
      onColumnFiltersChange?.(next)
      return next
    })
    setCurrentPage(0)
  }

  const handleSearchInput = (value: string) => {
    if (!isSearchControlled) setSearchQuery(value)
    setCurrentPage(0)
    onSearchChange?.(value)
  }

  const handleSearchClear = () => {
    if (!isSearchControlled) setSearchQuery("")
    onSearchChange?.("")
  }

  // Empty-state "Clear filters": reset table-internal state first, then notify
  // the parent so its server-side `search` / `category_id` / etc. get cleared
  // too. Without the parent reset, the listing falls back to a generic "No
  // data" state because the API still returns nothing for the lingering values.
  const handleClearAllFilters = () => {
    setSearchQuery("")
    onSearchChange?.("")
    setColumnFilters({})
    setCurrentPage(0)
    parentOnClearFilters?.()
  }

  const processedData = React.useMemo(() => {
    if (!activeTabConfig) return []
    // Server-paged mode: the caller already applied search/sort/filter at the
    // backend, and we only hold one page. Re-doing the work here would (a)
    // filter against an incomplete row set and (b) waste an O(n log n) sort
    // on every keystroke. Pass through.
    if (isServerPaged) return activeTabConfig.data
    return applySearchSortFilter(activeTabConfig, searchQuery, columnFilters, sortColumn, sortDirection)
  }, [activeTabConfig, isServerPaged, sortColumn, sortDirection, searchQuery, columnFilters])

  // Server-paginated mode: trust the caller for both data and totals.
  // Client-paginated mode: process + slice locally.
  const effectivePageSize = isServerPaged ? serverPagination!.pageSize : pageSize
  const effectiveTotalRows = isServerPaged ? serverPagination!.total : processedData.length
  const totalPages = Math.max(1, Math.ceil(effectiveTotalRows / effectivePageSize))
  const effectiveCurrentPage = isServerPaged ? serverPagination!.page - 1 : currentPage
  const paginatedData = isServerPaged
    ? (activeTabConfig?.data ?? [])
    : processedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  const totalColumns = (activeTabConfig?.columns.length ?? 0) + (showIndexColumn ? 1 : 0)
  const showLoadingState = !!serverPagination?.isFetching && paginatedData.length === 0

  const goToPage = (zeroIdx: number) => {
    if (isServerPaged) serverPagination!.onPageChange(zeroIdx + 1)
    else setCurrentPage(zeroIdx)
  }

  // Page-size dropdown handler: server mode forwards to the caller; client mode
  // updates local state and resets to the first page. `undefined` (server mode
  // without `onPageSizeChange`) hides the dropdown.
  const handlePageSizeChange =
    isServerPaged && serverPagination?.onPageSizeChange
      ? serverPagination.onPageSizeChange
      : !isServerPaged
        ? (size: number) => {
            setPageSize(size)
            setCurrentPage(0)
          }
        : undefined

  const filterableColumns = activeTabConfig?.columns.filter((c) => c.filterable) ?? []
  // Toolbar shouldn't paint its zebra band when there's nothing inside it.
  // Each filter dropdown bails on `options.length === 0`; in server-paged
  // mode without `filterOptions` supplied (e.g. CRM Leads/Deals list view),
  // every dropdown renders null and the toolbar wraps a row of nothing.
  const toolbarFiltersActive = (toolbarFilters ?? []).some(
    (f) => !!f.value && f.value !== "__all__",
  )
  const toolbarHasFilterContent =
    !!renderFilter ||
    filterableColumns.some((col) => (filterOptions[col.key]?.length ?? 0) > 0) ||
    (toolbarFilters?.length ?? 0) > 0
  const showToolbar = searchable || toolbarHasFilterContent
  const searchableFilterKeys = React.useMemo(
    () =>
      new Set([
        ...(searchableFilterColumns ?? []),
        ...(serverPagination?.searchableFilterColumns ?? []),
      ]),
    [searchableFilterColumns, serverPagination?.searchableFilterColumns],
  )

  return {
    isServerPaged,
    showsTabs,
    showIndexColumn,
    activeTab,
    activeTabConfig,
    effectiveSearch,
    handleSearchInput,
    handleSearchClear,
    handleTabChange,
    handleSort,
    handleFilterChange,
    handleClearAllFilters,
    filterOptions,
    filterableColumns,
    effectiveSortColumn,
    effectiveSortDirection,
    effectiveColumnFilters,
    searchableFilterKeys,
    toolbarFiltersActive,
    showToolbar,
    paginatedData,
    totalColumns,
    showLoadingState,
    effectivePageSize,
    effectiveTotalRows,
    effectiveCurrentPage,
    totalPages,
    goToPage,
    handlePageSizeChange,
  }
}

export type CrmDataTableController = ReturnType<typeof useCrmDataTable>
