import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EntityHeader } from '../components/EntityHeader'
import { LineItemsEditor, createEmptyItem } from '../components/LineItemsEditor'
import { TotalsSection } from '../components/TotalsSection'
import { salesOrders } from '../data/sales-orders'
import { accounts } from '../data/accounts'
import type { LineItem } from '../components/LineItemsEditor'
import type { SalesOrder } from '../types'

const SO_STATUSES: SalesOrder['status'][] = ['Draft', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']
const MOCK_OWNERS = ['Amit Patel', 'Sneha Desai', 'Rahul Verma'] as const

function SalesOrderFormPage() {
  const { id: orderId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existingOrder = orderId ? salesOrders.find((o) => o.id === orderId) : undefined
  const isEdit = !!existingOrder

  const [orderNumber] = useState(
    existingOrder?.orderNumber ?? `SO-2026-${String(salesOrders.length + 1).padStart(4, '0')}`
  )
  const [accountId, setAccountId] = useState(existingOrder?.accountId ?? '')
  const [orderDate, setOrderDate] = useState(existingOrder?.date ?? new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<SalesOrder['status']>(existingOrder?.status ?? 'Draft')
  const [owner, setOwner] = useState(MOCK_OWNERS[0])
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyItem()])
  const [discount, setDiscount] = useState(0)
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0),
    [lineItems]
  )

  const backHref = '/crm/sales-orders'

  function handleSave() {
    if (!accountId) return
    toast.success('Sales order saved successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit Sales Order: ${existingOrder.orderNumber}` : 'Create Sales Order'}
        backHref={backHref}
      />

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Sales Order' : 'New Sales Order'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Header fields */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="so-number" className="font-ui">Order Number</Label>
                <Input id="so-number" value={orderNumber} readOnly className="bg-muted/50" />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">
                  Account <span className="text-destructive">*</span>
                </Label>
                <Select value={accountId} onValueChange={(val) => { if (val) setAccountId(val) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="so-date" className="font-ui">Order Date</Label>
                <Input
                  id="so-date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as SalesOrder['status'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SO_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Owner</Label>
                <Select value={owner} onValueChange={(val) => { if (val) setOwner(val) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_OWNERS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <LineItemsEditor items={lineItems} onChange={setLineItems} />

          {/* Totals */}
          <TotalsSection
            subtotal={subtotal}
            discount={discount}
            onDiscountChange={setDiscount}
          />

          {/* Full-width fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="so-shipping" className="font-ui">Shipping Address</Label>
              <Textarea
                id="so-shipping"
                placeholder="Enter shipping address..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="so-notes" className="font-ui">Notes</Label>
              <Textarea
                id="so-notes"
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!accountId}>
            Save
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { SalesOrderFormPage }

export default SalesOrderFormPage
