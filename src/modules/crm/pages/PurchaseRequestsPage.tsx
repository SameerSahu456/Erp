import { useMemo } from 'react'
import { Plus, Eye, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow, type StatCardData } from '@/components/common/StatsRow'

import { purchaseRequests } from '@/modules/crm/data/purchase-requests'

const statusVariant: Record<string, StatusBadgeVariant> = {
  Draft: 'neutral',
  Submitted: 'info',
  'Pending PM Approval': 'warning',
  'Partially Approved': 'warning',
  'All PMs Approved': 'success',
  'Final Approved': 'success',
  Rejected: 'error',
  'Sent to Procurement': 'success',
}

const columns = [
  { key: 'prNumber', label: 'PR #', sortable: true },
  { key: 'salesOrderNumber', label: 'Linked SO', sortable: true },
  { key: 'status', label: 'Status', sortable: true, filterable: true },
  { key: 'pmApproval', label: 'PM Approvals' },
  { key: 'categories', label: 'Categories' },
  { key: 'itemsCount', label: 'Items', sortable: true, align: 'right' as const },
  { key: 'requestedBy', label: 'Requested By', sortable: true },
  { key: 'createdAt', label: 'Created', sortable: true },
  { key: 'actions', label: '' },
]

function PurchaseRequestsPage() {
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      purchaseRequests.map((pr) => {
        const approvedCount = pr.categoryApprovals.filter((a) => a.status === 'Approved').length
        const totalApprovals = pr.categoryApprovals.length
        const categories = [...new Set(pr.items.map((i) => i.category))]

        return {
          id: pr.id,
          prNumber: pr.prNumber,
          salesOrderNumber: pr.salesOrderNumber ?? '—',
          status: pr.status,
          pmApproval: `${approvedCount}/${totalApprovals}`,
          pmApprovalCount: approvedCount,
          pmApprovalTotal: totalApprovals,
          categories: categories.join(', '),
          categoryList: categories,
          itemsCount: pr.items.length,
          requestedBy: pr.requestedBy,
          createdAt: pr.createdAt,
        }
      }),
    []
  )

  const pendingPM = useMemo(() => rows.filter((r) => ['Pending PM Approval', 'Partially Approved'].includes(r.status)), [rows])
  const readyForProcurement = useMemo(() => rows.filter((r) => ['Final Approved', 'Sent to Procurement'].includes(r.status)), [rows])

  const stats: StatCardData[] = [
    { label: 'Total PRs', value: rows.length },
    { label: 'Pending PM Approval', value: pendingPM.length },
    { label: 'Ready for Procurement', value: readyForProcurement.length },
  ]

  const tabs: TabConfig[] = [
    { id: 'all', label: `All (${rows.length})`, columns, data: rows },
    { id: 'pending-pm', label: `Pending PM (${pendingPM.length})`, columns, data: pendingPM },
    { id: 'procurement', label: `Procurement (${readyForProcurement.length})`, columns, data: readyForProcurement },
  ]

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'prNumber') {
      return {
        display: (
          <Link to={`/crm/purchase-requests/${row.id}/edit`} className="text-primary hover:underline font-medium">
            {value as string}
          </Link>
        ),
      }
    }
    if (key === 'status') {
      const variant = statusVariant[value as string] ?? 'neutral'
      return {
        display: <StatusBadge variant={variant}>{value as string}</StatusBadge>,
      }
    }
    if (key === 'pmApproval') {
      const approved = row.pmApprovalCount as number
      const total = row.pmApprovalTotal as number
      const allDone = approved === total && total > 0
      return {
        display: (
          <span className="inline-flex items-center gap-1.5 text-sm">
            {allDone ? (
              <CheckCircle2 className="size-3.5 text-[#50cd89]" />
            ) : approved > 0 ? (
              <Clock className="size-3.5 text-[#f6c000]" />
            ) : (
              <Clock className="size-3.5 text-muted-foreground" />
            )}
            <span className={allDone ? 'text-[#50cd89] font-medium' : ''}>
              {value as string}
            </span>
          </span>
        ),
      }
    }
    if (key === 'categories') {
      const cats = row.categoryList as string[]
      return {
        display: (
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-xs">{c}</span>
            ))}
          </div>
        ),
      }
    }
    if (key === 'actions') {
      return {
        display: (
          <Link
            to={`/crm/purchase-requests/${row.id}/edit`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Eye className="size-3.5" />
            View
          </Link>
        ),
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold">Purchase Requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-category PRs require approval from each Product Manager before procurement
          </p>
        </div>
        <Button onClick={() => navigate('/crm/purchase-requests/new')}>
          <Plus className="mr-1 size-4" />
          Create PR
        </Button>
      </div>

      <StatsRow stats={stats} />
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} pageSize={10} />
    </div>
  )
}

export { PurchaseRequestsPage }
export default PurchaseRequestsPage
