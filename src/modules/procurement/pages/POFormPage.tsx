import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import {
  Plus,
  Trash2,
  Building2,
  Phone,
  Mail,
  Star,
  CreditCard,
  Package,
  CalendarDays,
  Send,
  Save,
  X,
  ArrowLeft,
} from 'lucide-react'

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
import { mockParts } from '@/modules/ims/data/parts'

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
  const goBack = useNavigateBack('/procurement/po')
  const [searchParams] = useSearchParams()
  const prId = searchParams.get('prId')
  const partId = searchParams.get('partId')

  // Pre-fill from PR if available
  const sourcePR = prId ? mockPurchaseRequests.find((pr) => pr.id === prId) : null
  const sourcePart = partId ? mockParts.find((p) => p.id === partId) : null

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
    if (sourcePart) {
      return [
        {
          id: `poi-${Date.now()}`,
          partName: sourcePart.name,
          partSku: sourcePart.sku,
          qty: 1,
          unitPrice: 0,
          taxRate: 18,
        },
      ]
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            onClick={goBack}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="cpt-page-title">
            Create Purchase Order
          </h2>
          {sourcePR && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              From {sourcePR.prNumber}
            </span>
          )}
          {sourcePart && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              For {sourcePart.sku}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={goBack}>
          <X className="mr-1.5 size-4" />
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vendor Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-muted-foreground" />
                Vendor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
                </div>

                {selectedVendor && (
                  <div className="rounded-lg bg-muted/30 px-4 py-3">
                    <p className="mb-2 text-sm font-medium">{selectedVendor.contactPerson}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="size-3.5 shrink-0" />
                        <span>{selectedVendor.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="size-3.5 shrink-0" />
                        <span>{selectedVendor.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="size-3.5 shrink-0 text-amber-500" />
                        <span>
                          {'★'.repeat(Math.round(selectedVendor.rating))}
                          {'☆'.repeat(5 - Math.round(selectedVendor.rating))}{' '}
                          ({selectedVendor.rating})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CreditCard className="size-3.5 shrink-0" />
                        <span>{selectedVendor.paymentTerms}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-5 text-muted-foreground" />
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        #
                      </th>
                      <th className="min-w-[180px] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Part
                      </th>
                      <th className="min-w-[120px] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        SKU
                      </th>
                      <th className="w-20 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Qty
                      </th>
                      <th className="w-32 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Unit Price
                      </th>
                      <th className="w-20 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Tax %
                      </th>
                      <th className="w-36 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Amount
                      </th>
                      <th className="w-14 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item, index) => {
                      const amount = item.qty * item.unitPrice
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-muted/20">
                          <td className="px-3 py-2.5 text-muted-foreground">{index + 1}</td>
                          <td className="px-2 py-2">
                            <Input
                              placeholder="Part name"
                              value={item.partName}
                              onChange={(e) => updateItem(item.id, 'partName', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              placeholder="SKU"
                              value={item.partSku}
                              onChange={(e) => updateItem(item.id, 'partSku', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={1}
                              className="text-right"
                              value={item.qty}
                              onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value) || 1)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              className="text-right"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className="text-right"
                              value={item.taxRate}
                              onChange={(e) => updateItem(item.id, 'taxRate', Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                            {formatCurrency(amount)}
                          </td>
                          <td className="px-2 py-2 text-center">
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
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-dashed"
                onClick={addItem}
              >
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
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
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

              <div className="border-t pt-5">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes for the vendor..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar -- Order Summary */}
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order info */}
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Package className="size-3.5" />
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {new Date().toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Totals */}
              <dl className="space-y-2.5">
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
                      className="h-8 w-28 text-right text-sm"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <dt className="text-base font-semibold">Grand Total</dt>
                  <dd className="text-lg font-bold tabular-nums text-primary">
                    {formatCurrency(grandTotal)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="space-y-2">
            <Button className="w-full" size="default">
              <Send className="mr-2 size-4" />
              Send to Vendor
            </Button>
            <Button variant="outline" className="w-full" size="default">
              <Save className="mr-2 size-4" />
              Save Draft
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              size="default"
              onClick={goBack}
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
