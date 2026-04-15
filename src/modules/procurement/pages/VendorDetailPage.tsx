import { useParams, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { DetailTabs } from '@/modules/crm/components/DetailTabs'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'

import { mockVendors } from '@/modules/procurement/data/vendors'
import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getVendorStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Active': return 'success'
    case 'Inactive': return 'neutral'
    case 'Pending Approval': return 'warning'
    case 'Blacklisted': return 'error'
    case 'Suspended': return 'error'
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

function VendorDetailPage() {
  const { id } = useParams<{ id: string }>()

  const vendor = mockVendors.find((v) => v.id === id)

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">Vendor not found</h2>
        <p className="text-sm text-muted-foreground">
          The vendor you are looking for does not exist.
        </p>
        <Button variant="outline" render={<Link to="/procurement/vendors" />}>
          Back to Vendors
        </Button>
      </div>
    )
  }

  const vendorPOs = mockPurchaseOrders.filter((po) => po.vendorId === vendor.id)
  const avgOrderValue = vendorPOs.length > 0
    ? vendorPOs.reduce((sum, po) => sum + po.grandTotal, 0) / vendorPOs.length
    : 0

  // Overview tab
  const overviewContent = (
    <div className="space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Contact Person</dt>
              <dd className="text-sm">{vendor.contactPerson}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="text-sm">{vendor.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="text-sm">{vendor.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">City</dt>
              <dd className="text-sm">{vendor.city}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Address</dt>
              <dd className="text-sm">{vendor.address}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Tax & Banking</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">GST Number</dt>
              <dd className="text-sm">{vendor.gstNumber ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">PAN Number</dt>
              <dd className="text-sm">{vendor.panNumber ?? '-'}</dd>
            </div>
            {vendor.bankDetails && (
              <>
                <div>
                  <dt className="text-xs text-muted-foreground">Bank</dt>
                  <dd className="text-sm">{vendor.bankDetails.bankName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Account</dt>
                  <dd className="text-sm">{vendor.bankDetails.accountNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">IFSC</dt>
                  <dd className="text-sm">{vendor.bankDetails.ifscCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Account Name</dt>
                  <dd className="text-sm">{vendor.bankDetails.accountName}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-xs text-muted-foreground">Payment Terms</dt>
              <dd className="text-sm">{vendor.paymentTerms}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )

  // Performance tab
  const performanceContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Rating</p>
            <p className="text-2xl font-bold tabular-nums">{vendor.rating}/5</p>
            <p className="text-sm">{'★'.repeat(Math.round(vendor.rating))}{'☆'.repeat(5 - Math.round(vendor.rating))}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">On-Time Delivery</p>
            <p className="text-2xl font-bold tabular-nums">{vendor.onTimeDeliveryRate}%</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Quality Score</p>
            <p className="text-2xl font-bold tabular-nums">{vendor.qualityScore}%</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Avg Order Value</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(avgOrderValue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Performance Charts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">Performance charts coming soon</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Delivery trends, quality history, and spend analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Orders tab
  const poColumns = [
    { key: 'poNumber', label: 'PO#', sortable: true },
    { key: 'grandTotal', label: 'Total', sortable: true, align: 'right' as const },
    { key: 'status', label: 'Status' },
    { key: 'expectedDelivery', label: 'Expected Delivery', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
  ]

  const poData = vendorPOs.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    grandTotal: po.grandTotal,
    status: po.status,
    expectedDelivery: po.expectedDelivery,
    createdAt: po.createdAt,
  }))

  const poTab: TabConfig = {
    id: 'vendor-pos',
    label: `Orders (${vendorPOs.length})`,
    columns: poColumns,
    data: poData,
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
    if (key === 'grandTotal' && typeof value === 'number') {
      return { display: formatCurrency(value) }
    }
    if (key === 'status' && typeof value === 'string') {
      return {
        display: <StatusBadge variant={getPOStatusVariant(value)}>{value}</StatusBadge>,
      }
    }
    return null
  }

  const ordersContent = (
    <BusinessMetricsTable
      tabs={[poTab]}
      cellFormatter={poCellFormatter}
      pageSize={10}
    />
  )

  // Invoices tab
  const invoicesContent = (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm text-muted-foreground">No purchase invoices available</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Purchase invoices from this vendor will appear here.
      </p>
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    { id: 'performance', label: 'Performance', content: performanceContent },
    { id: 'orders', label: 'Orders', count: vendorPOs.length, content: ordersContent },
    { id: 'invoices', label: 'Invoices', content: invoicesContent },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={vendor.name}
        subtitle={vendor.code}
        status={{ label: vendor.status, variant: getVendorStatusVariant(vendor.status) }}
        backHref="/procurement/vendors"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <DetailTabs tabs={tabs} defaultTab="overview" />
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Total Orders</dt>
                  <dd className="text-sm font-medium">{vendor.totalOrders}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Total Spend</dt>
                  <dd className="text-sm font-medium">{formatCurrency(vendor.totalSpend)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Avg Order Value</dt>
                  <dd className="text-sm font-medium">{formatCurrency(avgOrderValue)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">On-Time %</dt>
                  <dd className="text-sm font-medium">{vendor.onTimeDeliveryRate}%</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">Since</dt>
                  <dd className="text-sm">{formatDate(vendor.createdAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {vendor.categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default VendorDetailPage
