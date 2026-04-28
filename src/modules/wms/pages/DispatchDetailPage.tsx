import { useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import {
  ArrowLeft,
  Package,
  Truck,
  FileText,
  ExternalLink,
  AlertTriangle,
  ArrowLeftRight,
  Plus as PlusIcon,
  X as XIcon,
  Check,
  MapPin,
  User,
  Ticket,
  Receipt,
  ClipboardList,
  CheckCircle2,
  Tag,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { PageHeader } from '@/components/page'

import { useDispatches } from '../data/dispatches'
import {
  DISPATCH_TYPE_LABELS,
  type DispatchAction,
  type DispatchRequestStatus,
  type DispatchLineItem,
  type DispatchDocumentType,
} from '../types'

const STATUS_VARIANT: Record<DispatchRequestStatus, StatusBadgeVariant> = {
  Draft: 'neutral',
  'Assembly Pending': 'warning',
  Assembled: 'info',
  Billed: 'info',
  Dispatched: 'info',
  Delivered: 'success',
  Closed: 'success',
}

// Flow order — used to render a visual stepper
const STATUS_FLOW: DispatchRequestStatus[] = [
  'Draft',
  'Assembly Pending',
  'Assembled',
  'Billed',
  'Dispatched',
  'Delivered',
  'Closed',
]

const ACTION_STYLES: Record<DispatchAction, { label: string; tone: 'neutral' | 'success' | 'warning' | 'error' | 'info'; icon: typeof Check }> = {
  PLANNED: { label: 'Planned', tone: 'neutral', icon: ClipboardList },
  FITTED_AS_PLANNED: { label: 'Fitted', tone: 'success', icon: Check },
  ADDED: { label: 'Added', tone: 'info', icon: PlusIcon },
  REMOVED: { label: 'Removed', tone: 'error', icon: XIcon },
  REPLACED: { label: 'Replaced', tone: 'warning', icon: ArrowLeftRight },
}

const DOC_ICON: Record<DispatchDocumentType, typeof FileText> = {
  Invoice: Receipt,
  'E-way Bill': Truck,
  'Delivery Challan': FileText,
  'Warranty Card': CheckCircle2,
  'Service Agreement': FileText,
  Other: FileText,
}

function formatCurrency(value?: number): string {
  if (value === undefined) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ActionBadge({ action }: { action: DispatchAction }) {
  const { label, tone, icon: Icon } = ACTION_STYLES[action]
  return (
    <StatusBadge variant={tone === 'error' ? 'red-cell' : tone}>
      <Icon className="mr-1 size-3" />
      {label}
    </StatusBadge>
  )
}

function StatusStepper({ current }: { current: DispatchRequestStatus }) {
  const currentIdx = STATUS_FLOW.indexOf(current)
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {STATUS_FLOW.map((step, idx) => {
        const isPast = idx < currentIdx
        const isCurrent = idx === currentIdx
        return (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : isPast
                    ? 'bg-muted text-foreground'
                    : 'bg-muted/40 text-muted-foreground'
              }`}
            >
              {isPast && <Check className="size-3" />}
              {step}
            </div>
            {idx < STATUS_FLOW.length - 1 && (
              <div className={`mx-1 h-px w-4 ${isPast ? 'bg-muted-foreground' : 'bg-muted'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function DispatchDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const goBack = useNavigateBack('/wms/dispatches')
  const dispatches = useDispatches()
  const dispatch = useMemo(() => dispatches.find((d) => d.id === id), [dispatches, id])

  if (!dispatch) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="mr-1 size-4" />
          Back to dispatches
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Dispatch <span className="font-mono">{id}</span> not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const variance = dispatch.lineItems.filter(
    (li) => li.action === 'ADDED' || li.action === 'REMOVED' || li.action === 'REPLACED',
  )
  const fittedTotal = dispatch.lineItems.reduce((sum, li) => sum + li.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={dispatch.dispatchNumber}
        status={{ label: dispatch.status, variant: STATUS_VARIANT[dispatch.status] }}
        breadcrumbs={[
          { label: 'WMS' },
          { label: 'Dispatches', href: '/wms/dispatches' },
          { label: dispatch.dispatchNumber },
        ]}
        backHref="/wms/dispatches"
        meta={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>
              For SO <Link to={`/crm/sales-orders/${dispatch.salesOrderId}`} className="wms-link">{dispatch.salesOrderNumber}</Link>
            </span>
            <span>·</span>
            <span>{dispatch.accountName}</span>
          </div>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate(`/wms/dispatches/${dispatch.id}/edit`)}>
              Edit
            </Button>
            <Button size="sm" disabled>
              Advance status
            </Button>
          </>
        }
      />

      {/* Status stepper */}
      <Card>
        <CardContent className="py-4">
          <StatusStepper current={dispatch.status} />
        </CardContent>
      </Card>

      {/* Dispatch Details — all form-captured fields, always visible */}
      <Card>
        <CardContent className="py-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ClipboardList className="size-3.5" />
            Dispatch Details
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Sales Order</dt>
                <dd className="text-sm font-medium">
                  <Link
                    to={`/crm/sales-orders/${dispatch.salesOrderId}`}
                    className="wms-link"
                  >
                    {dispatch.salesOrderNumber}
                  </Link>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Tag className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Dispatch Type</dt>
                <dd className="text-sm font-medium">
                  {DISPATCH_TYPE_LABELS[dispatch.dispatchType]}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Account</dt>
                <dd className="text-sm font-medium">{dispatch.accountName}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Ticket className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">External Ticket</dt>
                <dd className="text-sm">
                  {dispatch.externalTicketNumber ? (
                    <>
                      <span className="font-mono font-medium">{dispatch.externalTicketNumber}</span>
                      {dispatch.externalSystem && (
                        <span className="ml-1 text-xs text-muted-foreground">via {dispatch.externalSystem}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Store Manager</dt>
                <dd className="text-sm font-medium">
                  {dispatch.storeManager || <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Receipt className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Billing Person</dt>
                <dd className="text-sm font-medium">
                  {dispatch.billingPerson || <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Receipt className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Invoice Amount</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {dispatch.invoiceAmount !== undefined
                    ? formatCurrency(dispatch.invoiceAmount)
                    : <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:col-span-2 lg:col-span-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Shipping Address</dt>
                <dd className="text-sm font-medium">
                  {dispatch.shippingAddress || <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardContent className="py-4">
          <div className="grid gap-3 text-sm md:grid-cols-5">
            <div>
              <div className="text-xs text-muted-foreground">Created</div>
              <div>{formatDate(dispatch.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Assembly Started</div>
              <div>{formatDateTime(dispatch.assemblyStartedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Assembly Completed</div>
              <div>{formatDateTime(dispatch.assemblyCompletedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Billed</div>
              <div>{formatDateTime(dispatch.billingCompletedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Dispatched</div>
              <div>{formatDateTime(dispatch.dispatchedAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variance summary banner */}
      {variance.length > 0 && (
        <div className="rounded-lg border border-[#f6c000]/40 bg-[#fff8dd] px-4 py-3 text-sm dark:bg-[#b88800]/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 text-[#b88800]" />
            <div>
              <div className="font-medium text-[#604400] dark:text-[#f6c000]">
                {variance.length} variance{variance.length === 1 ? '' : 's'} vs. SO plan
              </div>
              <div className="mt-1 text-xs text-[#604400]/80 dark:text-[#f6c000]/80">
                {variance.filter((v) => v.action === 'ADDED').length} added,{' '}
                {variance.filter((v) => v.action === 'REMOVED').length} removed,{' '}
                {variance.filter((v) => v.action === 'REPLACED').length} replaced.
                Each variance has a reason + serial numbers recorded below.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Line items */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Line Items</span>
              <span className="text-xs text-muted-foreground">
                ({dispatch.lineItems.length} total · {formatCurrency(fittedTotal)} fitted value)
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Part / Variant</th>
                  <th className="px-4 py-2 text-center font-medium">Action</th>
                  <th className="px-4 py-2 text-right font-medium">Planned</th>
                  <th className="px-4 py-2 text-right font-medium">Fitted</th>
                  <th className="px-4 py-2 text-left font-medium">Serial Numbers</th>
                  <th className="px-4 py-2 text-left font-medium">Reason / Notes</th>
                  <th className="px-4 py-2 text-right font-medium">Rate</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dispatch.lineItems.map((li) => (
                  <LineRow key={li.id} line={li} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Documents</span>
              <span className="text-xs text-muted-foreground">({dispatch.documents.length})</span>
            </div>
            <Button variant="outline" size="sm" disabled>
              <PlusIcon className="mr-1 size-3.5" />
              Attach
            </Button>
          </div>
          {dispatch.documents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No documents attached yet. Invoice, E-way Bill, and delivery challan go here once billing is done.
            </div>
          ) : (
            <div className="divide-y">
              {dispatch.documents.map((doc) => {
                const Icon = DOC_ICON[doc.type]
                return (
                  <div key={doc.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{doc.type}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">{doc.documentNumber}</Badge>
                        {doc.issuedDate && (
                          <span className="text-xs text-muted-foreground">Issued {formatDate(doc.issuedDate)}</span>
                        )}
                      </div>
                      {doc.notes && <div className="mt-0.5 text-xs text-muted-foreground">{doc.notes}</div>}
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Uploaded by {doc.uploadedBy} · {formatDateTime(doc.uploadedAt)}
                      </div>
                    </div>
                    {doc.fileName && (
                      <Button variant="ghost" size="sm" disabled className="shrink-0 text-xs">
                        <ExternalLink className="mr-1 size-3" />
                        {doc.fileName}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {dispatch.notes && (
        <Card>
          <CardContent className="py-4">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</div>
            <p className="text-sm whitespace-pre-line">{dispatch.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function LineRow({ line }: { line: DispatchLineItem }) {
  const isRemoved = line.action === 'REMOVED'
  return (
    <tr className={isRemoved ? 'bg-[#fff5f8]/40 dark:bg-[#991930]/10' : line.action === 'REPLACED' ? 'bg-[#fff8dd]/40 dark:bg-[#b88800]/10' : line.action === 'ADDED' ? 'bg-[#eef5ff]/40 dark:bg-[#0d4b94]/10' : ''}>
      <td className="px-4 py-3">
        <div className={`text-sm font-medium ${isRemoved ? 'line-through text-muted-foreground' : ''}`}>
          {line.partName}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{line.variantSku}</span>
          <Badge variant="outline" className="text-[10px]">{line.condition}</Badge>
          <span>{line.category}</span>
          {line.brand && <span>· {line.brand}</span>}
        </div>
        {line.action === 'REPLACED' && line.replacedDisplayName && (
          <div className="mt-1 flex items-center gap-1 text-xs text-[#b88800]">
            <ArrowLeftRight className="size-3" />
            Replaces: {line.replacedDisplayName}
            {line.replacedSerialNumbers && line.replacedSerialNumbers.length > 0 && (
              <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                ({line.replacedSerialNumbers.join(', ')})
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <ActionBadge action={line.action} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{line.plannedQty || '—'}</td>
      <td className="px-4 py-3 text-right tabular-nums font-medium">{line.fittedQty || '—'}</td>
      <td className="px-4 py-3">
        {line.serialNumbers && line.serialNumbers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {line.serialNumbers.slice(0, 3).map((sn) => (
              <Badge key={sn} variant="outline" className="font-mono text-[10px]">{sn}</Badge>
            ))}
            {line.serialNumbers.length > 3 && (
              <Badge variant="outline" className="text-[10px]">+{line.serialNumbers.length - 3} more</Badge>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          {line.reason && <Badge variant="outline" className="w-fit text-[10px]">{line.reason}</Badge>}
          {line.notes && <span className="text-xs text-muted-foreground">{line.notes}</span>}
          {!line.reason && !line.notes && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(line.rate)}</td>
      <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(line.amount)}</td>
    </tr>
  )
}

export default DispatchDetailPage
