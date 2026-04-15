import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Warehouse,
  Truck,
  FileText,
  Users,
  AlertTriangle,
  CircleDot,
  Repeat,
  Boxes,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { mockWorkOrders } from '../data/work-orders'
import type { WorkOrderStatus, WorkOrderType } from '../types'
import { WORK_ORDER_WORKFLOW_STAGES } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_VARIANT: Record<WorkOrderStatus, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  'Draft': 'neutral',
  'Pending Approval': 'warning',
  'Approved': 'info',
  'Component Picking': 'warning',
  'Components Picked': 'info',
  'In Assembly': 'warning',
  'Assembly Complete': 'info',
  'Packaging': 'warning',
  'Pending QC': 'warning',
  'QC Passed': 'success',
  'QC Failed': 'error',
  'Ready for Dispatch': 'success',
  'Sent to Rental Warehouse': 'success',
  'Dispatched': 'success',
  'Invoiced': 'success',
  'Closed': 'neutral',
}

const TYPE_LABELS: Record<WorkOrderType, string> = {
  SALES: 'Sales Order',
  RENTAL: 'Rental Contract',
  INTERNAL: 'Internal',
  DEMO: 'Demo',
}

function getActiveStage(status: WorkOrderStatus): number {
  const statusToStage: Record<string, number> = {
    'Draft': 0,
    'Pending Approval': 0,
    'Approved': 1,
    'Component Picking': 2,
    'Components Picked': 2,
    'In Assembly': 3,
    'Assembly Complete': 3,
    'Packaging': 4,
    'Pending QC': 5,
    'QC Passed': 5,
    'QC Failed': 5,
    'Ready for Dispatch': 6,
    'Sent to Rental Warehouse': 6,
    'Dispatched': 6,
    'Invoiced': 7,
    'Closed': 7,
  }
  return statusToStage[status] ?? 0
}

function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const wo = useMemo(() => mockWorkOrders.find((w) => w.id === id), [id])

  if (!wo) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Work Order not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/wms/work-orders')}>
          Back to Work Orders
        </Button>
      </div>
    )
  }

  const activeStage = getActiveStage(wo.status)
  const totalRequired = wo.components.reduce((s, c) => s + c.requiredQty, 0)
  const totalPicked = wo.components.reduce((s, c) => s + c.pickedQty, 0)
  const pickingProgress = totalRequired > 0 ? Math.round((totalPicked / totalRequired) * 100) : 0
  const hasSubstitutes = wo.components.some((c) => c.isSubstitute)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/wms/work-orders')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {wo.workOrderNumber}
            </h1>
            <StatusBadge variant={STATUS_VARIANT[wo.status]}>{wo.status}</StatusBadge>
            <StatusBadge variant={wo.type === 'RENTAL' ? 'warning' : 'info'}>
              {TYPE_LABELS[wo.type]}
            </StatusBadge>
            <StatusBadge variant={
              wo.priority === 'Urgent' ? 'error' :
              wo.priority === 'High' ? 'warning' :
              wo.priority === 'Medium' ? 'info' : 'neutral'
            }>
              {wo.priority}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {wo.outputPartName} &times; {wo.outputQty}
            {wo.customerName && ` · ${wo.customerName}`}
          </p>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Workflow Progress
        </h2>
        <div className="flex items-center gap-0">
          {WORK_ORDER_WORKFLOW_STAGES.map((stage, idx) => {
            const isCompleted = idx < activeStage
            const isActive = idx === activeStage
            const isFailed = isActive && wo.status === 'QC Failed'
            return (
              <div key={stage.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      isFailed
                        ? 'bg-red-100 text-red-700 ring-2 ring-red-400'
                        : isCompleted
                          ? 'bg-green-100 text-green-700'
                          : isActive
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                            : 'bg-muted text-muted-foreground'
                    }`}
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
                      idx < activeStage ? 'bg-green-400' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Key Info Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="size-4" />
            Output
          </div>
          <p className="mt-1 font-semibold">{wo.outputPartName}</p>
          <p className="text-sm text-muted-foreground">&times; {wo.outputQty} units</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Boxes className="size-4" />
            Components
          </div>
          <p className="mt-1 text-2xl font-semibold">{pickingProgress}%</p>
          <p className="text-sm text-muted-foreground">{totalPicked}/{totalRequired} picked</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {wo.destinationType === 'RENTAL_WAREHOUSE' ? (
              <Warehouse className="size-4" />
            ) : (
              <Truck className="size-4" />
            )}
            Destination
          </div>
          <p className="mt-1 font-semibold">
            {wo.destinationType === 'RENTAL_WAREHOUSE' ? 'Rental Warehouse' : wo.destinationType === 'DISPATCH' ? 'Direct Dispatch' : 'Stock'}
          </p>
          {wo.destinationWarehouseName && (
            <p className="text-sm text-muted-foreground">{wo.destinationWarehouseName}</p>
          )}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            Due Date
          </div>
          <p className="mt-1 font-semibold">{formatDate(wo.dueDate)}</p>
          {wo.completedAt ? (
            <p className="text-sm text-green-600">Completed {formatDate(wo.completedAt)}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {new Date(wo.dueDate) < new Date() ? (
                <span className="text-red-600">Overdue</span>
              ) : (
                `${Math.ceil((new Date(wo.dueDate).getTime() - Date.now()) / 86400000)} days left`
              )}
            </p>
          )}
        </div>
      </div>

      {/* Source Reference */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="size-4" />
            Source & BOM
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 px-6 py-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Source</p>
            <p className="mt-1 font-medium">{TYPE_LABELS[wo.type]}</p>
            <p className="text-sm text-muted-foreground">
              {wo.salesOrderNumber ?? wo.rentalContractNumber ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Bill of Materials</p>
            <Link to={`/wms/bom/${wo.bomId}`} className="mt-1 block font-medium text-primary hover:underline">
              {wo.bomName}
            </Link>
            <p className="text-sm text-muted-foreground">{wo.bomNumber}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Customer</p>
            <p className="mt-1 font-medium">{wo.customerName ?? '—'}</p>
            {wo.invoiceNumber && (
              <p className="text-sm text-muted-foreground">Invoice: {wo.invoiceNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Component Picking */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Boxes className="size-4" />
              Component Picking
              {hasSubstitutes && (
                <StatusBadge variant="warning">
                  <Repeat className="size-3 mr-1" />
                  Has Substitutions
                </StatusBadge>
              )}
            </h2>
            <span className="text-sm text-muted-foreground">
              {totalPicked}/{totalRequired} picked ({pickingProgress}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                pickingProgress === 100 ? 'bg-green-500' : 'bg-primary'
              }`}
              style={{ width: `${pickingProgress}%` }}
            />
          </div>
        </div>
        <div className="divide-y">
          {wo.components.map((comp) => {
            const progress = comp.requiredQty > 0 ? Math.round((comp.pickedQty / comp.requiredQty) * 100) : 0
            return (
              <div key={comp.id} className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{comp.partName}</p>
                      {comp.isSubstitute && (
                        <StatusBadge variant="warning">
                          <Repeat className="size-3 mr-1" />
                          Substitute
                        </StatusBadge>
                      )}
                      <StatusBadge
                        variant={
                          comp.status === 'Issued' || comp.status === 'Picked'
                            ? 'success'
                            : comp.status === 'Partially Picked'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {comp.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      SKU: {comp.partSku}
                      {comp.isSubstitute && comp.originalPartId && (
                        <span className="ml-2 italic">
                          (original: {comp.originalPartId})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold">
                      {comp.pickedQty}/{comp.requiredQty}
                    </p>
                    <p className="text-xs text-muted-foreground">{progress}% picked</p>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-yellow-500' : 'bg-muted'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {/* Picked SKUs (collapsed view) */}
                {comp.pickedSkus.length > 0 && comp.pickedSkus.length <= 4 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {comp.pickedSkus.map((s) => (
                      <span key={s.sku} className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs">
                        {s.barcode} · {s.location}
                      </span>
                    ))}
                  </div>
                )}
                {comp.pickedSkus.length > 4 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {comp.pickedSkus.length} units picked from {comp.pickedSkus[0]?.location}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Assembly */}
      {(wo.assemblyStartedAt || wo.assemblyTeam) && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="size-4" />
              Assembly
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 px-6 py-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Team</p>
              <p className="mt-1 font-medium">{wo.assemblyTeam ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Started</p>
              <p className="mt-1 font-medium">
                {wo.assemblyStartedAt ? formatDateTime(wo.assemblyStartedAt) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Completed</p>
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
      )}

      {/* QC Records */}
      {wo.qcRecords.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              Quality Control
            </h2>
          </div>
          <div className="divide-y">
            {wo.qcRecords.map((qc) => (
              <div key={qc.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {qc.result === 'PASSED' ? (
                      <div className="flex size-10 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle2 className="size-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
                        <XCircle className="size-5 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        QC {qc.result === 'PASSED' ? 'Passed' : 'Failed'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        By {qc.performedBy} &middot; {formatDateTime(qc.performedAt)}
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
                        item.result === 'PASS' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
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
                  <div className="mt-3 rounded-md bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-800 flex items-center gap-1.5">
                      <AlertTriangle className="size-4" />
                      Failure Reasons
                    </p>
                    <ul className="mt-1 list-disc list-inside text-sm text-red-700">
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
            ))}
          </div>
        </div>
      )}

      {/* Destination / Dispatch */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            {wo.destinationType === 'RENTAL_WAREHOUSE' ? (
              <>
                <Warehouse className="size-4" />
                Rental Warehouse Routing
              </>
            ) : (
              <>
                <Truck className="size-4" />
                Dispatch & Billing
              </>
            )}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 px-6 py-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Destination</p>
            <p className="mt-1 font-medium">
              {wo.destinationType === 'RENTAL_WAREHOUSE'
                ? wo.destinationWarehouseName ?? 'Rental Warehouse'
                : wo.destinationType === 'DISPATCH'
                  ? 'Direct to Customer'
                  : 'Stock'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Customer</p>
            <p className="mt-1 font-medium">{wo.customerName ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Invoice</p>
            <p className="mt-1 font-medium">{wo.invoiceNumber ?? 'Not yet invoiced'}</p>
          </div>
        </div>
        {wo.destinationType === 'RENTAL_WAREHOUSE' && (
          <div className="border-t px-6 py-4">
            <div className="flex items-center gap-2 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              <Warehouse className="size-4 shrink-0" />
              <span>
                This is a <strong>rental order</strong>. After QC, units are sent to the rental warehouse
                instead of direct dispatch. Billing happens through the rental contract cycle.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-3 font-semibold">People</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created By</dt>
              <dd>{wo.createdBy}</dd>
            </div>
            {wo.approvedBy && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Approved By</dt>
                <dd className="flex items-center gap-1">
                  <CheckCircle2 className="size-3.5 text-green-600" />
                  {wo.approvedBy}
                </dd>
              </div>
            )}
            {wo.assignedTo && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Assigned To</dt>
                <dd>{wo.assignedTo}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-3 font-semibold">Dates</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(wo.createdAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Requested</dt>
              <dd>{formatDate(wo.requestedDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Due</dt>
              <dd>{formatDate(wo.dueDate)}</dd>
            </div>
            {wo.completedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Completed</dt>
                <dd className="text-green-600">{formatDate(wo.completedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Notes */}
      {wo.notes && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-3 font-semibold">Notes</h3>
          <p className="text-sm text-muted-foreground">{wo.notes}</p>
        </div>
      )}
    </div>
  )
}

export { WorkOrderDetailPage }
export default WorkOrderDetailPage
