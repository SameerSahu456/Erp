import { useCallback, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import type { ToolbarFilter } from "../../components/shared/CrmDataTable"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import { UI } from "@/shared/constants"
import { dateRangeToParams } from "@/shared/lib/date"
import {
  useDebounce,
  useUrlDateRange,
  useUrlFilter,
  useUrlPagination,
} from "@/shared/hooks"
import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { useDemoRequests, useDemoRequestStats } from "./useDemoRequests"
import { useDemoSort } from "./useDemoSort"
import { DEMO_REQUESTS_STRINGS as S } from "../../components/demo-requests/demo-requests.strings"
import {
  DEMO_REQUESTS_PAGE_SIZE,
  DEMO_REQUESTS_TABS,
  DEMO_REQUESTS_TAB_LABELS,
  parseTabParam,
  tabCount,
  tabFilters,
} from "../../components/demo-requests/demoRequestsConfig"
import { buildDemoKpiStats, toDemoRow } from "../../components/demo-requests/demoRequestsView"

// Container logic for the Demo Requests list page: status filter (mirrored to
// ?status=), search, created-on range, sort and page — all URL-backed and applied
// server-side — plus the KPI cards and the status-filter counts, which come from ONE stats
// call over the whole filtered set (not the rows on the current page).
export function useDemoRequestsList() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canWriteDr = can([...crmCan.writeDr])
  const [searchParams, setSearchParams] = useSearchParams()
  const activeStatus = parseTabParam(searchParams.get("status"))
  // Page + page size live in the URL; the status handler clears `page` in the same
  // navigation, the search / date setters clear it for free.
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "demo_size",
    defaultSize: DEMO_REQUESTS_PAGE_SIZE,
  })
  const [search, setSearch] = useUrlFilter("search", "")
  const debouncedSearch = useDebounce(
    search.trim().slice(0, UI.FILTER_SEARCH_MAX_LENGTH),
    UI.DEBOUNCE_SEARCH_MS,
  )
  const [dateRange, setDateRange] = useUrlDateRange()
  const { date_from, date_to } = dateRangeToParams(dateRange)
  const { sortParam, sortColumn, sortDirection, setSort } = useDemoSort()
  const [now] = useState(() => Date.now())
  const filters = useMemo(() => tabFilters(activeStatus), [activeStatus])

  // Filters that scope BOTH the list and the stats (status / overdue do not —
  // the stats cover every status so each option can show its own count).
  const scope = { q: debouncedSearch || undefined, date_from, date_to }

  const demoQuery = useDemoRequests({
    ...scope,
    page,
    page_size: pageSize,
    status: filters.status,
    overdue: filters.overdue,
    sort: sortParam,
  })
  const statsQuery = useDemoRequestStats(scope)
  const stats = statsQuery.data
  const total = demoQuery.data?.total ?? 0

  const rows = useMemo(
    () => (demoQuery.data?.items ?? []).map((d) => toDemoRow(d, now)),
    [demoQuery.data?.items, now],
  )
  const kpiStats = useMemo(() => buildDemoKpiStats(stats), [stats])

  // Status dropdown. Each option carries its own server count (over the current
  // search + created-on range), so applying a filter moves the numbers. While
  // the first stats call is in flight the count is omitted, not shown as 0.
  // `all` is the dropdown's built-in reset option, so it is not listed.
  const statusFilter: ToolbarFilter = {
    key: "status",
    label: S.list.statusFilter.label,
    allLabel: S.list.statusFilter.allLabel,
    value: activeStatus === "all" ? "" : activeStatus,
    options: DEMO_REQUESTS_TABS.filter((id) => id !== "all").map((id) => {
      const count = tabCount(id, stats)
      const label = DEMO_REQUESTS_TAB_LABELS[id as keyof typeof DEMO_REQUESTS_TAB_LABELS]
      return { value: id, label: count === undefined ? label : `${label} (${count})` }
    }),
  }

  const dateFilter: ToolbarFilter = {
    kind: "daterange",
    key: "created_date",
    label: S.list.dateFilter.label,
    placeholder: S.list.dateFilter.placeholder,
    value: dateRange,
  }

  const handleToolbarDateRangeChange = useCallback(
    (_key: string, range: DateRange | undefined) => setDateRange(range),
    [setDateRange],
  )

  const handleStatusFilterChange = useCallback(
    (key: string, value: string) => {
      if (key !== "status") return
      const next = new URLSearchParams(searchParams)
      if (value) next.set("status", value)
      else next.delete("status")
      // Back to page 1 in the SAME navigation — a separate setPage() would read
      // a stale `prev` and stomp this one.
      next.delete("page")
      setSearchParams(next, { replace: false })
    },
    [searchParams, setSearchParams],
  )

  const hasActiveFilters = Boolean(
    activeStatus !== "all" || search.trim() || dateRange?.from || dateRange?.to,
  )

  // Search + status + created-on range cleared and back to page 1 in ONE
  // navigation — sequential setSearchParams calls would each read a stale
  // `prev`. The sort is a view, not a filter, so it stays.
  const handleClearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete("search")
    next.delete("status")
    next.delete("date_from")
    next.delete("date_to")
    next.delete("page")
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const openDemo = useCallback((id: string) => navigate(`/crm/demo-requests/${id}`), [navigate])
  const openDemoNew = useCallback(() => navigate("/crm/demo-requests/new"), [navigate])

  return {
    rows,
    total,
    kpiStats,
    statusFilter,
    dateFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    sortColumn,
    sortDirection,
    setSort,
    hasActiveFilters,
    demoQuery,
    canWriteDr,
    handleStatusFilterChange,
    handleToolbarDateRangeChange,
    handleSearchChange: setSearch,
    handleClearFilters,
    openDemo,
    openDemoNew,
  }
}
