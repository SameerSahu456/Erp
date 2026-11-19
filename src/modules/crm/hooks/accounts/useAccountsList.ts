import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"

import type { ToolbarFilter } from "../../components/shared/CrmDataTable"
import type {
  CrmListFilterCheckbox,
  CrmListFilterSelect,
} from "../../components/shared/CrmListFilterPanel"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"
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
import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { ACCOUNTS_STRINGS as S } from "../../components/accounts/accounts.strings"
import {
  ACCOUNT_HIERARCHY_ROLES,
  ACCOUNT_STATUSES,
  ACCOUNT_TYPE_VALUES,
  COMPANY_SIZE_OPTIONS,
  INDUSTRY_OPTIONS,
  type AccountApprovalStatus,
  type AccountHierarchyRole,
  type AccountStatus,
  type AccountTagWire,
  type AccountTypeWire,
  type CompanySizeWire,
} from "../../api"
import { useAccounts } from "./useAccounts"
import { useRentalAccountFilters } from "./useRentalAccountFilters"

export const ACCOUNTS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE
const ALL = "__all__"

export interface UseAccountsListOptions {
  enabled?: boolean
  /** KYC approval filter for the list query. Defaults to `["Approved"]` — the
   *  "All Accounts" tab shows only approved accounts. The admin-only Rejected
   *  tab passes `["Rejected"]`. */
  approvalStatuses?: AccountApprovalStatus[]
  /** Namespace for persisted filter state + URL pager keys, so two instances
   *  of this hook on the same route (All Accounts vs Rejected tab) don't share
   *  filters or collide on `?page`. Defaults to `"accounts"`. */
  persistPrefix?: string
  /** URL key for the page-number param. Defaults to `"page"`. */
  pageKey?: string
  /** Narrow the listing to accounts the rentals module claims — those with
   *  a rental sales order (in any state, including closed) or with rental
   *  billing defaults set. Powers Rentals › Accounts, which is THIS list
   *  filtered, not a separate one. */
  hasRentals?: boolean
}

// Container logic for the Accounts list page: persisted filter state (with
// stale-enum sanitization), the list query, and the toolbar-filter wiring.
export function useAccountsList(options?: UseAccountsListOptions) {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canWriteAccount = can([...crmCan.writeAccount])

  // Pager namespace (per-tab `?<prefix>_size` / `pageKey`) so the admin-only
  // Rejected tab doesn't collide with All Accounts on the same route.
  const prefix = options?.persistPrefix ?? "accounts"
  // Stabilize the approval filter by its contents so a fresh literal from the
  // caller (`["Approved"]` each render) doesn't churn the query memo/key.
  const approvalKey = (options?.approvalStatuses ?? ["Approved"]).join(",")
  const approvalStatuses = useMemo(
    () => approvalKey.split(",") as AccountApprovalStatus[],
    [approvalKey],
  )

  // Every filter lives in the URL (mirrors pagination) so it survives refresh,
  // detail round-trips, and browser back/forward. Each setter clears `?page`
  // for free.
  //
  // Filter keys are namespaced by `prefix` (like the pager's `${prefix}_size`)
  // so two instances of this hook on the SAME route — All Accounts and the
  // admin-only Rejected tab — don't share `?search` / `?status` / …. Without
  // this, a filter set on one tab leaked onto the other.
  const { setMany: setManyParams } = useFilterParams()
  const [search, setSearch] = useUrlFilter(`${prefix}_search`, "")
  const [selectedStatus, setSelectedStatus] = useUrlFilter(`${prefix}_status`, ALL)
  const [selectedTag, setSelectedTag] = useUrlFilter(`${prefix}_tag`, ALL)
  // Multi-select "Channel Type" (same control as Quotes / Sales Orders),
  // comma-encoded under one URL key. 2026-05-19: account_type enum shifted;
  // drop any stale value the backend would reject (§11.1), keeping the rest.
  const [rawSelectedTypes, setSelectedTypes] = useUrlMultiFilter(`${prefix}_type`)
  const selectedTypes = useMemo(
    () =>
      rawSelectedTypes.filter((t) =>
        (ACCOUNT_TYPE_VALUES as readonly string[]).includes(t),
      ),
    [rawSelectedTypes],
  )
  const [rawSelectedCompanySize, setSelectedCompanySize] =
    useUrlFilter(`${prefix}_company_size`, ALL)
  // Same guard for the new company_size enum.
  const selectedCompanySize = useMemo(() => {
    if (rawSelectedCompanySize === ALL) return ALL
    return (COMPANY_SIZE_OPTIONS as readonly string[]).includes(
      rawSelectedCompanySize,
    )
      ? rawSelectedCompanySize
      : ALL
  }, [rawSelectedCompanySize])
  const [industryFilter, setIndustryFilter] = useUrlFilter(`${prefix}_industry`, "")
  // Hierarchy-role filter: parent (root) / child (has a parent) / ALL.
  const [rawSelectedHierarchy, setSelectedHierarchy] = useUrlFilter(
    `${prefix}_hierarchy_role`,
    ALL,
  )
  const selectedHierarchy = useMemo(() => {
    if (rawSelectedHierarchy === ALL) return ALL
    return (ACCOUNT_HIERARCHY_ROLES as readonly string[]).includes(
      rawSelectedHierarchy,
    )
      ? rawSelectedHierarchy
      : ALL
  }, [rawSelectedHierarchy])
  // "Has access" checkbox — only accounts the viewer can already open. The URL
  // holds `has` while ticked and nothing otherwise; §11.1 — any other
  // hand-edited value counts as unticked, so the box never hides a filter.
  const [rawAccess, setRawAccess] = useUrlFilter(`${prefix}_access`, "")
  const hasAccessOnly = rawAccess === "has"
  const setHasAccessOnly = useCallback(
    (on: boolean) => setRawAccess(on ? "has" : ""),
    [setRawAccess],
  )
  // Created-date range filter (URL-backed via <prefix>_date_from / _date_to).
  const [dateRange, setDateRange] = useUrlDateRange(
    `${prefix}_date_from`,
    `${prefix}_date_to`,
  )
  const { date_from, date_to } = dateRangeToParams(dateRange)
  // Owner filter — multi-select. Stored as a list of user ids; the trigger
  // shows a count (no labels needed), so we don't hydrate the picked users.
  const [selectedOwnerIds, setSelectedOwnerIds] = useUrlMultiFilter(`${prefix}_owner_ids`)
  // Rentals scope and owner options (inert unless `hasRentals`).
  const hasRentals = options?.hasRentals === true
  const rental = useRentalAccountFilters(hasRentals)
  // Channel Type, Industry, Entity Type and Approved By are CRM facets:
  // Rentals › Accounts keeps only Status, First Rental Order and Owner.
  const crmOnly = !hasRentals
  // "Approved By" filter — multi-select of the users who approved the account.
  const [selectedApprovedBy, setSelectedApprovedBy] = useUrlMultiFilter(
    `${prefix}_approved_by`,
  )
  // Filter aside (Industry / Entity Type); the main chips stay in the toolbar.
  const [filtersOpen, setFiltersOpen] = useMemoryState("crm:accounts:filtersOpen", false)
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)
  const debouncedIndustry = useDebounce(industryFilter.trim(), UI.DEBOUNCE_SEARCH_MS)

  // §16 — page + page size in the URL (mirrors IMS). Filter changes reset to
  // page 1 automatically because each URL-backed filter setter clears `?page`.
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: `${prefix}_size`,
    pageKey: options?.pageKey ?? "page",
    defaultSize: ACCOUNTS_PAGE_SIZE,
  })

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch || undefined,
      status:
        selectedStatus !== ALL ? (selectedStatus as AccountStatus) : undefined,
      tag: selectedTag !== ALL ? (selectedTag as AccountTagWire) : undefined,
      account_type:
        crmOnly && selectedTypes.length > 0 ? (selectedTypes as AccountTypeWire[]) : undefined,
      company_size:
        selectedCompanySize !== ALL
          ? (selectedCompanySize as CompanySizeWire)
          : undefined,
      industry: (crmOnly && debouncedIndustry) || undefined,
      hierarchy_role:
        crmOnly && selectedHierarchy !== ALL
          ? (selectedHierarchy as AccountHierarchyRole)
          : undefined,
      access: crmOnly && hasAccessOnly ? ("has" as const) : undefined,
      date_from,
      date_to,
      owner_ids: selectedOwnerIds.length > 0 ? selectedOwnerIds : undefined,
      approved_by: crmOnly && selectedApprovedBy.length > 0 ? selectedApprovedBy : undefined,
      // Approval filter is caller-controlled: the "All Accounts" tab passes
      // ["Approved"] (default); the admin-only Rejected tab passes ["Rejected"].
      // Pending accounts never appear here — they live in the Approval queue.
      approval_statuses: approvalStatuses,
      ...rental.params,
      sort: "-created_at",
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      selectedStatus,
      selectedTag,
      selectedTypes,
      selectedCompanySize,
      debouncedIndustry,
      selectedHierarchy,
      hasAccessOnly,
      crmOnly,
      date_from,
      date_to,
      selectedOwnerIds,
      selectedApprovedBy,
      approvalStatuses,
      rental.params,
      crmOnly,
    ],
  )

  const { data, isLoading, isError, error, isFetching } = useAccounts(queryParams, {
    enabled: options?.enabled ?? true,
  })

  const total = data?.total ?? 0

  // Toolbar chips: Created Date, Status (+ Channel Type / Account Owners / Approved By,
  // rendered by the table via `extraFilters`). Industry and Entity Type live in
  // the filter aside.
  const toolbarFilters: ToolbarFilter[] = useMemo(
    () => [
      {
        key: "status",
        label: S.list.filters.statusLabel,
        allLabel: S.list.filters.statusAll,
        value: selectedStatus === ALL ? "" : selectedStatus,
        options: ACCOUNT_STATUSES.map((s) => ({ value: s, label: s })),
      },
      // Tag filter hidden from the Accounts toolbar (kept here, commented, so the
      // state/handlers stay wired for easy re-enable).
      // {
      //   key: "tag",
      //   label: "Tag",
      //   allLabel: "All tags",
      //   value: selectedTag === ALL ? "" : selectedTag,
      //   options: ACCOUNT_TAGS.map((t) => ({ value: t, label: t })),
      // },
      // Size filter hidden from the Accounts toolbar (kept here, commented, so
      // the state/handlers stay wired for easy re-enable).
      // {
      //   key: "company_size",
      //   label: S.list.filters.sizeLabel,
      //   allLabel: S.list.filters.sizeAll,
      //   value: selectedCompanySize === ALL ? "" : selectedCompanySize,
      //   options: COMPANY_SIZE_OPTIONS.map((s) => ({ value: s, label: s })),
      // },
      {
        kind: "daterange",
        key: "created_date",
        // Under the rentals scope the range is on the FIRST RENTAL ORDER
        // (server-side), and neither date can be in the future.
        label: hasRentals ? S.list.filters.firstRentalOrder : S.list.filters.createdDate,
        placeholder: hasRentals ? S.list.filters.firstRentalOrder : S.list.filters.createdDate,
        value: dateRange,
        disableFuture: hasRentals || undefined,
      },
    ],
    [selectedStatus, dateRange, hasRentals],
  )

  // Channel Type options for the toolbar chip (shared allow-list). Empty under
  // the rentals scope, which hides the Type filter.
  const typeOptions = useMemo(
    () => (crmOnly ? ACCOUNT_TYPE_VALUES.map((t) => ({ value: t, label: t })) : []),
    [crmOnly],
  )

  // Filter-aside fields: the rest of the filters that aren't toolbar chips.
  // Rentals › Accounts hides Industry and Entity type.
  const asideSelects: CrmListFilterSelect[] = useMemo(
    () =>
      crmOnly
        ? [
            {
              key: "industry",
              label: S.list.filters.industryLabel,
              allLabel: S.list.filters.industryAll,
              value: industryFilter,
              options: INDUSTRY_OPTIONS.map((i) => ({ value: i, label: i })),
              onChange: (v) => setIndustryFilter(v),
            },
            {
              key: "hierarchy_role",
              label: S.list.filters.entityType,
              allLabel: S.list.filters.entityType,
              value: selectedHierarchy === ALL ? "" : selectedHierarchy,
              options: [
                { value: "parent", label: "Parent" },
                { value: "child", label: "Child" },
              ],
              onChange: (v) => setSelectedHierarchy(v || ALL),
            },
          ]
        : [],
    [crmOnly, industryFilter, selectedHierarchy, setIndustryFilter, setSelectedHierarchy],
  )

  // On/off narrowings in the aside. CRM scope only — Rentals › Accounts has no
  // aside.
  const asideCheckboxes: CrmListFilterCheckbox[] = useMemo(
    () =>
      crmOnly
        ? [
            {
              key: "access",
              label: S.list.filters.accessHas,
              checked: hasAccessOnly,
              onChange: setHasAccessOnly,
            },
          ]
        : [],
    [crmOnly, hasAccessOnly, setHasAccessOnly],
  )

  // Every narrowing in play (toolbar chips + aside) — drives the Filters badge.
  const crmFacetCount =
    (selectedTypes.length > 0 ? 1 : 0) +
    (industryFilter ? 1 : 0) +
    (selectedHierarchy !== ALL ? 1 : 0) +
    (hasAccessOnly ? 1 : 0) +
    (selectedApprovedBy.length > 0 ? 1 : 0)
  const activeFilterCount =
    (selectedStatus !== ALL ? 1 : 0) +
    (crmOnly ? crmFacetCount : 0) +
    (selectedOwnerIds.length > 0 ? 1 : 0) +
    (date_from || date_to ? 1 : 0)

  const handleToolbarDateRangeChange = useCallback(
    (_key: string, range: DateRange | undefined) => setDateRange(range),
    [setDateRange],
  )

  const handleToolbarFilterChange = useCallback((key: string, value: string) => {
    switch (key) {
      case "status":
        setSelectedStatus(value || ALL)
        break
      case "tag":
        setSelectedTag(value || ALL)
        break
      case "company_size":
        setSelectedCompanySize(value || ALL)
        break
      case "industry":
        setIndustryFilter(value)
        break
      case "hierarchy_role":
        setSelectedHierarchy(value || ALL)
        break
    }
  }, [setSelectedStatus, setSelectedTag, setSelectedCompanySize, setIndustryFilter, setSelectedHierarchy])

  // Clear every filter key in ONE navigation (sequential setters would stomp
  // each other on the shared URL). Page resets for free; page size stays.
  const handleClearFilters = useCallback(() => {
    setManyParams({
      [`${prefix}_search`]: null,
      [`${prefix}_status`]: null,
      [`${prefix}_tag`]: null,
      [`${prefix}_type`]: null,
      [`${prefix}_company_size`]: null,
      [`${prefix}_industry`]: null,
      [`${prefix}_hierarchy_role`]: null,
      [`${prefix}_access`]: null,
      [`${prefix}_date_from`]: null,
      [`${prefix}_date_to`]: null,
      [`${prefix}_owner_ids`]: null,
      [`${prefix}_approved_by`]: null,
    })
  }, [setManyParams, prefix])

  // The panel's "Clear all": every filter (toolbar chips + aside), but keeps the
  // search text.
  const resetAllFilters = useCallback(() => {
    setManyParams({
      [`${prefix}_status`]: null,
      [`${prefix}_tag`]: null,
      [`${prefix}_type`]: null,
      [`${prefix}_company_size`]: null,
      [`${prefix}_industry`]: null,
      [`${prefix}_hierarchy_role`]: null,
      [`${prefix}_access`]: null,
      [`${prefix}_date_from`]: null,
      [`${prefix}_date_to`]: null,
      [`${prefix}_owner_ids`]: null,
      [`${prefix}_approved_by`]: null,
    })
  }, [setManyParams, prefix])

  const openAccount = useCallback((id: string) => navigate(`/crm/accounts/${id}`), [navigate])
  const openAccountNew = useCallback(() => navigate("/crm/accounts/new"), [navigate])

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
    selectedOwnerIds,
    setSelectedOwnerIds,
    ownerOptionsSource: rental.ownerOptionsSource,
    hasRentals,
    selectedApprovedBy,
    setSelectedApprovedBy,
    selectedTypes,
    setSelectedTypes,
    typeOptions,
    toolbarFilters,
    asideSelects,
    asideCheckboxes,
    filtersOpen,
    setFiltersOpen,
    activeFilterCount,
    resetAllFilters,
    handleToolbarFilterChange,
    handleToolbarDateRangeChange,
    handleClearFilters,
    canWriteAccount,
    openAccount,
    openAccountNew,
  }
}
