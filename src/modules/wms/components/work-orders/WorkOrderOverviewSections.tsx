import { Link } from 'react-router-dom'
import { Boxes, CheckCircle2, Clock, FileText, Package, Truck, Warehouse, XCircle } from 'lucide-react'

import type { WorkOrder } from '../../types'
import { WORK_ORDER_WORKFLOW_STAGES } from '../../types'
import { destinationShortLabel, formatDate, stageCircleClass, TYPE_LABELS } from './work-order-detail-helpers'
import { WORK_ORDERS_STRINGS } from './work-orders.strings'

const SD = WORK_ORDERS_STRINGS.detail

function StepperStage({
  stage,
  idx,
  activeStage,
  failed,
}: {
  stage: (typeof WORK_ORDER_WORKFLOW_STAGES)[number]
  idx: number
  activeStage: number
  failed: boolean
}) {
  const isCompleted = idx < activeStage
  const isActive = idx === activeStage
  const isFailed = isActive && failed
  return (
    <div className="flex flex-1 items-center">
      <div className="flex flex-col items-center gap-1.5 flex-1">
        <div
          className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${stageCircleClass({ isFailed, isCompleted, isActive })}`}
        >
          {isFailed ? (
            <XCircle className="size-4" />
          ) : isCompleted ? (
            <CheckCircle2 className="size-4" />
          ) : (
            idx + 1
          )}
        </div>
        <span className={`text-xs text-center ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
          {stage.label}
        </span>
      </div>
      {idx < WORK_ORDER_WORKFLOW_STAGES.length - 1 && (
        <div
          className={`h-0.5 w-full min-w-4 ${
            idx < activeStage ? 'bg-success' : 'bg-muted'
          }`}
        />
      )}
    </div>
  )
}

export function WorkOrderStepper({ wo, activeStage }: { wo: WorkOrder; activeStage: number }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {SD.workflowProgress}
      </h2>
      <div className="flex items-center gap-0">
        {WORK_ORDER_WORKFLOW_STAGES.map((stage, idx) => (
          <StepperStage
            key={stage.id}
            stage={stage}
            idx={idx}
            activeStage={activeStage}
            failed={wo.status === 'QC Failed'}
          />
        ))}
      </div>
    </div>
  )
}

export interface PickingTotals {
  totalPicked: number
  totalRequired: number
  pickingProgress: number
}

function DueDateCard({ wo, now }: { wo: WorkOrder; now: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-4" />
        {SD.dueDateLabel}
      </div>
      <p className="mt-1 font-semibold">{formatDate(wo.dueDate)}</p>
      {wo.completedAt ? (
        <p className="text-sm text-success">{SD.completedOn(formatDate(wo.completedAt))}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {new Date(wo.dueDate) < new Date() ? (
            <span className="text-destructive">{SD.overdue}</span>
          ) : (
            SD.daysLeft(Math.ceil((new Date(wo.dueDate).getTime() - now) / 86400000))
          )}
        </p>
      )}
    </div>
  )
}

export function WorkOrderKeyInfo({ wo, totals, now }: { wo: WorkOrder; totals: PickingTotals; now: number }) {
  const { totalPicked, totalRequired, pickingProgress } = totals
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="size-4" />
          {SD.outputLabel}
        </div>
        <p className="mt-1 font-semibold">{wo.outputPartName}</p>
        <p className="text-sm text-muted-foreground">{SD.outputUnits(wo.outputQty)}</p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Boxes className="size-4" />
          {SD.componentsLabel}
        </div>
        <p className="mt-1 text-2xl font-semibold">{pickingProgress}%</p>
        <p className="text-sm text-muted-foreground">{SD.componentsPicked(totalPicked, totalRequired)}</p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {wo.destinationType === 'RENTAL_WAREHOUSE' ? (
            <Warehouse className="size-4" />
          ) : (
            <Truck className="size-4" />
          )}
          {SD.destinationLabel}
        </div>
        <p className="mt-1 font-semibold">{destinationShortLabel(wo)}</p>
        {wo.destinationWarehouseName && (
          <p className="text-sm text-muted-foreground">{wo.destinationWarehouseName}</p>
        )}
      </div>
      <DueDateCard wo={wo} now={now} />
    </div>
  )
}

export function WorkOrderSourceCard({ wo }: { wo: WorkOrder }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold flex items-center gap-2">
          <FileText className="size-4" />
          {SD.sourceBomTitle}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 px-6 py-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{SD.sourceLabel}</p>
          <p className="mt-1 font-medium">{TYPE_LABELS[wo.type]}</p>
          <p className="text-sm text-muted-foreground">
            {wo.salesOrderNumber ?? wo.rentalContractNumber ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{SD.billOfMaterialsLabel}</p>
          <Link to={`/wms/bom/${wo.bomId}`} className="mt-1 block font-medium wms-link">
            {wo.bomName}
          </Link>
          <p className="text-sm text-muted-foreground">{wo.bomNumber}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{SD.customerLabel}</p>
          <p className="mt-1 font-medium">{wo.customerName ?? '—'}</p>
          {wo.invoiceNumber && (
            <p className="text-sm text-muted-foreground">{SD.invoicePrefix} {wo.invoiceNumber}</p>
          )}
        </div>
      </div>
    </div>
  )
}
