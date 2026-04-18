import { Plus, Building2, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { Badge } from '@/components/ui/badge'

import { mockVendorRegistrations } from '@/modules/vendors/data/vendors'
import type { VendorOnboardingStatus } from '@/modules/vendors/types'

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getStatusVariant(status: VendorOnboardingStatus): StatusBadgeVariant {
  switch (status) {
    case 'Active':
      return 'success'
    case 'Suspended':
    case 'Blacklisted':
      return 'error'
    case 'Under Review':
      return 'warning'
    default:
      return 'info'
  }
}

const columns = [
  { key: 'vendorCode', label: 'Code', sortable: true },
  { key: 'companyName', label: 'Company Name', sortable: true },
  { key: 'companyType', label: 'Type', sortable: true },
  { key: 'categories', label: 'Categories' },
  { key: 'contact', label: 'Contact', sortable: true },
  { key: 'city', label: 'City', sortable: true },
  { key: 'status', label: 'Status', sortable: true, filterable: true },
  { key: 'rating', label: 'Rating', sortable: true, align: 'center' as const },
  { key: 'createdAt', label: 'Created', sortable: true },
]

function buildRows(filter?: (v: typeof mockVendorRegistrations[number]) => boolean) {
  const vendors = filter ? mockVendorRegistrations.filter(filter) : mockVendorRegistrations
  return vendors.map((v) => ({
    id: v.id,
    vendorCode: v.vendorCode,
    companyName: v.companyName,
    companyType: v.companyType,
    categories: v.productCategories,
    contact: v.primaryContact,
    city: v.city,
    status: v.status,
    rating: v.status === 'Active' ? (4 + Math.random()).toFixed(1) : '-',
    createdAt: v.createdAt,
  }))
}

const tabs: TabConfig[] = [
  {
    id: 'active',
    label: 'Active',
    columns,
    data: buildRows((v) => v.status === 'Active'),
  },
  {
    id: 'pending',
    label: 'Pending',
    columns,
    data: buildRows((v) =>
      ['Submitted', 'Under Review', 'Documents Pending', 'Draft', 'Approved'].includes(v.status)
    ),
  },
  {
    id: 'all',
    label: 'All',
    columns,
    data: buildRows(),
  },
]

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'companyName' && typeof value === 'string') {
    return {
      display: (
        <Link to={`/vendors/${row['id']}`} className="text-primary hover:underline font-medium">
          {value}
        </Link>
      ),
    }
  }
  if (key === 'companyType' && typeof value === 'string') {
    return {
      display: <Badge variant="secondary">{value}</Badge>,
    }
  }
  if (key === 'categories' && Array.isArray(value)) {
    const cats = value as string[]
    return {
      display: (
        <div className="flex items-center gap-1">
          {cats.slice(0, 2).map((c) => (
            <Badge key={c} variant="outline" className="text-[10px]">
              {c}
            </Badge>
          ))}
          {cats.length > 2 && (
            <span className="text-xs text-muted-foreground">+{cats.length - 2}</span>
          )}
        </div>
      ),
    }
  }
  if (key === 'status' && typeof value === 'string') {
    return {
      display: (
        <StatusBadge variant={getStatusVariant(value as VendorOnboardingStatus)}>
          {value}
        </StatusBadge>
      ),
    }
  }
  if (key === 'rating' && typeof value === 'string') {
    if (value === '-') return { display: <span className="text-muted-foreground">-</span> }
    return {
      display: (
        <span className="text-sm">
          <span className="text-[#f6c000]">&#9733;</span> {value}
        </span>
      ),
    }
  }
  if (key === 'createdAt' && typeof value === 'string') {
    return { display: formatDate(value) }
  }
  return null
}

function VendorListPage() {
  const navigate = useNavigate()

  const totalVendors = mockVendorRegistrations.length
  const activeCount = mockVendorRegistrations.filter((v) => v.status === 'Active').length
  const pendingCount = mockVendorRegistrations.filter((v) =>
    ['Submitted', 'Under Review', 'Documents Pending'].includes(v.status)
  ).length
  const suspendedCount = mockVendorRegistrations.filter((v) => v.status === 'Suspended').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Vendor Management</h2>
        <Button onClick={() => navigate('/vendors/new')}>
          <Plus className="mr-1 size-4" />
          Register Vendor
        </Button>
      </div>

      <StatsRow
        stats={[
          { label: 'Total Vendors', value: totalVendors, icon: Building2 },
          { label: 'Active', value: activeCount, icon: CheckCircle },
          { label: 'Pending Approval', value: pendingCount, icon: Clock },
          { label: 'Suspended', value: suspendedCount, icon: AlertTriangle, className: 'text-destructive' },
        ]}
      />

      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export default VendorListPage
