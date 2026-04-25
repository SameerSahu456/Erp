import { useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { FormPageShell } from '@/components/page'
import { purchaseRequests } from '../data/purchase-requests'
import { salesOrders } from '../data/sales-orders'
import { IMS_CATEGORIES } from '../types'
import type { PurchaseRequestItem, PurchaseRequest } from '../types'

function generateId(): string {
  return `pri-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createEmptyPRItem(): PurchaseRequestItem {
  return {
    id: generateId(),
    item: '',
    description: '',
    category: '',
    qty: 1,
  }
}

function formatCurrencyValue(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Submitted': return 'info'
    case 'Under Review': return 'warning'
    case 'Pricing Confirmed': return 'success'
    case 'Approved': return 'success'
    case 'Rejected': return 'error'
    default: return 'neutral'
  }
}

const MOCK_OWNERS = ['Amit Patel', 'Sneha Desai', 'Rahul Verma'] as const

function PurchaseRequestFormPage() {
  const { id: prId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const existingPR = prId ? purchaseRequests.find((pr) => pr.id === prId) : undefined
  const isEdit = !!existingPR

  // Pre-fill from sales order
  const paramSOId = searchParams.get('salesOrderId') ?? ''
  const linkedSO = paramSOId
    ? salesOrders.find((so) => so.id === paramSOId)
    : existingPR?.salesOrderId
      ? salesOrders.find((so) => so.id === existingPR.salesOrderId)
      : undefined

  const [prNumber] = useState(
    existingPR?.prNumber ?? `PR-2026-${String(purchaseRequests.length + 1).padStart(3, '0')}`
  )
  const [status, setStatus] = useState<PurchaseRequest['status']>(existingPR?.status ?? 'Draft')
  const [requestedBy, setRequestedBy] = useState(existingPR?.requestedBy ?? MOCK_OWNERS[0])
  const [notes, setNotes] = useState(existingPR?.notes ?? '')
  const [items, setItems] = useState<PurchaseRequestItem[]>(
    existingPR?.items ?? [createEmptyPRItem()]
  )

  const backHref = '/crm/purchase-requests'
  const goBack = useNavigateBack(backHref)

  function updateItem(id: string, field: keyof Omit<PurchaseRequestItem, 'id'>, value: string | number | undefined) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyPRItem()])
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function handleSaveDraft() {
    toast.success('Purchase request saved as draft')
    navigate(backHref)
  }

  function handleSubmit() {
    toast.success('Purchase request submitted to procurement')
    navigate(backHref)
  }

  function handleCancel() {
    goBack()
  }

  return (
    <FormPageShell
      title={isEdit ? `Edit PR: ${existingPR.prNumber}` : 'Create Purchase Request'}
      subtitle={isEdit ? 'Update items, justification, and assignments.' : 'Request the procurement team to source items for an order.'}
      breadcrumbs={
        isEdit
          ? [
              { label: 'CRM' },
              { label: 'Purchase Requests', href: '/crm/purchase-requests' },
              { label: existingPR.prNumber },
              { label: 'Edit' },
            ]
          : [
              { label: 'CRM' },
              { label: 'Purchase Requests', href: '/crm/purchase-requests' },
              { label: 'New PR' },
            ]
      }
      status={{ label: status, variant: getStatusVariant(status) }}
      meta={
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-ui text-muted-foreground">PR #:</span>
            <span className="text-sm font-medium">{prNumber}</span>
          </div>
          {linkedSO && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-ui text-muted-foreground">Linked SO:</span>
              <Link
                to={`/crm/sales-orders/${linkedSO.id}/edit`}
                className="text-sm text-primary hover:underline"
              >
                {linkedSO.orderNumber}
              </Link>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-ui text-muted-foreground">Requested By:</span>
            <span className="text-sm">{requestedBy}</span>
          </div>
        </div>
      }
      backHref={backHref}
      footerActions={
        <>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button onClick={handleSubmit}>
            Submit to Procurement
          </Button>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Purchase Request' : 'New Purchase Request'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-ui">Requested By</Label>
              <Select value={requestedBy} onValueChange={(val) => { if (val) setRequestedBy(val) }}>
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
            <div className="space-y-1.5">
              <Label className="font-ui">Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as PurchaseRequest['status'])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['Draft', 'Submitted', 'Under Review', 'Pricing Confirmed', 'Approved', 'Rejected'] as const).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Items
            </h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-10 px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                    <th className="min-w-[130px] px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                    <th className="min-w-[120px] px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                    <th className="w-16 px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">Est. Rate (&#8377;)</th>
                    <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">Confirmed (&#8377;)</th>
                    <th className="w-28 px-3 py-2 text-left font-medium text-muted-foreground">Available</th>
                    <th className="min-w-[120px] px-3 py-2 text-left font-medium text-muted-foreground">Vendor Notes</th>
                    <th className="w-14 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          placeholder="Item name"
                          value={item.item}
                          onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select
                          value={item.category}
                          onValueChange={(val) => updateItem(item.id, 'category', val ?? '')}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {IMS_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          value={item.estimatedRate ?? ''}
                          onChange={(e) => updateItem(item.id, 'estimatedRate', Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          className="text-right"
                          value={item.confirmedRate ?? ''}
                          onChange={(e) => updateItem(item.id, 'confirmedRate', Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="date"
                          value={item.availableDate ?? ''}
                          onChange={(e) => updateItem(item.id, 'availableDate', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          placeholder="Notes"
                          value={item.vendorNotes ?? ''}
                          onChange={(e) => updateItem(item.id, 'vendorNotes', e.target.value)}
                        />
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
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
              <Plus className="mr-1.5 size-4" />
              Add Item
            </Button>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">Total Estimated:</span>
                <span className="font-medium tabular-nums">
                  &#8377;{formatCurrencyValue(items.reduce((sum, i) => sum + (i.estimatedRate ?? 0) * i.qty, 0))}
                </span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">Total Confirmed:</span>
                <span className="font-medium tabular-nums">
                  &#8377;{formatCurrencyValue(items.reduce((sum, i) => sum + (i.confirmedRate ?? 0) * i.qty, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="pr-notes" className="font-ui">Notes</Label>
            <Textarea
              id="pr-notes"
              placeholder="Add any notes for the procurement team..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </FormPageShell>
  )
}

export { PurchaseRequestFormPage }

export default PurchaseRequestFormPage
