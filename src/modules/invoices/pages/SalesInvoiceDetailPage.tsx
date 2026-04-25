import { useParams, Link } from 'react-router-dom'
import { Printer, Send, Ban, CreditCard } from 'lucide-react'

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

import { mockSalesInvoices } from '@/modules/invoices/data/sales-invoices'
import { mockCreditNotes } from '@/modules/invoices/data/credit-notes'
import { formatINR as formatCurrency, formatINR as formatCurrencyDecimal } from '@/lib/currency'

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Sent': return 'info'
    case 'Partially Paid': return 'warning'
    case 'Paid': return 'success'
    case 'Overdue': return 'error'
    case 'Void': return 'neutral'
    case 'Credit Note Issued': return 'warning'
    default: return 'neutral'
  }
}

function SalesInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const invoice = mockSalesInvoices.find((inv) => inv.id === id)

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">Invoice not found</h2>
        <p className="text-sm text-muted-foreground">
          The invoice you are looking for does not exist.
        </p>
        <Button variant="outline" render={<Link to="/invoices/sales" />}>
          Back to Sales Invoices
        </Button>
      </div>
    )
  }

  const relatedCreditNotes = mockCreditNotes.filter((cn) => cn.invoiceId === invoice.id)

  // Invoice Preview tab
  const invoicePreviewContent = (
    <Card className="print:shadow-none print:border-none">
      <CardContent className="space-y-6 text-sm">
        {/* Header */}
        <div className="flex justify-between border-b pb-4">
          <div>
            <p className="text-xl font-bold font-display">Comprint Technologies</p>
            <p className="text-muted-foreground">IT Infrastructure Solutions</p>
            <p className="text-muted-foreground">Mumbai, Maharashtra, India</p>
            <p className="text-muted-foreground">GSTIN: 27AABCC1234D1Z5</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">TAX INVOICE</p>
            <p className="font-semibold">{invoice.invoiceNumber}</p>
            <p className="text-muted-foreground">Date: {formatDate(invoice.issueDate)}</p>
            <p className="text-muted-foreground">Due: {formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Bill To</p>
            <p className="font-semibold">{invoice.customerName}</p>
            <p className="text-muted-foreground">{invoice.billingAddress}</p>
            {invoice.customerGst && (
              <p className="text-muted-foreground">GSTIN: {invoice.customerGst}</p>
            )}
          </div>
          {invoice.shippingAddress && (
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Ship To</p>
              <p className="font-semibold">{invoice.customerName}</p>
              <p className="text-muted-foreground">{invoice.shippingAddress}</p>
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                <th className="px-3 py-2 text-right font-medium">Discount</th>
                <th className="px-3 py-2 text-right font-medium">Tax</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2 max-w-[300px]">{item.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.qty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.discount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.taxRate}%</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCurrencyDecimal(invoice.subtotal)}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="tabular-nums">-{formatCurrencyDecimal(invoice.discountTotal)}</span>
              </div>
            )}
            {invoice.cgst > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CGST (9%)</span>
                <span className="tabular-nums">{formatCurrencyDecimal(invoice.cgst)}</span>
              </div>
            )}
            {invoice.sgst > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SGST (9%)</span>
                <span className="tabular-nums">{formatCurrencyDecimal(invoice.sgst)}</span>
              </div>
            )}
            {invoice.igst > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IGST (18%)</span>
                <span className="tabular-nums">{formatCurrencyDecimal(invoice.igst)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-semibold text-base">
              <span>Grand Total</span>
              <span className="tabular-nums">{formatCurrencyDecimal(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Payment History</p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Method</th>
                    <th className="px-3 py-2 text-left font-medium">Reference</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((pay) => (
                    <tr key={pay.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{formatDate(pay.date)}</td>
                      <td className="px-3 py-2">{pay.method}</td>
                      <td className="px-3 py-2 text-muted-foreground">{pay.reference}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{formatCurrency(pay.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Payments tab
  const paymentsContent = (
    <div className="space-y-4">
      {invoice.payments.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.payments.map((pay) => (
                <TableRow key={pay.id}>
                  <TableCell>{formatDate(pay.date)}</TableCell>
                  <TableCell>
                    <StatusBadge variant="info">{pay.method}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{pay.reference}</TableCell>
                  <TableCell className="text-muted-foreground">{pay.notes ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(pay.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No payments recorded yet</p>
        </div>
      )}
      <div className="flex justify-between items-center rounded-lg bg-muted/50 p-3">
        <span className="text-sm font-medium">Balance Due</span>
        <span className={cn(
          'text-lg font-bold tabular-nums',
          invoice.balanceDue > 0 ? 'text-destructive' : 'text-status-success-text'
        )}>
          {formatCurrency(invoice.balanceDue)}
        </span>
      </div>
      {invoice.balanceDue > 0 && (
        <Button>
          <CreditCard className="mr-1 size-4" />
          Record Payment
        </Button>
      )}
    </div>
  )

  // Credit Notes tab
  const creditNotesContent = (
    <div className="space-y-4">
      {relatedCreditNotes.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CN#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedCreditNotes.map((cn) => (
                <TableRow key={cn.id}>
                  <TableCell className="font-medium">{cn.creditNoteNumber}</TableCell>
                  <TableCell>{formatDate(cn.issueDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(cn.amount)}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground">{cn.reason}</TableCell>
                  <TableCell>
                    <StatusBadge variant={cn.status === 'Applied' ? 'success' : cn.status === 'Issued' ? 'info' : 'neutral'}>
                      {cn.status}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No credit notes for this invoice</p>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'preview', label: 'Invoice Preview', content: invoicePreviewContent },
    { id: 'payments', label: 'Payments', count: invoice.payments.length, content: paymentsContent },
    { id: 'credit-notes', label: 'Credit Notes', count: relatedCreditNotes.length, content: creditNotesContent },
  ]

  const actionButtons = (
    <>
      {invoice.status === 'Draft' && <Button size="sm"><Send className="size-3.5" data-icon="inline-start" />Send</Button>}
      {invoice.balanceDue > 0 && invoice.status !== 'Draft' && invoice.status !== 'Void' && (
        <Button size="sm"><CreditCard className="size-3.5" data-icon="inline-start" />Record Payment</Button>
      )}
      <Button variant="outline" size="sm">
        <Printer className="size-3.5" data-icon="inline-start" />
        PDF
      </Button>
      {invoice.status !== 'Void' && invoice.status !== 'Paid' && (
        <Button variant="outline" size="sm" className="text-destructive">
          <Ban className="size-3.5" data-icon="inline-start" />
          Void
        </Button>
      )}
    </>
  )

  return (
    <div className="space-y-6">
      <EntityHeader
        title={invoice.invoiceNumber}
        subtitle={`${invoice.customerName} | ${formatCurrency(invoice.grandTotal)}`}
        status={{ label: invoice.status, variant: getStatusVariant(invoice.status) }}
        backHref="/invoices/sales"
        actions={actionButtons}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DetailTabs cardContent tabs={tabs} defaultTab="preview" />
        </div>

        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Customer</dt>
                  <dd className="text-sm">{invoice.customerName}</dd>
                </div>
                {invoice.salesOrderNumber && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs font-ui text-muted-foreground">Sales Order</dt>
                    <dd className="text-sm text-primary">{invoice.salesOrderNumber}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Issue Date</dt>
                  <dd className="text-sm">{formatDate(invoice.issueDate)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Due Date</dt>
                  <dd className="text-sm">{formatDate(invoice.dueDate)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Payment Terms</dt>
                  <dd className="text-sm">{invoice.paymentTerms}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Created By</dt>
                  <dd className="text-sm">{invoice.createdBy}</dd>
                </div>
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
                  <dt className="text-muted-foreground">Grand Total</dt>
                  <dd className="tabular-nums font-medium">{formatCurrency(invoice.grandTotal)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="tabular-nums text-status-success-text">{formatCurrency(invoice.paidAmount)}</dd>
                </div>
                <div className="flex items-center justify-between border-t pt-2 font-semibold">
                  <dt>Balance Due</dt>
                  <dd className={cn('tabular-nums', invoice.balanceDue > 0 && 'text-destructive')}>
                    {formatCurrency(invoice.balanceDue)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SalesInvoiceDetailPage
