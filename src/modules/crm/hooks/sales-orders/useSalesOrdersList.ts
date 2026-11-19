import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"

import type { ToolbarFilter } from "../../components/shared/CrmDataTable"
import type { SortDirection } from "../../components/shared/crm-data-table/types"
import type {
  CrmListFilterDateRange,
  CrmListFilterEnumMultiSelect,
  CrmListFilterSelect,
  CrmListFilterUserMultiSelect,
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
  useUrlValueRange,
} from "@/shared/hooks"
import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { SO_STATUS_LABELS } from "../../constants/so-status"
import { CHANNEL_TYPES, CHANNEL_TYPE_LABELS } from "../../constants/channel-types"
import { useSalesOrders } from "./useSalesOrders"
import { useRememberSoListSearch } from "./soListHref"
import { SALES_ORDERS_STRINGS as S } from "../../components/sales-orders/sales-orders.strings"
import type { SalesOrderListItemWire, SOStatus } from "../../api"

// §16.6 — single source for page size; never hardcode a literal in the
// pagination config. Mirrors QuotesPage / LeadsPage / DealsPage.
export const SO_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

export type StatusTab = "all" | SOStatus

// Statuses surfaced in the status filter dropdown — every status an SO can
// hold, in lifecycle order. Labels come from SO_STATUS_LABELS.
const SO_STATUSES: SOStatus[] = [
  "Draft",
  "Submitted",
  "PartiallyApproved",
  "Approved",
  "Amend",
  "Rejected",
  "Account Approval Pending",
  "Account Rejected",
  "PartiallyDispatched",
  "Dispatched",
  "PartiallyReturned",
  "Returned",
  "Cancelled",
]

// Frontend column key → backend sort field. Only columns the backend's
// `_SORTABLE_FIELDS` map allows (sales_order_repository.py) are mapped here;
// clicks on any other column clear the sort instead of 422-ing the server.
const SO_SORT_FIELD_MAP: Record<string, string> = {
  orderNumber: "order_number",
  status: "status",
  createdAt: "created_at",
  submittedAt: "submitted_at",
  grandTotal: "grand_total",
}
const SO_SORT_COLUMN_BY_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(SO_SORT_FIELD_MAP).map(([col, field]) => [field, col]),
)
const SO_DEFAULT_SORT = "-created_at"

// Defensive fallback: the backend resolves orderable_number from the upstream
// row (Account.code / Deal.deal_number / Lead.lead_code), but if that row is
// soft-deleted or the FK is orphaned the value comes back null. Show the
// UUID's first 8 chars in that rare case so the row still has *something*.
function shortId(id: string): string {
  return id.slice(0, 8)
}

// Container logic for the Sales Orders list: owns the status-tab / page /
// search state (§16.7 server pagination), runs the query, and shapes the wire
// rows into the table's row model.
export function useSalesOrdersList() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canWriteSo = can([...crmCan.writeSo])

  // Every filter lives in the URL (mirrors pagination) so it survives refresh,
  // detail round-trips, and browser back/forward. Each setter clears `?page`.
  const { setMany: setManyParams } = useFilterParams()
  const [tabValue] = useUrlFilter("status", "all")
  // §11.1 — an unknown `?status=` falls back to "all" instead of reaching the
  // API as a 422.
  const tab: StatusTab = tabValue in SO_STATUS_LABELS ? (tabValue as StatusTab) : "all"
  // §16 — page + page size in the URL (mirrors IMS). A size change clears
  // `page` atomically; filter changes clear it via the URL-backed setters.
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "so_size",
    defaultSize: SO_PAGE_SIZE,
  })
  // Detail / form pages address the list explicitly instead of popping
  // history, so stamp the query string for them to re-attach on the way back.
  useRememberSoListSearch()
  const [rawSearch, setRawSearch] = useUrlFilter("search", "")
  // Multi-select "Created By" filter (URL-backed, comma-encoded under one key).
  const [selectedCreatedBy, setSelectedCreatedBy] = useUrlMultiFilter("created_by")
  // Multi-select "Submitted By" filter — same shape, backed by its own URL key.
  // Serialized to the API as repeated `?submitted_by=` keys (see fetchSalesOrders).
  const [selectedSubmittedBy, setSelectedSubmittedBy] = useUrlMultiFilter("submitted_by")
  // Multi-select "Account" filter — repeated `?account_id=` keys on the API.
  const [selectedAccounts, setSelectedAccounts] = useUrlMultiFilter("account_id")
  // Multi-select "Approver" filter — repeated `?approver_id=` keys on the API.
  // "Approved By": the backend matches via EXISTS over lines that are Approved
  // AND decided by a selected user (line_status + line_decided_by_id), so an SO
  // qualifies when AT LEAST ONE of its lines was approved by one of them —
  // assigned-but-undecided (Pending / Rejected) lines don't count.
  const [selectedApprovers, setSelectedApprovers] = useUrlMultiFilter("approver_id")
  // Total (grand_total) range — inclusive Min / Max.
  const [totalRange, setTotalRange] = useUrlValueRange("min_total", "max_total", 14)
  // Multi-select "Channel Type" filter — repeated `?channel_type=` keys. Values
  // are the LEAD_CHANNEL_TYPES allow-list; account-sourced SOs drop out while
  // the filter is active (channel lives on lead/deal, not on account).
  const [rawChannelTypes, setSelectedChannelTypes] = useUrlMultiFilter("channel_type")
  const selectedChannelTypes = useMemo(
    () => rawChannelTypes.filter((c) => (CHANNEL_TYPES as readonly string[]).includes(c)),
    [rawChannelTypes],
  )
  // Category / OEM filters — match through the order's LINE ITEMS (IMS ids).
  const [selectedCategories, setSelectedCategories] = useUrlMultiFilter("category_id")
  const [selectedOems, setSelectedOems] = useUrlMultiFilter("oem_id")
  // URL-backed sort token in backend format (`-created_at`, `grand_total`, …).
  // Default is empty — the hook falls back to `-created_at` when sending to
  // the API, so the clean "no sort chosen" state has no `?sort=` on the URL.
  const [sortToken, setSortToken] = useUrlFilter("sort", "")
  const debouncedSearch = useDebounce(rawSearch.trim().slice(0, UI.FILTER_SEARCH_MAX_LENGTH), 300)
  // Filter aside (status / created-by); Created Date stays in the toolbar.
  const [filtersOpen, setFiltersOpen] = useMemoryState("crm:sales-orders:filtersOpen", false)

  // Created-date range filter (URL-backed via date_from / date_to).
  const [dateRange, setDateRange] = useUrlDateRange()
  const { date_from, date_to } = dateRangeToParams(dateRange)
  // Submitted-date range filter — separate URL keys so the two don't overwrite
  // each other, same IST-day semantics as Created Date.
  const [submittedRange, setSubmittedRange] = useUrlDateRange(
    "submitted_from",
    "submitted_to",
  )
  const { date_from: submitted_from, date_to: submitted_to } =
    dateRangeToParams(submittedRange)

  const handleSearchChange = setRawSearch
  const handleToolbarDateRangeChange = useCallback(
    (key: string, range: DateRange | undefined) => {
      if (key === "submitted_date") setSubmittedRange(range)
      else setDateRange(range)
    },
    [setDateRange, setSubmittedRange],
  )
  // The panel's "Clear all": clears EVERY filter — the aside's own (Created By,
  // Channel Type, Submitted Date) and the toolbar chips (Status, Submitted By,
  // Account, Approved By, Created Date) — but keeps the search text and sort.
  const resetAsideFilters = useCallback(
    () =>
      setManyParams({
        status: null,
        created_by: null,
        submitted_by: null,
        account_id: null,
        approver_id: null,
        channel_type: null,
        category_id: null,
        oem_id: null,
        min_total: null,
        max_total: null,
        date_from: null,
        date_to: null,
        submitted_from: null,
        submitted_to: null,
      }),
    [setManyParams],
  )
  function clearFilters() {
    setManyParams({
      status: null,
      search: null,
      created_by: null,
      submitted_by: null,
      account_id: null,
      approver_id: null,
      channel_type: null,
      category_id: null,
      oem_id: null,
      min_total: null,
      max_total: null,
      date_from: null,
      date_to: null,
      submitted_from: null,
      submitted_to: null,
    })
  }

  const status: SOStatus | undefined = tab === "all" ? undefined : tab
  const created_by = selectedCreatedBy.length > 0 ? selectedCreatedBy : undefined
  const submitted_by = selectedSubmittedBy.length > 0 ? selectedSubmittedBy : undefined
  const account_id = selectedAccounts.length > 0 ? selectedAccounts : undefined
  const approver_id = selectedApprovers.length > 0 ? selectedApprovers : undefined
  const channel_type =
    selectedChannelTypes.length > 0 ? selectedChannelTypes : undefined
  const category_ids = selectedCategories.length > 0 ? selectedCategories : undefined
  const oem_ids = selectedOems.length > 0 ? selectedOems : undefined

  // Derive column + direction for the table's header UI from the URL-backed
  // token. Unknown fields (e.g. a stale bookmark referencing a since-removed
  // sort key) land on `null/null` so the header reads "unsorted" rather than
  // visually highlighting a column we're not actually sorting on.
  const { sortColumn, sortDirection } = useMemo<{
    sortColumn: string | null
    sortDirection: SortDirection
  }>(() => {
    if (!sortToken) return { sortColumn: null, sortDirection: null }
    const descending = sortToken.startsWith("-")
    const field = sortToken.replace(/^-/, "")
    const col = SO_SORT_COLUMN_BY_FIELD[field]
    if (!col) return { sortColumn: null, sortDirection: null }
    return { sortColumn: col, sortDirection: descending ? "desc" : "asc" }
  }, [sortToken])

  const setSort = useCallback(
    (column: string | null, direction: SortDirection) => {
      if (!column || !direction) {
        setSortToken("")
        return
      }
      const field = SO_SORT_FIELD_MAP[column]
      // Unsupported column (not in the backend allow-list) — clear instead of
      // sending a token the server will fall back on anyway.
      if (!field) {
        setSortToken("")
        return
      }
      setSortToken(`${direction === "desc" ? "-" : ""}${field}`)
    },
    [setSortToken],
  )

  // §16.7 — server-paginated list. The page owns `page`; it resets to 1 on
  // any filter change and the footer fires `onPageChange` to refetch.
  const { data, isLoading, isError, error, isFetching } = useSalesOrders({
    page,
    page_size: pageSize,
    status,
    account_id,
    created_by,
    submitted_by,
    approver_id,
    channel_type,
    category_ids,
    oem_ids,
    min_total: totalRange?.min,
    max_total: totalRange?.max,
    search: debouncedSearch || undefined,
    date_from,
    date_to,
    submitted_from,
    submitted_to,
    // Only a sort field the table actually offers reaches the API (§11.1).
    sort: sortColumn ? sortToken : SO_DEFAULT_SORT,
  })

  const total = data?.total ?? 0

  // Attribution names ride the list response itself (`created_by_detail` /
  // `submitted_by_detail`), resolved server-side in one batched query per page.
  //
  // This replaced a `useUsersByIds(submittedByIds)` call that collected every
  // row's `submitted_by_id` and fetched the names separately — a second request
  // per page, plus a render where the column read "—" until it landed. The
  // server already joins `users`, so the round-trip bought nothing.

  // Toolbar hosts the high-visibility filters: Status (single-select),
  // Submitted By + Account + Approved By (rendered inline via `extraFilters`
  // on the table), and the Created Date chip (date-range, rightmost by the
  // toolbar's layout contract — see trailingFilters for the aside toggle).
  const toolbarFilters: ToolbarFilter[] = useMemo(
    () => [
      {
        key: "status",
        label: S.list.filters.statusLabel,
        allLabel: S.list.filters.statusAll,
        value: tab === "all" ? "" : tab,
        options: SO_STATUSES.map((s) => ({ value: s, label: SO_STATUS_LABELS[s] })),
      },
      {
        kind: "daterange",
        key: "submitted_date",
        label: S.list.filters.submittedDateLabel,
        placeholder: S.list.filters.submittedDateLabel,
        value: submittedRange,
      },
    ],
    [tab, submittedRange],
  )

  const handleToolbarFilterChange = useCallback(
    (key: string, value: string) => {
      if (key === "status") setManyParams({ status: value || null })
    },
    [setManyParams],
  )

  // Nothing left in the aside's single-select slot — Status moved to the
  // toolbar. The slot stays wired on the controller so adding a new one later
  // is a one-line change.
  const asideSelects: CrmListFilterSelect[] = useMemo(() => [], [])

  // Approved By is a toolbar chip now (right before Created Date), so the
  // aside's user-multi-select slot is empty. Keep the slot wired for future
  // narrowings that genuinely belong in the aside.
  const asideUserMultiSelects: CrmListFilterUserMultiSelect[] = useMemo(() => [], [])

  // Channel Type is a small enum (4 values) — rendered as a checkbox list in
  // the aside, not a dropdown. Values come straight from CHANNEL_TYPES so the
  // allow-list stays in one place (also validated by the backend endpoint).
  const asideEnumMultiSelects: CrmListFilterEnumMultiSelect[] = useMemo(
    () => [
      {
        key: "channel_type",
        label: S.list.filters.channelTypeLabel,
        value: selectedChannelTypes,
        options: CHANNEL_TYPES.map((c) => ({ value: c, label: CHANNEL_TYPE_LABELS[c] })),
        onChange: setSelectedChannelTypes,
      },
    ],
    [selectedChannelTypes, setSelectedChannelTypes],
  )

  // Submitted On lives in the toolbar; Created On lives in the aside.
  const asideDateRanges: CrmListFilterDateRange[] = useMemo(
    () => [
      {
        key: "created_date",
        label: S.list.filters.createdDateLabel,
        value: dateRange,
        onChange: setDateRange,
      },
    ],
    [dateRange, setDateRange],
  )

  // Submitted By + Account chips sit in the toolbar but still count toward the
  // aside badge, so the "Filters" button reflects every narrowing in play.
  const activeFilterCount =
    (status ? 1 : 0) +
    (created_by ? 1 : 0) +
    (submitted_by ? 1 : 0) +
    (account_id ? 1 : 0) +
    (approver_id ? 1 : 0) +
    (channel_type ? 1 : 0) +
    (category_ids ? 1 : 0) +
    (oem_ids ? 1 : 0) +
    (totalRange?.min != null || totalRange?.max != null ? 1 : 0) +
    (submitted_from || submitted_to ? 1 : 0) +
    (date_from || date_to ? 1 : 0)

  // Any narrowing in play — search, the Created Date chip, or anything counted by
  // the Filters badge. Drives the "no match" empty state (vs. "no orders yet").
  const hasActiveFilters =
    activeFilterCount > 0 || debouncedSearch.length > 0

  const rows = useMemo(
    () =>
      (data?.items ?? []).map((so: SalesOrderListItemWire) => ({
        id: so.id,
        orderNumber: so.order_number,
        // Tunnelled so the order-number cell can flag demo-sourced SOs.
        fromDemo: so.source_demo_request_id != null,
        // A charge order bills a rental deficiency and is never dispatched.
        isCharge: so.order_kind === "charge",
        version: so.version_number,
        // Flags a rental order next to its number, like Demo / Charge.
        isRental: so.sellable_type === "rental_sales",
        // `orderable` carries the human-readable code shown in the "For"
        // column. We tunnel `orderableType` + `orderableId` through the row
        // shape so the cell formatter can render a Link to the source
        // lead/deal/account — see the formatter below.
        orderable: `${so.orderable_number ?? shortId(so.orderable_id)}`,
        orderableType: so.orderable_type,
        orderableId: so.orderable_id,
        // 2026-05-27 enrichment — defensive `?? "—"` / `?? 0` for the
        // window where the running backend hasn't shipped these fields.
        accountName: so.account_name ?? "—",
        channelType: so.channel_type ?? "—",
        itemsCount: so.items_count ?? 0,
        status: so.status,
        labels: so.labels,
        grandTotal: so.grand_total,
        submittedAt: so.submitted_at,
        // Draft rows have no submitter yet — `submitted_by_detail` is null and
        // the column reads "—". A non-null ref with a null `name` means the
        // user row was soft-deleted, which lands on "—" too.
        submittedBy: so.submitted_by_detail?.name ?? "—",
        approvedByUsers: so.approved_by ?? [],
        createdBy: so.created_by_detail?.name ?? "—",
        createdAt: so.created_at,
      })),
    [data?.items],
  )

  return {
    tab,
    page,
    setPage,
    pageSize,
    setPageSize,
    rawSearch,
    handleSearchChange,
    selectedCreatedBy,
    setSelectedCreatedBy,
    selectedSubmittedBy,
    setSelectedSubmittedBy,
    selectedAccounts,
    setSelectedAccounts,
    selectedApprovers,
    setSelectedApprovers,
    totalRange,
    setTotalRange,
    selectedCategories,
    setSelectedCategories,
    selectedOems,
    setSelectedOems,
    sortColumn,
    sortDirection,
    setSort,
    toolbarFilters,
    handleToolbarFilterChange,
    asideSelects,
    asideUserMultiSelects,
    asideEnumMultiSelects,
    asideDateRanges,
    filtersOpen,
    setFiltersOpen,
    activeFilterCount,
    hasActiveFilters,
    resetAsideFilters,
    handleToolbarDateRangeChange,
    clearFilters,
    rows,
    total,
    isLoading,
    isError,
    error,
    isFetching,
    canWriteSo,
    goToNew: () => navigate("/crm/sales-orders/new"),
    goToDetail: (id: string) => navigate(`/crm/sales-orders/${id}`),
  }
}

export type SalesOrdersListController = ReturnType<typeof useSalesOrdersList>
