import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'

import { ListPageShell } from '@/components/page-shells'
import { type CellFormatter, type TabConfig } from '@/components/common/tables/BusinessMetricsTable'
import { Typography } from '@/components/ui/typography'

import { useStageQueue } from '../../hooks/operations/useStageQueue'
import { useStartRepair } from '../../hooks/repair/useRepair'
import { WmsStatsCards } from '../shared/WmsStatsCards'
import { ScrapDeviceDialog } from '../devices/ScrapDeviceDialog'
import { canScrapStatus } from '../devices/scrap-helpers'
import { deviceDetailPath } from '../devices/device-detail/helpers'
import { StageQueueTable } from '../operations/StageQueueTable'
import { QueueAssignCell, QueueDash, QueueRowActions } from '../operations/StageQueueCells'
import { RepairCompleteDialog } from './RepairCompleteDialog'
import { REPAIR_STRINGS } from './repair.strings'
import {
  REPAIR_TABS,
  REPAIR_TAB_IDS,
  columns,
  isRepairActive,
  repairParamsFor,
  SORT_FIELD_MAP,
  toRepairRow,
} from './repair-body-helpers'

const Q = REPAIR_STRINGS.repairQueue
const EMPTY = {
  title: Q.empty.clearTitle,
  description: Q.empty.clearDescription,
  errorTitle: Q.empty.errorTitle,
  errorDescription: Q.empty.errorDescription,
}

export function RepairBody() {
  const navigate = useNavigate()
  const q = useStageQueue({
    stage: 'repair',
    storageKey: 'wms-repair',
    tabIds: REPAIR_TAB_IDS,
    defaultTab: 'in_progress',
    paramsFor: repairParamsFor,
    sortFieldMap: SORT_FIELD_MAP,
  })
  const { tab, access } = q

  // Complete-repair dialog — keyed by device id; RepairCompleteDialog owns the
  // checklist / result / notes state.
  const [completeId, setCompleteId] = useState<string | null>(null)
  // Device being condemned (device-scrap D5) — a second, independent row action.
  const [scrapDevice, setScrapDevice] = useState<{ id: string; serial: string } | null>(null)
  const startRepair = useStartRepair()
  // Repair ops spawn PENDING and can't complete from pending, so start (idempotent) first.
  const startAndComplete = (id: string) => {
    startRepair.mutate({ id, body: {} }, { onSuccess: () => setCompleteId(id) })
  }

  // Each tab sums the by_op_status counts (devices by their newest repair-op
  // status) for its own statuses.
  const byOpStatus = q.stats?.by_op_status ?? {}
  const tabTotal = (statuses: readonly string[]) =>
    statuses.reduce((n, s) => n + (byOpStatus[s] ?? 0), 0)

  const rows = useMemo(() => q.items.map(toRepairRow), [q.items])

  // The "Assigned To" column (filter + per-row assign dropdown) is manager-only.
  const visibleColumns = useMemo(
    () => (access.isManager ? columns : columns.filter((c) => c.key !== 'assignedTo')),
    [access.isManager],
  )

  const tabs: TabConfig[] = REPAIR_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: q.tabCount(t.id, tabTotal(t.statuses)),
    columns: visibleColumns,
    data: tab === t.id ? rows : [],
  }))

  // The barcode column falls through to the table's BarcodeText (mono serial +
  // reprint button) — do not format it here.
  const cellFormatter: CellFormatter = (value, key, row) => {
    const warehouseId = String(row.warehouseId ?? '')
    // Actions follow the device's own state, not the tab; a closed op would 404.
    const repairActive = isRepairActive(String(row.workflow ?? ''))
    if (key === 'partNo') {
      return { display: <Typography variant="body-strong">{String(value)}</Typography> }
    }
    if (key === 'assignedTo') {
      return {
        display: (
          <QueueAssignCell
            deviceId={String(row.id)}
            stage="repair"
            pool={q.poolsByWarehouse[warehouseId] ?? []}
            assigneeId={(row.assigneeId as string | null) ?? null}
            assigneeName={(row.assigneeName as string | null) ?? null}
            mayAssign={repairActive && access.canAssign(warehouseId)}
          />
        ),
      }
    }
    if (key !== 'actions') return null
    // No action on a finished repair, or for a user without repair rights here.
    if (!repairActive || !access.canStage('repair', warehouseId)) {
      return { display: <QueueDash /> }
    }
    const deviceId = String(row.id)
    const canScrap =
      canScrapStatus(String(row.status ?? '')) && access.canStage('devices_scrap', warehouseId)
    return {
      display: (
        <QueueRowActions
          icon={<Check className="size-3.5" data-icon="inline-start" />}
          label={Q.complete}
          disabled={startRepair.isPending}
          onAction={() => startAndComplete(deviceId)}
          scrapLabel={Q.scrap}
          onScrap={
            canScrap
              ? () => setScrapDevice({ id: deviceId, serial: String(row.barcode ?? '') })
              : undefined
          }
        />
      ),
    }
  }

  return (
    <>
      <ListPageShell title={Q.title} subtitle={Q.subtitle}>
        <div className="mb-6">
          <WmsStatsCards scope="repair" warehouseIds={q.view.selectedWarehouseIds} />
        </div>
        <StageQueueTable
          view={q.view}
          tabs={tabs}
          cellFormatter={cellFormatter}
          persistKey="wms-repair"
          searchPlaceholder={Q.searchPlaceholder}
          empty={EMPTY}
          onRowClick={(row) => navigate(deviceDetailPath(String(row.id), 'repair'))}
        />
      </ListPageShell>

      <RepairCompleteDialog
        key={completeId ?? 'closed'}
        deviceId={completeId}
        onClose={() => setCompleteId(null)}
      />

      <ScrapDeviceDialog
        deviceId={scrapDevice?.id ?? null}
        internalSerial={scrapDevice?.serial}
        onClose={() => setScrapDevice(null)}
      />
    </>
  )
}
