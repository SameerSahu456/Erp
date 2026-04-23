import { useMemo } from 'react'
import { Plus, Truck, ClipboardList, FileCheck, CheckCircle2 } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { StatsRow } from '@/components/common/StatsRow'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'

import { useDispatches } from '../data/dispatches'
import type { Dispatch, DispatchConfirmationStatus } from '../types'

const STATUS_VARIANT: Record<DispatchConfirmationStatus, StatusBadgeVariant> = {
  Draft: 'neutral',
  'Assembly Pending': 'warning',
  Assembled: 'info',
  Billed: 'info',
  Dispatched: 'info',
  Delivered: 'success',
  Closed: 'success',
}

function formatCurrency(value?: number): string {
  if (value === undefined) return '—'
  return `₹${(value / 100000).toFixed(2)}L`
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function countVariance(items: Dispatch['lineItems']): number {
  return items.filter((i) => i.action === 'ADDED' || i.action === 'REMOVED' || i.action === 'REPLACED').length
}

function buildTab(dispatches: Dispatch[]): TabConfig {
  return {
    id: 'dispatches',
    label: 'All Dispatches',
    columns: [
      { key: 'dispatchNumber', label: 'Dispatch #', sortable: true },
      { key: 'salesOrderNumber', label: 'Sales Order', sortable: true },
      { key: 'accountName', label: 'Account', sortable: true },
      { key: 'status', label: 'Status', sortable: true, filterable: true },
      { key: 'variance', label: 'Variance', align: 'center' },
      { key: 'externalTicketNumber', label: 'Ext. Ticket #', sortable: true },
      { key: 'assemblyCompletedAt', label: 'Assembled', sortable: true },
      { key: 'dispatchedAt', label: 'Dispatched', sortable: true },
      { key: 'invoiceAmount', label: 'Invoice', sortable: true, align: 'right' },
    ],
    data: dispatches.map((d) => ({
      id: d.id,
      dispatchNumber: d.dispatchNumber,
      salesOrderId: d.salesOrderId,
      salesOrderNumber: d.salesOrderNumber,
      accountName: d.accountName,
      status: d.status,
      variance: countVariance(d.lineItems),
      externalTicketNumber: d.externalTicketNumber ?? '',
      assemblyCompletedAt: d.assemblyCompletedAt ?? '',
      dispatchedAt: d.dispatchedAt ?? '',
      invoiceAmount: d.invoiceAmount ?? 0,
    })),
  }
}

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'dispatchNumber' && typeof value === 'string') {
    return {
      display: (
        <Link to={`/wms/dispatches/${row['id']}`} className="font-medium text-primary hover:underline">
          {value}
        </Link>
      ),
    }
  }
  if (key === 'salesOrderNumber' && typeof value === 'string') {
    return {
      display: (
        <Link to={`/crm/sales-orders/${row['salesOrderId']}`} className="text-muted-foreground hover:text-foreground hover:underline">
          {value}
        </Link>
      ),
    }
  }
  if (key === 'status' && typeof value === 'string') {
    const variant = STATUS_VARIANT[value as DispatchConfirmationStatus] ?? 'neutral'
    return { display: <StatusBadge variant={variant}>{value}</StatusBadge> }
  }
  if (key === 'variance' && typeof value === 'number') {
    if (value === 0) return { display: <span className="text-xs text-muted-foreground">None</span> }
    return {
      display: (
        <StatusBadge variant="warning">
          {value} change{value === 1 ? '' : 's'}
        </StatusBadge>
      ),
    }
  }
  if ((key === 'assemblyCompletedAt' || key === 'dispatchedAt') && typeof value === 'string') {
    return { display: formatDate(value || undefined) }
  }
  if (key === 'invoiceAmount' && typeof value === 'number') {
    return { display: value === 0 ? '—' : formatCurrency(value) }
  }
  if (key === 'externalTicketNumber' && typeof value === 'string') {
    if (!value) return { display: <span className="text-muted-foreground">—</span> }
    return { display: <span className="font-mono text-xs">{value}</span> }
  }
  return null
}

function DispatchListPage() {
  const navigate = useNavigate()
  const dispatches = useDispatches()
  const tab = useMemo(() => buildTab(dispatches), [dispatches])

  const pending = dispatches.filter((d) => d.status === 'Draft' || d.status === 'Assembly Pending').length
  const inFlight = dispatches.filter((d) => d.status === 'Assembled' || d.status === 'Billed' || d.status === 'Dispatched').length
  const delivered = dispatches.filter((d) => d.status === 'Delivered' || d.status === 'Closed').length
  const totalInvoiced = dispatches.reduce((sum, d) => sum + (d.invoiceAmount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold">WMS Outward &mdash; Dispatches</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            SO-level dispatch confirmations with external assembly tracking, billing documents, and Remove / Add / Replace variance capture.
          </p>
        </div>
        <Button onClick={() => navigate('/wms/dispatches/new')}>
          <Plus className="mr-1 size-4" />
          New Dispatch
        </Button>
      </div>

      <StatsRow
        stats={[
          { label: 'Pending Assembly', value: pending, icon: ClipboardList },
          { label: 'In Flight', value: inFlight, icon: Truck },
          { label: 'Delivered / Closed', value: delivered, icon: CheckCircle2 },
          { label: 'Total Invoiced', value: formatCurrency(totalInvoiced), icon: FileCheck },
        ]}
      />

      <BusinessMetricsTable
        tabs={[tab]}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="wms-dispatches"
        onRowClick={(row) => navigate(`/wms/dispatches/${row.id}`)}
      />
    </div>
  )
}

export default DispatchListPage
