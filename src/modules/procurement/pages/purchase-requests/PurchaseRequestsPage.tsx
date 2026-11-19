import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileText, Clock, CheckCircle, IndianRupee } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BusinessMetricsTable } from '@/components/common/tables/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/tables/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { StatsRow } from '@/components/common/display/StatsRow'
import { ListPageShell } from '@/components/page-shells'

import { usePermission } from '@shared/rbac'

import { mockPurchaseRequests } from '@/modules/procurement/data/purchase-requests'
import type { PRStatus } from '@/modules/procurement/types'
import { procurementCan } from '../../permissions'
import { formatINRCompact } from "@/lib/currency";
import { PR_STRINGS } from '../../components/purchase-requests/purchase-requests.strings'


const formatShort = (v: number) => {
  if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
  return String(v)
}

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

const columns = [
  { key: 'prNumber', label: PR_STRINGS.list.columns.prNumber, sortable: true },
  { key: 'title', label: PR_STRINGS.list.columns.title, sortable: true },
  { key: 'department', label: PR_STRINGS.list.columns.department, sortable: true },
  { key: 'items', label: PR_STRINGS.list.columns.items, align: 'right' as const },
  { key: 'totalEstimated', label: PR_STRINGS.list.columns.totalEstimated, sortable: true, align: 'right' as const },
  { key: 'status', label: PR_STRINGS.list.columns.status },
  { key: 'requestedBy', label: PR_STRINGS.list.columns.requestedBy, sortable: true },
  { key: 'requestedDate', label: PR_STRINGS.list.columns.requestedDate, sortable: true },
]

function buildData(filter?: PRStatus | PRStatus[]) {
  let prs = mockPurchaseRequests
  if (filter) {
    const filters = Array.isArray(filter) ? filter : [filter]
    prs = prs.filter((pr) => filters.includes(pr.status))
  }
  return prs.map((pr) => ({
    id: pr.id,
    prNumber: pr.prNumber,
    title: pr.title,
    department: pr.department,
    items: pr.items.length,
    totalEstimated: pr.totalEstimated,
    status: pr.status,
    requestedBy: pr.requestedBy,
    requestedDate: pr.requestedDate,
  }))
}

const tabs: TabConfig[] = [
  { id: 'all', label: PR_STRINGS.list.tabs.all, columns, data: buildData() },
  { id: 'draft', label: PR_STRINGS.list.tabs.draft, columns, data: buildData('Draft') },
  { id: 'pending', label: PR_STRINGS.list.tabs.pending, columns, data: buildData(['Submitted', 'Under Review', 'Partially Approved']) },
  { id: 'approved', label: PR_STRINGS.list.tabs.approved, columns, data: buildData(['Approved', 'Converted to PO']) },
  { id: 'rejected', label: PR_STRINGS.list.tabs.rejected, columns, data: buildData('Rejected') },
]

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'prNumber' && typeof value === 'string') {
    return {
      display: (
        <Link to={`/procurement/pr/${row['id']}`} className="text-primary hover:underline font-medium">
          {value}
        </Link>
      ),
    }
  }
  if (key === 'totalEstimated' && typeof value === 'number') {
    return { display: formatINRCompact(value) }
  }
  if (key === 'status' && typeof value === 'string') {
    return {
      display: <StatusBadge variant={getPRStatusVariant(value)}>{value}</StatusBadge>,
    }
  }
  return null
}

function PurchaseRequestsPage() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canWrite = can(procurementCan.writePr)

  const totalPRs = mockPurchaseRequests.length
  const pendingCount = mockPurchaseRequests.filter((pr) =>
    ['Submitted', 'Under Review', 'Partially Approved'].includes(pr.status)
  ).length
  const approvedCount = mockPurchaseRequests.filter((pr) =>
    ['Approved', 'Converted to PO'].includes(pr.status)
  ).length
  const totalValue = mockPurchaseRequests.reduce((sum, pr) => sum + pr.totalEstimated, 0)

  const stats = [
    {
      label: PR_STRINGS.list.stats.totalPRs,
      value: totalPRs,
      icon: FileText,
      accent: 'primary' as const,
    },
    {
      label: PR_STRINGS.list.stats.pendingApproval,
      value: pendingCount,
      icon: Clock,
      accent: 'warning' as const,
      ...(pendingCount > 0 && {
        className: 'border-status-warning-text/20 bg-status-warning-bg/30',
      }),
    },
    {
      label: PR_STRINGS.list.stats.approved,
      value: approvedCount,
      icon: CheckCircle,
      accent: 'success' as const,
    },
    {
      label: PR_STRINGS.list.stats.totalValue,
      value: `₹${formatShort(totalValue)}`,
      icon: IndianRupee,
      accent: 'teal' as const,
    },
  ]

  return (
    <ListPageShell
      title={PR_STRINGS.list.title}
      subtitle={PR_STRINGS.list.subtitle}
      breadcrumbs={[{ label: PR_STRINGS.list.breadcrumbs.procurement }, { label: PR_STRINGS.list.breadcrumbs.purchaseRequests }]}
      actions={
        canWrite ? (
          <Button onClick={() => navigate('/procurement/pr/new')}>
            <Plus className="mr-1 size-4" />
            {PR_STRINGS.list.createPR}
          </Button>
        ) : undefined
      }
      stats={<StatsRow stats={stats} />}
    >
      <div className="bmt-search-lg">
        <BusinessMetricsTable
          tabs={tabs}
          cellFormatter={cellFormatter}
          pageSize={10}
          persistKey="procurement-pr"
          onRowClick={(row) => navigate(`/procurement/pr/${row['id']}`)}
          emptyState={{
            title: PR_STRINGS.list.empty.title,
            description: PR_STRINGS.list.empty.description,
            action: canWrite
              ? {
                  label: PR_STRINGS.list.empty.action,
                  onClick: () => navigate('/procurement/pr/new'),
                }
              : undefined,
          }}
        />
      </div>
    </ListPageShell>
  )
}

export default PurchaseRequestsPage
