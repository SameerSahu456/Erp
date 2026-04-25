import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { StatsRow, type StatCardData } from '@/components/common/StatsRow'
import { ListPageShell } from '@/components/page'
import { mockWorkOrders } from '../data/work-orders'
import type { WorkOrderStatus, WorkOrderType } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const TYPE_LABELS: Record<WorkOrderType, string> = {
  SALES: 'Sales',
  RENTAL: 'Rental',
  INTERNAL: 'Internal',
  DEMO: 'Demo',
}

const TYPE_VARIANT: Record<WorkOrderType, 'success' | 'warning' | 'info' | 'neutral'> = {
  SALES: 'info',
  RENTAL: 'warning',
  INTERNAL: 'neutral',
  DEMO: 'success',
}

const STATUS_VARIANT: Record<WorkOrderStatus, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  'Draft': 'neutral',
  'Pending Approval': 'warning',
  'Approved': 'info',
  'Component Picking': 'warning',
  'Components Picked': 'info',
  'In Assembly': 'warning',
  'Assembly Complete': 'info',
  'Packaging': 'warning',
  'Pending QC': 'warning',
  'QC Passed': 'success',
  'QC Failed': 'error',
  'Ready for Dispatch': 'success',
  'Sent to Rental Warehouse': 'success',
  'Dispatched': 'success',
  'Invoiced': 'success',
  'Closed': 'neutral',
}

const PRIORITY_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Urgent: 'error',
}

const columns = [
  { key: 'workOrderNumber', label: 'WO #', sortable: true },
  { key: 'type', label: 'Type' },
  { key: 'priority', label: 'Priority' },
  { key: 'outputProduct', label: 'Product', sortable: true },
  { key: 'qty', label: 'Qty', align: 'right' as const },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'bomNumber', label: 'BOM' },
  { key: 'dueDate', label: 'Due Date', sortable: true },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
]

function WorkOrderListPage() {
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      mockWorkOrders.map((wo) => ({
        id: wo.id,
        workOrderNumber: wo.workOrderNumber,
        type: wo.type,
        priority: wo.priority,
        outputProduct: wo.outputPartName,
        qty: wo.outputQty,
        customer: wo.customerName ?? '—',
        bomNumber: wo.bomNumber,
        bomId: wo.bomId,
        dueDate: formatDate(wo.dueDate),
        dueDateRaw: wo.dueDate,
        status: wo.status,
        destination: wo.destinationType,
      })),
    []
  )

  const inProgress = useMemo(
    () => rows.filter((r) => !['Dispatched', 'Invoiced', 'Closed', 'Sent to Rental Warehouse'].includes(r.status)),
    [rows]
  )
  const salesOrders = useMemo(() => rows.filter((r) => r.type === 'SALES'), [rows])
  const rentalOrders = useMemo(() => rows.filter((r) => r.type === 'RENTAL'), [rows])
  const urgent = useMemo(() => rows.filter((r) => r.priority === 'Urgent' || r.priority === 'High'), [rows])

  const stats: StatCardData[] = [
    { label: 'Total Work Orders', value: rows.length },
    { label: 'In Progress', value: inProgress.length },
    { label: 'Sales', value: salesOrders.length },
    { label: 'Rental', value: rentalOrders.length },
  ]

  const tabs: TabConfig[] = [
    { id: 'all', label: `All (${rows.length})`, columns, data: rows },
    { id: 'in-progress', label: `In Progress (${inProgress.length})`, columns, data: inProgress },
    { id: 'sales', label: `Sales (${salesOrders.length})`, columns, data: salesOrders },
    { id: 'rental', label: `Rental (${rentalOrders.length})`, columns, data: rentalOrders },
    { id: 'urgent', label: `Urgent/High (${urgent.length})`, columns, data: urgent },
  ]

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'workOrderNumber') {
      return {
        display: (
          <Link to={`/wms/work-orders/${row.id}`} className="font-medium wms-link">
            {value as string}
          </Link>
        ),
      }
    }
    if (key === 'type') {
      const t = value as WorkOrderType
      return {
        display: <StatusBadge variant={TYPE_VARIANT[t]}>{TYPE_LABELS[t]}</StatusBadge>,
      }
    }
    if (key === 'priority') {
      return {
        display: (
          <StatusBadge variant={PRIORITY_VARIANT[value as string] ?? 'neutral'}>
            {value as string}
          </StatusBadge>
        ),
      }
    }
    if (key === 'status') {
      const s = value as WorkOrderStatus
      return {
        display: <StatusBadge variant={STATUS_VARIANT[s]}>{s}</StatusBadge>,
      }
    }
    if (key === 'bomNumber') {
      return {
        display: (
          <Link
            to={`/wms/bom/${row.bomId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs wms-link"
          >
            {value as string}
          </Link>
        ),
      }
    }
    if (key === 'actions') {
      return {
        display: (
          <Link
            to={`/wms/work-orders/${row.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium wms-link"
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
      title="Work Orders"
      subtitle="SO / Rental → Engineering → Assembly → QC → Dispatch."
      breadcrumbs={[{ label: 'WMS' }, { label: 'Work Orders' }]}
      actions={
        <Button onClick={() => navigate('/wms/work-orders/new')}>
          <Plus className="size-4" data-icon="inline-start" />
          Create Work Order
        </Button>
      }
      stats={<StatsRow stats={stats} />}
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-work-orders"
        onRowClick={(row) => navigate(`/wms/work-orders/${row.id}`)}
        emptyState={{
          title: 'No work orders yet',
          description: 'Work orders track engineering and assembly progress for sales and rental orders.',
          action: {
            label: 'Create Work Order',
            onClick: () => navigate('/wms/work-orders/new'),
          },
        }}
      />
    </ListPageShell>
  )
}

export { WorkOrderListPage }
export default WorkOrderListPage
