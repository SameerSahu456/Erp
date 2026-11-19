import { AlertTriangle, CheckCircle2, Users, XCircle } from 'lucide-react'

import type { WorkOrder, WorkOrderQC } from '../../types'
import { formatDateTime } from './work-order-detail-helpers'
import { WORK_ORDERS_STRINGS } from './work-orders.strings'

const SD = WORK_ORDERS_STRINGS.detail

export function WorkOrderAssemblyCard({ wo }: { wo: WorkOrder }) {
  if (!(wo.assemblyStartedAt || wo.assemblyTeam)) return null
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Users className="size-4" />
          {SD.assemblyTitle}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 px-6 py-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{SD.teamLabel}</p>
          <p className="mt-1 font-medium">{wo.assemblyTeam ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{SD.startedLabel}</p>
          <p className="mt-1 font-medium">
            {wo.assemblyStartedAt ? formatDateTime(wo.assemblyStartedAt) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{SD.completedLabel}</p>
          <p className="mt-1 font-medium">
            {wo.assemblyCompletedAt ? formatDateTime(wo.assemblyCompletedAt) : '—'}
          </p>
        </div>
      </div>
      {wo.assemblyNotes && (
        <div className="border-t px-6 py-4">
          <p className="text-sm text-muted-foreground">{wo.assemblyNotes}</p>
        </div>
      )}
    </div>
  )
}

function QcRecord({ qc }: { qc: WorkOrderQC }) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {qc.result === 'PASSED' ? (
            <div className="flex size-10 items-center justify-center rounded-full bg-success-soft">
              <CheckCircle2 className="size-5 text-success" />
            </div>
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive-soft">
              <XCircle className="size-5 text-destructive" />
            </div>
          )}
          <div>
            <p className="font-medium">
              {qc.result === 'PASSED' ? SD.qcPassed : SD.qcFailed}
            </p>
            <p className="text-sm text-muted-foreground">
              {SD.qcPerformedBy(qc.performedBy, formatDateTime(qc.performedAt))}
            </p>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {qc.checklist.map((item) => (
          <div
            key={item.item}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              item.result === 'PASS' ? 'bg-success-soft text-success' : 'bg-destructive-soft text-destructive'
            }`}
          >
            {item.result === 'PASS' ? (
              <CheckCircle2 className="size-3.5 shrink-0" />
            ) : (
              <XCircle className="size-3.5 shrink-0" />
            )}
            <span className="truncate">{item.item}</span>
          </div>
        ))}
      </div>

      {/* Failure reasons */}
      {qc.failureReasons && qc.failureReasons.length > 0 && (
        <div className="mt-3 rounded-md bg-destructive-soft px-4 py-3">
          <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
            <AlertTriangle className="size-4" />
            {SD.failureReasonsTitle}
          </p>
          <ul className="mt-1 list-disc list-inside text-sm text-destructive">
            {qc.failureReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {qc.notes && (
        <p className="mt-3 text-sm text-muted-foreground italic">{qc.notes}</p>
      )}
    </div>
  )
}

export function WorkOrderQcCard({ wo }: { wo: WorkOrder }) {
  if (wo.qcRecords.length === 0) return null
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          {SD.qualityControlTitle}
        </h2>
      </div>
      <div className="divide-y">
        {wo.qcRecords.map((qc) => (
          <QcRecord key={qc.id} qc={qc} />
        ))}
      </div>
    </div>
  )
}
