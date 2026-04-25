import { useParams, Link } from 'react-router-dom'
import {
  Package,
  Calendar,
  Hash,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { DetailTabs } from '@/modules/crm/components/DetailTabs'

import { mockGRNMatches } from '@/modules/procurement/data/grn-matching'
import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'

const formatDate = (dateStr?: string) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-'

function getGRNStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Matched': return 'success'
    case 'Partial': return 'warning'
    case 'Pending': return 'info'
    case 'Over Received': return 'error'
    case 'Discrepancy': return 'error'
    default: return 'neutral'
  }
}

function GRNDetailPage() {
  const { id } = useParams<{ id: string }>()

  const entry = mockGRNMatches.find((g) => g.id === id)

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted p-4">
          <Package className="size-8 text-muted-foreground" />
        </div>
        <h2 className="font-display text-xl font-semibold">GRN entry not found</h2>
        <p className="text-sm text-muted-foreground">
          The GRN entry you are looking for does not exist.
        </p>
        <Button variant="outline" render={<Link to="/procurement/grn-matching" />}>
          Back to GRN Matching
        </Button>
      </div>
    )
  }

  const po = mockPurchaseOrders.find((p) => p.id === entry.poId)
  const poItem = po?.items.find((i) => i.id === entry.poItemId)

  const matchPct = entry.qtyOrdered > 0
    ? Math.min(100, Math.round((entry.qtyReceived / entry.qtyOrdered) * 100))
    : 0
  const isDiscrepancy = entry.status === 'Discrepancy' || entry.status === 'Over Received'

  // Receipt tab
  const receiptContent = (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 text-sm font-semibold">Receipt Details</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Part</dt>
            <dd className="mt-0.5 text-sm font-medium">{entry.partName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Batch Number</dt>
            <dd className="mt-0.5 text-sm font-mono">{entry.batchNumber ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Received Date</dt>
            <dd className="mt-0.5 text-sm">{formatDate(entry.receivedDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-0.5">
              <StatusBadge variant={getGRNStatusVariant(entry.status)}>{entry.status}</StatusBadge>
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-4 text-sm font-semibold">Quantity Match</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Ordered</p>
            <p className="text-2xl font-bold tabular-nums">{entry.qtyOrdered}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Received</p>
            <p className="text-2xl font-bold tabular-nums">{entry.qtyReceived}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold tabular-nums">{entry.qtyPending}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Fulfilment</span>
            <span className="font-medium tabular-nums">{matchPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                matchPct === 100 ? 'bg-status-success-text'
                  : matchPct > 0 ? 'bg-status-warning-text'
                    : 'bg-muted-foreground/30'
              }`}
              style={{ width: `${matchPct}%` }}
            />
          </div>
        </div>
      </div>

      {entry.discrepancyNotes && (
        <div className="flex items-start gap-2.5 rounded-lg border border-status-error-text/20 bg-status-error-bg/50 p-4">
          <AlertTriangle className="mt-0.5 size-4 text-status-error-text" />
          <div>
            <p className="text-sm font-medium text-status-error-text">Discrepancy Notes</p>
            <p className="mt-1 text-sm text-status-error-text/80">{entry.discrepancyNotes}</p>
          </div>
        </div>
      )}
    </div>
  )

  // PO Reference tab
  const poRefContent = po ? (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Linked Purchase Order</h3>
          <Link
            to={`/procurement/po/${po.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            View PO
            <ExternalLink className="size-3" />
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">PO Number</dt>
            <dd className="mt-0.5 text-sm font-mono">{po.poNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Vendor</dt>
            <dd className="mt-0.5 text-sm">{po.vendorName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Expected Delivery</dt>
            <dd className="mt-0.5 text-sm">{formatDate(po.expectedDelivery)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">PO Status</dt>
            <dd className="mt-0.5 text-sm">{po.status}</dd>
          </div>
        </dl>
      </div>

      {poItem && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 text-sm font-semibold">Line Item</h3>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Part SKU</dt>
              <dd className="mt-0.5 text-sm font-mono">{poItem.partSku}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Unit Price</dt>
              <dd className="mt-0.5 text-sm tabular-nums">₹{poItem.unitPrice.toLocaleString('en-IN')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">PO Quantity</dt>
              <dd className="mt-0.5 text-sm tabular-nums">{poItem.qtyOrdered}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Line Total</dt>
              <dd className="mt-0.5 text-sm tabular-nums">₹{poItem.amount.toLocaleString('en-IN')}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
      <Package className="size-8 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">Linked PO not available</p>
    </div>
  )

  // Activity tab
  const activityContent = (
    <div className="space-y-3">
      {entry.receivedDate && (
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <div className="mt-0.5 rounded-full bg-status-success-bg p-1.5">
            <CheckCircle2 className="size-3.5 text-status-success-text" />
          </div>
          <div>
            <p className="text-sm font-medium">Goods received</p>
            <p className="text-xs text-muted-foreground">
              {entry.qtyReceived} of {entry.qtyOrdered} units received
              {entry.batchNumber && ` · Batch ${entry.batchNumber}`}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(entry.receivedDate)}</p>
          </div>
        </div>
      )}
      {isDiscrepancy && (
        <div className="flex items-start gap-3 rounded-lg border border-status-error-text/20 bg-status-error-bg/30 p-3">
          <div className="mt-0.5 rounded-full bg-status-error-bg p-1.5">
            <AlertTriangle className="size-3.5 text-status-error-text" />
          </div>
          <div>
            <p className="text-sm font-medium">Discrepancy flagged</p>
            <p className="text-xs text-muted-foreground">
              Status changed to {entry.status}
            </p>
          </div>
        </div>
      )}
      {entry.qtyPending > 0 && entry.status !== 'Pending' && (
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <div className="mt-0.5 rounded-full bg-status-warning-bg p-1.5">
            <ClipboardList className="size-3.5 text-status-warning-text" />
          </div>
          <div>
            <p className="text-sm font-medium">Pending balance</p>
            <p className="text-xs text-muted-foreground">
              {entry.qtyPending} units still expected from vendor
            </p>
          </div>
        </div>
      )}
      {!entry.receivedDate && entry.status === 'Pending' && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <ClipboardList className="size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No receipts logged yet</p>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'receipt', label: 'Receipt', content: receiptContent },
    { id: 'po', label: 'PO Reference', content: poRefContent },
    { id: 'activity', label: 'Activity', content: activityContent },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={`${entry.id} — ${entry.partName}`}
        subtitle={entry.poNumber}
        status={{ label: entry.status, variant: getGRNStatusVariant(entry.status) }}
        backHref="/procurement/grn-matching"
      />

      {/* Quick info strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Package className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Ordered / Received</p>
            <p className="text-sm font-medium tabular-nums">{entry.qtyOrdered} / {entry.qtyReceived}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Hash className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Batch</p>
            <p className="text-sm font-mono truncate">{entry.batchNumber ?? '-'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Calendar className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Received</p>
            <p className="text-sm font-medium">{formatDate(entry.receivedDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <CheckCircle2 className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Fulfilment</p>
            <p className="text-sm font-semibold tabular-nums">{matchPct}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DetailTabs cardContent tabs={tabs} defaultTab="receipt" />
        </div>

        <div className="space-y-4">
          {isDiscrepancy && (
            <div className="flex items-start gap-2.5 rounded-lg border border-status-error-text/20 bg-status-error-bg/50 p-3">
              <AlertTriangle className="mt-0.5 size-4 text-status-error-text" />
              <div>
                <p className="text-sm font-medium text-status-error-text">Action required</p>
                <p className="text-xs text-status-error-text/80">
                  Reach out to vendor to resolve {entry.status.toLowerCase()}.
                </p>
              </div>
            </div>
          )}

          <Card size="sm">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">GRN ID</dt>
                  <dd className="text-sm font-mono">{entry.id}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">PO Number</dt>
                  <dd className="text-sm">
                    <Link to={`/procurement/po/${entry.poId}`} className="font-mono text-primary hover:underline">
                      {entry.poNumber}
                    </Link>
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Qty Ordered</dt>
                  <dd className="text-sm font-medium tabular-nums">{entry.qtyOrdered}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Qty Received</dt>
                  <dd className="text-sm font-medium tabular-nums">{entry.qtyReceived}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Qty Pending</dt>
                  <dd className="text-sm font-medium tabular-nums">{entry.qtyPending}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {entry.qtyPending > 0 && (
                  <Button size="sm" className="w-full">Record Receipt</Button>
                )}
                {isDiscrepancy && (
                  <Button size="sm" variant="outline" className="w-full">Raise Vendor Query</Button>
                )}
                <Button size="sm" variant="outline" className="w-full" render={<Link to={`/procurement/po/${entry.poId}`} />}>
                  View Purchase Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default GRNDetailPage
