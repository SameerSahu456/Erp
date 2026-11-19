import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine } from 'lucide-react'

import { ListPageShell } from '@/components/page-shells'
import { type CellFormatter, type TabConfig } from '@/components/common/tables/BusinessMetricsTable'
import { TruncatedSerial } from '@/components/common/display/TruncatedSerial'

import { useStartInspection } from '../../hooks/inspection/useInspection'
import { useStageQueue } from '../../hooks/operations/useStageQueue'
import { WmsStatsCards } from '../shared/WmsStatsCards'
import { ScrapDeviceDialog } from '../devices/ScrapDeviceDialog'
import { canScrapStatus } from '../devices/scrap-helpers'
import { deviceDetailPath } from '../devices/device-detail/helpers'
import { StageQueueTable } from '../operations/StageQueueTable'
import { QueueAssignCell, QueueDash, QueueRowActions } from '../operations/StageQueueCells'
import { InspectionCompleteDialog } from './InspectionCompleteDialog'
import { INSPECTION_STRINGS } from './inspection.strings'
import {
  INSPECTION_STAGES,
  INSPECTION_TABS,
  INSPECTION_TAB_IDS,
  columns,
  inspectionParamsFor,
  SORT_FIELD_MAP,
  toInspectionRow,
} from './inspection-body-helpers'

const L = INSPECTION_STRINGS.list

export function InspectionBody() {
  const navigate = useNavigate()
  const q = useStageQueue({
    stage: 'inspection',
    storageKey: 'wms-inspection',
    tabIds: INSPECTION_TAB_IDS,
    defaultTab: 'pending',
    paramsFor: inspectionParamsFor,
    sortFieldMap: SORT_FIELD_MAP,
  })
  const { tab, access } = q

  // Device whose inspection form is open. Start opens the op (pending) then the
  // form; an already-started device opens it directly.
  const [formDeviceId, setFormDeviceId] = useState<string | null>(null)
  // Device being condemned (device-scrap D5) — a second, independent action.
  const [scrapDevice, setScrapDevice] = useState<{ id: string; serial: string } | null>(null)
  const startInspection = useStartInspection()
  const openForm = (deviceId: string, workflow: string) => {
    if (workflow === 'pending_inspection') {
      startInspection.mutate({ id: deviceId, body: {} }, { onSuccess: () => setFormDeviceId(deviceId) })
    } else {
      setFormDeviceId(deviceId)
    }
  }

  // Pending sums the inspection workflow_status buckets; Completed reads the
  // inspection op's completed count.
  const byWorkflowStatus = q.stats?.by_workflow_status ?? {}
  const tabTotal = {
    pending: INSPECTION_STAGES.reduce((n, s) => n + (byWorkflowStatus[s] ?? 0), 0),
    completed: q.stats?.by_op_status?.['completed'] ?? 0,
  }

  const rows = useMemo(() => q.items.map(toInspectionRow), [q.items])

  // Engineers lose "Assigned To" and the Batch filter (needs `wms:inward_read`).
  const visibleColumns = useMemo(
    () =>
      access.isManager
        ? columns
        : columns
            .filter((c) => c.key !== 'assignedTo')
            .map((c) => (c.key === 'batch' ? { ...c, filterable: false } : c)),
    [access.isManager],
  )

  const tabs: TabConfig[] = INSPECTION_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: q.tabCount(t.id, tabTotal[t.id]),
    columns: visibleColumns,
    data: tab === t.id ? rows : [],
  }))

  // The barcode column falls through to the table's BarcodeText (mono text +
  // reprint); wrapping it in a <span> printed "[object Object]" on the label.
  const cellFormatter: CellFormatter = (value, key, row) => {
    const warehouseId = String(row.warehouseId ?? '')
    if (key === 'serialNo') return { display: <TruncatedSerial value={String(value ?? '')} /> }
    if (key === 'assignedTo') {
      return {
        display: (
          <QueueAssignCell
            deviceId={String(row.id)}
            stage="inspection"
            pool={q.poolsByWarehouse[warehouseId] ?? []}
            assigneeId={(row.assigneeId as string | null) ?? null}
            assigneeName={(row.assigneeName as string | null) ?? null}
            mayAssign={access.canAssign(warehouseId)}
          />
        ),
      }
    }
    if (key !== 'actions') return null
    // A Completed row is read-only history (no active op — "Inspect" would
    // 404), and a user without inspection rights here has no action either.
    if (tab === 'completed' || !access.canStage('inspection', warehouseId)) {
      return { display: <QueueDash /> }
    }
    const deviceId = String(row.id)
    const canScrap =
      canScrapStatus(String(row.status ?? '')) && access.canStage('devices_scrap', warehouseId)
    return {
      display: (
        <QueueRowActions
          icon={<ScanLine className="size-3.5" data-icon="inline-start" />}
          label={L.actions.inspect}
          disabled={startInspection.isPending}
          onAction={() => openForm(deviceId, String(row.workflow ?? ''))}
          scrapLabel={L.actions.scrap}
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
      <ListPageShell title={L.title} subtitle={L.subtitle}>
        <div className="mb-6">
          <WmsStatsCards scope="inspection" warehouseIds={q.view.selectedWarehouseIds} />
        </div>
        <StageQueueTable
          view={q.view}
          tabs={tabs}
          cellFormatter={cellFormatter}
          persistKey="wms-inspection"
          searchPlaceholder={L.searchPlaceholder}
          empty={L.empty}
          onRowClick={(row) => navigate(deviceDetailPath(String(row.id), 'inspection'))}
        />
      </ListPageShell>

      <InspectionCompleteDialog
        key={formDeviceId ?? 'closed'}
        deviceId={formDeviceId}
        onClose={() => setFormDeviceId(null)}
      />

      <ScrapDeviceDialog
        deviceId={scrapDevice?.id ?? null}
        internalSerial={scrapDevice?.serial}
        onClose={() => setScrapDevice(null)}
      />
    </>
  )
}
