import { useMemo } from "react"

import type { AsyncSelectOption } from "@/components/ui/async-select"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import { UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { useTabbedListView } from "@/shared/hooks/useTabbedListView"
import { dateRangeToParams } from "@shared/lib/date"
import { toSortParam } from "@shared/lib/sort-param"
import { usePermission } from "@shared/rbac"
import { crmPermissions, useReplacementRequestCounts, useReplacementRequests } from "@modules/crm"
import { rentalsCan } from "@modules/rentals"

import { wmsCan } from "../../permissions"
import { WMS_PAGE_SIZE } from "../../constants"
import {
  REPLACEMENT_KPI_STATUS_IDS,
  REPLACEMENT_SORT_FIELD_MAP,
  REPLACEMENT_STATUS_IDS,
  toReplacementRow,
  type ReplacementTabId,
} from "../../components/replacement-requests/replacement-requests.columns"

/** Per-tab filter bag for the list view (§1.1). */
type ReplacementFilters = {
  priority: string
  mode: string
  /** Sales Order filter — `{id,label}` so the picked order still renders in
   *  the trigger even when it isn't on the loaded option pages (§16.11). */
  salesOrder: AsyncSelectOption | null
  /** Raised (created) date window. */
  dateRange: DateRange | undefined
}

/** State + data owner for the Replacement Requests listing (§17).
 *  Not warehouse-scoped (§0.16): the endpoint has no warehouse filter. */
export function useReplacementRequestsList() {
  // Raising a replacement mirrors the create endpoint's gate: `crm:manage` OR
  // `wms:outward_manage` OR the rentals raise grant (§0.9).
  const canCreate = usePermission().can([
    crmPermissions.MANAGE,
    ...wmsCan.outwardManage,
    ...rentalsCan.raiseReplacement,
  ])
  const lv = useTabbedListView<ReplacementFilters, ReplacementTabId>({
    storageKey: "wms-replacements",
    tabIds: REPLACEMENT_STATUS_IDS,
    defaultTab: "all",
    emptyFilters: () => ({ priority: "", mode: "", salesOrder: null, dateRange: undefined }),
    pageSize: WMS_PAGE_SIZE,
  })
  const activeTab = lv.activeTab
  const { search, sortColumn, sortDirection, page, pageSize } = lv.view
  const { priority, mode, salesOrder, dateRange } = lv.view.filters
  const debouncedSearch = useDebounce(search, UI.DEBOUNCE_SEARCH_MS)

  // A picked sales order maps straight to the endpoint's entity filter.
  const entityFilter = {
    priority: priority || undefined,
    replacement_mode: mode || undefined,
    entity_type: salesOrder ? "sales_orders" : undefined,
    entity_id: salesOrder?.id,
    ...dateRangeToParams(dateRange),
  }

  // Server-side pagination + search + filters + sort (§16.7).
  const listQuery = useReplacementRequests({
    page,
    page_size: pageSize,
    q: debouncedSearch || undefined,
    status: activeTab === "all" ? undefined : [activeTab],
    ...entityFilter,
    // Unsorted / unmapped columns fall back to the endpoint default.
    sort: toSortParam(sortColumn, sortDirection, REPLACEMENT_SORT_FIELD_MAP),
  })

  // Filter-aware tab-badge counts (search is per-tab, so not sent here); the
  // active tab is skipped and reuses the list `total` (§1.1.H).
  const rawCounts = useReplacementRequestCounts(REPLACEMENT_STATUS_IDS, entityFilter, activeTab)
  // Unfiltered overall counts for the KPI strip — a list filter never moves them.
  const statCounts = useReplacementRequestCounts(REPLACEMENT_KPI_STATUS_IDS)
  // While the list still shows the previous tab's rows (keep-previous-data)
  // its total is stale, so fall back to the cached count until it lands.
  const counts: Partial<Record<string, number>> = listQuery.isPlaceholderData
    ? rawCounts
    : { ...rawCounts, [activeTab]: listQuery.data?.total ?? rawCounts[activeTab] ?? 0 }

  const rows = useMemo(() => (listQuery.data?.items ?? []).map(toReplacementRow), [listQuery.data?.items])

  return {
    lv,
    activeTab,
    canCreate,
    listQuery,
    rows,
    counts,
    statCounts,
    setTab: (tabId: string) => lv.setActiveTab(tabId as ReplacementTabId),
    // §1.1.E — cap at the backend's `q` limit so a long paste never 422s.
    setSearch: (value: string) => lv.setSearch(value.slice(0, UI.SEARCH_MAX_LENGTH)),
  }
}
