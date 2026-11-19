import { useParams, Link } from 'react-router-dom'
import { Printer, Send, Ban, CreditCard } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { EntityHeader } from '@/components/page-shells/EntityHeader'
import { DetailTabs } from '@/components/page-shells/DetailTabs'
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
import { formatIST_date } from "@shared/lib/date"
import { SALES_INVOICE_STRINGS } from './sales-invoice.strings'

const S = SALES_INVOICE_STRINGS.detail

const formatDate = (dateStr: string) => formatIST_date(dateStr)

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

export function SalesInvoiceDetailBody() {
  const { id } = useParams<{ id: string }>()
  const invoice = mockSalesInvoices.find((inv) => inv.id === id)

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Typography variant="section-title">{S.notFoundTitle}</Typography>
        <Typography tone="muted">
          {S.notFoundDescription}
        </Typography>
        <Button variant="outline" render={<Link to="/invoices/sales" />}>
          {S.backToList}
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
            <p className="text-xl font-bold font-display">{S.preview.companyName}</p>
            <p className="text-muted-foreground">{S.preview.companyTagline}</p>
            <p className="text-muted-foreground">{S.preview.companyCity}</p>
            <p className="text-muted-foreground">{S.preview.companyGstin}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{S.preview.taxInvoice}</p>
            <p className="font-semibold">{invoice.invoiceNumber}</p>
            <p className="text-muted-foreground">{S.preview.dateLabel} {formatDate(invoice.issueDate)}</p>
            <p className="text-muted-foreground">{S.preview.dueLabel} {formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">{S.preview.billTo}</p>
            <p className="font-semibold">{invoice.customerName}</p>
            <p className="text-muted-foreground">{invoice.billingAddress}</p>
            {invoice.customerGst && (
              <p className="text-muted-foreground">{S.preview.gstinPrefix} {invoice.customerGst}</p>
            )}
          </div>
          {invoice.shippingAddress && (
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">{S.preview.shipTo}</p>
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
                <th className="px-3 py-2 text-left font-medium">{S.preview.lineItemColumns.description}</th>
                <th className="px-3 py-2 text-right font-medium">{S.preview.lineItemColumns.qty}</th>
                <th className="px-3 py-2 text-right font-medium">{S.preview.lineItemColumns.unitPrice}</th>
                <th className="px-3 py-2 text-right font-medium">{S.preview.lineItemColumns.discount}</th>
                <th className="px-3 py-2 text-right font-medium">{S.preview.lineItemColumns.tax}</th>
                <th className="px-3 py-2 text-right font-medium">{S.preview.lineItemColumns.amount}</th>
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
              <span className="text-muted-foreground">{S.preview.subtotal}</span>
              <span className="tabular-nums">{formatCurrencyDecimal(invoice.subtotal)}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{S.preview.discount}</span>
                <span className="tabular-nums">-{formatCurrencyDecimal(invoice.discountTotal)}</span>
              </div>
            )}
            {invoice.cgst > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{S.preview.cgst}</span>
                <span className="tabular-nums">{formatCurrencyDecimal(invoice.cgst)}</span>
              </div>
            )}
            {invoice.sgst > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{S.preview.sgst}</span>
                <span className="tabular-nums">{formatCurrencyDecimal(invoice.sgst)}</span>
              </div>
            )}
            {invoice.igst > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{S.preview.igst}</span>
                <span className="tabular-nums">{formatCurrencyDecimal(invoice.igst)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-semibold text-base">
              <span>{S.preview.grandTotal}</span>
              <span className="tabular-nums">{formatCurrencyDecimal(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{S.preview.paymentHistory}</p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">{S.preview.paymentColumns.date}</th>
                    <th className="px-3 py-2 text-left font-medium">{S.preview.paymentColumns.method}</th>
                    <th className="px-3 py-2 text-left font-medium">{S.preview.paymentColumns.reference}</th>
                    <th className="px-3 py-2 text-right font-medium">{S.preview.paymentColumns.amount}</th>
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
                <TableHead>{S.payments.columns.date}</TableHead>
                <TableHead>{S.payments.columns.method}</TableHead>
                <TableHead>{S.payments.columns.reference}</TableHead>
                <TableHead>{S.payments.columns.notes}</TableHead>
                <TableHead className="text-right">{S.payments.columns.amount}</TableHead>
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
                  <TableCell className="text-muted-foreground">{pay.notes ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(pay.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Typography tone="muted">{S.payments.empty}</Typography>
        </div>
      )}
      <div className="flex justify-between items-center rounded-lg bg-muted/50 p-3">
        <Typography asChild variant="body-strong"><span>{S.payments.balanceDue}</span></Typography>
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
          {S.payments.recordPayment}
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
                <TableHead>{S.creditNotes.columns.cnNumber}</TableHead>
                <TableHead>{S.creditNotes.columns.date}</TableHead>
                <TableHead className="text-right">{S.creditNotes.columns.amount}</TableHead>
                <TableHead>{S.creditNotes.columns.reason}</TableHead>
                <TableHead>{S.creditNotes.columns.status}</TableHead>
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
          <Typography tone="muted">{S.creditNotes.empty}</Typography>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'preview', label: S.tabs.preview, content: invoicePreviewContent },
    { id: 'payments', label: S.tabs.payments, count: invoice.payments.length, content: paymentsContent },
    { id: 'credit-notes', label: S.tabs.creditNotes, count: relatedCreditNotes.length, content: creditNotesContent },
  ]

  const actionButtons = (
    <>
      {invoice.status === 'Draft' && <Button size="sm"><Send className="size-3.5" data-icon="inline-start" />{S.send}</Button>}
      {invoice.balanceDue > 0 && invoice.status !== 'Draft' && invoice.status !== 'Void' && (
        <Button size="sm"><CreditCard className="size-3.5" data-icon="inline-start" />{S.recordPayment}</Button>
      )}
      <Button variant="outline" size="sm">
        <Printer className="size-3.5" data-icon="inline-start" />
        {S.pdf}
      </Button>
      {invoice.status !== 'Void' && invoice.status !== 'Paid' && (
        <Button variant="outline" size="sm" className="text-destructive">
          <Ban className="size-3.5" data-icon="inline-start" />
          {S.void}
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
              <CardTitle>{S.sidebar.invoiceDetailsTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <Typography asChild variant="helper" className="font-ui"><dt>{S.sidebar.customer}</dt></Typography>
                  <Typography asChild variant="body"><dd>{invoice.customerName}</dd></Typography>
                </div>
                {invoice.salesOrderNumber && (
                  <div className="flex items-center justify-between">
                    <Typography asChild variant="helper" className="font-ui"><dt>{S.sidebar.salesOrder}</dt></Typography>
                    <Typography asChild variant="body" tone="primary"><dd>{invoice.salesOrderNumber}</dd></Typography>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Typography asChild variant="helper" className="font-ui"><dt>{S.sidebar.issueDate}</dt></Typography>
                  <Typography asChild variant="body"><dd>{formatDate(invoice.issueDate)}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <Typography asChild variant="helper" className="font-ui"><dt>{S.sidebar.dueDate}</dt></Typography>
                  <Typography asChild variant="body"><dd>{formatDate(invoice.dueDate)}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <Typography asChild variant="helper" className="font-ui"><dt>{S.sidebar.paymentTerms}</dt></Typography>
                  <Typography asChild variant="body"><dd>{invoice.paymentTerms}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <Typography asChild variant="helper" className="font-ui"><dt>{S.sidebar.createdBy}</dt></Typography>
                  <Typography asChild variant="body"><dd>{invoice.createdBy}</dd></Typography>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{S.sidebar.totalsTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">{S.sidebar.grandTotal}</dt>
                  <dd className="tabular-nums font-medium">{formatCurrency(invoice.grandTotal)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">{S.sidebar.paid}</dt>
                  <dd className="tabular-nums text-status-success-text">{formatCurrency(invoice.paidAmount)}</dd>
                </div>
                <div className="flex items-center justify-between border-t pt-2 font-semibold">
                  <dt>{S.sidebar.balanceDue}</dt>
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
