import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileText, Clock, CheckCircle, IndianRupee } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'

import { mockPurchaseRequests } from '@/modules/procurement/data/purchase-requests'
import type { PRStatus } from '@/modules/procurement/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

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
  { key: 'prNumber', label: 'PR#', sortable: true },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'department', label: 'Department', sortable: true },
  { key: 'items', label: 'Items', align: 'right' as const },
  { key: 'totalEstimated', label: 'Est. Total', sortable: true, align: 'right' as const },
  { key: 'status', label: 'Status' },
  { key: 'requestedBy', label: 'Requested By', sortable: true },
  { key: 'requestedDate', label: 'Date', sortable: true },
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
  { id: 'all', label: 'All', columns, data: buildData() },
  { id: 'draft', label: 'Draft', columns, data: buildData('Draft') },
  { id: 'pending', label: 'Pending', columns, data: buildData(['Submitted', 'Under Review', 'Partially Approved']) },
  { id: 'approved', label: 'Approved', columns, data: buildData(['Approved', 'Converted to PO']) },
  { id: 'rejected', label: 'Rejected', columns, data: buildData('Rejected') },
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
    return { display: formatCurrency(value) }
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
      label: 'Total PRs',
      value: totalPRs,
      icon: FileText,
    },
    {
      label: 'Pending Approval',
      value: pendingCount,
      icon: Clock,
      ...(pendingCount > 0 && {
        className: 'border-status-warning-text/20 bg-status-warning-bg/30',
      }),
    },
    {
      label: 'Approved',
      value: approvedCount,
      icon: CheckCircle,
    },
    {
      label: 'Total Value',
      value: `₹${formatShort(totalValue)}`,
      icon: IndianRupee,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="cpt-page-title">
            Purchase Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage and track purchase requisitions
          </p>
        </div>
        <Button onClick={() => navigate('/procurement/pr/new')}>
          <Plus className="mr-1 size-4" />
          Create PR
        </Button>
      </div>

      {/* Summary Stats */}
      <StatsRow stats={stats} />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="bmt-search-lg">
            <BusinessMetricsTable
              tabs={tabs}
              cellFormatter={cellFormatter}
              pageSize={10}
              persistKey="procurement-pr"
              onRowClick={(row) => navigate(`/procurement/pr/${row['id']}`)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PurchaseRequestsPage
