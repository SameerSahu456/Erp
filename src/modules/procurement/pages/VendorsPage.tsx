import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'

import { mockVendors } from '@/modules/procurement/data/vendors'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Vendors</h2>
        <Button onClick={() => navigate('/procurement/vendors/new')}>
          <Plus className="mr-1 size-4" />
          Add Vendor
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

export default VendorsPage
