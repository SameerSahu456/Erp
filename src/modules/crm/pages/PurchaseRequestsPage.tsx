import { Plus } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'

import { purchaseRequests } from '@/modules/crm/data/purchase-requests'

const statusVariant: Record<string, StatusBadgeVariant> = {
  Draft: 'neutral',
  Submitted: 'info',
  'Under Review': 'warning',
  'Pricing Confirmed': 'success',
  Approved: 'success',
  Rejected: 'error',
}

const prTab: TabConfig = {
  id: 'purchase-requests',
  label: 'All Purchase Requests',
  columns: [
    { key: 'prNumber', label: 'PR #', sortable: true },
    { key: 'salesOrderNumber', label: 'Linked SO', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'itemsCount', label: 'Items', sortable: true, align: 'right' },
    { key: 'requestedBy', label: 'Requested By', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
  ],
  data: purchaseRequests.map((pr) => ({
    id: pr.id,
    prNumber: pr.prNumber,
    salesOrderNumber: pr.salesOrderNumber ?? '-',
    status: pr.status,
    itemsCount: pr.items.length,
    requestedBy: pr.requestedBy,
    createdAt: pr.createdAt,
  })),
}

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'prNumber' && typeof value === 'string') {
    return {
      display: (
        <Link
          to={`/crm/purchase-requests/${row['id']}/edit`}
          className="text-primary hover:underline font-medium"
        >
          {value}
        </Link>
      ),
    }
  }
  if (key === 'status' && typeof value === 'string') {
    const variant = statusVariant[value] ?? 'neutral'
    return {
      display: <StatusBadge variant={variant}>{value}</StatusBadge>,
    }
  }
  // Row-level styling
  const status = row['status']
  if (status === 'Rejected') {
    return { className: 'text-destructive' }
  }
  if (status === 'Approved' || status === 'Pricing Confirmed') {
    return { className: 'text-status-success-text' }
  }
  return null
}

function PurchaseRequestsPage() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Purchase Requests</h2>
        <Button onClick={() => navigate('/crm/purchase-requests/new')}>
          <Plus className="mr-1 size-4" />
          Create PR
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={[prTab]}
        cellFormatter={cellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export { PurchaseRequestsPage }

export default PurchaseRequestsPage
