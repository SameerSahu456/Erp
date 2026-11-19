import { useMemo } from 'react'
import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/tables/BusinessMetricsTable'
import { StatsRow, type StatCardData } from '@/components/common/display/StatsRow'
import { ListPageShell } from '@/components/page-shells'
import { mockWorkOrders } from '../../data/work-orders'
import type { WorkOrderStatus, WorkOrderType } from '../../types'
import { formatIST_date } from "@shared/lib/date"
import { WORK_ORDERS_STRINGS } from './work-orders.strings'


function formatDate(dateStr: string) {
  return formatIST_date(dateStr)
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

const S = WORK_ORDERS_STRINGS.list

const columns = [
  { key: 'workOrderNumber', label: S.columns.workOrderNumber, sortable: true },
  { key: 'type', label: S.columns.type },
  { key: 'priority', label: S.columns.priority },
  { key: 'outputProduct', label: S.columns.outputProduct, sortable: true },
  { key: 'qty', label: S.columns.qty, align: 'right' as const },
  { key: 'customer', label: S.columns.customer, sortable: true },
  { key: 'bomNumber', label: S.columns.bomNumber },
  { key: 'dueDate', label: S.columns.dueDate, sortable: true },
  { key: 'status', label: S.columns.status },
  { key: 'actions', label: '' },
]


export function WorkOrderListBody() {
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
    { label: S.stats.total, value: rows.length, accent: 'primary' as const },
    { label: S.stats.inProgress, value: inProgress.length, accent: 'info' as const },
    { label: S.stats.sales, value: salesOrders.length, accent: 'violet' as const },
    { label: S.stats.rental, value: rentalOrders.length, accent: 'teal' as const },
  ]

  const tabs: TabConfig[] = [
    { id: 'all', label: S.tabs.all(rows.length), columns, data: rows },
    { id: 'in-progress', label: S.tabs.inProgress(inProgress.length), columns, data: inProgress },
    { id: 'sales', label: S.tabs.sales(salesOrders.length), columns, data: salesOrders },
    { id: 'rental', label: S.tabs.rental(rentalOrders.length), columns, data: rentalOrders },
    { id: 'urgent', label: S.tabs.urgentHigh(urgent.length), columns, data: urgent },
  ]

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'workOrderNumber') {
      return {
        display: (
          <Link
            to={`/wms/work-orders/${row.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium wms-link"
          >
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
            onClick={(e) => e.stopPropagation()}
            to={`/wms/work-orders/${row.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium wms-link"
          >
            <Eye className="size-3.5" />
            {S.viewLink}
          </Link>
        ),
      }
    }
    return null
  }

  return (
    <ListPageShell
      title={S.title}
      subtitle={S.subtitle}
      breadcrumbs={[{ label: S.breadcrumbs.wms }, { label: S.breadcrumbs.workOrders }]}
      actions={
        <Button onClick={() => navigate('/wms/work-orders/new')}>
          <Plus className="size-4" data-icon="inline-start" />
          {S.createButton}
        </Button>
      }
      stats={<StatsRow stats={stats} />}
    >
      <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-work-orders"
        searchPlaceholder="Search by WO #, product, or customer…"
        onRowClick={(row) => navigate(`/wms/work-orders/${row.id}`)}
        emptyState={{
          title: S.emptyTitle,
          description: S.emptyDescription,
          action: {
            label: S.emptyAction,
            onClick: () => navigate('/wms/work-orders/new'),
          },
        }}
      />
    </ListPageShell>
  )
}


