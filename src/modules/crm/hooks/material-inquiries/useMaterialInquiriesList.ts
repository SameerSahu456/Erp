import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"

import type { ToolbarFilter } from "../../components/shared/CrmDataTable"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import { PAGINATION, UI } from "@/shared/constants"
import { dateRangeToParams } from "@/shared/lib/date"
import {
  useDebounce,
  useFilterParams,
  useUrlDateRange,
  useUrlFilter,
  useUrlPagination,
} from "@/shared/hooks"
import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { useMaterialInquiries } from "./useMaterialInquiries"
import {
  MATERIAL_INQUIRY_STATUSES,
  type MaterialInquiryStatus,
} from "../../api"
import { MATERIAL_INQUIRIES_STRINGS as S } from "../../components/material-inquiries/material-inquiries.strings"
import { MATERIAL_INQUIRY_STATUS_LABELS } from "../../constants/material-inquiry-status"

export const MATERIAL_INQUIRY_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE
const ALL = "__all__"

// Container logic for the Material Inquiries list page: filter state, the
// list query, and the toolbar status filter.
export function useMaterialInquiriesList() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canWriteMi = can([...crmCan.writeMi])

  // Every filter lives in the URL (mirrors pagination) so it survives refresh,
  // detail round-trips, and browser back/forward. Each setter clears `?page`.
  const { setMany: setManyParams } = useFilterParams()
  const [search, setSearch] = useUrlFilter("search", "")
  const [selectedStatus, setSelectedStatus] = useUrlFilter("status", ALL)
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)

  // Created-date range filter (URL-backed via date_from / date_to).
  const [dateRange, setDateRange] = useUrlDateRange()
  const { date_from, date_to } = dateRangeToParams(dateRange)

  // §16 — page + page size in the URL (mirrors IMS). Filter changes reset to
  // page 1 automatically because each URL-backed filter setter clears `?page`.
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "mi_size",
    defaultSize: MATERIAL_INQUIRY_PAGE_SIZE,
  })

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch || undefined,
      status:
        selectedStatus !== ALL
          ? (selectedStatus as MaterialInquiryStatus)
          : undefined,
      date_from,
      date_to,
      sort: "-created_at" as const,
    }),
    [page, pageSize, debouncedSearch, selectedStatus, date_from, date_to],
  )

  const { data, isLoading, isError, error, isFetching } = useMaterialInquiries(queryParams)
  const total = data?.total ?? 0

  const toolbarFilters: ToolbarFilter[] = useMemo(
    () => [
      {
        key: "status",
        label: S.list.filters.statusLabel,
        allLabel: S.list.filters.statusAll,
        value: selectedStatus === ALL ? "" : selectedStatus,
        options: MATERIAL_INQUIRY_STATUSES.map((s) => ({
          value: s,
          label: MATERIAL_INQUIRY_STATUS_LABELS[s],
        })),
      },
      {
        kind: "daterange",
        key: "created_date",
        label: "Created On",
        // Empty-chip text — without this the picker falls back to "All Created
        // Date" (placeholder ?? `All ${label}`).
        placeholder: "Created On",
        value: dateRange,
      },
    ],
    [selectedStatus, dateRange],
  )

  const handleToolbarFilterChange = useCallback((key: string, value: string) => {
    if (key === "status") setSelectedStatus(value || ALL)
  }, [setSelectedStatus])

  const handleToolbarDateRangeChange = useCallback(
    (_key: string, range: DateRange | undefined) => setDateRange(range),
    [setDateRange],
  )

  const handleClearFilters = useCallback(() => {
    setManyParams({ search: null, status: null, date_from: null, date_to: null })
  }, [setManyParams])

  const openMi = useCallback((id: string) => navigate(`/crm/material-inquiries/${id}`), [navigate])
  const openMiNew = useCallback(() => navigate("/crm/material-inquiries/new"), [navigate])

  return {
    items: data?.items ?? [],
    total,
    isLoading,
    isError,
    error,
    isFetching,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    toolbarFilters,
    handleToolbarFilterChange,
    handleToolbarDateRangeChange,
    handleClearFilters,
    canWriteMi,
    openMi,
    openMiNew,
  }
}
