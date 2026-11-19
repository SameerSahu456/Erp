import { useMemo, useState } from 'react'

import type { TabConfig } from '@/components/common/tables/BusinessMetricsTable'
import { useDebounce } from '@/shared/hooks'
import { useMemoryState } from '@/shared/hooks/useMemoryState'
import { useTabCounts } from '@/shared/hooks/useTabCounts'
import { dateRangeToParams, formatIST_date } from '@shared/lib/date'
import { usePermission } from '@shared/rbac'

import { useGrnBatches } from './useInwards'
import { wmsKeys } from '../keys'
import { useWarehouseScope } from '../../context/warehouse-scope'
import { fetchGrnBatchesPage, type GrnBatchSortField } from '../../api'
import { wmsCan } from '../../permissions'
import { INWARD_SEARCH_MAX_CHARS } from '../../constants'
import {
  INWARD_TABS,
  INWARD_TAB_IDS,
  SORT_FIELD_MAP,
  emptyInwardView,
  inwardListColumns,
  reviveRange,
  type InwardTabId,
  type InwardTabView,
} from '../../components/inwards/inward-list-helpers'

/** Stored shape: the free-text `search` is kept PER TAB; the rest of the view
 *  (type + date filters, sort, page, page size) is one value SHARED by every
 *  tab. Derived back into an `InwardTabView` for the active tab (see `view`). */
type InwardStoredView = Omit<InwardTabView, 'search'> & {
  searchByTab: Partial<Record<InwardTabId, string>>
}

const emptyInwardStored = (): InwardStoredView => {
  const { search: _search, ...rest } = emptyInwardView()
  return { ...rest, searchByTab: {} }
}

/** All view state, queries and derived rows/tabs for the Inward (GRN batch)
 *  list. InwardListBody stays presentational. */
export function useInwardListView() {
  const canManageInward = usePermission().can(wmsCan.inwardManage)

  // Active tab is remembered too, so returning to the list reopens the same tab.
  const [activeTab, setActiveTab] = useMemoryState<InwardTabId>(
    'wms-inward:activeTab',
    'open',
  )

  // Search is PER TAB; the rest of the view (type + date filters, sort, page,
  // page size) is GLOBAL across tabs — a filter set on one tab stays applied
  // when switching, but each tab keeps its own search term. The tab only pins
  // the GRN status; switching it keeps the filters and resets to page 1 (see
  // `changeTab`). One in-memory entry holds the per-tab searches + the shared
  // rest, so it survives list ↔ detail but a refresh (or leaving the section)
  // resets to defaults, and the existing `:views` reset wiring clears it.
  const [stored, setStored] = useMemoryState<InwardStoredView>(
    'wms-inward:views',
    emptyInwardStored,
  )
  const searchFor = (id: InwardTabId) => stored.searchByTab?.[id] ?? ''
  // The active tab's view: its own search + the shared rest. Body reads this.
  const view: InwardTabView = {
    search: searchFor(activeTab),
    inwardType: stored.inwardType,
    dateRange: stored.dateRange,
    sortColumn: stored.sortColumn,
    sortDirection: stored.sortDirection,
    page: stored.page,
    pageSize: stored.pageSize,
  }
  const { search, inwardType, sortColumn, sortDirection, page, pageSize } = view
  const dateRange = reviveRange(view.dateRange)
  const { date_from, date_to } = dateRangeToParams(dateRange)
  // `search` (if present) routes to the ACTIVE tab's slot; the rest is shared.
  const patchView = (patch: Partial<InwardTabView>) =>
    setStored((prev) => {
      const { search: s, ...rest } = patch
      const next: InwardStoredView = { ...prev, ...rest }
      if (s !== undefined) next.searchByTab = { ...prev.searchByTab, [activeTab]: s }
      return next
    })
  const setPage = (p: number) => patchView({ page: p })
  // Switching tabs changes the GRN-status bucket → keep filters, reset page 1.
  // The active tab's search follows automatically (it's keyed by tab).
  const changeTab = (id: InwardTabId) => {
    setActiveTab(id)
    patchView({ page: 1 })
  }
  // A navbar warehouse switch changes the whole dataset — wipe every tab back to
  // defaults (per-tab searches + type + date filters / sort / page / page size)
  // and return to the default tab, so the list starts clean for the newly-scoped
  // warehouse.
  const resetAllViews = () => {
    setStored(emptyInwardStored())
    setActiveTab('open')
  }
  // Cap at the backend `q` maxLength; a longer paste (e.g. a full
  // serial string) would 422 and blank the list.
  const trimmedSearch = search.trim().slice(0, INWARD_SEARCH_MAX_CHARS)
  const debouncedSearch = useDebounce(trimmedSearch, 300)
  // An empty search skips the debounce so clearing it updates the list at once.
  const effectiveSearch = trimmedSearch ? debouncedSearch : ''

  // Follows the navbar warehouse scope; resets to page 1 when it changes.
  const { selectedWarehouseIds } = useWarehouseScope()
  // Repeated `to_warehouse_ids` param; empty = all accessible warehouses. Keyed
  // as a string so the page-reset effect fires on any change to the selection.
  const whKey = selectedWarehouseIds.join(',')
  const toWarehouseIds = selectedWarehouseIds.length
    ? selectedWarehouseIds
    : undefined
  const [lastWh, setLastWh] = useState(whKey)
  if (whKey !== lastWh) {
    setLastWh(whKey)
    // The whole dataset changes — reset every tab's filters/sort/page + tab.
    resetAllViews()
  }

  // The active tab pins the GRN status (All = no status filter).
  const activeStatus = INWARD_TABS.find((t) => t.id === activeTab)?.status
  // Header-click sort → API sort field; defaults to newest-first server-side.
  const sortParam: GrnBatchSortField =
    sortColumn && sortDirection && SORT_FIELD_MAP[sortColumn]
      ? (`${sortDirection === 'desc' ? '-' : ''}${SORT_FIELD_MAP[sortColumn]}` as GrnBatchSortField)
      : '-created_at'
  const commonFilters = {
    inward_type: inwardType || undefined,
    to_warehouse_ids: toWarehouseIds,
    q: effectiveSearch || undefined,
    date_from,
    date_to,
  }

  const batchesQuery = useGrnBatches({
    ...commonFilters,
    status: activeStatus,
    sort: sortParam,
    page,
    page_size: pageSize,
  })
  const total = batchesQuery.data?.total ?? 0

  // The shared type + date filters move every badge together; the search is
  // per tab, so each tab counts under ITS OWN term. The active tab reuses the
  // list's own `total` (under `effectiveSearch`); each inactive tab runs one
  // slim count query under its committed search.
  const countParamsFor = (tabId: InwardTabId) => {
    const tabSearch =
      tabId === activeTab ? effectiveSearch : searchFor(tabId).trim().slice(0, INWARD_SEARCH_MAX_CHARS)
    return {
      to_warehouse_ids: toWarehouseIds,
      status: INWARD_TABS.find((t) => t.id === tabId)?.status,
      inward_type: view.inwardType || undefined,
      q: tabSearch || undefined,
      ...dateRangeToParams(reviveRange(view.dateRange)),
      page: 1,
      page_size: 1,
    }
  }
  const countFor = useTabCounts({
    tabIds: INWARD_TAB_IDS,
    activeTab,
    activeTotal: total,
    paramsFor: countParamsFor,
    queryKey: wmsKeys.grnBatches.count,
    fetchCount: fetchGrnBatchesPage,
  })

  const rows = useMemo(
    () =>
      (batchesQuery.data?.items ?? []).map((b) => ({
        id: b.id,
        batchNumber: b.grn_number,
        inwardType: b.inward_type,
        // Raw briefs — the cell formatter renders them as an overflow pill list
        // (first category + "+N", full list on hover).
        category: b.categories ?? [],
        deviceCount: b.unit_count ?? 0,
        warehouse: b.to_warehouse?.name ?? '—',
        // A draft / cancelled batch has no receiver (set only at finalize), so
        // fall back to who created/staged it.
        receivedBy: b.received_by_user?.name ?? b.created_by_user?.name ?? '—',
        receivedDate: formatIST_date(b.created_at),
        status: b.status,
      })),
    [batchesQuery.data],
  )

  // All tabs share columns; only the active tab carries the current server page.
  const tabs: TabConfig[] = INWARD_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: countFor(t.id),
    columns: inwardListColumns,
    data: activeTab === t.id ? rows : [],
  }))

  return {
    canManageInward,
    activeTab,
    changeTab,
    view,
    patchView,
    setPage,
    dateRange,
    selectedWarehouseIds,
    batchesQuery,
    total,
    tabs,
  }
}

export type InwardListView = ReturnType<typeof useInwardListView>
