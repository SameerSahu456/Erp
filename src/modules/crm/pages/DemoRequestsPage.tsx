import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { StatsRow, type StatCardData } from '@/components/common/StatsRow'
import { ListPageShell } from '@/components/page'
import { demoRequests } from '../data/demo-requests'
import type { DemoRequestStatus } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_VARIANT: Record<DemoRequestStatus, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  'Draft': 'neutral',
  'Submitted': 'info',
  'Pending PM Approval': 'warning',
  'PM Approved': 'success',
  'PM Rejected': 'error',
  'Dispatch Created': 'info',
  'Dispatched': 'info',
  'With Customer': 'warning',
  'Return Overdue': 'error',
  'Returned': 'success',
  'Closed': 'neutral',
}

const columns = [
  { key: 'demoNumber', label: 'Demo #', sortable: true },
  { key: 'account', label: 'Account', sortable: true },
  { key: 'contact', label: 'Contact' },
  { key: 'items', label: 'Items', align: 'right' as const },
  { key: 'productManager', label: 'PM' },
  { key: 'dispatchDate', label: 'Dispatched' },
  { key: 'returnDate', label: 'Return By', sortable: true },
  { key: 'overdue', label: 'Overdue' },
  { key: 'status', label: 'Status', filterable: true },
  { key: 'actions', label: '' },
]

function DemoRequestsPage() {
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      demoRequests.map((d) => ({
        id: d.id,
        demoNumber: d.demoNumber,
        account: d.accountName,
        contact: d.contactName,
        items: d.items.reduce((s, i) => s + i.qty, 0),
        productManager: d.productManager,
        dispatchDate: d.dispatchDate ? formatDate(d.dispatchDate) : '—',
        returnDate: formatDate(d.expectedReturnDate),
        returnDateRaw: d.expectedReturnDate,
        overdue: d.isOverdue,
        overdueByDays: d.overdueByDays ?? 0,
        status: d.status,
      })),
    []
  )

  const overdue = useMemo(() => rows.filter((r) => r.overdue), [rows])
  const withCustomer = useMemo(
    () => rows.filter((r) => ['With Customer', 'Dispatched', 'Return Overdue'].includes(r.status)),
    [rows]
  )
  const pendingApproval = useMemo(
    () => rows.filter((r) => r.status === 'Pending PM Approval'),
    [rows]
  )

  const stats: StatCardData[] = [
    { label: 'Total Demos', value: rows.length, accent: 'primary' },
    { label: 'With Customer', value: withCustomer.length, accent: 'info' },
    { label: 'Pending Approval', value: pendingApproval.length, accent: 'warning' },
    { label: 'Overdue Returns', value: overdue.length, accent: overdue.length > 0 ? 'danger' : 'primary' },
  ]

  const tabs: TabConfig[] = [
    { id: 'all', label: `All (${rows.length})`, columns, data: rows },
    { id: 'active', label: `Active (${withCustomer.length})`, columns, data: withCustomer },
    { id: 'overdue', label: `Overdue (${overdue.length})`, columns, data: overdue },
    { id: 'pending', label: `Pending Approval (${pendingApproval.length})`, columns, data: pendingApproval },
  ]

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'demoNumber') {
      return {
        display: (
          <Link to={`/crm/demo-requests/${row.id}`} className="font-medium text-primary hover:underline">
            {value as string}
          </Link>
        ),
      }
    }
    if (key === 'status') {
      const s = value as DemoRequestStatus
      return {
        display: <StatusBadge variant={STATUS_VARIANT[s]}>{s}</StatusBadge>,
      }
    }
    if (key === 'overdue') {
      const isOverdue = value as boolean
      const days = row.overdueByDays as number
      if (!isOverdue) return { display: <span className="text-muted-foreground">—</span> }
      return {
        display: (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#f1416c]">
            <AlertTriangle className="size-3.5" />
            {days}d overdue
          </span>
        ),
      }
    }
    if (key === 'returnDate') {
      const isOverdue = row.overdue as boolean
      return {
        display: (
          <span className={isOverdue ? 'font-medium text-[#f1416c]' : ''}>
            {value as string}
          </span>
        ),
      }
    }
    if (key === 'actions') {
      return {
        display: (
          <Link
            to={`/crm/demo-requests/${row.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Eye className="size-3.5" />
            View
          </Link>
        ),
      }
    }
    return null
  }

  return (
    <ListPageShell
      title="Demo Requests"
      subtitle="Product demos for prospects — PM approval, dispatch, and return tracking."
      breadcrumbs={[{ label: 'CRM' }, { label: 'Demo Requests' }]}
      actions={
        <Button onClick={() => navigate('/crm/demo-requests/new')}>
          <Plus className="size-4" data-icon="inline-start" />
          New Demo Request
        </Button>
      }
      stats={<StatsRow stats={stats} />}
      toolbar={
        overdue.length > 0 ? (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
          >
            <AlertTriangle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-destructive">
                {overdue.length} demo return{overdue.length > 1 ? 's' : ''} overdue
              </p>
              <p className="truncate text-xs text-destructive/80">
                {overdue.map((r) => `${r.demoNumber} (${r.account})`).join(', ')}
              </p>
            </div>
          </div>
        ) : undefined
      }
    >
      <BusinessMetricsTable
        className="bmt-search-wide"
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="crm-demo-requests"
        onRowClick={(row) => navigate(`/crm/demo-requests/${row.id}`)}
        emptyState={{
          title: 'No demo requests yet',
          description: 'Create a demo request to ship eval units to a prospect.',
          action: {
            label: 'New Demo Request',
            onClick: () => navigate('/crm/demo-requests/new'),
          },
        }}
      />
    </ListPageShell>
  )
}

export { DemoRequestsPage }
export default DemoRequestsPage
