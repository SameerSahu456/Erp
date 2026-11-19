import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"

import { PAGINATION, UI } from "@/shared/constants"
import { dateRangeToParams } from "@/shared/lib/date"
import {
  useDebounce,
  useFilterParams,
  useMemoryState,
  useUrlDateRange,
  useUrlFilter,
  useUrlMultiFilter,
  useUrlPagination,
} from "@/shared/hooks"

import { mapCrmLead } from "../../api"
import { useLeads } from "./useLeads"

export const REJECTED_LEADS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

// Container logic for the Rejected Leads list page: search/owner/date-range/
// pagination state plus the single (stage="Rejected") list query and its
// derived rows. The same /crm/leads endpoint backs both lists, so date_from/
// date_to apply here just like on the active Leads list.
export function useRejectedLeads() {
  const navigate = useNavigate()
  // Filters + page live in the URL so they persist across refresh, detail
  // round-trips, and browser back/forward (each filter setter clears `?page`).
  const { setMany: setManyParams } = useFilterParams()
  const [search, setSearch] = useUrlFilter("search", "")
  // Owner filter — multi-select user ids, sent as `assigned_to` (the table's
  // Owner column is the lead's assignee). Same URL key as the Leads list.
  const [selectedOwners, setSelectedOwners] = useUrlMultiFilter("assigned_to")
  // Assignment filter — "unassigned" swaps the owner match for the backend's
  // `unassigned=true`. Same URL key + semantics as the Leads list.
  const [selectedAssignment, setSelectedAssignment] = useUrlFilter("assignment", "__all__")
  const onlyUnassigned = selectedAssignment === "unassigned"
  const ownerFilter =
    !onlyUnassigned && selectedOwners.length > 0 ? selectedOwners : undefined
  // Category / OEM filters — multi-select IMS ids (same URL keys as Leads).
  const [selectedCategories, setSelectedCategories] = useUrlMultiFilter("category_id")
  const [selectedOems, setSelectedOems] = useUrlMultiFilter("oem_id")
  // Rejected-date range filter (URL keys `rejected_from` / `rejected_to`).
  const [dateRange, setDateRange] = useUrlDateRange("rejected_from", "rejected_to")
  // Rejected-by (user ids) + rejection-reason (preset names) — multi-selects.
  const [selectedRejectors, setSelectedRejectors] = useUrlMultiFilter("rejected_by")
  const [selectedReasons, setSelectedReasons] = useUrlMultiFilter("rejection_reason")
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "rejected_size",
    defaultSize: REJECTED_LEADS_PAGE_SIZE,
  })

  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)
  const { date_from: rejected_from, date_to: rejected_to } = dateRangeToParams(dateRange)

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch || undefined,
      stage: "Rejected" as const,
      assigned_to: ownerFilter,
      unassigned: onlyUnassigned || undefined,
      category_ids: selectedCategories.length > 0 ? selectedCategories : undefined,
      oem_ids: selectedOems.length > 0 ? selectedOems : undefined,
      rejected_from,
      rejected_to,
      rejected_by: selectedRejectors.length > 0 ? selectedRejectors : undefined,
      rejection_reasons: selectedReasons.length > 0 ? selectedReasons : undefined,
    }),
    [page, pageSize, debouncedSearch, ownerFilter, onlyUnassigned, selectedCategories, selectedOems, rejected_from, rejected_to, selectedRejectors, selectedReasons],
  )

  const { data, isLoading, isError, error, isFetching } = useLeads(params)

  const rejectedLeads = useMemo(
    () => (data?.items ?? []).map(mapCrmLead),
    [data?.items],
  )

  const handleDateRangeChange = setDateRange
  const handleOnlyUnassignedChange = (checked: boolean) =>
    setSelectedAssignment(checked ? "unassigned" : "__all__")

  const activeFilterCount =
    (onlyUnassigned ? 1 : 0) +
    (ownerFilter ? 1 : 0) +
    (selectedCategories.length > 0 ? 1 : 0) +
    (selectedOems.length > 0 ? 1 : 0) +
    (dateRange?.from || dateRange?.to ? 1 : 0) +
    (selectedRejectors.length > 0 ? 1 : 0) +
    (selectedReasons.length > 0 ? 1 : 0)

  // Open the filter panel by default when the page mounts with filters already
  // applied (shared/bookmarked URL, or back-nav from a detail page) so the
  // active filters are visible. Lazy initializer ⇒ only the first render
  // decides; the user can still toggle it freely afterwards.
  const [filtersOpen, setFiltersOpen] = useMemoryState("crm:rejected-leads:filtersOpen", () => activeFilterCount > 0)

  const clearFilters = useCallback(() => {
    setManyParams({
      assigned_to: null,
      assignment: null,
      category_id: null,
      oem_id: null,
      rejected_from: null,
      rejected_to: null,
      rejected_by: null,
      rejection_reason: null,
    })
  }, [setManyParams])

  const totalRejected = data?.total ?? 0

  const openLead = useCallback(
    (id: string) => navigate(`/crm/leads/${id}?from=rejected`),
    [navigate],
  )

  return {
    search,
    setSearch,
    selectedOwners,
    setSelectedOwners,
    onlyUnassigned,
    handleOnlyUnassignedChange,
    selectedCategories,
    setSelectedCategories,
    selectedOems,
    setSelectedOems,
    dateRange,
    handleDateRangeChange,
    selectedRejectors,
    setSelectedRejectors,
    selectedReasons,
    setSelectedReasons,
    filtersOpen,
    setFiltersOpen,
    page,
    setPage,
    pageSize,
    setPageSize,
    rejectedLeads,
    isLoading,
    isError,
    error,
    isFetching,
    activeFilterCount,
    clearFilters,
    totalRejected,
    openLead,
  }
}
