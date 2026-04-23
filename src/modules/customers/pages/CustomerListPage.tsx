import { Plus, Building2, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { Badge } from '@/components/ui/badge'

import { mockCustomerRegistrations } from '@/modules/customers/data/customers'
import type { CustomerOnboardingStatus } from '@/modules/customers/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

function getStatusVariant(status: CustomerOnboardingStatus): StatusBadgeVariant {
  switch (status) {
    case 'Active':
      return 'success'
    case 'Inactive':
    case 'Churned':
      return 'error'
    case 'Onboarding':
    case 'KYC Pending':
      return 'warning'
    default:
      return 'info'
  }
}

const columns = [
  { key: 'customerCode', label: 'Code', sortable: true },
  { key: 'companyName', label: 'Company Name', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'industry', label: 'Industry', sortable: true },
  { key: 'accountManager', label: 'Account Manager', sortable: true },
  { key: 'outstanding', label: 'Outstanding', sortable: true, align: 'right' as const },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'city', label: 'City', sortable: true },
]

function buildRows(filter?: (c: typeof mockCustomerRegistrations[number]) => boolean) {
  const customers = filter ? mockCustomerRegistrations.filter(filter) : mockCustomerRegistrations
  return customers.map((c) => ({
    id: c.id,
    customerCode: c.customerCode,
    companyName: c.companyName,
    type: c.type,
    industry: c.industry ?? '-',
    accountManager: c.accountManager,
    outstanding: c.outstandingBalance,
    overdueAmount: c.overdueAmount,
    status: c.status,
    city: c.billingCity,
  }))
}

const tabs: TabConfig[] = [
  {
    id: 'active',
    label: 'Active',
    columns,
    data: buildRows((c) => c.status === 'Active'),
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    columns,
    data: buildRows((c) => ['Onboarding', 'KYC Pending', 'Lead', 'Prospect'].includes(c.status)),
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
        <Link to={`/customers/${row['id']}`} className="text-primary hover:underline font-medium">
          {value}
        </Link>
      ),
    }
  }
  if (key === 'type' && typeof value === 'string') {
    return {
      display: (
        <Badge variant={value === 'Company' ? 'secondary' : 'outline'}>
          {value}
        </Badge>
      ),
    }
  }
  if (key === 'outstanding' && typeof value === 'number') {
    const overdue = row['overdueAmount'] as number
    return {
      display: (
        <span className={overdue > 0 ? 'text-destructive font-medium' : ''}>
          {formatCurrency(value)}
        </span>
      ),
    }
  }
  if (key === 'status' && typeof value === 'string') {
    return {
      display: (
        <StatusBadge variant={getStatusVariant(value as CustomerOnboardingStatus)}>
          {value}
        </StatusBadge>
      ),
    }
  }
  return null
}

function CustomerListPage() {
  const navigate = useNavigate()

  const totalCustomers = mockCustomerRegistrations.length
  const activeCount = mockCustomerRegistrations.filter((c) => c.status === 'Active').length
  const onboardingCount = mockCustomerRegistrations.filter((c) =>
    ['Onboarding', 'KYC Pending'].includes(c.status)
  ).length
  const overdueBalance = mockCustomerRegistrations
    .filter((c) => c.overdueAmount > 0)
    .reduce((sum, c) => sum + c.overdueAmount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Customer Management</h2>
        <Button onClick={() => navigate('/customers/new')}>
          <Plus className="mr-1 size-4" />
          Register Customer
        </Button>
      </div>

      <StatsRow
        stats={[
          { label: 'Total Customers', value: totalCustomers, icon: Building2 },
          { label: 'Active', value: activeCount, icon: CheckCircle },
          { label: 'Onboarding', value: onboardingCount, icon: Clock },
          {
            label: 'Overdue Balance',
            value: formatCurrency(overdueBalance),
            icon: AlertTriangle,
            className: 'text-destructive',
          },
        ]}
      />

      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="customers"
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
      />
    </div>
  )
}

export default CustomerListPage
