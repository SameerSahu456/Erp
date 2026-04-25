import { Link, useNavigate } from 'react-router-dom'
import { Plus, Store, ShoppingCart, Star, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { Badge } from '@/components/ui/badge'
import { ListPageShell } from '@/components/page'
import { mockVendors } from '@/modules/procurement/data/vendors'

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

const columns = [
  { key: 'code', label: 'Code', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'categories', label: 'Categories' },
  { key: 'rating', label: 'Rating', sortable: true, align: 'center' as const },
  { key: 'totalOrders', label: 'Orders', sortable: true, align: 'right' as const },
  { key: 'totalSpend', label: 'Spend', sortable: true, align: 'right' as const },
  { key: 'onTimeDeliveryRate', label: 'Delivery %', sortable: true, align: 'right' as const },
  { key: 'qualityScore', label: 'Quality %', sortable: true, align: 'right' as const },
  { key: 'status', label: 'Status' },
]

function buildData(onlyActive?: boolean) {
  let vendors = mockVendors
  if (onlyActive) {
    vendors = vendors.filter((v) => v.status === 'Active')
  }
  return vendors.map((v) => ({
    id: v.id,
    code: v.code,
    name: v.name,
    categories: v.categories,
    rating: v.rating,
    totalOrders: v.totalOrders,
    totalSpend: v.totalSpend,
    onTimeDeliveryRate: v.onTimeDeliveryRate,
    qualityScore: v.qualityScore,
    status: v.status,
  }))
}

const tabs: TabConfig[] = [
  { id: 'active', label: 'Active', columns, data: buildData(true) },
  { id: 'all', label: 'All', columns, data: buildData() },
]

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'name' && typeof value === 'string') {
    return {
      display: (
        <Link to={`/procurement/vendors/${row['id']}`} className="text-primary hover:underline font-medium">
          {value}
        </Link>
      ),
    }
  }
  if (key === 'categories' && Array.isArray(value)) {
    const cats = value as string[]
    const displayCats = cats.slice(0, 2)
    const remaining = cats.length - 2
    return {
      display: (
        <div className="flex flex-wrap gap-1">
          {displayCats.map((cat) => (
            <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
          ))}
          {remaining > 0 && (
            <Badge variant="outline" className="text-xs">+{remaining}</Badge>
          )}
        </div>
      ),
    }
  }
  if (key === 'rating' && typeof value === 'number') {
    return {
      display: (
        <span className="text-sm">
          {'★'.repeat(Math.round(value))}{'☆'.repeat(5 - Math.round(value))}
          <span className="ml-1 text-muted-foreground">({value})</span>
        </span>
      ),
    }
  }
  if (key === 'totalSpend' && typeof value === 'number') {
    return { display: formatCurrency(value) }
  }
  if ((key === 'onTimeDeliveryRate' || key === 'qualityScore') && typeof value === 'number') {
    return { display: `${value}%` }
  }
  if (key === 'status' && typeof value === 'string') {
    return {
      display: <StatusBadge variant={getVendorStatusVariant(value)}>{value}</StatusBadge>,
    }
  }
  return null
}

function VendorsPage() {
  const navigate = useNavigate()

  const activeVendors = mockVendors.filter((v) => v.status === 'Active')
  const activeCount = activeVendors.length
  const totalOrders = mockVendors.reduce((sum, v) => sum + v.totalOrders, 0)
  const avgRating = activeVendors.length > 0
    ? (activeVendors.reduce((sum, v) => sum + v.rating, 0) / activeVendors.length).toFixed(1)
    : '0.0'
  const totalSpend = mockVendors.reduce((sum, v) => sum + v.totalSpend, 0)

  const stats = [
    { label: 'Active Vendors', value: activeCount, icon: Store },
    { label: 'Total Orders', value: totalOrders, icon: ShoppingCart },
    { label: 'Avg Rating', value: `${avgRating}/5`, icon: Star },
    { label: 'Total Spend', value: formatShort(totalSpend), icon: IndianRupee },
  ]

  return (
    <ListPageShell
      title="Vendors"
      subtitle="Vendor relationships, performance ratings, and active spend."
      breadcrumbs={[{ label: 'Procurement' }, { label: 'Vendors' }]}
      actions={
        <Button onClick={() => navigate('/procurement/vendors/new')}>
          <Plus className="mr-1 size-4" />
          Add Vendor
        </Button>
      }
      stats={<StatsRow stats={stats} />}
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="procurement-vendors"
        onRowClick={(row) => navigate(`/procurement/vendors/${row.id}`)}
        emptyState={{
          title: 'No vendors yet',
          description: 'Add vendors to issue purchase orders and track performance.',
          action: {
            label: 'Add Vendor',
            onClick: () => navigate('/procurement/vendors/new'),
          },
        }}
      />
    </ListPageShell>
  )
}

export default VendorsPage
