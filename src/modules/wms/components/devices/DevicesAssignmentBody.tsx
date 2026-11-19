import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { ListPageShell } from '@/components/page-shells'
import { TruncatedSerial } from '@/components/common/display/TruncatedSerial'
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from '@/components/common/tables/BusinessMetricsTable'
import { Typography } from '@/components/ui/typography'
import { recordLabelState } from '@shared/routing/record-label'

import { useDevicesAssignmentList } from '../../hooks/devices/useDevicesAssignmentList'
import { WMS_LIST_MAX_CELL_CHARS } from '../../constants'
import { DeviceQueueFilter } from '../shared/DeviceQueueFilter'
import { WmsStatsCards } from '../shared/WmsStatsCards'
import { deviceDetailPath } from './device-detail/helpers'
import { DeviceEngineerCell, DeviceStageBadge } from './DeviceHubCells'
import { DEVICES_STRINGS as DS } from './devices.strings'
import {
  columns,
  DEVICE_TABS,
  ENGINEER_COLUMN_STAGE,
  stageTabColumns,
  toDeviceHubRow,
} from './devices-assignment-helpers'

export function DevicesAssignmentBody() {
  const navigate = useNavigate()
  const v = useDevicesAssignmentList()
  const { tab } = v

  const rows = useMemo(() => v.items.map(toDeviceHubRow), [v.items])

  const tabs: TabConfig[] = DEVICE_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: v.tabCount(t.id),
    columns: t.id === 'all' ? columns : stageTabColumns,
    data: tab === t.id ? rows : [],
  }))

  // The barcode column falls through to the table's BarcodeText (mono serial +
  // reprint button) — do not format it here.
  const cellFormatter: CellFormatter = (value, key, row) => {
    // Truncate long (operator-entered) serials, full value on hover.
    if (key === 'serialNo') return { display: <TruncatedSerial value={String(value ?? '')} /> }
    if (key === 'partNo') {
      return {
        display: (
          <Typography variant="body-strong" asChild>
            <span>{String(value)}</span>
          </Typography>
        ),
      }
    }
    if (key === 'status') {
      return {
        display: (
          <DeviceStageBadge
            workflow={String(value ?? '')}
            stockStatus={String(row.stockStatus ?? '')}
            vendorPrior={String(row.vendorPrior ?? '')}
            vendorSections={(row.vendorSections as string[] | undefined) ?? []}
            componentsUnchecked={row.componentsUnchecked === true}
          />
        ),
      }
    }
    const stage = ENGINEER_COLUMN_STAGE[key]
    if (!stage) return null
    const warehouseId = String(row.warehouseId ?? '')
    return {
      display: (
        <DeviceEngineerCell
          deviceId={String(row.id)}
          stage={stage}
          pool={v.pools[stage][warehouseId] ?? []}
          assigneeId={String(value ?? '')}
          assigneeName={row[`${stage}EngineerName`] as string | undefined}
          mayAssign={v.canAssign(warehouseId)}
          stageActive={Boolean(row[`${stage}Active`])}
        />
      ),
    }
  }

  return (
    <ListPageShell title={DS.list.title} subtitle={DS.list.subtitle}>
      <div className="mb-6">
        <WmsStatsCards scope="devices" warehouseIds={v.selectedWarehouseIds} />
      </div>

      <div className="bmt-search-md">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          searchPlaceholder={DS.list.searchPlaceholder}
          tabs={tabs}
          activeTab={tab}
          onTabChange={v.setActiveTab}
          cellFormatter={cellFormatter}
          persistKey="wms-devices"
          onRowClick={(row) =>
            navigate(deviceDetailPath(String(row.id)), { state: recordLabelState(row.barcode) })
          }
          searchValue={v.search}
          onSearchChange={(q) => v.lv.setSearch(q)}
          dateRange={{ value: v.dateRange, onChange: (r) => v.lv.setFilters({ dateRange: r }) }}
          renderFilter={({ column, value, onChange }) => {
            const kind = v.controls.filterKindFor(column.key)
            return kind ? (
              <DeviceQueueFilter
                kind={kind}
                value={value}
                onChange={onChange}
                warehouseIds={v.selectedWarehouseIds}
              />
            ) : null
          }}
          onClearFilters={() => v.lv.clearFilters()}
          serverPagination={{
            page: v.page,
            pageSize: v.pageSize,
            total: v.total,
            isFetching: v.devicesQuery.isFetching,
            onPageChange: v.lv.setPage,
            onPageSizeChange: (s) => v.lv.setPageSize(s),
            filters: v.controls.filters,
            onFiltersChange: v.controls.onFiltersChange,
            sort: { column: v.sortColumn, direction: v.sortDirection },
            onSortChange: (col, dir) => v.lv.setSort(col, dir),
          }}
          emptyState={{ title: DS.list.empty.title, description: DS.list.empty.description }}
          error={
            v.devicesQuery.isError
              ? {
                  title: DS.list.error.title,
                  description: DS.list.error.description,
                  onRetry: () => void v.devicesQuery.refetch(),
                }
              : undefined
          }
        />
      </div>
    </ListPageShell>
  )
}
