import { useParams, Link, useNavigate } from 'react-router-dom'

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

  // Items tab
  const itemsContent = (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Part</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Est. Cost</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pr.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.partName}</TableCell>
              <TableCell className="text-muted-foreground">{item.partSku}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(item.estimatedTotal)}</TableCell>
              <TableCell>
                <StatusBadge variant={getUrgencyVariant(item.urgency)}>{item.urgency}</StatusBadge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {item.notes ?? '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  // Approval tab
  const approvalContent = (
    <div className="space-y-6">
      {pr.approvalChain.map((step) => (
        <div key={step.id} className="flex items-start justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{step.approver}</span>
              <StatusBadge
                variant={
                  step.status === 'Approved'
                    ? 'success'
                    : step.status === 'Rejected'
                      ? 'error'
                      : step.status === 'Skipped'
                        ? 'neutral'
                        : 'warning'
                }
              >
                {step.status}
              </StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground">{step.role}</p>
            {step.comments && (
              <p className="text-sm text-muted-foreground mt-1">"{step.comments}"</p>
            )}
            {step.actionDate && (
              <p className="text-xs text-muted-foreground">{formatDate(step.actionDate)}</p>
            )}
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
  )

  // Linked tab
  const linkedContent = (
    <div className="space-y-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Linked Material Inquiry</CardTitle>
        </CardHeader>
        <CardContent>
          {pr.linkedMaterialInquiryId ? (
            <Link to={`/crm/material-inquiries/${pr.linkedMaterialInquiryId}`} className="text-sm text-primary hover:underline">
              {pr.linkedMaterialInquiryId}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">No material inquiry linked</p>
          )}
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Linked Sales Order</CardTitle>
        </CardHeader>
        <CardContent>
          {pr.linkedSalesOrderId ? (
            <Link to={`/crm/sales-orders/${pr.linkedSalesOrderId}`} className="text-sm text-primary hover:underline">
              {pr.linkedSalesOrderId}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">No sales order linked</p>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const tabs = [
    { id: 'items', label: 'Items', count: pr.items.length, content: itemsContent },
    { id: 'approval', label: 'Approval', content: approvalContent },
    { id: 'linked', label: 'Linked', content: linkedContent },
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <DetailTabs tabs={tabs} defaultTab="items" />
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Requested By</dt>
                  <dd className="text-sm">{pr.requestedBy}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Department</dt>
                  <dd className="text-sm">{pr.department}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Required By</dt>
                  <dd className="text-sm">{formatDate(pr.requiredByDate)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Total Estimated</dt>
                  <dd className="text-sm font-medium">{formatCurrency(pr.totalEstimated)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Created</dt>
                  <dd className="text-sm">{formatDate(pr.createdAt)}</dd>
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
                <p className="text-sm text-muted-foreground">{pr.justification}</p>
              </CardContent>
            </Card>
          )}

          {pr.notes && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{pr.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default PRDetailPage
