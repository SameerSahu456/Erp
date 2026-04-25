import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Building2,
  User,
  IndianRupee,
  FileText,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { WorkflowStepper } from '@/components/common/WorkflowStepper'
import type { StepConfig } from '@/components/common/WorkflowStepper'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { DetailTabs } from '@/modules/crm/components/DetailTabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

import { mockPurchaseRequests } from '@/modules/procurement/data/purchase-requests'
import type { ApprovalStep } from '@/modules/procurement/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getPRStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Submitted': return 'info'
    case 'Under Review': return 'warning'
    case 'Approved': return 'success'
    case 'Partially Approved': return 'warning'
    case 'Rejected': return 'error'
    case 'Converted to PO': return 'success'
    default: return 'neutral'
  }
}

function getUrgencyVariant(urgency: string): StatusBadgeVariant {
  switch (urgency) {
    case 'Low': return 'neutral'
    case 'Medium': return 'info'
    case 'High': return 'warning'
    case 'Critical': return 'error'
    default: return 'neutral'
  }
}

function approvalToStep(step: ApprovalStep): StepConfig {
  const statusMap: Record<string, StepConfig['status']> = {
    Approved: 'completed',
    Rejected: 'failed',
    Pending: 'pending',
    Skipped: 'pending',
  }
  return {
    id: step.id,
    label: step.approver,
    description: step.role,
    status: statusMap[step.status] ?? 'pending',
  }
}

function PRDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const pr = mockPurchaseRequests.find((p) => p.id === id)

  if (!pr) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted p-4">
          <FileText className="size-8 text-muted-foreground" />
        </div>
        <h2 className="font-display text-xl font-semibold">Purchase Request not found</h2>
        <p className="text-sm text-muted-foreground">
          The purchase request you are looking for does not exist.
        </p>
        <Button variant="outline" render={<Link to="/procurement/pr" />}>
          Back to Purchase Requests
        </Button>
      </div>
    )
  }

  const stepperSteps = pr.approvalChain.map(approvalToStep)
  const approvedCount = pr.approvalChain.filter((s) => s.status === 'Approved').length
  const totalSteps = pr.approvalChain.length

  // Items tab
  const itemsContent = (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Part</TableHead>
              <TableHead>Part no</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Est. Total</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pr.items.map((item, idx) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">{item.partName}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{item.partSku}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {item.category}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">{item.qty}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(item.estimatedUnitCost)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatCurrency(item.estimatedTotal)}</TableCell>
                <TableCell>
                  <StatusBadge variant={getUrgencyVariant(item.urgency)}>{item.urgency}</StatusBadge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                  {item.notes ?? '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <div className="rounded-lg bg-muted/50 px-4 py-2.5">
          <span className="text-sm text-muted-foreground">Total Estimated: </span>
          <span className="text-base font-semibold tabular-nums">{formatCurrency(pr.totalEstimated)}</span>
        </div>
      </div>
    </div>
  )

  // Approval tab
  const approvalContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
        <div className="text-sm">
          <span className="font-medium">{approvedCount}/{totalSteps}</span>
          <span className="text-muted-foreground"> approvals completed</span>
        </div>
        <div className="ml-auto flex h-2 w-32 overflow-hidden rounded-full bg-muted">
          <div
            className="rounded-full bg-primary transition-all"
            style={{ width: `${(approvedCount / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {pr.approvalChain.map((step, idx) => (
          <div
            key={step.id}
            className={`flex items-start justify-between rounded-lg border p-4 transition-colors ${
              step.status === 'Pending' ? 'border-primary/20 bg-primary/[0.02]' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
                step.status === 'Approved'
                  ? 'bg-status-success-bg text-status-success-text'
                  : step.status === 'Rejected'
                    ? 'bg-status-error-bg text-status-error-text'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {idx + 1}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{step.approver}</span>
                  <StatusBadge
                    variant={
                      step.status === 'Approved' ? 'success'
                        : step.status === 'Rejected' ? 'error'
                          : step.status === 'Skipped' ? 'neutral'
                            : 'warning'
                    }
                  >
                    {step.status}
                  </StatusBadge>
                </div>
                <p className="text-xs text-muted-foreground">{step.role}</p>
                {step.comments && (
                  <p className="mt-1 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm text-muted-foreground italic">
                    "{step.comments}"
                  </p>
                )}
                {step.actionDate && (
                  <p className="text-xs text-muted-foreground">{formatDate(step.actionDate)}</p>
                )}
              </div>
            </div>
            {step.status === 'Pending' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">Reject</Button>
                <Button size="sm">Approve</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  // Linked tab
  const linkedContent = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <FileText className="size-3.5" />
          Material Inquiry
        </div>
        {pr.linkedMaterialInquiryId ? (
          <Link
            to={`/crm/material-inquiries/${pr.linkedMaterialInquiryId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {pr.linkedMaterialInquiryId}
            <ExternalLink className="size-3" />
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">Not linked</p>
        )}
      </div>
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <FileText className="size-3.5" />
          Sales Order
        </div>
        {pr.linkedSalesOrderId ? (
          <Link
            to={`/crm/sales-orders/${pr.linkedSalesOrderId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {pr.linkedSalesOrderId}
            <ExternalLink className="size-3" />
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">Not linked</p>
        )}
      </div>
    </div>
  )

  const tabs = [
    { id: 'items', label: 'Items', count: pr.items.length, content: itemsContent },
    { id: 'approval', label: 'Approval Chain', content: approvalContent },
    { id: 'linked', label: 'Linked Documents', content: linkedContent },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={`${pr.prNumber} — ${pr.title}`}
        status={{ label: pr.status, variant: getPRStatusVariant(pr.status) }}
        backHref="/procurement/pr"
        actions={
          pr.status === 'Approved' ? (
            <Button onClick={() => navigate(`/procurement/po/new?prId=${pr.id}`)}>
              Convert to PO
            </Button>
          ) : undefined
        }
      />

      {/* Approval chain stepper */}
      <Card>
        <CardContent className="pt-2">
          <WorkflowStepper steps={stepperSteps} />
        </CardContent>
      </Card>

      {/* Quick info strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <User className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Requested By</p>
            <p className="text-sm font-medium">{pr.requestedBy}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Building2 className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Department</p>
            <p className="text-sm font-medium">{pr.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Calendar className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Required By</p>
            <p className="text-sm font-medium">{formatDate(pr.requiredByDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <IndianRupee className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Total Estimated</p>
            <p className="text-sm font-semibold">{formatCurrency(pr.totalEstimated)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <DetailTabs cardContent tabs={tabs} defaultTab="items" />
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {pr.items.some((i) => i.urgency === 'Critical' || i.urgency === 'High') && (
            <div className="flex items-start gap-2.5 rounded-lg border border-status-warning-text/20 bg-status-warning-bg/50 p-3">
              <AlertTriangle className="mt-0.5 size-4 text-status-warning-text" />
              <div>
                <p className="text-sm font-medium text-status-warning-text">High Priority Items</p>
                <p className="text-xs text-status-warning-text/80">
                  {pr.items.filter((i) => i.urgency === 'Critical' || i.urgency === 'High').length} item(s)
                  marked as {pr.items.some((i) => i.urgency === 'Critical') ? 'Critical' : 'High'} urgency
                </p>
              </div>
            </div>
          )}

          <Card size="sm">
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">PR Number</dt>
                  <dd className="text-sm font-mono">{pr.prNumber}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Created</dt>
                  <dd className="text-sm">{formatDate(pr.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Items</dt>
                  <dd className="text-sm font-medium">{pr.items.length}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Total Qty</dt>
                  <dd className="text-sm font-medium">{pr.items.reduce((s, i) => s + i.qty, 0)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {pr.justification && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Justification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{pr.justification}</p>
              </CardContent>
            </Card>
          )}

          {pr.notes && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{pr.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Category breakdown mini chart */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {Object.entries(
                  pr.items.reduce<Record<string, number>>((acc, item) => {
                    acc[item.category] = (acc[item.category] ?? 0) + item.estimatedTotal
                    return acc
                  }, {})
                )
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const percentage = (amount / pr.totalEstimated) * 100
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium">{category}</span>
                          <span className="text-muted-foreground tabular-nums">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PRDetailPage
