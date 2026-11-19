import { useState, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MultiStepWizard } from '@/components/common/views/MultiStepWizard'
import type { WizardStepProps } from '@/components/common/views/MultiStepWizard'
import { WorkflowStepper } from '@/components/common/views/WorkflowStepper'
import type { StepConfig } from '@/components/common/views/WorkflowStepper'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { PageHeader } from '@/components/page-shells'
import { mockPMAssignments } from '@/modules/ims/data/pm-assignments'
import type { PMAssignment } from '@/modules/ims/data/pm-assignments'
import { formatINRCompact } from "@/lib/currency";
import { useAuth } from "@shared/auth/use-auth"
import { PR_STRINGS } from './purchase-requests.strings'



// Mock parts catalog with category IDs and OEM IDs for PM assignment resolution
export const mockParts = [
  { id: 'PART-001', name: 'Dell PowerEdge R750', sku: 'DEL-SRV-R750', category: 'Servers', categoryId: 'cat-003', oemId: 'oem-001', oemName: 'Dell', estCost: 285000 },
  { id: 'PART-003', name: 'HP EliteBook 860 G10', sku: 'HP-EB-860G10', category: 'Laptops', categoryId: 'cat-001', oemId: 'oem-002', oemName: 'HP', estCost: 92000 },
  { id: 'PART-004', name: 'Lenovo ThinkStation P360 Tower', sku: 'LEN-TS-P360', category: 'Desktops', categoryId: 'cat-002', oemId: 'oem-003', oemName: 'Lenovo', estCost: 195000 },
  { id: 'PART-005', name: 'Cisco Catalyst 9300-48P', sku: 'CISCO-C9300-48P', category: 'Networking', categoryId: 'cat-005', oemId: 'oem-004', oemName: 'Cisco', estCost: 245000 },
  { id: 'PART-007', name: 'Palo Alto PA-5250', sku: 'PA-5250-BND', category: 'Networking', categoryId: 'cat-005', oemId: 'oem-008', oemName: 'Palo Alto Networks', estCost: 1850000 },
  { id: 'PART-009', name: 'D-Link DBA-2820P', sku: 'DLINK-AP-2820P', category: 'Networking', categoryId: 'cat-005', oemId: null, oemName: 'D-Link', estCost: 18500 },
  { id: 'PART-010', name: 'APC Smart-UPS 3000VA', sku: 'APC-UPS-3000', category: 'UPS & Power', categoryId: 'cat-008', oemId: 'oem-009', oemName: 'APC', estCost: 38000 },
  { id: 'PART-011', name: 'FortiGate 200F', sku: 'FG-200F-BND', category: 'Networking', categoryId: 'cat-005', oemId: null, oemName: 'Fortinet', estCost: 385000 },
]

export const departments = ['IT Procurement', 'Network Solutions', 'Security Solutions', 'IT Infrastructure', 'General']
export const urgencyOptions = ['Low', 'Medium', 'High', 'Critical'] as const

export interface PRLineItem {
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
export interface PRFormState {
  title: string
  department: string
  justification: string
  requiredByDate: string
  urgency: string
  items: PRLineItem[]
}

export const initialState: PRFormState = {
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

export interface ResolvedApprover {
  pmAssignment: PMAssignment
  items: PRLineItem[]
}

export function resolveApprovers(items: PRLineItem[]): ResolvedApprover[] {
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

export function getApprovalSteps(approvers: ResolvedApprover[]): StepConfig[] {
  if (approvers.length === 0) {
    return [{ id: 'none', label: PR_STRINGS.approval.noPMLabel, description: PR_STRINGS.approval.noPMDescription, status: 'pending' }]
  }
  return approvers.map((a) => ({
    id: a.pmAssignment.id,
    label: PR_STRINGS.approval.pmLabel(a.pmAssignment.pmName),
    description: `${a.pmAssignment.categoryName}${a.pmAssignment.oemName ? ` / ${a.pmAssignment.oemName}` : PR_STRINGS.approval.allOEMs}`,
    status: 'pending' as const,
  }))
}


export function PRFormBody() {
  const navigate = useNavigate()
  const goBack = useNavigateBack('/procurement/pr')
  const { user } = useAuth()
  const currentUserId = user?.id ?? null
  const [form, setForm] = useState<PRFormState>(initialState)

  const totalEstimated = useMemo(
    () => form.items.reduce((sum, item) => sum + item.qty * item.estimatedUnitCost, 0),
    [form.items]
  )

  const resolvedApprovers = useMemo(() => resolveApprovers(form.items), [form.items])
  const isAutoApproved =
    !!currentUserId &&
    resolvedApprovers.length > 0 &&
    resolvedApprovers.every((a) => a.pmAssignment.pmId === currentUserId)
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
          <h3 className="text-lg font-semibold tracking-tight">{PR_STRINGS.requestInfo.heading}</h3>
          <Typography variant="body" tone="muted" className="mt-1" asChild><p>{PR_STRINGS.requestInfo.subtitle}</p></Typography>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pr-title">{PR_STRINGS.requestInfo.titleLabel}</Label>
            <Input
              id="pr-title"
              placeholder={PR_STRINGS.requestInfo.titlePlaceholder}
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pr-department">{PR_STRINGS.requestInfo.departmentLabel}</Label>
            <Select value={form.department} onValueChange={(v) => updateField('department', v as string)}>
              <SelectTrigger id="pr-department">
                <SelectValue placeholder={PR_STRINGS.requestInfo.departmentPlaceholder} />
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
          <Label htmlFor="pr-justification">{PR_STRINGS.requestInfo.justificationLabel}</Label>
          <Textarea
            id="pr-justification"
            placeholder={PR_STRINGS.requestInfo.justificationPlaceholder}
            value={form.justification}
            onChange={(e) => updateField('justification', e.target.value)}
            rows={3}
          />
        </div>

        <div className="border-b" />

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pr-date">{PR_STRINGS.requestInfo.requiredByDateLabel}</Label>
            <Input
              id="pr-date"
              type="date"
              value={form.requiredByDate}
              onChange={(e) => updateField('requiredByDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pr-urgency">{PR_STRINGS.requestInfo.urgencyLabel}</Label>
            <Select value={form.urgency} onValueChange={(v) => updateField('urgency', v as string)}>
              <SelectTrigger id="pr-urgency">
                <SelectValue placeholder={PR_STRINGS.requestInfo.urgencyPlaceholder} />
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
          <h3 className="text-lg font-semibold tracking-tight">{PR_STRINGS.lineItems.heading}</h3>
          <Typography variant="body" tone="muted" className="mt-1" asChild><p>{PR_STRINGS.lineItems.subtitle}</p></Typography>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                <th className="min-w-[200px] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{PR_STRINGS.lineItems.columns.part}</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{PR_STRINGS.lineItems.columns.partNo}</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{PR_STRINGS.lineItems.columns.category}</th>
                <th className="w-24 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">{PR_STRINGS.lineItems.columns.qty}</th>
                <th className="w-32 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">{PR_STRINGS.lineItems.columns.estUnitCost}</th>
                <th className="min-w-[120px] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{PR_STRINGS.lineItems.columns.notes}</th>
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
                        <SelectValue placeholder={PR_STRINGS.lineItems.partPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {mockParts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{item.partSku || '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{item.category || '—'}</td>
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
                    {formatINRCompact(item.estimatedUnitCost)}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder={PR_STRINGS.lineItems.notesPlaceholder}
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
            {PR_STRINGS.lineItems.addItem}
          </Button>

          <div className="rounded-lg bg-muted/50 px-4 py-2.5">
            <Typography variant="body" tone="muted" asChild><span>{PR_STRINGS.lineItems.estimatedTotal}</span></Typography>
            <span className="ml-3 text-base font-semibold tabular-nums">{formatINRCompact(totalEstimated)}</span>
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
          <h3 className="text-lg font-semibold tracking-tight">{PR_STRINGS.approval.heading}</h3>
          <Typography variant="body" tone="muted" className="mt-1" asChild>
            <p>
              {PR_STRINGS.approval.subtitle}
            </p>
          </Typography>
        </div>

        {isAutoApproved && (
          <div className="flex items-start gap-3 rounded-lg border bg-status-success-bg p-4">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-800">{PR_STRINGS.approval.autoApprovedNotice}</p>
          </div>
        )}

        {hasUnassignedItems && (
          <div className="flex items-start gap-3 rounded-lg border bg-status-warning-bg p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              {PR_STRINGS.approval.unassignedWarningPrefix}{' '}
              <Link to="/ims/pm-assignments" className="font-medium underline underline-offset-2">{PR_STRINGS.approval.configurePMAssignments}</Link>
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
                      <Typography variant="body" tone="muted" className="mt-0.5" asChild>
                        <p>
                          {approver.pmAssignment.categoryName}
                          {approver.pmAssignment.oemName ? ` / ${approver.pmAssignment.oemName}` : PR_STRINGS.approval.allOEMs}
                          {approver.pmAssignment.variant ? ` / ${approver.pmAssignment.variant === 'new' ? PR_STRINGS.approval.variantNew : PR_STRINGS.approval.variantRefurb}` : PR_STRINGS.approval.allVariants}
                        </p>
                      </Typography>
                    </div>
                    <StatusBadge variant="warning">{PR_STRINGS.approval.pendingBadge}</StatusBadge>
                  </div>
                  <div className="border-t bg-muted/30 px-4 py-2.5">
                    <p className="text-xs font-medium text-muted-foreground">{PR_STRINGS.approval.itemsUnderPM}</p>
                    <ul className="mt-1.5 space-y-1">
                      {approver.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm">
                          <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                          {PR_STRINGS.review.lineItemLabel(item.partName, item.qty)}
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
            {PR_STRINGS.approval.approvalRoutingNote}
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
          <h3 className="text-lg font-semibold tracking-tight">{PR_STRINGS.review.heading}</h3>
          <Typography variant="body" tone="muted" className="mt-1" asChild><p>{PR_STRINGS.review.subtitle}</p></Typography>
        </div>

        <Card size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{PR_STRINGS.review.requestInfoCard}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <div>
                <Typography variant="helper" asChild><dt>{PR_STRINGS.review.fields.title}</dt></Typography>
                <Typography variant="body-strong" className="mt-0.5" asChild><dd>{form.title || '—'}</dd></Typography>
              </div>
              <div>
                <Typography variant="helper" asChild><dt>{PR_STRINGS.review.fields.department}</dt></Typography>
                <Typography variant="body" className="mt-0.5" asChild><dd>{form.department || '—'}</dd></Typography>
              </div>
              <div>
                <Typography variant="helper" asChild><dt>{PR_STRINGS.review.fields.requiredBy}</dt></Typography>
                <Typography variant="body" className="mt-0.5" asChild><dd>{form.requiredByDate || '—'}</dd></Typography>
              </div>
              <div>
                <Typography variant="helper" asChild><dt>{PR_STRINGS.review.fields.urgency}</dt></Typography>
                <dd className="mt-1"><StatusBadge variant={form.urgency === 'Critical' ? 'error' : form.urgency === 'High' ? 'warning' : 'info'}>{form.urgency}</StatusBadge></dd>
              </div>
              <div className="sm:col-span-2">
                <Typography variant="helper" asChild><dt>{PR_STRINGS.review.fields.justification}</dt></Typography>
                <dd className="mt-0.5 text-sm leading-relaxed">{form.justification || '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {PR_STRINGS.review.itemsCard(form.items.filter((i) => i.partId).length)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {form.items.filter((i) => i.partId).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm odd:bg-muted/30">
                  <span>{PR_STRINGS.review.lineItemLabel(item.partName, item.qty)}</span>
                  <span className="font-medium tabular-nums">{formatINRCompact(item.qty * item.estimatedUnitCost)}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 font-semibold">
                <span>{PR_STRINGS.review.total}</span>
                <span className="tabular-nums">{formatINRCompact(totalEstimated)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{PR_STRINGS.review.approvalChainCard}</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowStepper steps={approvalSteps} />
          </CardContent>
        </Card>
      </div>
    )
  }

  const wizardSteps = [
    { id: 'request-info', label: PR_STRINGS.form.steps.requestInfo, component: RequestInfoStep },
    { id: 'line-items', label: PR_STRINGS.form.steps.lineItems, component: LineItemsStep },
    { id: 'approval', label: PR_STRINGS.form.steps.approvalChain, component: ApprovalChainStep },
    { id: 'review', label: PR_STRINGS.form.steps.reviewSubmit, component: ReviewStep },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={PR_STRINGS.form.title}
        subtitle={PR_STRINGS.form.subtitle}
        breadcrumbs={[
          { label: PR_STRINGS.form.breadcrumbs.procurement },
          { label: PR_STRINGS.form.breadcrumbs.purchaseRequests, href: '/procurement/pr' },
          { label: PR_STRINGS.form.breadcrumbs.new },
        ]}
        backHref="/procurement/pr"
        actions={
          <Button variant="outline" onClick={goBack}>
            {PR_STRINGS.form.cancel}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <MultiStepWizard
            steps={wizardSteps}
            onComplete={() => navigate('/procurement/pr', { replace: true })}
          />
        </CardContent>
      </Card>
    </div>
  )
}


