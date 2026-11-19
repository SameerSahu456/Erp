/** Controller hook behind `SparesBody`. */
import { useState } from 'react'

import { type DateRange } from '@/components/common/pickers/DateRangePicker'
import { useDebounce } from '@/shared/hooks'
import { UI } from '@/shared/constants'
import { useTabCounts } from '@/shared/hooks/useTabCounts'
import { useTabbedListView } from '@/shared/hooks/useTabbedListView'
import { dateRangeToParams } from '@shared/lib/date'
import { toSortParam } from '@shared/lib/sort-param'

import { fetchSpareRequests, type SpareRequestListParams } from '../../api'
import { WMS_PAGE_SIZE } from '../../constants'
import { useWarehouseScope } from '../../context/warehouse-scope'
import {
  emptyDeviceQueueFilters,
  useDeviceQueueControls,
  type DeviceQueueFilters,
} from '../devices/useDeviceQueueControls'
import { wmsKeys } from '../keys'
import { useWmsStageAccess } from '../operations/useStageAccess'
import { useSpareRequests, useSparesInventory } from './useSpares'

/** Spares worklist filters — the shared device-queue filters plus a requested-on
 *  date range (mirrors the Devices list). */
export type SpareFilters = DeviceQueueFilters & { dateRange: DateRange | undefined }

export const SPARE_TAB_IDS = ['pending', 'fulfilled', 'returned', 'cancelled'] as const
export type SpareTab = (typeof SPARE_TAB_IDS)[number]

/** Tab → server filter. `pending` and `returned` go via `status_group`: a return never
 *  changes `status`, so returned requests still read 'fulfilled'. */
export function spareTabParams(tabId: SpareTab): {
  status_group?: string
  status?: string
} {
  if (tabId === 'pending') return { status_group: 'pending' }
  if (tabId === 'returned') return { status_group: 'returned' }
  // Fulfilled = fulfilled AND nothing returned, so a returned spare drops out
  // of this tab and shows only under Returned (not both).
  if (tabId === 'fulfilled') return { status_group: 'fulfilled' }
  return { status: tabId }
}

/** `sortFieldMap` maps a table column key → backend sort field; it is owned by
 *  the column config (`spares-body-helpers.ts`), so the caller passes it. */
export function useSparesList(sortFieldMap: Record<string, string>) {
  // Per-tab view in an in-memory store: survives list ↔ detail nav, resets on refresh.
  const lv = useTabbedListView<SpareFilters, SpareTab>({
    storageKey: 'wms-spares',
    tabIds: SPARE_TAB_IDS,
    defaultTab: 'pending',
    emptyFilters: () => ({ ...emptyDeviceQueueFilters(), dateRange: undefined }),
    pageSize: WMS_PAGE_SIZE,
  })
  // Requested-on date range → server params (IST calendar days).
  const dateRange = lv.view.filters.dateRange
  const { date_from, date_to } = dateRangeToParams(dateRange)
  const spareTab = lv.activeTab
  const { search, sortColumn, sortDirection, page, pageSize } = lv.view
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)
  const sortParam = toSortParam(sortColumn, sortDirection, sortFieldMap)
  // Server-side Category + Variant filters — driven by the active tab's filter
  // slice so each tab filters independently.
  const controls = useDeviceQueueControls({
    variantColumnKey: 'variant',
    value: lv.view.filters,
    onChange: (patch) => lv.setFilters(patch),
  })

  // The view follows the navbar multi-select; actions need exactly one warehouse
  // (per-warehouse grants), so `whId` is undefined for 0 or 2+.
  const { selectedWarehouseId, selectedWarehouseIds } = useWarehouseScope()
  const whId = selectedWarehouseId ?? undefined
  const viewWhIds = selectedWarehouseIds.length ? selectedWarehouseIds : undefined
  const whKey = selectedWarehouseIds.join(',')
  // The Inventory sub-table is a separate server-paginated table (its own page,
  // §16.7 — no client-side slicing).
  const [invPage, setInvPage] = useState(1)
  const [lastWh, setLastWh] = useState(whKey)
  if (whKey !== lastWh) {
    setLastWh(whKey)
    lv.resetAllViews()
    setInvPage(1)
  }

  // Each tab is a server-paged query (§16.7).
  const requestsQuery = useSpareRequests({
    warehouse_ids: viewWhIds,
    ...spareTabParams(spareTab),
    search: debouncedSearch || undefined,
    sort: sortParam,
    category_id: controls.params.category_id,
    variant_id: controls.params.variant_id,
    date_from,
    date_to,
    page,
    page_size: pageSize,
  })
  const total = requestsQuery.data?.total ?? 0
  // Filter-aware counts: active tab uses the list `total`, others a page_size:1 query.
  const countParamsFor = (tabId: SpareTab): SpareRequestListParams => {
    const v = lv.viewByTab[tabId]?.filters
    const q = tabId === spareTab ? debouncedSearch : (lv.viewByTab[tabId]?.search ?? '').trim()
    const { date_from: cFrom, date_to: cTo } = dateRangeToParams(v?.dateRange)
    return {
      warehouse_ids: viewWhIds,
      ...spareTabParams(tabId),
      search: q || undefined,
      category_id: v?.category_id || undefined,
      variant_id: v?.variant_id || undefined,
      date_from: cFrom,
      date_to: cTo,
      page: 1,
      page_size: 1,
    }
  }
  const countFor = useTabCounts({
    tabIds: SPARE_TAB_IDS,
    activeTab: spareTab,
    activeTotal: total,
    paramsFor: countParamsFor,
    // The list key (not `count`): `invalidateSpares` refreshes `lists()` after
    // every spare write, so the badges move with the list.
    queryKey: wmsKeys.spares.count,
    fetchCount: fetchSpareRequests,
  })
  const inventoryQuery = useSparesInventory({
    warehouseIds: viewWhIds,
    page: invPage,
    pageSize: WMS_PAGE_SIZE,
  })

  const { canSeeStage, canStage, isManager, canReturnSpare } = useWmsStageAccess()
  // Check the grant at the scoped warehouse so buttons match the backend; unscoped = any.
  const canManageSpares = whId ? canStage('spares', whId) : canSeeStage('spares')
  // Fulfilment is a manager-only action (backend enforces manager_only). An
  // engineer may raise/cancel a request but not fulfil it, so hide the button.
  const canFulfill = isManager
  // Returns are store / warehouse manager only (backend store_or_warehouse_manager_only).
  const canReturn = canReturnSpare(whId)

  return {
    lv,
    spareTab,
    dateRange,
    controls,
    whId,
    selectedWarehouseIds,
    requestsQuery,
    total,
    countFor,
    inventoryQuery,
    invPage,
    setInvPage,
    access: { canManageSpares, canFulfill, canReturn },
    // Exposed so the list can gate the Return action PER ROW on that spare's own
    // warehouse — the global `canReturn` above is false whenever no single
    // warehouse is selected (a manager viewing several warehouses at once).
    canReturnSpare,
  }
}
