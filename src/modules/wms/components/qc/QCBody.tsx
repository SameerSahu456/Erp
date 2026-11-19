import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'

import { ListPageShell } from '@/components/page-shells'
import { type CellFormatter, type TabConfig } from '@/components/common/tables/BusinessMetricsTable'
import { TruncatedSerial } from '@/components/common/display/TruncatedSerial'
import { Typography } from '@/components/ui/typography'

import { useStageQueue } from '../../hooks/operations/useStageQueue'
import { useStartQc } from '../../hooks/qc/useQc'
import { WmsStatsCards } from '../shared/WmsStatsCards'
import { ScrapDeviceDialog } from '../devices/ScrapDeviceDialog'
import { canScrapStatus } from '../devices/scrap-helpers'
import { deviceDetailPath } from '../devices/device-detail/helpers'
import { StageQueueTable } from '../operations/StageQueueTable'
import { QueueAssignCell, QueueDash, QueueRowActions } from '../operations/StageQueueCells'
import { QcCompleteDialog } from './QcCompleteDialog'
import { QC_STRINGS } from './qc.strings'
import {
  QC_TABS,
  QC_TAB_IDS,
  columns,
  qcParamsFor,
  SORT_FIELD_MAP,
  toQcRow,
} from './qc-body-helpers'

const B = QC_STRINGS.body
type QueueRow = Parameters<CellFormatter>[2]
const EMPTY = {
  title: B.empty.clearTitle,
  description: B.empty.clearDescription,
  errorTitle: B.empty.errorTitle,
  errorDescription: B.empty.errorDescription,
}

export function QCBody() {
  const navigate = useNavigate()
  const q = useStageQueue({
    stage: 'qc',
    // Bumped when the tab set changed (pending → pending_qc + under_qc) so a
    // stale persisted active-tab can't point at a tab that no longer exists.
    storageKey: 'wms-qc-v2',
    tabIds: QC_TAB_IDS,
    defaultTab: 'pending_qc',
    paramsFor: qcParamsFor,
    sortFieldMap: SORT_FIELD_MAP,
  })
  const { tab, access } = q

  // Which device's Complete-QC dialog is open (self-contained QcCompleteDialog).
  const [completeId, setCompleteId] = useState<string | null>(null)
  // Device being condemned (device-scrap D5) — a second, independent row action.
  const [scrapDevice, setScrapDevice] = useState<{ id: string; serial: string } | null>(null)
  const startQc = useStartQc()
  // Start opens the QC form: a pending device is started first (→ under_qc);
  // an already-started one opens directly.
  const startAndOpen = (deviceId: string, stage: string) => {
    if (stage === 'pending_qc') {
      startQc.mutate({ id: deviceId, body: {} }, { onSuccess: () => setCompleteId(deviceId) })
    } else {
      setCompleteId(deviceId)
    }
  }

  // Pending QC / Under QC read their workflow_status buckets; Completed reads
  // the QC op's completed count.
  const byWorkflowStatus = q.stats?.by_workflow_status ?? {}
  const tabTotal = {
    pending_qc: byWorkflowStatus['pending_qc'] ?? 0,
    under_qc: byWorkflowStatus['under_qc'] ?? 0,
    completed: q.stats?.by_op_status?.['completed'] ?? 0,
  }

  const rows = useMemo(() => q.items.map(toQcRow), [q.items])

  // The "Assigned To" column (filter + per-row assign dropdown) is manager-only.
  const visibleColumns = useMemo(
    () => (access.isManager ? columns : columns.filter((c) => c.key !== 'assignedTo')),
    [access.isManager],
  )

  const tabs: TabConfig[] = QC_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: q.tabCount(t.id, tabTotal[t.id]),
    columns: visibleColumns,
    data: tab === t.id ? rows : [],
  }))

  const assignCell = (row: QueueRow, warehouseId: string) => ({
    display: (
      // Completed rows have no active op, so the assignee is read-only.
      <QueueAssignCell
        deviceId={String(row.id)}
        stage="qc"
        pool={q.poolsByWarehouse[warehouseId] ?? []}
        assigneeId={(row.assigneeId as string | null) ?? null}
        assigneeName={(row.assigneeName as string | null) ?? null}
        mayAssign={tab !== 'completed' && access.canAssign(warehouseId)}
        fixedHeight
      />
    ),
  })

  const actionsCell = (row: QueueRow, warehouseId: string) => {
    // Completed is read-only history (no active op — Start would 404), and a
    // user without QC rights here has no action either.
    if (tab === 'completed' || !access.canStage('qc', warehouseId)) {
      return { display: <QueueDash /> }
    }
    const deviceId = String(row.id)
    const canScrap =
      canScrapStatus(String(row.status ?? '')) && access.canStage('devices_scrap', warehouseId)
    return {
      display: (
        <QueueRowActions
          icon={<Play className="size-3.5" data-icon="inline-start" />}
          label={B.startInwardQc}
          disabled={startQc.isPending}
          onAction={() => startAndOpen(deviceId, String(row.workflow ?? ''))}
          scrapLabel={B.scrap}
          onScrap={
            canScrap
              ? () => setScrapDevice({ id: deviceId, serial: String(row.barcode ?? '') })
              : undefined
          }
        />
      ),
    }
  }

  // Barcode falls through to the table's BarcodeText (mono + reprint button);
  // wrapping it in a <span> made the printed label read "[object Object]".
  const cellFormatter: CellFormatter = (value, key, row) => {
    const warehouseId = String(row.warehouseId ?? '')
    if (key === 'serialNo') return { display: <TruncatedSerial value={String(value ?? '')} /> }
    if (key === 'partNo') {
      return { display: <Typography variant="body-strong">{String(value)}</Typography> }
    }
    if (key === 'assignedTo') return assignCell(row, warehouseId)
    if (key !== 'actions') return null
    return actionsCell(row, warehouseId)
  }

  return (
    <>
      <ListPageShell title={B.title} subtitle={B.subtitle}>
        <div className="mb-6">
          <WmsStatsCards scope="qc" warehouseIds={q.view.selectedWarehouseIds} />
        </div>
        <StageQueueTable
          view={q.view}
          tabs={tabs}
          cellFormatter={cellFormatter}
          persistKey="wms-qc"
          searchPlaceholder={B.searchPlaceholder}
          empty={EMPTY}
          onRowClick={(row) => navigate(deviceDetailPath(String(row.id), 'qc'))}
        />
      </ListPageShell>

      {/* Keyed by device so reopening resets the form's state. */}
      <QcCompleteDialog
        key={completeId ?? 'qc-closed'}
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
