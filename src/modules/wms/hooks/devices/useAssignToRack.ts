import { toSortParam } from '@shared/lib/sort-param'
import { useMemo, useState } from 'react'
import { LocateFixed, PackageCheck } from 'lucide-react'

import { type TabConfig } from '@/components/common/tables/BusinessMetricsTable'
import { useDebounce } from '@/shared/hooks'
import { UI } from '@/shared/constants'
import { useTabbedListView } from '@/shared/hooks/useTabbedListView'
import { formatIST_date, dateRangeToParams } from '@shared/lib/date'
import { type DateRange } from '@/components/common/pickers/DateRangePicker'

import { useDevices, useDeviceStats } from './useDevices'
import {
  useDeviceQueueControls,
  emptyDeviceQueueFilters,
  type DeviceQueueFilters,
} from './useDeviceQueueControls'
import { useWmsStageAccess } from '../operations/useStageAccess'
import { useWarehouseScope } from '../../context/warehouse-scope'
import { WMS_PAGE_SIZE } from '../../constants'
import { ASSIGN_TO_RACK_STRINGS } from '../../components/devices/assign-to-rack.strings'
import {
  ASSIGN_TO_RACK_COLUMNS,
  ASSIGN_TO_RACK_SORT_FIELD_MAP,
} from '../../components/devices/assign-to-rack.columns'

const RACK_STAGE = 'awaiting_rack'

export type RackSubject = {
  id: string
  warehouseId: string
  serial: string
  mfrSerial: string
  // Where the device sits RIGHT NOW (any stage can hold a location) — the
  // picker pre-fills with it (device-placement D5).
  locationId: string | null
}

/** Assign-to-rack filters — the shared device-queue filters plus a received-on
 *  date range. */
type AssignRackFilters = DeviceQueueFilters & { dateRange: DateRange | undefined }

/** State, queries and table data for the assign-to-rack queue (`AssignToRackBody`). */
export function useAssignToRack() {
  // Single-list view kept in an in-memory store: survives list ↔ device-detail
  // nav, resets on refresh or on leaving the rack queue.
  const lv = useTabbedListView<AssignRackFilters, 'queue'>({
    storageKey: 'wms-assign-rack',
    tabIds: ['queue'],
    defaultTab: 'queue',
    emptyFilters: () => ({ ...emptyDeviceQueueFilters(), dateRange: undefined }),
    pageSize: WMS_PAGE_SIZE,
  })
  // Received-on date range → server params.
  const dateRange = lv.view.filters.dateRange
  const { date_from, date_to } = dateRangeToParams(dateRange)
  const { search, sortColumn, sortDirection, page, pageSize } = lv.view
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)
  const sortParam = toSortParam(sortColumn, sortDirection, ASSIGN_TO_RACK_SORT_FIELD_MAP)
  // Server-side Category + Variant filters — driven by the view's filter slice.
  const controls = useDeviceQueueControls({
    variantColumnKey: 'variantName',
    value: lv.view.filters,
    onChange: (patch) => lv.setFilters(patch),
  })

  // Multi-select: the device list + stat tiles scope to the UNION of the
  // navbar-picked warehouses (empty = unscoped). Reset pages on change.
  const { selectedWarehouseIds } = useWarehouseScope()
  const whKey = selectedWarehouseIds.join(',')
  const [lastWh, setLastWh] = useState(whKey)
  if (whKey !== lastWh) {
    setLastWh(whKey)
    lv.resetAllViews()
  }

  const devicesQuery = useDevices({
    workflow_status: RACK_STAGE,
    warehouse_ids: selectedWarehouseIds,
    search: debouncedSearch || undefined,
    sort: sortParam,
    from_date: date_from,
    to_date: date_to,
    ...controls.params,
    page,
    page_size: pageSize,
  })
  const stats = useDeviceStats({ warehouse_ids: selectedWarehouseIds })

  const { canStage } = useWmsStageAccess()
  const [subject, setSubject] = useState<RackSubject | null>(null)

  const total = devicesQuery.data?.total ?? 0
  const rows = useMemo(
    () =>
      (devicesQuery.data?.items ?? []).map((d) => ({
        id: d.id,
        partNo: d.part_number || '—',
        partName: d.part_name ?? '—',
        variantName: d.part_variant_name || '—',
        category: d.category_name ?? '—',
        grade: d.qc_grade ?? '',
        serial: d.internal_serial,
        mfrSerial: d.manufacturer_serial ?? '—',
        warehouseId: d.warehouse_id ?? '',
        locationId: d.warehouse_location_id ?? null,
        warehouse: d.warehouse_name ?? '—',
        received: formatIST_date(d.created_at),
      })),
    [devicesQuery.data],
  )
  const tabs: TabConfig[] = [
    { id: 'queue', label: ASSIGN_TO_RACK_STRINGS.tabs.queue, columns: ASSIGN_TO_RACK_COLUMNS, data: rows },
  ]

  const byStage = stats.data?.by_workflow_status ?? {}
  const statRow = [
    {
      label: ASSIGN_TO_RACK_STRINGS.stats.awaitingRack,
      value: byStage.awaiting_rack ?? 0,
      icon: LocateFixed,
      accent: 'warning' as const,
    },
    {
      label: ASSIGN_TO_RACK_STRINGS.stats.alreadyInRack,
      value: stats.data?.in_rack ?? 0,
      icon: PackageCheck,
      accent: 'success' as const,
    },
  ]

  return {
    lv,
    dateRange,
    search,
    sortColumn,
    sortDirection,
    page,
    pageSize,
    controls,
    devicesQuery,
    canStage,
    subject,
    setSubject,
    total,
    tabs,
    statRow,
  }
}
