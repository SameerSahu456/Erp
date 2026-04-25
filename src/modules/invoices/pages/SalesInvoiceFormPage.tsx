import { useState, useMemo } from 'react'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page'
import { formatINR as formatCurrency } from '@/lib/currency'

interface InvoiceLineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
  discount: number
  taxRate: number
}

const customerOptions = [
  { id: 'CUST-001', name: 'TCS Ltd' },
  { id: 'CUST-002', name: 'HCL Technologies' },
  { id: 'CUST-003', name: 'Wipro Ltd' },
  { id: 'CUST-004', name: 'Infosys Ltd' },
  { id: 'CUST-005', name: 'HDFC Bank Ltd' },
  { id: 'CUST-006', name: 'Reliance Jio Infocomm' },
  { id: 'CUST-007', name: 'Mahindra & Mahindra Ltd' },
  { id: 'CUST-008', name: 'SBI (State Bank of India)' },
  { id: 'CUST-009', name: 'Bajaj Finance Ltd' },
]

const paymentTermsOptions = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt']

function SalesInvoiceFormPage() {
  const goBack = useNavigateBack('/invoices/sales')

  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState('2026-04-15')
  const [dueDate, setDueDate] = useState('2026-05-15')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')

  const [items, setItems] = useState<InvoiceLineItem[]>([
    { id: `ii-${Date.now()}`, description: '', qty: 1, unitPrice: 0, discount: 0, taxRate: 18 },
  ])

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [items]
  )

  const totalDiscount = useMemo(
    () => items.reduce((sum, item) => sum + item.discount * item.qty, 0),
    [items]
  )

  const taxableAmount = Math.max(subtotal - totalDiscount, 0)
  const cgst = taxableAmount * 0.09
  const sgst = taxableAmount * 0.09
  const grandTotal = taxableAmount + cgst + sgst

  function addItem() {
    setItems([
      ...items,
      { id: `ii-${Date.now()}`, description: '', qty: 1, unitPrice: 0, discount: 0, taxRate: 18 },
    ])
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    setItems(items.filter((item) => item.id !== id))
  }

  function updateItem(id: string, field: keyof Omit<InvoiceLineItem, 'id'>, value: string | number) {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Sales Invoice"
        subtitle="Draft an invoice, add line items, and review totals before sending."
        breadcrumbs={[
          { label: 'Invoices' },
          { label: 'Sales', href: '/invoices/sales' },
          { label: 'New' },
        ]}
        backHref="/invoices/sales"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customerOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
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
                  <Label>Issue Date</Label>
                  <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                      <th className="min-w-[200px] px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                      <th className="w-20 px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                      <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">Unit Price</th>
                      <th className="w-24 px-3 py-2 text-right font-medium text-muted-foreground">Discount</th>
                      <th className="w-20 px-3 py-2 text-right font-medium text-muted-foreground">Tax %</th>
                      <th className="w-32 px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
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
                              placeholder="Item description"
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
                Add Line Item
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Totals sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="tabular-nums">-{formatCurrency(totalDiscount)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <dt className="text-muted-foreground">Taxable Amount</dt>
                  <dd className="tabular-nums">{formatCurrency(taxableAmount)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">CGST (9%)</dt>
                  <dd className="tabular-nums">{formatCurrency(cgst)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">SGST (9%)</dt>
                  <dd className="tabular-nums">{formatCurrency(sgst)}</dd>
                </div>
                <div className="flex items-center justify-between border-t pt-2 font-semibold text-base">
                  <dt>Grand Total</dt>
                  <dd className="tabular-nums">{formatCurrency(grandTotal)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="flex flex-col gap-2">
            <Button className="w-full">Send Invoice</Button>
            <Button variant="outline" className="w-full">Save Draft</Button>
            <Button variant="ghost" className="w-full" onClick={goBack}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalesInvoiceFormPage
