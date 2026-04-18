import { useState, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'

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
import { mockPMAssignments } from '@/modules/ims/data/pm-assignments'
import type { PMAssignment } from '@/modules/ims/data/pm-assignments'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

// Mock parts catalog with category IDs and OEM IDs for PM assignment resolution
const mockParts = [
  { id: 'PART-001', name: 'Dell PowerEdge R750', sku: 'DEL-SRV-R750', category: 'Servers', categoryId: 'cat-003', oemId: 'oem-001', oemName: 'Dell', estCost: 285000 },
  { id: 'PART-003', name: 'HP EliteBook 860 G10', sku: 'HP-EB-860G10', category: 'Laptops', categoryId: 'cat-001', oemId: 'oem-002', oemName: 'HP', estCost: 92000 },
  { id: 'PART-004', name: 'Lenovo ThinkStation P360 Tower', sku: 'LEN-TS-P360', category: 'Desktops', categoryId: 'cat-002', oemId: 'oem-003', oemName: 'Lenovo', estCost: 195000 },
  { id: 'PART-005', name: 'Cisco Catalyst 9300-48P', sku: 'CISCO-C9300-48P', category: 'Networking', categoryId: 'cat-005', oemId: 'oem-004', oemName: 'Cisco', estCost: 245000 },
  { id: 'PART-007', name: 'Palo Alto PA-5250', sku: 'PA-5250-BND', category: 'Networking', categoryId: 'cat-005', oemId: 'oem-008', oemName: 'Palo Alto Networks', estCost: 1850000 },
  { id: 'PART-009', name: 'D-Link DBA-2820P', sku: 'DLINK-AP-2820P', category: 'Networking', categoryId: 'cat-005', oemId: null, oemName: 'D-Link', estCost: 18500 },
  { id: 'PART-010', name: 'APC Smart-UPS 3000VA', sku: 'APC-UPS-3000', category: 'UPS & Power', categoryId: 'cat-008', oemId: 'oem-009', oemName: 'APC', estCost: 38000 },
  { id: 'PART-011', name: 'FortiGate 200F', sku: 'FG-200F-BND', category: 'Networking', categoryId: 'cat-005', oemId: null, oemName: 'Fortinet', estCost: 385000 },
]

const departments = ['IT Procurement', 'Network Solutions', 'Security Solutions', 'IT Infrastructure', 'General']
const urgencyOptions = ['Low', 'Medium', 'High', 'Critical'] as const

interface PRLineItem {
  id: string
  partId: string
  partName: string
  partSku: string
  category: string
  categoryId: string
  oemId: string | null
  oemName: string
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
      categoryId: '',
      oemId: null,
      oemName: '',
      qty: 1,
      estimatedUnitCost: 0,
      notes: '',
      urgency: 'Medium',
    },
  ],
}

// Mock current user — in production this comes from auth context
const CURRENT_USER_ID = 'user-999' // not a PM, so approval is never auto-approved in demo

interface ResolvedApprover {
  pmAssignment: PMAssignment
  items: PRLineItem[]
}

function resolveApprovers(items: PRLineItem[]): ResolvedApprover[] {
  const validItems = items.filter((i) => i.partId && i.categoryId)
  const approverMap = new Map<string, ResolvedApprover>()

  for (const item of validItems) {
    // Find most specific PM assignment: category + OEM > category only
    let match: PMAssignment | undefined
    // Try exact category + OEM match first
    if (item.oemId) {
      match = mockPMAssignments.find(
        (a) => a.categoryId === item.categoryId && a.oemId === item.oemId && a.variant === null
      )
    }
    // Fallback to category-only match
    if (!match) {
      match = mockPMAssignments.find(
        (a) => a.categoryId === item.categoryId && a.oemId === null && a.variant === null
      )
    }
    if (match) {
      const existing = approverMap.get(match.id)
      if (existing) {
        existing.items.push(item)
      } else {
        approverMap.set(match.id, { pmAssignment: match, items: [item] })
      }
    }
  }

  return Array.from(approverMap.values())
}

function getApprovalSteps(approvers: ResolvedApprover[]): StepConfig[] {
  if (approvers.length === 0) {
    return [{ id: 'none', label: 'No PM Assigned', description: 'Configure PM Assignments', status: 'pending' }]
  }
  return approvers.map((a) => ({
    id: a.pmAssignment.id,
    label: `PM: ${a.pmAssignment.pmName}`,
    description: `${a.pmAssignment.categoryName}${a.pmAssignment.oemName ? ` / ${a.pmAssignment.oemName}` : ' / All OEMs'}`,
    status: 'pending' as const,
  }))
}

function PRFormPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<PRFormState>(initialState)

  const totalEstimated = useMemo(
    () => form.items.reduce((sum, item) => sum + item.qty * item.estimatedUnitCost, 0),
    [form.items]
  )

  const resolvedApprovers = useMemo(() => resolveApprovers(form.items), [form.items])
  const isAutoApproved = resolvedApprovers.length > 0 && resolvedApprovers.every((a) => a.pmAssignment.pmId === CURRENT_USER_ID)
  const hasUnassignedItems = form.items.some((i) => i.partId && i.categoryId && !resolvedApprovers.some((a) => a.items.includes(i)))
  const approvalSteps = useMemo(() => getApprovalSteps(resolvedApprovers), [resolvedApprovers])

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
              categoryId: part.categoryId,
              oemId: part.oemId,
              oemName: part.oemName,
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
          categoryId: '',
          oemId: null,
          oemName: '',
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
      <div className="space-y-6 px-6 pb-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Request Information</h3>
          <p className="mt-1 text-sm text-muted-foreground">Fill in the basic request information</p>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pr-title">Title</Label>
            <Input
              id="pr-title"
              placeholder="PR title"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pr-department">Department</Label>
            <Select value={form.department} onValueChange={(v) => updateField('department', v as string)}>
              <SelectTrigger id="pr-department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-b" />

        <div className="space-y-2">
          <Label htmlFor="pr-justification">Justification</Label>
          <Textarea
            id="pr-justification"
            placeholder="Why is this purchase needed?"
            value={form.justification}
            onChange={(e) => updateField('justification', e.target.value)}
            rows={3}
          />
        </div>

        <div className="border-b" />

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pr-date">Required By Date</Label>
            <Input
              id="pr-date"
              type="date"
              value={form.requiredByDate}
              onChange={(e) => updateField('requiredByDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pr-urgency">Urgency</Label>
            <Select value={form.urgency} onValueChange={(v) => updateField('urgency', v as string)}>
              <SelectTrigger id="pr-urgency">
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
      <div className="space-y-5 px-6 pb-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Line Items</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add the parts you need to purchase</p>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                <th className="min-w-[200px] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">SKU</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="w-24 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty</th>
                <th className="w-32 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Est. Unit Cost</th>
                <th className="min-w-[120px] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</th>
                <th className="w-14 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {form.items.map((item, index) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-muted-foreground">{index + 1}</td>
                  <td className="px-2 py-2">
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
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{item.partSku || '-'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{item.category || '-'}</td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={1}
                      className="text-right"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value) || 1)}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                    {formatCurrency(item.estimatedUnitCost)}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="Notes"
                      value={item.notes}
                      onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
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

        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={addItem}
            className="border-dashed"
          >
            <Plus className="mr-1.5 size-4" />
            Add Item
          </Button>

          <div className="rounded-lg bg-muted/50 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Estimated Total</span>
            <span className="ml-3 text-base font-semibold tabular-nums">{formatCurrency(totalEstimated)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: PM Approval
  function ApprovalChainStep(_props: WizardStepProps) {
    return (
      <div className="space-y-5 px-6 pb-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">PM Approval</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Based on the line items selected, the following Product Manager(s) will review this PR:
          </p>
        </div>

        {isAutoApproved && (
          <div className="flex items-start gap-3 rounded-lg border bg-status-success-bg p-4">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-800">This PR will be auto-approved as you are the assigned PM for all items.</p>
          </div>
        )}

        {hasUnassignedItems && (
          <div className="flex items-start gap-3 rounded-lg border bg-status-warning-bg p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              Some items have no PM assigned.{' '}
              <Link to="/ims/pm-assignments" className="font-medium underline underline-offset-2">Configure PM Assignments</Link>
            </p>
          </div>
        )}

        {resolvedApprovers.length > 0 ? (
          <div className="space-y-3">
            {resolvedApprovers.map((approver) => (
              <Card key={approver.pmAssignment.id} size="sm" className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{approver.pmAssignment.pmName}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {approver.pmAssignment.categoryName}
                        {approver.pmAssignment.oemName ? ` / ${approver.pmAssignment.oemName}` : ' / All OEMs'}
                        {approver.pmAssignment.variant ? ` / ${approver.pmAssignment.variant === 'new' ? 'New' : 'Refurbished'}` : ' / All Variants'}
                      </p>
                    </div>
                    <StatusBadge variant="warning">Pending</StatusBadge>
                  </div>
                  <div className="border-t bg-muted/30 px-4 py-2.5">
                    <p className="text-xs font-medium text-muted-foreground">Items under this PM:</p>
                    <ul className="mt-1.5 space-y-1">
                      {approver.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm">
                          <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                          {item.partName} x {item.qty}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-4">
              <WorkflowStepper steps={approvalSteps} />
            </CardContent>
          </Card>
        )}

        <div className="rounded-lg bg-muted/40 px-4 py-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Approval is routed by Category x OEM. If items span multiple categories/OEMs, each relevant PM must approve. Any rejection cancels the entire PR.
          </p>
        </div>
      </div>
    )
  }

  // Step 4: Review & Submit
  function ReviewStep(_props: WizardStepProps) {
    return (
      <div className="space-y-6 px-6 pb-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Review & Submit</h3>
          <p className="mt-1 text-sm text-muted-foreground">Verify the details below before submitting your purchase request</p>
        </div>

        <Card size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Request Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Title</dt>
                <dd className="mt-0.5 text-sm font-medium">{form.title || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Department</dt>
                <dd className="mt-0.5 text-sm">{form.department || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Required By</dt>
                <dd className="mt-0.5 text-sm">{form.requiredByDate || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Urgency</dt>
                <dd className="mt-1"><StatusBadge variant={form.urgency === 'Critical' ? 'error' : form.urgency === 'High' ? 'warning' : 'info'}>{form.urgency}</StatusBadge></dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Justification</dt>
                <dd className="mt-0.5 text-sm leading-relaxed">{form.justification || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Items ({form.items.filter((i) => i.partId).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {form.items.filter((i) => i.partId).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm odd:bg-muted/30">
                  <span>{item.partName} x {item.qty}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(item.qty * item.estimatedUnitCost)}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(totalEstimated)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Approval Chain</CardTitle>
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
        <h2 className="font-display text-2xl font-semibold tracking-tight">Create Purchase Request</h2>
        <Button variant="outline" onClick={() => navigate('/procurement/pr')}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
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
