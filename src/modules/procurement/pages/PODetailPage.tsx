import { Fragment, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Printer,
  Eye,
  Truck,
  Calendar,
  CreditCard,
  User,
  Building2,
  Package,
  Package2,
  FileText,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Layers,
  History as HistoryIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { DetailTabs } from '@/modules/crm/components/DetailTabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'
import { mockVendors } from '@/modules/procurement/data/vendors'
import { mockBOMs } from '@/modules/wms/data/boms'
import type { POStatus, PurchaseOrderItem } from '@/modules/procurement/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

const formatCurrencyDecimal = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getPOStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Sent to Vendor': return 'info'
    case 'Acknowledged': return 'info'
    case 'Partially Received': return 'warning'
    case 'Fully Received': return 'success'
    case 'Closed': return 'neutral'
    case 'Cancelled': return 'error'
    default: return 'neutral'
  }
}

function findBOMForLine(item: PurchaseOrderItem) {
  if (item.category !== 'Servers') return undefined
  return (
    mockBOMs.find((b) => b.type === 'ASSEMBLY' && b.parentPartId === item.partId) ??
    mockBOMs.find((b) => b.type === 'ASSEMBLY')
  )
}

const AMENDABLE_PO_STATUSES: POStatus[] = [
  'Sent to Vendor',
  'Acknowledged',
  'Partially Received',
]

function PODetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [amendOpen, setAmendOpen] = useState(false)
  const [amendReason, setAmendReason] = useState('')
  const [bomExpanded, setBomExpanded] = useState<Record<string, boolean>>({})
  const [previewOpen, setPreviewOpen] = useState(false)

  const toggleBom = (lineId: string) =>
    setBomExpanded((prev) => ({ ...prev, [lineId]: !prev[lineId] }))

  const po = mockPurchaseOrders.find((p) => p.id === id)

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted p-4">
          <Package className="size-8 text-muted-foreground" />
        </div>
        <h2 className="font-display text-xl font-semibold">Purchase Order not found</h2>
        <p className="text-sm text-muted-foreground">
          The purchase order you are looking for does not exist.
        </p>
        <Button variant="outline" render={<Link to="/procurement/po" />}>
          Back to Purchase Orders
        </Button>
      </div>
    )
  }

  const vendor = mockVendors.find((v) => v.id === po.vendorId)
  const canAmend = AMENDABLE_PO_STATUSES.includes(po.status)
  const versionHistory = po.versionHistory ?? []

  // Fulfilment progress
  const totalOrdered = po.items.reduce((s, i) => s + i.qtyOrdered, 0)
  const totalReceived = po.items.reduce((s, i) => s + i.qtyReceived, 0)
  const fulfilmentPct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0

  function handleConfirmAmend() {
    // Snapshot current state into history and bump version. id + poNumber stay stable.
    const snapshot = {
      version: po!.version,
      amendedAt: new Date().toISOString().slice(0, 10),
      amendedBy: 'Current User',
      reason: amendReason.trim() || undefined,
      items: po!.items,
      subtotal: po!.subtotal,
      taxAmount: po!.taxAmount,
      discount: po!.discount,
      grandTotal: po!.grandTotal,
      status: po!.status,
      expectedDelivery: po!.expectedDelivery,
    }
    po!.versionHistory = [...(po!.versionHistory ?? []), snapshot]
    po!.version = po!.version + 1
    setAmendOpen(false)
    setAmendReason('')
    toast.success(`${po!.poNumber} — Rev ${po!.version} created`)
    navigate(`/procurement/po/${po!.id}/edit`)
  }

  // Line items tab
  const itemsContent = (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Part no</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {po.items.map((item, idx) => {
              const shortReceived = item.qtyReceived < item.qtyOrdered
              const pct = item.qtyOrdered > 0 ? Math.round((item.qtyReceived / item.qtyOrdered) * 100) : 0
              const bom = findBOMForLine(item)
              const expanded = !!bomExpanded[item.id]
              const components = bom?.items ?? []
              return (
                <Fragment key={item.id}>
                  <TableRow>
                    <TableCell className="align-top text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-muted-foreground">{item.partSku}</span>
                        {bom && (
                          <button
                            type="button"
                            onClick={() => toggleBom(item.id)}
                            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            <Package2 className="size-3" />
                            {expanded ? 'Hide BOM' : 'View BOM'}
                            {components.length > 0 && (
                              <Badge variant="outline" className="ml-1 text-[10px]">
                                {components.length}
                              </Badge>
                            )}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div>
                        <span className="font-medium">{item.partName}</span>
                        <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {item.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right tabular-nums">{item.qtyOrdered}</TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={cn(
                          'tabular-nums',
                          shortReceived && 'text-status-warning-text font-medium'
                        )}>
                          {item.qtyReceived}
                        </span>
                        <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted sm:block">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              pct >= 100 ? 'bg-status-success-text' : pct > 0 ? 'bg-status-warning-text' : 'bg-muted-foreground/30'
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="align-top text-right tabular-nums text-muted-foreground">{item.taxRate}%</TableCell>
                    <TableCell className="align-top text-right tabular-nums font-medium">{formatCurrency(item.amount)}</TableCell>
                  </TableRow>
                  {expanded && bom && (
                    <TableRow>
                      <TableCell />
                      <TableCell colSpan={7} className="bg-muted/20">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex size-6 items-center justify-center rounded bg-primary/10 text-primary">
                            <Layers className="size-3.5" />
                          </span>
                          <div>
                            <Link
                              to={`/wms/bom/${bom.id}`}
                              className="text-sm font-semibold text-foreground hover:underline"
                            >
                              {bom.name}
                            </Link>
                            <div className="text-[11px] text-muted-foreground">
                              <span className="font-mono">{bom.bomNumber}</span> · {components.length} component{components.length === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>
                        {components.length > 0 ? (
                          <div className="overflow-hidden rounded-md border bg-background">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                                <tr>
                                  <th className="px-3 py-1.5 text-left font-medium">Line items</th>
                                  <th className="px-3 py-1.5 text-left font-medium">Part NO</th>
                                  <th className="w-20 px-3 py-1.5 text-right font-medium">Qty</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {components.map((c) => (
                                  <tr key={c.id}>
                                    <td className="px-3 py-1.5">
                                      <div className="font-medium">{c.partName}</div>
                                      <div className="text-[10px] text-muted-foreground font-mono">
                                        {c.partSku}
                                      </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <span className="font-mono text-[11px]">{c.variantSku}</span>
                                      <Badge variant="outline" className="ml-1 text-[10px]">{c.condition}</Badge>
                                      {c.isOptional && (
                                        <Badge variant="secondary" className="ml-1 text-[10px]">Optional</Badge>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">
                                      {c.quantity} {c.unitOfMeasure}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs italic text-muted-foreground">
                            This BOM has no components configured.
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  // Vendor tab
  const vendorContent = vendor ? (
    <div className="space-y-4">
      <div className="flex items-start gap-4 rounded-lg border p-4">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/8">
          <Building2 className="size-6 text-primary" />
        </div>
        <div className="flex-1">
          <Link to={`/procurement/vendors/${vendor.id}`} className="text-base font-semibold text-primary hover:underline">
            {vendor.name}
          </Link>
          <p className="text-sm text-muted-foreground">{vendor.contactPerson} &middot; {vendor.email}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm text-yellow-500">
              {'★'.repeat(Math.round(vendor.rating))}{'☆'.repeat(5 - Math.round(vendor.rating))}
            </span>
            <span className="text-xs text-muted-foreground">({vendor.rating}/5)</span>
            <span className="text-xs text-muted-foreground">&middot;</span>
            <span className="text-xs text-muted-foreground">{vendor.onTimeDeliveryRate}% on-time</span>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground mb-1">Phone</dt>
          <dd className="text-sm">{vendor.phone}</dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground mb-1">Address</dt>
          <dd className="text-sm">{vendor.address}</dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground mb-1">GST Number</dt>
          <dd className="text-sm font-mono">{vendor.gstNumber ?? '-'}</dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground mb-1">Payment Terms</dt>
          <dd className="text-sm">{vendor.paymentTerms}</dd>
        </div>
      </dl>
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">Vendor details not available.</p>
  )

  // Documents tab
  const documentsContent = (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
      <FileText className="size-8 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">No documents attached</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Attach PO documents, invoices, and delivery receipts.
      </p>
    </div>
  )

  const tabs = [
    { id: 'items', label: 'Line items', count: po.items.length, content: itemsContent },
    { id: 'vendor', label: 'Vendor', content: vendorContent },
    { id: 'documents', label: 'Documents', content: documentsContent },
  ]

  // Status-based actions
  const actionButtons = (
    <>
      {po.status === 'Draft' && <Button size="sm">Send to Vendor</Button>}
      {(po.status === 'Acknowledged' || po.status === 'Partially Received') && (
        <Button size="sm">Mark Received</Button>
      )}
      {po.status === 'Fully Received' && (
        <Button size="sm" variant="outline">Close PO</Button>
      )}
      {canAmend && (
        <Button variant="outline" size="sm" onClick={() => setAmendOpen(true)}>
          <GitBranch className="size-3.5" data-icon="inline-start" />
          Amend
        </Button>
      )}
      <Button variant="outline" size="sm">
        <Printer className="size-3.5" data-icon="inline-start" />
        Print
      </Button>
      <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
        <Eye className="size-3.5" data-icon="inline-start" />
        Preview
      </Button>
    </>
  )

  const versionBadge = po.version > 1 ? (
    <Badge variant="outline" className="gap-1 font-mono">
      <GitBranch className="size-3" />
      Rev {po.version}
    </Badge>
  ) : null

  return (
    <div className="space-y-6">
      <EntityHeader
        title={po.poNumber}
        subtitle={po.vendorName}
        status={{ label: po.status, variant: getPOStatusVariant(po.status) }}
        badges={versionBadge}
        backHref="/procurement/po"
        actions={actionButtons}
      />

      {/* Quick info strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Building2 className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Vendor</p>
            <p className="text-sm font-medium truncate">{po.vendorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Calendar className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Expected Delivery</p>
            <p className="text-sm font-medium">{formatDate(po.expectedDelivery)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
          <div className="rounded-md bg-primary/8 p-1.5">
            <CreditCard className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Payment</p>
            <p className="text-sm font-medium">{po.paymentTerms}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
          <div className="rounded-md bg-primary/8 p-1.5">
            <User className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Created By</p>
            <p className="text-sm font-medium">{po.createdBy}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Truck className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Fulfilment</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{fulfilmentPct}%</p>
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    fulfilmentPct >= 100 ? 'bg-status-success-text' : fulfilmentPct > 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                  style={{ width: `${fulfilmentPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <DetailTabs cardContent tabs={tabs} defaultTab="items" />
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {po.prNumber && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">PR Ref</dt>
                    <dd>
                      <Link
                        to={`/procurement/pr/${po.prId}`}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        {po.prNumber}
                      </Link>
                    </dd>
                  </div>
                )}
                {po.salesOrderId && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Sales Order</dt>
                    <dd>
                      <Link
                        to={`/crm/sales-orders/${po.salesOrderId}`}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        {po.salesOrderNumber}
                      </Link>
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Delivery Terms</dt>
                  <dd className="text-sm">{po.deliveryTerms}</dd>
                </div>
                {po.sentDate && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Sent Date</dt>
                    <dd className="text-sm">{formatDate(po.sentDate)}</dd>
                  </div>
                )}
                {po.approvedBy && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Approved By</dt>
                    <dd className="text-sm">{po.approvedBy}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Created</dt>
                  <dd className="text-sm">{formatDate(po.createdAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Fulfilment progress card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Fulfilment Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold tabular-nums">{fulfilmentPct}%</span>
                  <span className="text-xs text-muted-foreground">{totalReceived}/{totalOrdered} units</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      fulfilmentPct >= 100 ? 'bg-status-success-text' : 'bg-primary'
                    )}
                    style={{ width: `${fulfilmentPct}%` }}
                  />
                </div>
                <div className="space-y-2 pt-1">
                  {po.items.map((item) => {
                    const pct = item.qtyOrdered > 0 ? Math.round((item.qtyReceived / item.qtyOrdered) * 100) : 0
                    return (
                      <div key={item.id}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="truncate max-w-[140px]">{item.partName}</span>
                          <span className="text-muted-foreground tabular-nums">{item.qtyReceived}/{item.qtyOrdered}</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              pct >= 100 ? 'bg-status-success-text' : pct > 0 ? 'bg-status-warning-text' : 'bg-muted-foreground/20'
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {versionHistory.length > 0 && (
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HistoryIcon className="size-4" />
                  Amendment History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <Badge variant="outline" className="gap-1 font-mono mt-0.5">
                    <GitBranch className="size-3" />
                    Rev {po.version}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Current revision</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatCurrency(po.grandTotal)} &middot; {po.status}
                    </p>
                  </div>
                </div>
                {[...versionHistory].reverse().map((snap) => (
                  <div key={snap.version} className="flex items-start gap-2 rounded-lg border px-3 py-2">
                    <Badge variant="secondary" className="gap-1 font-mono mt-0.5">
                      <GitBranch className="size-3" />
                      Rev {snap.version}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      {snap.reason && <p className="text-xs">{snap.reason}</p>}
                      <p className="text-[11px] text-muted-foreground">
                        {formatCurrency(snap.grandTotal)} &middot; {snap.amendedBy} on {formatDate(snap.amendedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {po.notes && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{po.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>PO Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold text-lg">{po.poNumber}</p>
                <p className="text-muted-foreground">Date: {formatDate(po.createdAt)}</p>
                {po.sentDate && <p className="text-muted-foreground">Sent: {formatDate(po.sentDate)}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold">Comprint Technologies</p>
                <p className="text-muted-foreground">Bengaluru, India</p>
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Vendor</p>
              <p className="font-medium">{po.vendorName}</p>
              <p className="text-muted-foreground">{po.vendorAddress}</p>
              <p className="text-muted-foreground">{po.vendorEmail}</p>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, idx) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{item.partName}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{item.qtyOrdered}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrencyDecimal(po.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums">{formatCurrencyDecimal(po.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrencyDecimal(po.discount)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-semibold text-base">
                  <span>Grand Total</span>
                  <span className="tabular-nums">{formatCurrencyDecimal(po.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={amendOpen} onOpenChange={setAmendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Amend {po.poNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The current state will be snapshotted as Rev {po.version}, and you will edit a new Rev {po.version + 1}.
              The PO number stays the same.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="po-amend-reason">
              Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="po-amend-reason"
              placeholder="e.g., Vendor extended volume discount after full upfront payment"
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAmend}>
              Create Rev {po.version + 1}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PODetailPage
