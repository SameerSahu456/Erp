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
  { key: 'status', label: 'Status' },
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
    { label: 'Total Demos', value: rows.length },
    { label: 'With Customer', value: withCustomer.length },
    { label: 'Pending Approval', value: pendingApproval.length },
    { label: 'Overdue Returns', value: overdue.length, variant: overdue.length > 0 ? 'error' : undefined },
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
          <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
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
          <span className={isOverdue ? 'font-medium text-red-600' : ''}>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Demo Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Request product demos for prospects &mdash; PM approval, dispatch, return tracking
          </p>
        </div>
        <Button onClick={() => navigate('/crm/demo-requests/new')}>
          <Plus className="size-4" data-icon="inline-start" />
          New Demo Request
        </Button>
      </div>

      {/* Overdue alert banner */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {overdue.length} demo return{overdue.length > 1 ? 's' : ''} overdue
            </p>
            <p className="text-xs text-red-600">
              {overdue.map((r) => `${r.demoNumber} (${r.account})`).join(', ')}
            </p>
          </div>
        </div>
      )}

      <StatsRow stats={stats} />
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />
    </div>
  )
}

export { DemoRequestsPage }
export default DemoRequestsPage
