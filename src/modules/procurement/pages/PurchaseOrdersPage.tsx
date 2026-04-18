import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'

import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'
import type { POStatus } from '@/modules/procurement/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

function getPOStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Sent to Vendor': return 'info'
    case 'Acknowledged': return 'info'
    case 'Partially Received': return 'warning'
    case 'Fully Received': return 'success'
    case 'Closed': return 'neutral'
    case 'Cancelled': return 'error'
    default: return 'neutral'
  }
}

const columns = [
  { key: 'poNumber', label: 'PO#', sortable: true },
  { key: 'vendor', label: 'Vendor', sortable: true },
  { key: 'items', label: 'Items', align: 'right' as const },
  { key: 'grandTotal', label: 'Total', sortable: true, align: 'right' as const },
  { key: 'status', label: 'Status', filterable: true },
  { key: 'prRef', label: 'PR Ref' },
  { key: 'expectedDelivery', label: 'Expected Delivery', sortable: true },
  { key: 'createdBy', label: 'Created By', sortable: true },
]

function buildData(filter?: POStatus | POStatus[]) {
  let pos = mockPurchaseOrders
  if (filter) {
    const filters = Array.isArray(filter) ? filter : [filter]
    pos = pos.filter((po) => filters.includes(po.status))
  }
  return pos.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    vendor: po.vendorName,
    items: po.items.length,
    grandTotal: po.grandTotal,
    status: po.status,
    prRef: po.prNumber ?? '-',
    expectedDelivery: po.expectedDelivery,
    createdBy: po.createdBy,
  }))
}

const tabs: TabConfig[] = [
  { id: 'all', label: 'All', columns, data: buildData() },
  { id: 'draft', label: 'Draft', columns, data: buildData('Draft') },
  { id: 'sent', label: 'Sent', columns, data: buildData('Sent to Vendor') },
  { id: 'in-progress', label: 'In Progress', columns, data: buildData(['Acknowledged', 'Partially Received']) },
  { id: 'received', label: 'Received', columns, data: buildData('Fully Received') },
  { id: 'closed', label: 'Closed', columns, data: buildData('Closed') },
]

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'poNumber' && typeof value === 'string') {
    return {
      display: (
        <Link to={`/procurement/po/${row['id']}`} className="text-primary hover:underline font-medium">
          {value}
        </Link>
      ),
    }
  }
  if (key === 'grandTotal' && typeof value === 'number') {
    return { display: formatCurrency(value) }
  }
  if (key === 'status' && typeof value === 'string') {
    return {
      display: <StatusBadge variant={getPOStatusVariant(value)}>{value}</StatusBadge>,
    }
  }
  if (key === 'prRef' && typeof value === 'string' && value !== '-') {
    return {
      display: (
        <span className="text-primary text-sm">{value}</span>
      ),
    }
  }
  return null
}

function PurchaseOrdersPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Purchase Orders</h2>
        <Button onClick={() => navigate('/procurement/po/new')}>
          <Plus className="mr-1 size-4" />
          Create PO
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export default PurchaseOrdersPage
