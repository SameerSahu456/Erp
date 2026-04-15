import { useParams, Link } from 'react-router-dom'
import { Printer } from 'lucide-react'

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

  // Items tab
  const itemsContent = (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Part</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Qty Ordered</TableHead>
            <TableHead className="text-right">Qty Received</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Tax (%)</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {po.items.map((item) => {
            const shortReceived = item.qtyReceived < item.qtyOrdered
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.partName}</TableCell>
                <TableCell className="text-muted-foreground">{item.partSku}</TableCell>
                <TableCell className="text-right tabular-nums">{item.qtyOrdered}</TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    shortReceived && 'bg-destructive/10 text-destructive font-medium'
                  )}
                >
                  {item.qtyReceived}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">{item.taxRate}%</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatCurrency(item.amount)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )

  // Vendor tab
  const vendorContent = vendor ? (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{vendor.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Contact Person</dt>
            <dd className="text-sm">{vendor.contactPerson}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="text-sm">{vendor.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="text-sm">{vendor.phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Address</dt>
            <dd className="text-sm">{vendor.address}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">GST Number</dt>
            <dd className="text-sm">{vendor.gstNumber ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Payment Terms</dt>
            <dd className="text-sm">{vendor.paymentTerms}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rating</dt>
            <dd className="text-sm">{'★'.repeat(Math.round(vendor.rating))}{'☆'.repeat(5 - Math.round(vendor.rating))} ({vendor.rating})</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  ) : (
    <p className="text-sm text-muted-foreground">Vendor details not available.</p>
  )

  // GRN Matching tab
  const grnContent = (
    <div className="space-y-4">
      {grnEntries.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Qty Ordered</TableHead>
                <TableHead className="text-right">Qty Received</TableHead>
                <TableHead className="text-right">Qty Pending</TableHead>
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
                  <TableCell className="text-right tabular-nums">{entry.qtyPending}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.batchNumber ?? '-'}</TableCell>
                  <TableCell>
                    <StatusBadge variant={getGRNStatusVariant(entry.status)}>{entry.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {entry.discrepancyNotes ?? '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No GRN entries for this purchase order</p>
        </div>
      )}
    </div>
  )

  // Documents tab
  const documentsContent = (
    <div className="rounded-lg border border-dashed p-8 text-center">
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
                <div className="overflow-x-auto rounded-md border">
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
                  <div className="w-full max-w-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">{formatCurrencyDecimal(po.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="tabular-nums">{formatCurrencyDecimal(po.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="tabular-nums">-{formatCurrencyDecimal(po.discount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-semibold">
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
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Vendor</dt>
                  <dd className="text-sm">{po.vendorName}</dd>
                </div>
                {po.prNumber && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">PR Ref</dt>
                    <dd>
                      <Link
                        to={`/procurement/pr/${po.prId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {po.prNumber}
                      </Link>
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Payment Terms</dt>
                  <dd className="text-sm">{po.paymentTerms}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Delivery Terms</dt>
                  <dd className="text-sm">{po.deliveryTerms}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Expected Delivery</dt>
                  <dd className="text-sm">{formatDate(po.expectedDelivery)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Created By</dt>
                  <dd className="text-sm">{po.createdBy}</dd>
                </div>
                {po.approvedBy && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Approved By</dt>
                    <dd className="text-sm">{po.approvedBy}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
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
                  <dd className="tabular-nums">-{formatCurrency(po.discount)}</dd>
                </div>
                <div className="flex items-center justify-between border-t pt-2 font-semibold">
                  <dt>Grand Total</dt>
                  <dd className="tabular-nums">{formatCurrency(po.grandTotal)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {po.notes && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{po.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default PODetailPage
