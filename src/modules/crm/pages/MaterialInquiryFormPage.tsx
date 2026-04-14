import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
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
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { EntityHeader } from '../components/EntityHeader'
import { materialInquiries } from '../data/material-inquiries'
import { leads } from '../data/leads'
import { deals } from '../data/deals'
import { IMS_CATEGORIES } from '../types'
import type { MaterialInquiryItem } from '../types'

function generateId(): string {
  return `mii-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createEmptyMIItem(): MaterialInquiryItem {
  return {
    id: generateId(),
    item: '',
    category: '',
    description: '',
    qtyRequested: 1,
  }
}

function getStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Submitted': return 'info'
    case 'Partially Responded': return 'warning'
    case 'Fully Responded': return 'success'
    case 'Closed': return 'neutral'
    default: return 'neutral'
  }
}

const PROCUREMENT_TEAM = ['Deepak Gupta', 'Anjali Nair', 'Priya Sharma'] as const
const PRODUCT_MANAGERS = ['Vikram Singh', 'Priya Sharma', 'Rahul Mehta'] as const

function MaterialInquiryFormPage() {
  const { id: miId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const existingMI = miId ? materialInquiries.find((mi) => mi.id === miId) : undefined
  const isEdit = !!existingMI

  // Pre-fill from search params
  const paramLeadId = searchParams.get('leadId') ?? ''
  const paramDealId = searchParams.get('dealId') ?? ''

  const prefilledLeadId = paramLeadId || existingMI?.leadId || ''
  const prefilledDealId = paramDealId || existingMI?.dealId || ''

  const [inquiryNumber] = useState(
    existingMI?.inquiryNumber ?? `MI-2026-${String(materialInquiries.length + 1).padStart(3, '0')}`
  )
  const [status] = useState(existingMI?.status ?? 'Draft')
  const [leadId, setLeadId] = useState(prefilledLeadId)
  const [dealId, setDealId] = useState(prefilledDealId)
  const [clientBudget, setClientBudget] = useState(existingMI?.clientBudget?.toString() ?? '')
  const [clientTimeline, setClientTimeline] = useState(existingMI?.clientTimeline ?? '')
  const [assignedTo, setAssignedTo] = useState(existingMI?.assignedTo ?? '')
  const [pmNotified, setPmNotified] = useState(existingMI?.productManagerNotified ?? '')
  const [description, setDescription] = useState(existingMI?.description ?? '')
  const [notes, setNotes] = useState(existingMI?.notes ?? '')
  const [items, setItems] = useState<MaterialInquiryItem[]>(
    existingMI?.items ?? [createEmptyMIItem()]
  )

  const backHref = '/crm/material-inquiries'

  function updateItem(id: string, field: keyof Omit<MaterialInquiryItem, 'id'>, value: string | number | undefined) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyMIItem()])
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function handleSaveDraft() {
    toast.success('Material inquiry saved as draft')
    navigate(backHref)
  }

  function handleSubmit() {
    toast.success('Material inquiry submitted to procurement')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit: ${existingMI.inquiryNumber}` : 'Create Material Inquiry'}
        backHref={backHref}
      />

      {/* Header Info */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-ui text-muted-foreground">MI #:</span>
          <span className="text-sm font-medium">{inquiryNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-ui text-muted-foreground">Status:</span>
          <StatusBadge variant={getStatusVariant(status)}>{status}</StatusBadge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Material Inquiry' : 'New Material Inquiry'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-ui">Linked Lead</Label>
              <Select value={leadId} onValueChange={(val) => { if (val) setLeadId(val) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select lead (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.company})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-ui">Linked Deal</Label>
              <Select value={dealId} onValueChange={(val) => { if (val) setDealId(val) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select deal (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-ui">Client Budget (Overall, &#8377;)</Label>
              <Input
                type="number"
                min={0}
                value={clientBudget}
                onChange={(e) => setClientBudget(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-ui">Client Timeline</Label>
              <Input
                value={clientTimeline}
                onChange={(e) => setClientTimeline(e.target.value)}
                placeholder="e.g., 4 weeks"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-ui">Assign To (Procurement)</Label>
              <Select value={assignedTo} onValueChange={(val) => { if (val) setAssignedTo(val) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {PROCUREMENT_TEAM.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-ui">Notify Product Manager</Label>
              <Select value={pmNotified} onValueChange={(val) => { if (val) setPmNotified(val) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select PM (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_MANAGERS.map((pm) => (
                    <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="font-ui">Request Description *</Label>
            <p className="text-xs text-muted-foreground">Describe what the client needs, context, and any special requirements. This can be used instead of or alongside structured items below.</p>
            <Textarea
              placeholder="e.g., Client needs 50 servers for new data center. Budget is &#8377;60L. Prefer Dell PowerEdge series. Delivery needed within 4 weeks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
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
                    <th className="min-w-[150px] px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                    <th className="w-16 px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">Budget/Unit (&#8377;)</th>
                    <th className="w-28 px-3 py-2 text-left font-medium text-muted-foreground">Timeline</th>
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
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          min={1}
                          className="text-right"
                          value={item.qtyRequested}
                          onChange={(e) => updateItem(item.id, 'qtyRequested', Number(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          className="text-right"
                          value={item.clientBudgetPerUnit ?? ''}
                          onChange={(e) => updateItem(item.id, 'clientBudgetPerUnit', Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          placeholder="e.g., 4 weeks"
                          value={item.clientTimeline ?? ''}
                          onChange={(e) => updateItem(item.id, 'clientTimeline', e.target.value)}
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

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="mi-notes" className="font-ui">Notes</Label>
            <Textarea
              id="mi-notes"
              placeholder="Add any notes for the procurement team..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button onClick={handleSubmit}>
            Submit to Procurement
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { MaterialInquiryFormPage }

export default MaterialInquiryFormPage
