import { useNavigate } from 'react-router-dom'
import { LocateFixed } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { StatsRow } from '@/components/common/display/StatsRow'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { TruncatedSerial } from '@/components/common/display/TruncatedSerial'
import { EMPTY_VALUE } from '@/shared/constants'
import { ListPageShell } from '@/components/page-shells'
import {
  BusinessMetricsTable,
  type CellFormatter,
} from '@/components/common/tables/BusinessMetricsTable'

import { useAssignToRack } from '../../hooks/devices/useAssignToRack'
import { DeviceQueueFilter } from '../shared/DeviceQueueFilter'
import { WMS_LIST_MAX_CELL_CHARS } from '../../constants'
import { AssignRackDialog } from './AssignRackDialog'
import { ASSIGN_TO_RACK_STRINGS } from './assign-to-rack.strings'
import { gradeVariant } from './device-detail/checklist-run-helpers'
import { deviceDetailPath } from './device-detail/helpers'

export function AssignToRackBody() {
  const navigate = useNavigate()
  const {
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
  } = useAssignToRack()

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'serial') {
      return {
        display: (
          <TruncatedSerial value={String(value ?? '')} className="font-medium" />
        ),
      }
    }
    if (key === 'mfrSerial') {
      return { display: <TruncatedSerial value={String(value ?? '')} /> }
    }
    if (key === 'grade') {
      // Same badge colours as the device page's checklist-run grade (A green, B blue).
      return {
        display: value ? (
          <StatusBadge variant={gradeVariant(String(value))}>
            {ASSIGN_TO_RACK_STRINGS.gradeBadge(String(value))}
          </StatusBadge>
        ) : (
          EMPTY_VALUE
        ),
      }
    }
    if (key === 'actions') {
      const warehouseId = (row.warehouseId as string) || ''
      if (!canStage('rack_assign', warehouseId)) {
        return {
          display: (
            <Typography variant="helper" tone="muted" asChild>
              <span>{ASSIGN_TO_RACK_STRINGS.rowActions.noAccess}</span>
            </Typography>
          ),
        }
      }
      return {
        display: (
          <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              onClick={() =>
                setSubject({
                  id: row.id as string,
                  warehouseId,
                  serial: String(row.serial),
                  mfrSerial: row.mfrSerial === '—' ? '' : String(row.mfrSerial),
                  locationId: (row.locationId as string | null) ?? null,
                })
              }
            >
              <LocateFixed className="size-3.5" data-icon="inline-start" />
              {ASSIGN_TO_RACK_STRINGS.rowActions.assignRack}
            </Button>
          </div>
        ),
      }
    }
    return null
  }

  return (
    <ListPageShell
      title={ASSIGN_TO_RACK_STRINGS.header.title}
      subtitle={ASSIGN_TO_RACK_STRINGS.header.subtitle}
    >
      <div className="mb-6">
        <StatsRow stats={statRow} />
      </div>

      <div className="bmt-search-md">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default" showIndex
          searchPlaceholder={ASSIGN_TO_RACK_STRINGS.table.searchPlaceholder}
          tabs={tabs}
          cellFormatter={cellFormatter}
          persistKey="wms-assign-rack"
          onRowClick={(row) => navigate(deviceDetailPath(String(row.id), 'rack'))}
          searchValue={search}
          onSearchChange={(q) => lv.setSearch(q)}
          dateRange={{
            value: dateRange,
            onChange: (r) => lv.setFilters({ dateRange: r }),
          }}
          renderFilter={({ column, value, onChange }) => {
            const kind = controls.filterKindFor(column.key)
            return kind ? <DeviceQueueFilter kind={kind} value={value} onChange={onChange} /> : null
          }}
          onClearFilters={() => lv.clearFilters()}
          serverPagination={{
            page,
            pageSize,
            total,
            isFetching: devicesQuery.isFetching,
            onPageChange: lv.setPage,
            onPageSizeChange: (s) => lv.setPageSize(s),
            sort: { column: sortColumn, direction: sortDirection },
            onSortChange: (col, dir) => lv.setSort(col, dir),
            filters: controls.filters,
            onFiltersChange: controls.onFiltersChange,
          }}
          emptyState={{
            title: devicesQuery.isError
              ? ASSIGN_TO_RACK_STRINGS.empty.errorTitle
              : ASSIGN_TO_RACK_STRINGS.empty.title,
            description: devicesQuery.isError
              ? ASSIGN_TO_RACK_STRINGS.empty.errorDescription
              : ASSIGN_TO_RACK_STRINGS.empty.description,
          }}
        />
      </div>

      <AssignRackDialog
        key={subject?.id ?? 'closed'}
        open={subject !== null}
        onOpenChange={(o) => { if (!o) setSubject(null) }}
        deviceId={subject?.id ?? null}
        warehouseId={subject?.warehouseId ?? ''}
        serial={subject?.serial}
        mfrSerial={subject?.mfrSerial}
        currentLocationId={subject?.locationId ?? null}
      />
    </ListPageShell>
  )
}
