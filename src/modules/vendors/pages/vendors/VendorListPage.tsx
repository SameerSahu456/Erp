import { Plus, Building2, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Typography } from "@/components/ui/typography"
import { BusinessMetricsTable } from '@/components/common/tables/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/tables/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { StatsRow } from '@/components/common/display/StatsRow'
import { Badge } from '@/components/ui/badge'
import { ListPageShell } from '@/components/page-shells'

import { mockVendorRegistrations } from '@/modules/vendors/data/vendors'
import type { VendorOnboardingStatus } from '@/modules/vendors/types'
import { formatIST_date } from "@shared/lib/date"
import { VENDORS_STRINGS } from '../../components/vendors/vendors.strings'

const formatDate = (dateStr: string) => formatIST_date(dateStr)

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
  { key: 'vendorCode', label: VENDORS_STRINGS.list.columns.code, sortable: true },
  { key: 'companyName', label: VENDORS_STRINGS.list.columns.companyName, sortable: true },
  { key: 'companyType', label: VENDORS_STRINGS.list.columns.type, sortable: true },
  { key: 'categories', label: VENDORS_STRINGS.list.columns.categories },
  { key: 'contact', label: VENDORS_STRINGS.list.columns.contact, sortable: true },
  { key: 'city', label: VENDORS_STRINGS.list.columns.city, sortable: true },
  { key: 'status', label: VENDORS_STRINGS.list.columns.status, sortable: true, filterable: true },
  { key: 'rating', label: VENDORS_STRINGS.list.columns.rating, sortable: true, align: 'center' as const },
  { key: 'createdAt', label: VENDORS_STRINGS.list.columns.created, sortable: true },
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
    label: VENDORS_STRINGS.list.tabs.active,
    columns,
    data: buildRows((v) => v.status === 'Active'),
  },
  {
    id: 'pending',
    label: VENDORS_STRINGS.list.tabs.pending,
    columns,
    data: buildRows((v) =>
      ['Submitted', 'Under Review', 'Documents Pending', 'Draft', 'Approved'].includes(v.status)
    ),
  },
  {
    id: 'all',
    label: VENDORS_STRINGS.list.tabs.all,
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
            <Typography variant="helper" asChild><span>+{cats.length - 2}</span></Typography>
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
          {VENDORS_STRINGS.starIcon}{' '}{value}
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
    <ListPageShell
      title={VENDORS_STRINGS.list.title}
      subtitle={VENDORS_STRINGS.list.subtitle}
      breadcrumbs={[{ label: VENDORS_STRINGS.list.breadcrumb }]}
      actions={
        <Button onClick={() => navigate('/vendors/new')}>
          <Plus className="mr-1 size-4" />
          {VENDORS_STRINGS.list.registerVendor}
        </Button>
      }
      stats={
        <StatsRow
          stats={[
            { label: VENDORS_STRINGS.list.stats.totalVendors, value: totalVendors, icon: Building2 },
            { label: VENDORS_STRINGS.list.stats.active, value: activeCount, icon: CheckCircle },
            { label: VENDORS_STRINGS.list.stats.pendingApproval, value: pendingCount, icon: Clock },
            { label: VENDORS_STRINGS.list.stats.suspended, value: suspendedCount, icon: AlertTriangle, className: 'text-destructive' },
          ]}
        />
      }
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="vendors"
        onRowClick={(row) => navigate(`/vendors/${row.id}`)}
        emptyState={{
          title: VENDORS_STRINGS.list.empty.title,
          description: VENDORS_STRINGS.list.empty.description,
          action: {
            label: VENDORS_STRINGS.list.empty.action,
            onClick: () => navigate('/vendors/new'),
          },
        }}
      />
    </ListPageShell>
  )
}

export default VendorListPage
