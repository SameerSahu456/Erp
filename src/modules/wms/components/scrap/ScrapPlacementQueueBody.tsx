import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { TruncatedSerial } from '@/components/common/display/TruncatedSerial'
import { ListPageShell } from '@/components/page-shells'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/tables/BusinessMetricsTable'

import { useWmsStageAccess } from '../../hooks/operations/useStageAccess'
import { useScrapPlacementQueue } from '../../hooks/scrap/useScrapPlacementQueue'
import { WMS_LIST_MAX_CELL_CHARS, WMS_PAGE_SIZE } from '../../constants'
import { deviceDetailPath } from '../devices/device-detail/helpers'
import { UnscrapDeviceDialog } from '../devices/UnscrapDeviceDialog'
import { ScrapAssignLocationDialog } from './ScrapAssignLocationDialog'
import { ScrapQueueRowActions, type AssignSubject, type UnscrapSubject } from './ScrapQueueRowActions'
import { SCRAP_QUEUE_COLUMNS } from './scrap-placement-queue.columns'
import { SCRAP_PLACEMENT_QUEUE_STRINGS as S } from './scrap-placement-queue.strings'

/**
 * The store manager's placement queue (device-scrap D6) — condemned units
 * with no recorded location. This is the ONLY way such a unit gets onto a
 * shelf; scrap deliberately never places one (D3).
 *
 * `GET /wms/devices/scrap-pending-placement` is server-paginated and takes the
 * navbar's repeated `warehouse_ids` (see `useScrapPlacementQueue`).
 */
export function ScrapPlacementQueueBody() {
  const navigate = useNavigate()
  const { canManageScrap, isManager } = useWmsStageAccess()
  const { query, page, setPage, rows } = useScrapPlacementQueue()

  const [subject, setSubject] = useState<AssignSubject | null>(null)
  // Un-scrap is offered here too, saving a hop to the device page.
  const [unscrapSubject, setUnscrapSubject] = useState<UnscrapSubject | null>(null)

  // Loading is its own state (§0.6); checking `data` keeps a background refetch from blanking the queue.
  if (query.isLoading && query.data === undefined) {
    return (
      <ListPageShell title={S.title} subtitle={S.subtitle}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ListPageShell>
    )
  }

  const tabs: TabConfig[] = [{ id: 'queue', label: S.title, columns: SCRAP_QUEUE_COLUMNS, data: rows }]

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'serial' || key === 'mfrSerial') {
      return { display: <TruncatedSerial value={String(value ?? '')} /> }
    }
    if (key !== 'actions') return null
    const warehouseId = String(row.warehouseId ?? '')
    // Rows with no warehouse must still be placeable, so any manager may act on them.
    const allowed = warehouseId ? canManageScrap(warehouseId) : isManager
    return {
      display: (
        <ScrapQueueRowActions row={row} allowed={allowed} onAssign={setSubject} onUnscrap={setUnscrapSubject} />
      ),
    }
  }

  return (
    <ListPageShell title={S.title} subtitle={S.subtitle}>
      <div className="bmt-search-md">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          tabs={tabs}
          cellFormatter={cellFormatter}
          persistKey="wms-scrap-placement"
          serverPagination={{
            page,
            pageSize: WMS_PAGE_SIZE,
            // The whole queue, not this page — the manager needs to know how
            // much work is left. Never rows.length (§16.7).
            total: query.data?.total ?? 0,
            isFetching: query.isFetching,
            onPageChange: setPage,
          }}
          onRowClick={(row) => navigate(deviceDetailPath(String(row.id), 'scrap-placement'))}
          // Error and empty are DISTINCT (§0.6/§1.1): a failed load reading as
          // an empty table would tell the store manager there is nothing to do.
          error={
            query.isError
              ? { title: S.error.title, description: S.error.description, onRetry: () => void query.refetch() }
              : undefined
          }
          emptyState={{ title: S.empty.title, description: S.empty.description }}
        />
      </div>

      <ScrapAssignLocationDialog subject={subject} onClose={() => setSubject(null)} />
      <UnscrapDeviceDialog
        deviceId={unscrapSubject?.id ?? null}
        internalSerial={unscrapSubject?.serial}
        scrapPriorStatus={unscrapSubject?.priorStatus || null}
        hasLocation={unscrapSubject?.hasLocation ?? false}
        hasWarehouse={unscrapSubject?.hasWarehouse ?? true}
        onClose={() => setUnscrapSubject(null)}
      />
    </ListPageShell>
  )
}
