import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Building2,
  User,
  IndianRupee,
  FileText,
  AlertTriangle,
  ExternalLink,
  StickyNote,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { ExpandableClampText } from '@/components/common/display/ExpandableClampText'
import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { WorkflowStepper } from '@/components/common/views/WorkflowStepper'
import type { StepConfig } from '@/components/common/views/WorkflowStepper'
import { EntityHeader } from '@/components/page-shells/EntityHeader'
import { DetailTabs } from '@/components/page-shells/DetailTabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

import { usePermission } from '@shared/rbac'

import { mockPurchaseRequests } from '@/modules/procurement/data/purchase-requests'
import type { ApprovalStep } from '@/modules/procurement/types'
import { procurementCan } from '../../permissions'
import { formatINRCompact } from "@/lib/currency";
import { formatIST_date } from "@shared/lib/date"
import { PR_STRINGS } from './purchase-requests.strings'



export const formatDate = (dateStr: string) => formatIST_date(dateStr)

export function getPRStatusVariant(status: string): StatusBadgeVariant {
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

export function getUrgencyVariant(urgency: string): StatusBadgeVariant {
  switch (urgency) {
    case 'Low': return 'neutral'
    case 'Medium': return 'info'
    case 'High': return 'warning'
    case 'Critical': return 'error'
    default: return 'neutral'
  }
}

export function approvalToStep(step: ApprovalStep): StepConfig {
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


export function PRDetailBody() {
  // Backend gate (once PR endpoints ship): PR write for edit/submit/duplicate/
  // revise; PR approve for line approve/reject. "Convert to PO" jumps to the
  // PO create flow, so it gates on `writePo` — a PR-approver without PO write
  // authority shouldn't see the shortcut.
  const { can } = usePermission()
  const canApprove = can(procurementCan.approvePr)
  const canConvertToPo = can(procurementCan.writePo)
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const pr = mockPurchaseRequests.find((p) => p.id === id)

  if (!pr) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted p-4">
          <FileText className="size-8 text-muted-foreground" />
        </div>
        <h2 className="font-display text-xl font-semibold">{PR_STRINGS.detail.notFoundTitle}</h2>
        <Typography variant="body" tone="muted" asChild>
          <p>
            {PR_STRINGS.detail.notFoundDescription}
          </p>
        </Typography>
        <Button variant="outline" render={<Link to="/procurement/pr" />}>
          {PR_STRINGS.detail.backToPRs}
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
              <TableHead>{PR_STRINGS.detail.itemsTable.part}</TableHead>
              <TableHead>{PR_STRINGS.detail.itemsTable.partNo}</TableHead>
              <TableHead>{PR_STRINGS.detail.itemsTable.category}</TableHead>
              <TableHead className="text-right">{PR_STRINGS.detail.itemsTable.qty}</TableHead>
              <TableHead className="text-right">{PR_STRINGS.detail.itemsTable.unitCost}</TableHead>
              <TableHead className="text-right">{PR_STRINGS.detail.itemsTable.estTotal}</TableHead>
              <TableHead>{PR_STRINGS.detail.itemsTable.urgency}</TableHead>
              <TableHead>{PR_STRINGS.detail.itemsTable.notes}</TableHead>
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
                <TableCell className="text-right tabular-nums">{formatINRCompact(item.estimatedUnitCost)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatINRCompact(item.estimatedTotal)}</TableCell>
                <TableCell>
                  <StatusBadge variant={getUrgencyVariant(item.urgency)}>{item.urgency}</StatusBadge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                  {item.notes ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <div className="rounded-lg bg-muted/50 px-4 py-2.5">
          <Typography variant="body" tone="muted" asChild><span>{PR_STRINGS.detail.totalEstimatedLabel}</span></Typography>
          <span className="text-base font-semibold tabular-nums">{formatINRCompact(pr.totalEstimated)}</span>
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
          <span className="text-muted-foreground">{PR_STRINGS.detail.approvalsCompleted}</span>
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
                  <Typography variant="body-strong" asChild><span>{step.approver}</span></Typography>
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
                <Typography variant="helper" asChild><p>{step.role}</p></Typography>
                {step.comments && (
                  <Typography variant="body" tone="muted" className="mt-1 rounded-md bg-muted/50 px-2.5 py-1.5 italic" asChild>
                    <p>
                      "{step.comments}"
                    </p>
                  </Typography>
                )}
                {step.actionDate && (
                  <Typography variant="helper" asChild><p>{formatDate(step.actionDate)}</p></Typography>
                )}
              </div>
            </div>
            {step.status === 'Pending' && canApprove && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">{PR_STRINGS.detail.rejectButton}</Button>
                <Button size="sm">{PR_STRINGS.detail.approveButton}</Button>
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
          {PR_STRINGS.detail.materialInquiry}
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
          <Typography variant="body" tone="muted" asChild><p>{PR_STRINGS.detail.notLinked}</p></Typography>
        )}
      </div>
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <FileText className="size-3.5" />
          {PR_STRINGS.detail.salesOrder}
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
          <Typography variant="body" tone="muted" asChild><p>{PR_STRINGS.detail.notLinked}</p></Typography>
        )}
      </div>
    </div>
  )

  const tabs = [
    { id: 'items', label: PR_STRINGS.detail.tabs.items, count: pr.items.length, content: itemsContent },
    { id: 'approval', label: PR_STRINGS.detail.tabs.approvalChain, content: approvalContent },
    { id: 'linked', label: PR_STRINGS.detail.tabs.linkedDocuments, content: linkedContent },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={`${pr.prNumber} — ${pr.title}`}
        status={{ label: pr.status, variant: getPRStatusVariant(pr.status) }}
        backHref="/procurement/pr"
        actions={
          pr.status === 'Approved' && canConvertToPo ? (
            <Button onClick={() => navigate(`/procurement/po/new?prId=${pr.id}`)}>
              {PR_STRINGS.detail.convertToPO}
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
            <Typography variant="caption" asChild><p>{PR_STRINGS.detail.requestedBy}</p></Typography>
            <Typography variant="body-strong" asChild><p>{pr.requestedBy}</p></Typography>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Building2 className="size-3.5 text-primary" />
          </div>
          <div>
            <Typography variant="caption" asChild><p>{PR_STRINGS.detail.department}</p></Typography>
            <Typography variant="body-strong" asChild><p>{pr.department}</p></Typography>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Calendar className="size-3.5 text-primary" />
          </div>
          <div>
            <Typography variant="caption" asChild><p>{PR_STRINGS.detail.requiredBy}</p></Typography>
            <Typography variant="body-strong" asChild><p>{formatDate(pr.requiredByDate)}</p></Typography>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <IndianRupee className="size-3.5 text-primary" />
          </div>
          <div>
            <Typography variant="caption" asChild><p>{PR_STRINGS.detail.totalEstimated}</p></Typography>
            <p className="text-sm font-semibold">{formatINRCompact(pr.totalEstimated)}</p>
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
                <p className="text-sm font-medium text-status-warning-text">{PR_STRINGS.detail.highPriorityTitle}</p>
                <p className="text-xs text-status-warning-text/80">
                  {PR_STRINGS.detail.highPriorityDetail(
                    pr.items.filter((i) => i.urgency === 'Critical' || i.urgency === 'High').length,
                    pr.items.some((i) => i.urgency === 'Critical') ? PR_STRINGS.detail.urgencyLabelCritical : PR_STRINGS.detail.urgencyLabelHigh
                  )}
                </p>
              </div>
            </div>
          )}

          <Card size="sm">
            <CardHeader>
              <CardTitle>{PR_STRINGS.detail.requestDetailsTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{PR_STRINGS.detail.requestDetailFields.prNumber}</dt>
                  <dd className="text-sm font-mono">{pr.prNumber}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{PR_STRINGS.detail.requestDetailFields.created}</dt>
                  <Typography variant="body" asChild><dd>{formatDate(pr.createdAt)}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{PR_STRINGS.detail.requestDetailFields.items}</dt>
                  <Typography variant="body-strong" asChild><dd>{pr.items.length}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{PR_STRINGS.detail.requestDetailFields.totalQty}</dt>
                  <Typography variant="body-strong" asChild><dd>{pr.items.reduce((s, i) => s + i.qty, 0)}</dd></Typography>
                </div>
              </dl>
            </CardContent>
          </Card>

          {pr.justification && (
            <Card size="sm">
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <FileText className="size-4 text-muted-foreground" />
                <CardTitle>{PR_STRINGS.detail.justificationTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border bg-muted/30 p-3.5">
                  <ExpandableClampText
                    text={pr.justification}
                    lines={3}
                    variant="body"
                    showMoreLabel="... Show more"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {pr.notes && (
            <Card size="sm">
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <StickyNote className="size-4 text-muted-foreground" />
                <CardTitle>{PR_STRINGS.detail.notesTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border bg-muted/30 p-3.5">
                  <ExpandableClampText
                    text={pr.notes}
                    lines={3}
                    variant="body"
                    showMoreLabel="... Show more"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category breakdown mini chart */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>{PR_STRINGS.detail.categoryBreakdownTitle}</CardTitle>
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
                          <span className="text-muted-foreground tabular-nums">{formatINRCompact(amount)}</span>
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
