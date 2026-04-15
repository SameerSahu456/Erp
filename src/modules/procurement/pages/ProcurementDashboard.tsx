import { Link } from 'react-router-dom'
import { FileText, ShoppingCart, Clock, IndianRupee } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/common/StatsRow'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'

import { mockPurchaseRequests } from '@/modules/procurement/data/purchase-requests'
import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

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

// Stats
const openPRs = mockPurchaseRequests.filter(
  (pr) => pr.status !== 'Rejected' && pr.status !== 'Converted to PO'
).length
const activePOs = mockPurchaseOrders.filter(
  (po) => po.status !== 'Closed' && po.status !== 'Cancelled'
).length
const pendingApprovals = mockPurchaseRequests.filter(
  (pr) => pr.status === 'Submitted' || pr.status === 'Under Review' || pr.status === 'Partially Approved'
).length
const totalSpendThisMonth = mockPurchaseOrders
  .filter((po) => po.status !== 'Draft' && po.status !== 'Cancelled')
  .reduce((sum, po) => sum + po.grandTotal, 0)

// Recent PRs
const recentPRs = [...mockPurchaseRequests]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5)

// PO Status Table
const poTableData = mockPurchaseOrders.map((po) => ({
  id: po.id,
  poNumber: po.poNumber,
  vendor: po.vendorName,
  status: po.status,
  amount: po.grandTotal,
  expectedDelivery: po.expectedDelivery,
}))

const poTab: TabConfig = {
  id: 'po-overview',
  label: 'Purchase Orders',
  columns: [
    { key: 'poNumber', label: 'PO#', sortable: true },
    { key: 'vendor', label: 'Vendor', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'amount', label: 'Amount', sortable: true, align: 'right' },
    { key: 'expectedDelivery', label: 'Expected Delivery', sortable: true },
  ],
  data: poTableData,
}

const poCellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'poNumber' && typeof value === 'string') {
    return {
      display: (
        <Link to={`/procurement/po/${row['id']}`} className="text-primary hover:underline font-medium">
          {value}
        </Link>
      ),
    }
  }
  if (key === 'status' && typeof value === 'string') {
    return {
      display: <StatusBadge variant={getPOStatusVariant(value)}>{value}</StatusBadge>,
    }
  }
  if (key === 'amount' && typeof value === 'number') {
    return { display: formatCurrency(value) }
  }
  return null
}

// Pending approvals
const pendingPRs = mockPurchaseRequests.filter(
  (pr) => pr.status === 'Submitted' || pr.status === 'Under Review' || pr.status === 'Partially Approved'
)

function ProcurementDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-semibold">Procurement Dashboard</h2>

      <StatsRow
        stats={[
          {
            label: 'Open PRs',
            value: openPRs,
            icon: FileText,
            trend: { value: 5, isPositive: true },
          },
          {
            label: 'Active POs',
            value: activePOs,
            icon: ShoppingCart,
            trend: { value: 12, isPositive: true },
          },
          {
            label: 'Pending Approvals',
            value: pendingApprovals,
            icon: Clock,
          },
          {
            label: 'Total Spend This Month',
            value: formatCurrency(totalSpendThisMonth),
            icon: IndianRupee,
            trend: { value: 8, isPositive: true },
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Purchase Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchase Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPRs.map((pr) => (
                <Link
                  key={pr.id}
                  to={`/procurement/pr/${pr.id}`}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">{pr.prNumber}</span>
                      <StatusBadge variant={getPRStatusVariant(pr.status)}>{pr.status}</StatusBadge>
                    </div>
                    <p className="text-sm">{pr.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {pr.requestedBy} &middot; {pr.requestedDate}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PO Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>PO Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <BusinessMetricsTable
              tabs={[poTab]}
              cellFormatter={poCellFormatter}
              pageSize={5}
            />
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingPRs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPRs.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/procurement/pr/${pr.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {pr.prNumber}
                      </Link>
                      <StatusBadge variant={getPRStatusVariant(pr.status)}>
                        {pr.status}
                      </StatusBadge>
                    </div>
                    <p className="text-sm">{pr.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {pr.requestedBy} &middot; {pr.department} &middot; {formatCurrency(pr.totalEstimated)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Reject
                    </Button>
                    <Button size="sm">Approve</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ProcurementDashboard
