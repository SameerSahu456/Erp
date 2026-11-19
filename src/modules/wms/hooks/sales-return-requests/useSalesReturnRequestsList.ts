import { useMemo, useState } from "react"

import type { AsyncSelectOption } from "@/components/ui/async-select"
import { type DateRange } from "@/components/common/pickers/DateRangePicker"
import { UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { useTabbedListView } from "@/shared/hooks/useTabbedListView"
import { dateRangeToParams } from "@shared/lib/date"
import { toSortParam } from "@shared/lib/sort-param"
import { usePermission } from "@shared/rbac"
import { crmPermissions, useSalesReturnRequestCounts, useSalesReturnRequests } from "@modules/crm"

import { wmsCan } from "../../permissions"
import { WMS_PAGE_SIZE } from "../../constants"
import { useWarehouseScope } from "../../context/warehouse-scope"
import {
  SALES_RETURN_KPI_STATUS_IDS,
  SALES_RETURN_SORT_FIELD_MAP,
  SALES_RETURN_STATUS_IDS,
  toSalesReturnRow,
  type SalesReturnTabId,
} from "../../components/sales-return-requests/sales-return-requests.columns"

/** Per-tab filter bag for the list view (§1.1). */
type SalesReturnFilters = {
  reason: string
  /** `{id,label}` so the picked order still renders in the closed picker. */
  salesOrder: AsyncSelectOption | null
  /** Raised-date range (created_at). */
  dateRange: DateRange | undefined
}

const STATUS_BUCKETS = SALES_RETURN_STATUS_IDS.filter((id) => id !== "all")
const ALL_BUCKET = ["all"] as const

/** State + data owner for the Sales Return Requests listing (§17). */
export function useSalesReturnRequestsList() {
  // Raising a sales return mirrors the create endpoint's gate: `crm:manage`
  // OR `wms:outward_manage` (§0.9).
  const canCreate = usePermission().can([crmPermissions.MANAGE, ...wmsCan.outwardManage])
  const lv = useTabbedListView<SalesReturnFilters, SalesReturnTabId>({
    storageKey: "wms-sales-returns",
    tabIds: SALES_RETURN_STATUS_IDS,
    defaultTab: "all",
    emptyFilters: () => ({ reason: "", salesOrder: null, dateRange: undefined }),
    pageSize: WMS_PAGE_SIZE,
  })
  const activeTab = lv.activeTab
  const { search, sortColumn, sortDirection, page, pageSize, filters } = lv.view
  const debouncedSearch = useDebounce(search, UI.DEBOUNCE_SEARCH_MS)
  // Reason, sales order and the date range are all-tab filters, so they move
  // every count (§1.1.H). A picked order maps to the endpoint's entity filter.
  const reasonParam = filters.reason || undefined
  const orderParams = {
    entity_type: filters.salesOrder ? "sales_orders" : undefined,
    entity_id: filters.salesOrder?.id,
  }
  const { date_from, date_to } = dateRangeToParams(filters.dateRange)

  // Navbar warehouse scope (§0.16): a switch makes a new dataset — wipe every
  // tab's view, not just the page (§1.1.K).
  const { selectedWarehouseIds } = useWarehouseScope()
  const whKey = selectedWarehouseIds.join(",")
  const [lastWh, setLastWh] = useState(whKey)
  if (whKey !== lastWh) {
    setLastWh(whKey)
    lv.resetAllViews()
  }

  // Server-side pagination + search + status / reason / date + sort (§16.7).
  const listQuery = useSalesReturnRequests({
    page,
    page_size: pageSize,
    q: debouncedSearch || undefined,
    status: activeTab === "all" ? undefined : [activeTab],
    warehouse_ids: selectedWarehouseIds,
    reason: reasonParam,
    ...orderParams,
    date_from,
    date_to,
    sort: toSortParam(sortColumn, sortDirection, SALES_RETURN_SORT_FIELD_MAP),
  })

  // Shared count filters: scope + dates + reason + order. Search is per tab.
  const shared = {
    warehouse_ids: selectedWarehouseIds,
    date_from,
    date_to,
    reason: reasonParam,
    ...orderParams,
  }
  const statusCounts = useSalesReturnRequestCounts(STATUS_BUCKETS, shared, activeTab)
  const allCount = useSalesReturnRequestCounts(ALL_BUCKET, shared, activeTab)
  // §1.1.H — the active tab reuses the list `total`; while the list still shows
  // the previous tab's rows (keep-previous-data) fall back to the cached count.
  const rawCounts: Partial<Record<string, number>> = { ...statusCounts, ...allCount }
  const counts = listQuery.isPlaceholderData
    ? rawCounts
    : { ...rawCounts, [activeTab]: listQuery.data?.total ?? rawCounts[activeTab] ?? 0 }

  // KPI strip: warehouse-scoped but filter/search-independent (rule C).
  const statCounts = useSalesReturnRequestCounts(SALES_RETURN_KPI_STATUS_IDS, {
    warehouse_ids: selectedWarehouseIds,
  })

  const rows = useMemo(() => (listQuery.data?.items ?? []).map(toSalesReturnRow), [listQuery.data?.items])

  return {
    lv,
    activeTab,
    canCreate,
    listQuery,
    rows,
    counts,
    statCounts,
    setTab: (tabId: string) => lv.setActiveTab(tabId as SalesReturnTabId),
    // §1.1.E — cap at the backend's `q` limit so a long paste never 422s.
    setSearch: (value: string) => lv.setSearch(value.slice(0, UI.SEARCH_MAX_LENGTH)),
  }
}
