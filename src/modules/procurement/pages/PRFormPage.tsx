import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { MultiStepWizard } from '@/components/common/MultiStepWizard'
import type { WizardStepProps } from '@/components/common/MultiStepWizard'
import { WorkflowStepper } from '@/components/common/WorkflowStepper'
import type { StepConfig } from '@/components/common/WorkflowStepper'
import { StatusBadge } from '@/components/common/StatusBadge'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

// Mock parts catalog
const mockParts = [
  { id: 'PART-001', name: 'Dell PowerEdge R750', sku: 'DEL-SRV-R750', category: 'Servers', estCost: 285000 },
  { id: 'PART-003', name: 'HP EliteBook 860 G10', sku: 'HP-EB-860G10', category: 'Laptops', estCost: 92000 },
  { id: 'PART-004', name: 'Lenovo ThinkStation P360 Tower', sku: 'LEN-TS-P360', category: 'Workstations', estCost: 195000 },
  { id: 'PART-005', name: 'Cisco Catalyst 9300-48P', sku: 'CISCO-C9300-48P', category: 'Networking', estCost: 245000 },
  { id: 'PART-007', name: 'Palo Alto PA-5250', sku: 'PA-5250-BND', category: 'Security', estCost: 1850000 },
  { id: 'PART-009', name: 'D-Link DBA-2820P', sku: 'DLINK-AP-2820P', category: 'Networking', estCost: 18500 },
  { id: 'PART-010', name: 'APC Smart-UPS 3000VA', sku: 'APC-UPS-3000', category: 'UPS & Power', estCost: 38000 },
  { id: 'PART-011', name: 'FortiGate 200F', sku: 'FG-200F-BND', category: 'Security', estCost: 385000 },
]

const departments = ['IT Procurement', 'Network Solutions', 'Security Solutions', 'IT Infrastructure', 'General']
const urgencyOptions = ['Low', 'Medium', 'High', 'Critical'] as const

interface PRLineItem {
  id: string
  partId: string
  partName: string
  partSku: string
  category: string
  qty: number
  estimatedUnitCost: number
  notes: string
  urgency: string
}

// Shared state across wizard steps
interface PRFormState {
  title: string
  department: string
  justification: string
  requiredByDate: string
  urgency: string
  items: PRLineItem[]
}

const initialState: PRFormState = {
  title: '',
  department: '',
  justification: '',
  requiredByDate: '',
  urgency: 'Medium',
  items: [
    {
      id: `li-${Date.now()}`,
      partId: '',
      partName: '',
      partSku: '',
      category: '',
      qty: 1,
      estimatedUnitCost: 0,
      notes: '',
      urgency: 'Medium',
    },
  ],
}

function getApprovalChain(total: number): StepConfig[] {
  const steps: StepConfig[] = [
    { id: 'manager', label: 'Department Manager', description: 'Suresh Kumar', status: 'pending' },
  ]
  if (total >= 500000) {
    steps.push({ id: 'finance', label: 'Finance Head', description: 'Priya Deshmukh', status: 'pending' })
  }
  if (total >= 2500000) {
    steps.push({ id: 'vp', label: 'VP Operations', description: 'Vikram Singh', status: 'pending' })
  }
  return steps
}

function PRFormPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<PRFormState>(initialState)

  const totalEstimated = useMemo(
    () => form.items.reduce((sum, item) => sum + item.qty * item.estimatedUnitCost, 0),
    [form.items]
  )

  const approvalSteps = useMemo(() => getApprovalChain(totalEstimated), [totalEstimated])

  const updateField = useCallback(<K extends keyof PRFormState>(key: K, value: PRFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateItem = useCallback((id: string, field: keyof PRLineItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id) return item
        if (field === 'partId') {
          const part = mockParts.find((p) => p.id === value)
          if (part) {
            return {
              ...item,
              partId: part.id,
              partName: part.name,
              partSku: part.sku,
              category: part.category,
              estimatedUnitCost: part.estCost,
            }
          }
        }
        return { ...item, [field]: value }
      }),
    }))
  }, [])

  const addItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          partId: '',
          partName: '',
          partSku: '',
          category: '',
          qty: 1,
          estimatedUnitCost: 0,
          notes: '',
          urgency: 'Medium',
        },
      ],
    }))
  }, [])

  const removeItem = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((i) => i.id !== id) : prev.items,
    }))
  }, [])

  // Step 1: Request Info
  function RequestInfoStep(_props: WizardStepProps) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Request Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="PR title"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={form.department} onValueChange={(v) => updateField('department', v as string)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Justification</Label>
            <Textarea
              placeholder="Why is this purchase needed?"
              value={form.justification}
              onChange={(e) => updateField('justification', e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Required By Date</Label>
            <Input
              type="date"
              value={form.requiredByDate}
              onChange={(e) => updateField('requiredByDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Urgency</Label>
            <Select value={form.urgency} onValueChange={(v) => updateField('urgency', v as string)}>
              <SelectTrigger>
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                {urgencyOptions.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Line Items
  function LineItemsStep(_props: WizardStepProps) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Line Items</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                <th className="min-w-[200px] px-3 py-2 text-left font-medium text-muted-foreground">Part</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                <th className="w-24 px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                <th className="w-32 px-3 py-2 text-right font-medium text-muted-foreground">Est. Unit Cost</th>
                <th className="min-w-[120px] px-3 py-2 text-left font-medium text-muted-foreground">Notes</th>
                <th className="w-14 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, index) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                  <td className="px-2 py-1.5">
                    <Select value={item.partId} onValueChange={(v) => updateItem(item.id, 'partId', v as string)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select part" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockParts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{item.partSku || '-'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.category || '-'}</td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min={1}
                      className="text-right"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value) || 1)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(item.estimatedUnitCost)}
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      placeholder="Notes"
                      value={item.notes}
                      onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem(item.id)}
                      disabled={form.items.length <= 1}
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
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1.5 size-4" />
            Add Item
          </Button>
          <div className="text-sm font-medium">
            Total: {formatCurrency(totalEstimated)}
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Approval Chain
  function ApprovalChainStep(_props: WizardStepProps) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Approval Chain</h3>
        <p className="text-sm text-muted-foreground">
          Based on the estimated total of {formatCurrency(totalEstimated)}, the following approval chain will be used:
        </p>
        <Card>
          <CardContent className="pt-2">
            <WorkflowStepper steps={approvalSteps} />
          </CardContent>
        </Card>
        <div className="rounded-lg border border-dashed p-4">
          <p className="text-xs text-muted-foreground">
            Approval rules: Below {formatCurrency(500000)} — Manager only. {formatCurrency(500000)} to {formatCurrency(2500000)} — Manager + Finance. Above {formatCurrency(2500000)} — Manager + Finance + VP.
          </p>
        </div>
      </div>
    )
  }

  // Step 4: Review & Submit
  function ReviewStep(_props: WizardStepProps) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Review & Submit</h3>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Request Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Title</dt>
                <dd className="text-sm font-medium">{form.title || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Department</dt>
                <dd className="text-sm">{form.department || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Required By</dt>
                <dd className="text-sm">{form.requiredByDate || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Urgency</dt>
                <dd><StatusBadge variant={form.urgency === 'Critical' ? 'error' : form.urgency === 'High' ? 'warning' : 'info'}>{form.urgency}</StatusBadge></dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Justification</dt>
                <dd className="text-sm">{form.justification || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Items ({form.items.filter((i) => i.partId).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {form.items.filter((i) => i.partId).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.partName} x {item.qty}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(item.qty * item.estimatedUnitCost)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(totalEstimated)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Approval Chain</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowStepper steps={approvalSteps} />
          </CardContent>
        </Card>
      </div>
    )
  }

  const wizardSteps = [
    { id: 'request-info', label: 'Request Info', component: RequestInfoStep },
    { id: 'line-items', label: 'Line Items', component: LineItemsStep },
    { id: 'approval', label: 'Approval Chain', component: ApprovalChainStep },
    { id: 'review', label: 'Review & Submit', component: ReviewStep },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Create Purchase Request</h2>
        <Button variant="outline" onClick={() => navigate('/procurement/pr')}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardContent>
          <MultiStepWizard
            steps={wizardSteps}
            onComplete={() => navigate('/procurement/pr')}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default PRFormPage
