import { useParams, Link } from 'react-router-dom'
import {
  Printer,
  Truck,
  Calendar,
  CreditCard,
  User,
  Building2,
  Package,
  FileText,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
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
import { mockGRNMatches } from '@/modules/procurement/data/grn-matching'

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

function PODetailPage() {
  const { id } = useParams<{ id: string }>()

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
  const grnEntries = mockGRNMatches.filter((g) => g.poId === po.id)

  // Fulfilment progress
  const totalOrdered = po.items.reduce((s, i) => s + i.qtyOrdered, 0)
  const totalReceived = po.items.reduce((s, i) => s + i.qtyReceived, 0)
  const fulfilmentPct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0

  // Items tab
  const itemsContent = (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Part</TableHead>
              <TableHead>SKU</TableHead>
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
              return (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{item.partName}</span>
                      <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                        {item.category}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{item.partSku}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.qtyOrdered}</TableCell>
                  <TableCell className="text-right">
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
                  <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{item.taxRate}%</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(item.amount)}</TableCell>
                </TableRow>
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

  // GRN Matching tab
  const grnContent = (
    <div className="space-y-4">
      {grnEntries.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>Batch#</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grnEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.partName}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.qtyOrdered}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.qtyReceived}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{entry.qtyPending}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{entry.batchNumber ?? '-'}</TableCell>
                  <TableCell>
                    <StatusBadge variant={getGRNStatusVariant(entry.status)}>{entry.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                    {entry.discrepancyNotes ?? '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Package className="size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No GRN entries for this purchase order</p>
        </div>
      )}
    </div>
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
    { id: 'items', label: 'Items', count: po.items.length, content: itemsContent },
    { id: 'vendor', label: 'Vendor', content: vendorContent },
    { id: 'grn', label: 'GRN Matching', count: grnEntries.length, content: grnContent },
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
      <Button variant="outline" size="sm">
        <Printer className="size-3.5" data-icon="inline-start" />
        Print
      </Button>
    </>
  )

  return (
    <div className="space-y-6">
      <EntityHeader
        title={po.poNumber}
        subtitle={po.vendorName}
        status={{ label: po.status, variant: getPOStatusVariant(po.status) }}
        backHref="/procurement/po"
        actions={actionButtons}
      />

      {/* Quick info strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Building2 className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Vendor</p>
            <p className="text-sm font-medium truncate">{po.vendorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Calendar className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Expected Delivery</p>
            <p className="text-sm font-medium">{formatDate(po.expectedDelivery)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <CreditCard className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Payment</p>
            <p className="text-sm font-medium">{po.paymentTerms}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <User className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Created By</p>
            <p className="text-sm font-medium">{po.createdBy}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
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
          <DetailTabs tabs={tabs} defaultTab="items" />

          {/* Print-ready PO Preview */}
          <Card className="mt-6 print:shadow-none print:border-none">
            <CardHeader>
              <CardTitle>PO Preview</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">{formatCurrency(po.subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="tabular-nums">{formatCurrency(po.taxAmount)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="tabular-nums text-status-success-text">-{formatCurrency(po.discount)}</dd>
                </div>
                <div className="flex items-center justify-between border-t pt-2.5">
                  <dt className="font-semibold">Grand Total</dt>
                  <dd className="text-lg font-bold tabular-nums">{formatCurrency(po.grandTotal)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

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
    </div>
  )
}

export default PODetailPage
