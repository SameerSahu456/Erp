import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

import { mockVendors } from '@/modules/procurement/data/vendors'
import { mockPurchaseRequests } from '@/modules/procurement/data/purchase-requests'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)

interface POLineItem {
  id: string
  partName: string
  partSku: string
  qty: number
  unitPrice: number
  taxRate: number
}

const paymentTermsOptions = ['Net 30', 'Net 45', 'Net 60', 'Advance']
const deliveryTermsOptions = ['FOB', 'CIF', 'Ex-Works', 'DDP']

function POFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prId = searchParams.get('prId')

  // Pre-fill from PR if available
  const sourcePR = prId ? mockPurchaseRequests.find((pr) => pr.id === prId) : null

  const [vendorId, setVendorId] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [deliveryTerms, setDeliveryTerms] = useState('FOB')
  const [expectedDelivery, setExpectedDelivery] = useState(sourcePR?.requiredByDate ?? '')
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<POLineItem[]>(() => {
    if (sourcePR) {
      return sourcePR.items.map((item) => ({
        id: item.id,
        partName: item.partName,
        partSku: item.partSku,
        qty: item.qty,
        unitPrice: item.estimatedUnitCost,
        taxRate: 18,
      }))
    }
    return [
      {
        id: `poi-${Date.now()}`,
        partName: '',
        partSku: '',
        qty: 1,
        unitPrice: 0,
        taxRate: 18,
      },
    ]
  })

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [items]
  )

  const taxAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.qty * item.unitPrice * (item.taxRate / 100), 0),
    [items]
  )

  const grandTotal = subtotal + taxAmount - discount

  function updateItem(id: string, field: keyof POLineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `poi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        partName: '',
        partSku: '',
        qty: 1,
        unitPrice: 0,
        taxRate: 18,
      },
    ])
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const selectedVendor = mockVendors.find((v) => v.id === vendorId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold">Create Purchase Order</h2>
          {sourcePR && (
            <p className="text-sm text-muted-foreground mt-1">
              Pre-filled from {sourcePR.prNumber}: {sourcePR.title}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => navigate('/procurement/po')}>
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Vendor Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Select Vendor</Label>
                <Select value={vendorId} onValueChange={(v) => setVendorId(v as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockVendors
                      .filter((v) => v.status === 'Active')
                      .map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} {'★'.repeat(Math.round(v.rating))} ({v.rating})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedVendor && (
                  <p className="text-xs text-muted-foreground">
                    {selectedVendor.contactPerson} &middot; {selectedVendor.email} &middot; {selectedVendor.paymentTerms}
                  </p>
                )}
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
                      <th className="min-w-[180px] px-3 py-2 text-left font-medium text-muted-foreground">Part</th>
                      <th className="min-w-[120px] px-3 py-2 text-left font-medium text-muted-foreground">SKU</th>
                      <th className="w-20 px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                      <th className="w-32 px-3 py-2 text-right font-medium text-muted-foreground">Unit Price</th>
                      <th className="w-20 px-3 py-2 text-right font-medium text-muted-foreground">Tax %</th>
                      <th className="w-36 px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                      <th className="w-14 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const amount = item.qty * item.unitPrice
                      return (
                        <tr key={item.id} className="border-b last:border-b-0">
                          <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                          <td className="px-2 py-1.5">
                            <Input
                              placeholder="Part name"
                              value={item.partName}
                              onChange={(e) => updateItem(item.id, 'partName', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              placeholder="SKU"
                              value={item.partSku}
                              onChange={(e) => updateItem(item.id, 'partSku', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              min={1}
                              className="text-right"
                              value={item.qty}
                              onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value) || 1)}
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
                              max={100}
                              className="text-right"
                              value={item.taxRate}
                              onChange={(e) => updateItem(item.id, 'taxRate', Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {formatCurrency(amount)}
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

          {/* Terms & Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Terms & Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v as string)}>
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
                  <Label>Delivery Terms</Label>
                  <Select value={deliveryTerms} onValueChange={(v) => setDeliveryTerms(v as string)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryTermsOptions.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery Date</Label>
                  <Input
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes for the vendor..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar — Totals */}
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-medium tabular-nums">{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="tabular-nums">{formatCurrency(taxAmount)}</dd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd>
                    <Input
                      type="number"
                      min={0}
                      className="w-28 text-right"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                  <dt>Grand Total</dt>
                  <dd className="tabular-nums">{formatCurrency(grandTotal)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Footer actions */}
          <div className="space-y-2">
            <Button className="w-full">Send to Vendor</Button>
            <Button variant="outline" className="w-full">Save Draft</Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/procurement/po')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default POFormPage
