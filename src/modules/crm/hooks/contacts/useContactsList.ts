import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"

import type { ToolbarFilter } from "../../components/shared/CrmDataTable"
import type { CrmListFilterSelect } from "../../components/shared/CrmListFilterPanel"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import { PAGINATION, UI } from "@/shared/constants"
import { dateRangeToParams } from "@/shared/lib/date"
import {
  useDebounce,
  useFilterParams,
  useMemoryState,
  useUrlBoolFilter,
  useUrlDateRange,
  useUrlFilter,
  useUrlPagination,
} from "@/shared/hooks"
import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import {
  CONTACT_DEPARTMENT_OPTIONS,
  CONTACT_STATUSES,
  type ContactStatus,
} from "../../api"
import { useContacts } from "./useContacts"

export const CONTACTS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

const ALL = "__all__"
const TRI_ALL = "__all__"
const TRI_YES = "yes"
const TRI_NO = "no"

// Container logic for the Contacts list page: persisted filter state, the
// list query, and the toolbar-filter wiring.
export function useContactsList() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canWriteContact = can([...crmCan.writeContact])

  // Every filter lives in the URL (mirrors pagination) so it survives refresh,
  // detail round-trips, and browser back/forward. Each setter clears `?page`.
  const { setMany: setManyParams } = useFilterParams()
  const [search, setSearch] = useUrlFilter("search", "")
  const [selectedStatus, setSelectedStatus] = useUrlFilter("status", ALL)
  const [selectedDepartment, setSelectedDepartment] = useUrlFilter("department", ALL)
  const [hasEmail, setHasEmail] = useUrlFilter("has_email", TRI_ALL)
  const [hasPhone, setHasPhone] = useUrlFilter("has_phone", TRI_ALL)
  const [orphanOnly, setOrphanOnly] = useUrlBoolFilter("is_orphan")
  // Created-date range filter (URL-backed via date_from / date_to).
  const [dateRange, setDateRange] = useUrlDateRange()
  const { date_from, date_to } = dateRangeToParams(dateRange)
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)

  // §16 — page + page size in the URL (mirrors IMS). Filter changes reset to
  // page 1 automatically because each URL-backed filter setter clears `?page`.
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "contacts_size",
    defaultSize: CONTACTS_PAGE_SIZE,
  })

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch || undefined,
      status:
        selectedStatus !== ALL ? (selectedStatus as ContactStatus) : undefined,
      department: selectedDepartment !== ALL ? selectedDepartment : undefined,
      has_email:
        hasEmail === TRI_YES ? true : hasEmail === TRI_NO ? false : undefined,
      has_phone:
        hasPhone === TRI_YES ? true : hasPhone === TRI_NO ? false : undefined,
      is_orphan: orphanOnly ? true : undefined,
      date_from,
      date_to,
      sort: "-created_at",
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      selectedStatus,
      selectedDepartment,
      hasEmail,
      hasPhone,
      orphanOnly,
      date_from,
      date_to,
    ],
  )

  const { data, isLoading, isError, error, isFetching } = useContacts(queryParams)

  // Filter aside (department / email / phone) — the Status chip stays in the
  // toolbar. Opens by default when the page mounts with filters already applied.
  const activeFilterCount =
    (selectedStatus !== ALL ? 1 : 0) +
    (selectedDepartment !== ALL ? 1 : 0) +
    (hasEmail !== TRI_ALL ? 1 : 0) +
    (hasPhone !== TRI_ALL ? 1 : 0) +
    (orphanOnly ? 1 : 0) +
    (dateRange?.from || dateRange?.to ? 1 : 0)
  const [filtersOpen, setFiltersOpen] = useMemoryState("crm:contacts:filtersOpen", () => activeFilterCount > 0)

  const total = data?.total ?? 0

  // Every filter rendered as an inline dropdown chip in the table toolbar —
  // the erp-demo CRM list-page layout. `has_email` / `has_phone` / orphan are
  // Comprint-only API params with no matching column, so they ride in as
  // column-independent `toolbarFilters`.
  const toolbarFilters: ToolbarFilter[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        allLabel: "Statuses",
        value: selectedStatus === ALL ? "" : selectedStatus,
        options: CONTACT_STATUSES.map((s) => ({ value: s, label: s })),
      },
      {
        kind: "daterange",
        key: "created_date",
        label: "Created On",
        // Empty-chip text — without it the picker falls back to "All Created On".
        placeholder: "Created On",
        value: dateRange,
      },
      // Linkage filter (Orphan only) hidden from the Contacts toolbar (kept
      // here, commented, so the state/handler stays wired for easy re-enable).
      // {
      //   key: "is_orphan",
      //   label: "Linkage",
      //   allLabel: "Linkage",
      //   value: orphanOnly ? "orphan" : "",
      //   options: [{ value: "orphan", label: "Orphan only" }],
      // },
    ],
    [selectedStatus, orphanOnly, dateRange],
  )

  // Filter-aside selects: the filters that aren't toolbar chips. `has_email` /
  // `has_phone` are API-only params with no matching column.
  const asideSelects: CrmListFilterSelect[] = useMemo(
    () => [
      {
        key: "department",
        label: "Department",
        allLabel: "Departments",
        value: selectedDepartment === ALL ? "" : selectedDepartment,
        options: CONTACT_DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d })),
        onChange: (v) => setSelectedDepartment(v || ALL),
      },
      {
        key: "has_email",
        label: "Email",
        allLabel: "Email",
        value: hasEmail === TRI_ALL ? "" : hasEmail,
        options: [
          { value: TRI_YES, label: "With email" },
          { value: TRI_NO, label: "Without email" },
        ],
        onChange: (v) => setHasEmail(v || TRI_ALL),
      },
      {
        key: "has_phone",
        label: "Phone",
        allLabel: "Phone",
        value: hasPhone === TRI_ALL ? "" : hasPhone,
        options: [
          { value: TRI_YES, label: "With phone" },
          { value: TRI_NO, label: "Without phone" },
        ],
        onChange: (v) => setHasPhone(v || TRI_ALL),
      },
    ],
    [selectedDepartment, hasEmail, hasPhone, setSelectedDepartment, setHasEmail, setHasPhone],
  )

  const handleToolbarFilterChange = useCallback((key: string, value: string) => {
    switch (key) {
      case "status":
        setSelectedStatus(value || ALL)
        break
      case "department":
        setSelectedDepartment(value || ALL)
        break
      case "has_email":
        setHasEmail(value || TRI_ALL)
        break
      case "has_phone":
        setHasPhone(value || TRI_ALL)
        break
      case "is_orphan":
        setOrphanOnly(value === "orphan")
        break
    }
  }, [setSelectedStatus, setSelectedDepartment, setHasEmail, setHasPhone, setOrphanOnly])

  const handleToolbarDateRangeChange = useCallback(
    (_key: string, range: DateRange | undefined) => setDateRange(range),
    [setDateRange],
  )

  // Clear every filter key in ONE navigation (sequential setters would stomp
  // each other on the shared URL). Page resets for free; page size stays.
  const handleClearFilters = useCallback(() => {
    setManyParams({
      search: null,
      status: null,
      department: null,
      has_email: null,
      has_phone: null,
      is_orphan: null,
      date_from: null,
      date_to: null,
    })
  }, [setManyParams])

  // The aside's "Clear all": every filter, but keep the search text.
  const resetAllFilters = useCallback(() => {
    setManyParams({
      status: null,
      department: null,
      has_email: null,
      has_phone: null,
      is_orphan: null,
      date_from: null,
      date_to: null,
    })
  }, [setManyParams])

  const openContact = useCallback((id: string) => navigate(`/crm/contacts/${id}`), [navigate])
  const openContactNew = useCallback(() => navigate("/crm/contacts/new"), [navigate])

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
    resetAllFilters,
    asideSelects,
    filtersOpen,
    setFiltersOpen,
    activeFilterCount,
    canWriteContact,
    openContact,
    openContactNew,
  }
}
