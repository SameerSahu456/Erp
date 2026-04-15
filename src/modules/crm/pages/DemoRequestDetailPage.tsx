import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Package,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  RotateCcw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { demoRequests } from '../data/demo-requests'
import type { DemoRequestStatus } from '../types'

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

const STATUS_VARIANT: Record<DemoRequestStatus, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  'Draft': 'neutral',
  'Submitted': 'info',
  'Pending PM Approval': 'warning',
  'PM Approved': 'success',
  'PM Rejected': 'error',
  'Dispatch Created': 'info',
  'Dispatched': 'info',
  'With Customer': 'warning',
  'Return Overdue': 'error',
  'Returned': 'success',
  'Closed': 'neutral',
}

const DEMO_WORKFLOW_STAGES = [
  { id: 'request', label: 'Request' },
  { id: 'pm-approval', label: 'PM Approval' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'with-customer', label: 'With Customer' },
  { id: 'return', label: 'Return' },
]

function getActiveStage(status: DemoRequestStatus): number {
  const map: Record<string, number> = {
    'Draft': 0,
    'Submitted': 0,
    'Pending PM Approval': 1,
    'PM Approved': 1,
    'PM Rejected': 1,
    'Dispatch Created': 2,
    'Dispatched': 2,
    'With Customer': 3,
    'Return Overdue': 3,
    'Returned': 4,
    'Closed': 4,
  }
  return map[status] ?? 0
}

function DemoRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const demo = useMemo(() => demoRequests.find((d) => d.id === id), [id])

  if (!demo) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Demo request not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/crm/demo-requests')}>
          Back to Demo Requests
        </Button>
      </div>
    )
  }

  const activeStage = getActiveStage(demo.status)
  const isRejected = demo.status === 'PM Rejected'
  const isOverdue = demo.isOverdue
  const totalItems = demo.items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/crm/demo-requests')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {demo.demoNumber}
            </h1>
            <StatusBadge variant={STATUS_VARIANT[demo.status]}>{demo.status}</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {demo.accountName} &middot; {totalItems} item{totalItems > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Overdue alert */}
      {isOverdue && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Return overdue by {demo.overdueByDays} day{(demo.overdueByDays ?? 0) > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-600">
              Expected return: {formatDate(demo.expectedReturnDate)}. Contact {demo.contactName} at {demo.contactPhone} immediately.
            </p>
          </div>
        </div>
      )}

      {/* Workflow Stepper */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Demo Lifecycle
        </h2>
        <div className="flex items-center gap-0">
          {DEMO_WORKFLOW_STAGES.map((stage, idx) => {
            const isCompleted = idx < activeStage
            const isActive = idx === activeStage
            const isFailed = isActive && (isRejected || isOverdue)
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
                {idx < DEMO_WORKFLOW_STAGES.length - 1 && (
                  <div className={`h-0.5 w-full min-w-4 ${idx < activeStage ? 'bg-green-400' : 'bg-muted'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Contact */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <User className="size-4" />
            Customer Contact
          </h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Account</dt>
              <dd className="font-medium">{demo.accountName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Contact</dt>
              <dd className="font-medium">{demo.contactName}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="size-3 text-muted-foreground" />
              <span>{demo.contactPhone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="size-3 text-muted-foreground" />
              <span>{demo.contactEmail}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin className="size-3 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-xs">{demo.shippingAddress}</span>
            </div>
          </dl>
        </div>

        {/* PM Approval */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            PM Approval
          </h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Product Manager</dt>
              <dd className="font-medium">{demo.productManager}</dd>
              <dd className="text-xs text-muted-foreground">{demo.productManagerEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd>
                {demo.pmApprovalDate ? (
                  <StatusBadge variant={isRejected ? 'error' : 'success'}>
                    {isRejected ? 'Rejected' : 'Approved'} on {formatDate(demo.pmApprovalDate)}
                  </StatusBadge>
                ) : (
                  <StatusBadge variant="warning">Pending</StatusBadge>
                )}
              </dd>
            </div>
            {demo.pmRemarks && (
              <div>
                <dt className="text-xs text-muted-foreground">Remarks</dt>
                <dd className="mt-1 rounded-md bg-muted/50 p-2 text-xs italic">{demo.pmRemarks}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Dates */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <Calendar className="size-4" />
            Dates & Return
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(demo.createdAt)}</dd>
            </div>
            {demo.dispatchDate && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground flex items-center gap-1"><Truck className="size-3" /> Dispatched</dt>
                <dd>{formatDate(demo.dispatchDate)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                <RotateCcw className="size-3" /> Return By
              </dt>
              <dd className={isOverdue ? 'text-red-600 font-medium' : ''}>
                {formatDate(demo.expectedReturnDate)}
              </dd>
            </div>
            {demo.actualReturnDate && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Actual Return</dt>
                <dd className="text-green-600">{formatDate(demo.actualReturnDate)}</dd>
              </div>
            )}
            {isOverdue && (
              <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />
                Overdue by {demo.overdueByDays} day{(demo.overdueByDays ?? 0) > 1 ? 's' : ''}
              </div>
            )}
            {demo.returnCondition && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Condition</dt>
                <dd>
                  <StatusBadge variant={demo.returnCondition === 'Good' ? 'success' : demo.returnCondition === 'Damaged' ? 'error' : 'warning'}>
                    {demo.returnCondition}
                  </StatusBadge>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Demo Items */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Package className="size-4" />
            Demo Items ({totalItems} units)
          </h2>
        </div>
        <div className="divide-y">
          {demo.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{item.partName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.brand} · {item.partSku} · {item.category}
                </p>
                {item.serialNumbers && item.serialNumbers.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.serialNumbers.map((sn) => (
                      <span key={sn} className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                        {sn}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-semibold">&times;{item.qty}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Source & Notes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-3 font-semibold">Source</h3>
          <dl className="space-y-2 text-sm">
            {demo.dealId && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Deal</dt>
                <dd className="font-medium">{demo.dealName}</dd>
              </div>
            )}
            {demo.leadId && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Lead</dt>
                <dd className="font-medium">{demo.leadName}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Requested By</dt>
              <dd>{demo.requestedBy}</dd>
            </div>
            {demo.dispatchRequestId && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Dispatch Ref</dt>
                <dd className="font-mono text-xs">{demo.dispatchRequestId}</dd>
              </div>
            )}
          </dl>
        </div>

        {demo.notes && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-3 font-semibold">Notes</h3>
            <p className="text-sm text-muted-foreground">{demo.notes}</p>
            {demo.returnNotes && (
              <div className="mt-3 rounded-md bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">Return Notes</p>
                <p className="mt-1 text-sm">{demo.returnNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { DemoRequestDetailPage }
export default DemoRequestDetailPage
