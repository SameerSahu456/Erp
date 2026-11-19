import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"

import type { ToolbarFilter } from "../../components/shared/CrmDataTable"
import type { SortDirection } from "../../components/shared/crm-data-table/types"
import type { CrmListFilterSelect } from "../../components/shared/CrmListFilterPanel"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import { PAGINATION, UI } from "@/shared/constants"
import { dateRangeToParams } from "@/shared/lib/date"
import { isUuid } from "@/shared/lib/validation"
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
import { CHANNEL_TYPES, CHANNEL_TYPE_LABELS } from "../../constants/channel-types"
import { QUOTE_FILTER_STATUSES, QUOTE_STATUS_LABELS } from "../../constants/quote-status"
import { QUOTES_STRINGS as S } from "../../components/quotes/quotes.strings"
import { useQuotes, useVersionQuote } from "./useQuotes"
import { useBrandsInfinite } from "./useBrands"
import { fetchLead } from "../../api"
import type { QuotableType, QuoteListItemWire, QuoteMentionFilter, QuoteStatus } from "../../api"
import { checkLeadCloseWonReady, hasLeadDescription } from "../../lib/lead-close-won-gate"

// §16.6 — single source for page size; mirrors DealsPage / LeadsPage.
export const QUOTES_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE
const ALL = "__all__"

const QUOTE_STATUS_FILTERS: QuoteStatus[] = QUOTE_FILTER_STATUSES

// This page never lists quotes you see ONLY because you were @mentioned on
// their lead/deal (`hide_mention_only`) — those stay on the lead/deal Quotes
// tab. So the Mentions dropdown has one narrowing option: "Not mentioned",
// which also hides quotes on a lead/deal you're assigned to AND mentioned on.
const QUOTE_MENTION_FILTERS: Exclude<QuoteMentionFilter, "all">[] = ["exclude"]
const QUOTE_MENTION_LABELS: Record<Exclude<QuoteMentionFilter, "all">, string> = {
  only: S.list.filters.mentionOnly,
  exclude: S.list.filters.mentionExclude,
}

// Frontend column key → backend sort field. Only columns the backend's
// `_SORTABLE_FIELDS` map allows (quote_repository.py) are mapped; clicks on any
// other column clear the sort instead of 422-ing the server.
const QUOTE_SORT_FIELD_MAP: Record<string, string> = {
  quoteNumber: "quote_number",
  total: "grand_total",
  status: "status",
  validUntil: "valid_until",
  createdAt: "created_at",
}
const QUOTE_SORT_COLUMN_BY_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(QUOTE_SORT_FIELD_MAP).map(([col, field]) => [field, col]),
)
const QUOTE_DEFAULT_SORT = "-created_at"

// Container logic for the Quotes list page: filter state, the list query
// (server-side status filter), the version mutation, and table-row mapping.
export function useQuotesList() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canWriteQuote = can([...crmCan.writeQuote])
  // Convert-to-SO is a destination-resource gate (SO write), separate from
  // quote write — mirrors QuoteStatusActions on the detail page.
  const canConvertToSo = can([...crmCan.quoteAcceptToSo])

  // Every filter lives in the URL (mirrors pagination) so it survives refresh,
  // detail round-trips, and browser back/forward. Each setter clears `?page`.
  const { setMany: setManyParams } = useFilterParams()
  const [search, setSearch] = useUrlFilter("search", "")
  const [selectedStatus] = useUrlFilter("status", ALL)
  const [rawSelectedBrand, setSelectedBrand] = useUrlFilter("brand_id", ALL)
  // §11.1 — a non-UUID brand id would 422; fall back to "All".
  const selectedBrand = isUuid(rawSelectedBrand) ? rawSelectedBrand : ALL
  const [selectedMention, setSelectedMention] = useUrlFilter("mention", ALL)
  // Multi-select "Created By" filter (URL-backed, comma-encoded under one key).
  const [selectedCreatedBy, setSelectedCreatedBy] = useUrlMultiFilter("created_by")
  // Approved By: a quote matches when ANY of its line items was approved by one of them.
  const [selectedApprovedBy, setSelectedApprovedBy] = useUrlMultiFilter("approved_by")
  // Multi-select "Account" filter — repeated `?account_id=` keys on the API.
  const [selectedAccounts, setSelectedAccounts] = useUrlMultiFilter("account_id")
  // Multi-select "Channel Type" filter — repeated `?channel_type=` keys. The
  // channel lives on the lead/deal, so account quotes drop out while it's on.
  const [rawChannelTypes, setSelectedChannelTypes] = useUrlMultiFilter("channel_type")
  const selectedChannelTypes = useMemo(
    () => rawChannelTypes.filter((c) => (CHANNEL_TYPES as readonly string[]).includes(c)),
    [rawChannelTypes],
  )
  // Category / OEM filters — match through the quote's LINE ITEMS (IMS ids).
  const [selectedCategories, setSelectedCategories] = useUrlMultiFilter("category_id")
  // Total (grand_total) range — inclusive Min / Max.
  const [totalRange, setTotalRange] = useUrlValueRange("min_total", "max_total", 14)
  const [selectedOems, setSelectedOems] = useUrlMultiFilter("oem_id")
  // URL-backed sort token in backend format; empty = default (`-created_at`).
  const [sortToken, setSortToken] = useUrlFilter("sort", "")
  const debouncedSearch = useDebounce(
    search.trim().slice(0, UI.FILTER_SEARCH_MAX_LENGTH),
    UI.DEBOUNCE_SEARCH_MS,
  )
  // Filter aside (vertical / mention / created-by); Status, Account and Created Date stay in the toolbar.
  const [filtersOpen, setFiltersOpen] = useMemoryState("crm:quotes:filtersOpen", false)

  // Brand ("vertical") options for the toolbar dropdown. The brand list is
  // tiny (a handful of active verticals) so a single fetch covers it; the
  // dropdown chip filters over the loaded set, matching the quote builder's
  // §16.11 picker source.
  const brandsQuery = useBrandsInfinite("")
  const brandOptions = useMemo(
    () =>
      (brandsQuery.data?.pages ?? [])
        .flatMap((p) => p.items)
        .map((b) => ({ value: b.id, label: b.name })),
    [brandsQuery.data?.pages],
  )

  // Created-date range filter (URL-backed via date_from / date_to).
  const [dateRange, setDateRange] = useUrlDateRange()
  const { date_from, date_to } = dateRangeToParams(dateRange)

  // §16 — page + page size in the URL (mirrors IMS). Filter changes reset to
  // page 1 automatically because each URL-backed filter setter clears `?page`.
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "quotes_size",
    defaultSize: QUOTES_PAGE_SIZE,
  })

  // The panel's "Clear all": clears every filter, including the toolbar's Created
  // Date chip, but keeps the search text.
  const resetAsideFilters = useCallback(() => {
    setManyParams({
      status: null,
      brand_id: null,
      mention: null,
      created_by: null,
      approved_by: null,
      account_id: null,
      channel_type: null,
      category_id: null,
      oem_id: null,
      min_total: null,
      max_total: null,
      date_from: null,
      date_to: null,
    })
  }, [setManyParams])

  const handleClearFilters = useCallback(() => {
    setManyParams({
      search: null,
      status: null,
      brand_id: null,
      mention: null,
      created_by: null,
      approved_by: null,
      account_id: null,
      channel_type: null,
      category_id: null,
      oem_id: null,
      min_total: null,
      max_total: null,
      date_from: null,
      date_to: null,
    })
  }, [setManyParams])

  // §11.1 — `?status=` is untrusted input, so it is checked against the offered
  // set rather than cast. Drops both garbage (`?status=foo`, which the backend
  // would 422) and a stale `?status=Accepted` bookmark from before those two
  // were pulled from the dropdown; either way the facet falls back to "All"
  // instead of applying a filter the user has no control to clear.
  const status: QuoteStatus | undefined = QUOTE_STATUS_FILTERS.includes(
    selectedStatus as QuoteStatus,
  )
    ? (selectedStatus as QuoteStatus)
    : undefined
  const brand_id: string | undefined = selectedBrand !== ALL ? selectedBrand : undefined
  // Same untrusted-URL guard as `status`: anything else falls back to "All".
  const mention: QuoteMentionFilter = QUOTE_MENTION_FILTERS.includes(
    selectedMention as Exclude<QuoteMentionFilter, "all">,
  )
    ? (selectedMention as QuoteMentionFilter)
    : "all"
  const created_by = selectedCreatedBy.length > 0 ? selectedCreatedBy : undefined
  const approved_by = selectedApprovedBy.length > 0 ? selectedApprovedBy : undefined
  const account_id = selectedAccounts.length > 0 ? selectedAccounts : undefined
  const channel_type = selectedChannelTypes.length > 0 ? selectedChannelTypes : undefined
  const category_ids = selectedCategories.length > 0 ? selectedCategories : undefined
  const oem_ids = selectedOems.length > 0 ? selectedOems : undefined

  // Column + direction for the header UI, derived from the URL token. Unknown
  // fields (stale bookmark) read as "unsorted".
  const { sortColumn, sortDirection } = useMemo<{
    sortColumn: string | null
    sortDirection: SortDirection
  }>(() => {
    if (!sortToken) return { sortColumn: null, sortDirection: null }
    const col = QUOTE_SORT_COLUMN_BY_FIELD[sortToken.replace(/^-/, "")]
    if (!col) return { sortColumn: null, sortDirection: null }
    return { sortColumn: col, sortDirection: sortToken.startsWith("-") ? "desc" : "asc" }
  }, [sortToken])

  const setSort = useCallback(
    (column: string | null, direction: SortDirection) => {
      const field = column ? QUOTE_SORT_FIELD_MAP[column] : undefined
      if (!field || !direction) {
        setSortToken("")
        return
      }
      setSortToken(`${direction === "desc" ? "-" : ""}${field}`)
    },
    [setSortToken],
  )

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuotes({
    page,
    page_size: pageSize,
    status,
    brand_id,
    created_by,
    approved_by,
    account_id,
    channel_type,
    category_ids,
    oem_ids,
    min_total: totalRange?.min,
    max_total: totalRange?.max,
    mention,
    hide_mention_only: true,
    search: debouncedSearch || undefined,
    date_from,
    date_to,
    // Only a sort field the table actually offers reaches the API (§11.1).
    sort: sortColumn ? sortToken : QUOTE_DEFAULT_SORT,
  })

  const versionMut = useVersionQuote()

  const total = data?.total ?? 0

  const rows = useMemo(
    () =>
      (data?.items ?? []).map((q: QuoteListItemWire) => ({
        id: q.id,
        quoteNumber: q.quote_number,
        accountName: q.account_name,
        createdBy: q.created_by_user?.name ?? "—",
        approvedByUsers: q.approved_by_users ?? [],
        quotable: q.entity_number ?? q.quotable_id.slice(0, 8),
        quotableType: q.quotable_type,
        _quotableId: q.quotable_id,
        vertical: q.brand_name ?? "",
        version: q.version_number,
        status: q.status,
        items: q.line_item_count ?? 0,
        total: q.grand_total ?? 0,
        validUntil: q.valid_until,
        createdAt: q.created_at,
        _status: q.status,
        _isLatest: q.is_latest_quote,
        // Visible only through a mention → read-only row (no amend / convert).
        _viewOnly: q.access_level === "view",
      })),
    [data?.items],
  )

  // Toolbar hosts Status and the Created Date chip (Account is an inline chip
  // via `extraFilters`); Vertical / Mentions / Created By live in the aside.
  const toolbarFilters: ToolbarFilter[] = useMemo(
    () => [
      {
        key: "status",
        label: S.list.filters.statusLabel,
        allLabel: S.list.filters.statusAll,
        // The VALIDATED status, so a rejected URL value can't leave the chip
        // reading "Accepted" while the list is actually unfiltered.
        value: status ?? "",
        // Label from the domain map (§16.12), not the raw wire value.
        options: QUOTE_STATUS_FILTERS.map((s) => ({
          value: s,
          label: QUOTE_STATUS_LABELS[s],
        })),
      },
      {
        kind: "daterange",
        key: "created_date",
        label: S.list.columns.created,
        // Empty-chip text — without this the picker falls back to "All Created
        // On" (placeholder ?? `All ${label}`).
        placeholder: S.list.columns.created,
        value: dateRange,
      },
    ],
    [status, dateRange],
  )

  const handleToolbarFilterChange = useCallback(
    (key: string, value: string) => {
      if (key === "status") setManyParams({ status: value || null })
    },
    [setManyParams],
  )

  const asideSelects: CrmListFilterSelect[] = useMemo(
    () => [
      {
        key: "brand_id",
        label: S.list.filters.verticalLabel,
        allLabel: S.list.filters.verticalAll,
        value: selectedBrand === ALL ? "" : selectedBrand,
        options: brandOptions,
        onChange: (v) => setSelectedBrand(v || ALL),
      },
      {
        key: "mention",
        label: S.list.filters.mentionLabel,
        allLabel: S.list.filters.mentionAll,
        value: mention === "all" ? "" : mention,
        options: QUOTE_MENTION_FILTERS.map((m) => ({
          value: m,
          label: QUOTE_MENTION_LABELS[m],
        })),
        onChange: (v) => setSelectedMention(v || ALL),
      },
    ],
    [selectedBrand, mention, brandOptions, setSelectedBrand, setSelectedMention],
  )

  // Channel Type options for the toolbar chip (values from the shared allow-list).
  const channelTypeOptions = useMemo(
    () => CHANNEL_TYPES.map((c) => ({ value: c, label: CHANNEL_TYPE_LABELS[c] })),
    [],
  )

  const activeFilterCount =
    (status ? 1 : 0) +
    (brand_id ? 1 : 0) +
    (mention !== "all" ? 1 : 0) +
    (created_by ? 1 : 0) +
    (approved_by ? 1 : 0) +
    (account_id ? 1 : 0) +
    (channel_type ? 1 : 0) +
    (category_ids ? 1 : 0) +
    (oem_ids ? 1 : 0) +
    (totalRange?.min != null || totalRange?.max != null ? 1 : 0) +
    (date_from || date_to ? 1 : 0)

  // Any narrowing in play — drives the "no match" empty state (vs. "no quotes yet").
  const hasActiveFilters = activeFilterCount > 0 || debouncedSearch.length > 0

  const handleToolbarDateRangeChange = useCallback(
    (_key: string, range: DateRange | undefined) => setDateRange(range),
    [setDateRange],
  )

  const openQuote = useCallback((id: string) => navigate(`/crm/quotes/${id}`), [navigate])
  const openQuoteEdit = useCallback((id: string) => navigate(`/crm/quotes/${id}/edit`), [navigate])
  const openQuoteNew = useCallback(() => navigate("/crm/quotes/new"), [navigate])

  // Row-level "Convert to Sales Order". Same routing as the detail page
  // (useQuoteForm.handleConvertToSO): Lead / Deal quotes go through the
  // Closed-Won wizard so the cascade UI runs; account quotes land on the
  // standalone SO form with the quote pre-selected. The list row carries no
  // lead data, so for lead quotes the lead is fetched on click to run the
  // close-won gate — blocked = toast only, stay on the list.
  const convertQuoteToSO = useCallback(
    async (quoteId: string, quotableType: QuotableType, quotableId: string) => {
      if (quotableType === "lead") {
        try {
          const lead = await fetchLead(quotableId)
          if (
            !checkLeadCloseWonReady(lead.stage, {
              hasName: Boolean(lead.contact_name?.trim()),
              hasCompany: Boolean(lead.company_name?.trim()),
              hasContact: Boolean(lead.email?.trim() || lead.phone?.trim()),
              hasType: !!lead.channel_type,
              hasCategories: lead.categories.length > 0,
              hasDescription: hasLeadDescription(lead.description),
              hasOwner: !!lead.assigned_to,
            })
          ) {
            return
          }
        } catch {
          // Lead fetch failed — fall through and let the wizard surface it.
        }
        navigate(`/crm/leads/${quotableId}/close-won?type=lead&quoteId=${quoteId}`)
        return
      }
      if (quotableType === "deal") {
        navigate(`/crm/deals/${quotableId}/close-won?type=deal&quoteId=${quoteId}`)
        return
      }
      navigate(`/crm/sales-orders/new?quoteId=${quoteId}`)
    },
    [navigate],
  )

  return {
    rows,
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
    selectedCreatedBy,
    setSelectedCreatedBy,
    selectedApprovedBy,
    setSelectedApprovedBy,
    selectedAccounts,
    setSelectedAccounts,
    sortColumn,
    sortDirection,
    setSort,
    toolbarFilters,
    handleToolbarFilterChange,
    hasActiveFilters,
    asideSelects,
    channelTypeOptions,
    selectedChannelTypes,
    setSelectedChannelTypes,
    selectedCategories,
    setSelectedCategories,
    totalRange,
    setTotalRange,
    selectedOems,
    setSelectedOems,
    filtersOpen,
    setFiltersOpen,
    activeFilterCount,
    resetAsideFilters,
    handleToolbarDateRangeChange,
    handleClearFilters,
    versionMut,
    canWriteQuote,
    canConvertToSo,
    convertQuoteToSO,
    openQuote,
    openQuoteEdit,
    openQuoteNew,
  }
}
