import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page-shells'
import { formatINR as formatCurrency } from '@/lib/currency'
import { customerOptions, paymentTermsOptions } from "../../hooks/sales/useSalesInvoiceForm"
import type { SalesInvoiceFormController } from "../../hooks/sales/useSalesInvoiceForm"
import { SALES_INVOICE_STRINGS } from './sales-invoice.strings'

const S = SALES_INVOICE_STRINGS.form

export function SalesInvoiceFormBody({ f }: { f: SalesInvoiceFormController }) {
  const {
    goBack,
    customerId,
    setCustomerId,
    issueDate,
    setIssueDate,
    dueDate,
    setDueDate,
    paymentTerms,
    setPaymentTerms,
    items,
    subtotal,
    totalDiscount,
    taxableAmount,
    cgst,
    sgst,
    grandTotal,
    addItem,
    removeItem,
    updateItem,
  } = f

  return (
    <div className="space-y-6">
      <PageHeader
        title={S.title}
        subtitle={S.subtitle}
        breadcrumbs={[
          { label: S.breadcrumbs.invoices },
          { label: S.breadcrumbs.sales, href: '/invoices/sales' },
          { label: S.breadcrumbs.new },
        ]}
        backHref="/invoices/sales"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Dates */}
          <Card>
            <CardHeader>
              <CardTitle>{S.invoiceDetails}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{S.customer}</Label>
                  <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder={S.selectCustomer} />
                    </SelectTrigger>
                    <SelectContent>
                      {customerOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{S.paymentTerms}</Label>
                  <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v ?? 'Net 30')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTermsOptions.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{S.issueDate}</Label>
                  <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{S.dueDate}</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>{S.lineItems}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                      <th className="min-w-[200px] px-3 py-2 text-left font-medium text-muted-foreground">{S.columns.description}</th>
                      <th className="w-20 px-3 py-2 text-right font-medium text-muted-foreground">{S.columns.qty}</th>
                      <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">{S.columns.unitPrice}</th>
                      <th className="w-24 px-3 py-2 text-right font-medium text-muted-foreground">{S.columns.discount}</th>
                      <th className="w-20 px-3 py-2 text-right font-medium text-muted-foreground">{S.columns.taxPct}</th>
                      <th className="w-32 px-3 py-2 text-right font-medium text-muted-foreground">{S.columns.amount}</th>
                      <th className="w-14 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const lineAmount = item.qty * (item.unitPrice - item.discount)
                      return (
                        <tr key={item.id} className="border-b last:border-b-0">
                          <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                          <td className="px-2 py-1.5">
                            <Input
                              placeholder={S.itemDescriptionPlaceholder}
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              min={1}
                              className="text-right"
                              value={item.qty}
                              onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              min={0}
                              className="text-right"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              min={0}
                              className="text-right"
                              value={item.discount}
                              onChange={(e) => updateItem(item.id, 'discount', Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              min={0}
                              className="text-right"
                              value={item.taxRate}
                              onChange={(e) => updateItem(item.id, 'taxRate', Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {formatCurrency(lineAmount)}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length <= 1}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
                <Plus className="mr-1.5 size-4" />
                {S.addLineItem}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Totals sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <Card size="sm">
            <CardHeader>
              <CardTitle>{S.totals}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">{S.subtotal}</dt>
                  <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">{S.discountRow}</dt>
                  <dd className="tabular-nums">-{formatCurrency(totalDiscount)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <dt className="text-muted-foreground">{S.taxableAmount}</dt>
                  <dd className="tabular-nums">{formatCurrency(taxableAmount)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">{S.cgst}</dt>
                  <dd className="tabular-nums">{formatCurrency(cgst)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">{S.sgst}</dt>
                  <dd className="tabular-nums">{formatCurrency(sgst)}</dd>
                </div>
                <div className="flex items-center justify-between border-t pt-2 font-semibold text-base">
                  <dt>{S.grandTotal}</dt>
                  <dd className="tabular-nums">{formatCurrency(grandTotal)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="flex flex-col gap-2">
            <Button className="w-full">{S.sendInvoice}</Button>
            <Button variant="outline" className="w-full">{S.saveDraft}</Button>
            <Button variant="ghost" className="w-full" onClick={goBack}>
              {S.cancel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
