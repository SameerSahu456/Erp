import { Link, useNavigate } from 'react-router-dom'
import { Plus, ShoppingCart, Truck, PackageCheck, IndianRupee } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'

import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'
import type { POStatus } from '@/modules/procurement/types'

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

/* ---------- computed stats ---------- */
const totalPOs = mockPurchaseOrders.length

const inTransitStatuses: POStatus[] = ['Sent to Vendor', 'Acknowledged', 'Partially Received']
const inTransitCount = mockPurchaseOrders.filter((po) => inTransitStatuses.includes(po.status)).length

const fullyReceivedCount = mockPurchaseOrders.filter((po) => po.status === 'Fully Received').length

const totalOrderValue = mockPurchaseOrders.reduce((sum, po) => sum + po.grandTotal, 0)

function PurchaseOrdersPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="cpt-page-title">Purchase Orders</h2>
          <p className="text-sm text-muted-foreground">Track and manage vendor purchase orders</p>
        </div>
        <Button onClick={() => navigate('/procurement/po/new')}>
          <Plus className="mr-1 size-4" />
          Create PO
        </Button>
      </div>

      {/* Summary Stats */}
      <StatsRow
        stats={[
          { label: 'Total POs', value: totalPOs, icon: ShoppingCart },
          { label: 'In Transit', value: inTransitCount, icon: Truck },
          { label: 'Fully Received', value: fullyReceivedCount, icon: PackageCheck },
          { label: 'Total Order Value', value: formatShort(totalOrderValue), icon: IndianRupee },
        ]}
      />

      {/* Table */}
      <Card>
        <CardContent>
          <BusinessMetricsTable
            tabs={tabs}
            cellFormatter={cellFormatter}
            pageSize={10}
            persistKey="procurement-po"
            onRowClick={(row) => navigate(`/procurement/po/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default PurchaseOrdersPage
