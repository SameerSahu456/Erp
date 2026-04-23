import { useMemo, useCallback } from 'react'
import { toast } from 'sonner'

import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { BusinessMetricsTable, type TabConfig, type CellFormatter } from '@/components/common/BusinessMetricsTable'
import type { DataCardProps } from '@/components/common/DataCard'
import { mockRentalOrders, type RentalOrder } from '../data/orders'

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`

const STATUS_VARIANT: Record<RentalOrder['status'], StatusBadgeVariant> = {
  Draft: 'neutral',
  'Pending Approval': 'warning',
  Approved: 'info',
  Staging: 'info',
  Dispatched: 'warning',
  Delivered: 'success',
  Cancelled: 'error',
}

const ANNEXURE_VARIANT: Record<string, StatusBadgeVariant> = {
  'Not Created': 'neutral',
  'Pending Signature': 'warning',
  Signed: 'success',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function RentalOrdersPage() {
  const orders = mockRentalOrders

  const stats = useMemo(() => ({
    total: orders.length,
    active: orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'Delivered').length,
    totalValue: orders.reduce((s, o) => s + o.monthlyRental, 0),
    pendingApproval: orders.filter((o) => o.status === 'Pending Approval').length,
  }), [orders])

  const kpiStats: DataCardProps[] = [
    { label: 'Total Orders', value: String(stats.total), sub: `${fmtINR(stats.totalValue)}/month total` },
    { label: 'Active / In Progress', value: String(stats.active) },
    { label: 'Delivered', value: String(stats.delivered) },
    { label: 'Pending Approval', value: String(stats.pendingApproval) },
  ]

  const rows = useMemo(() => orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customer: o.customerName,
    customerType: o.customerType,
    units: o.totalUnits,
    monthly: o.monthlyRental,
    deposit: o.depositAmount,
    status: o.status,
    annexure: o.annexureStatus,
    dispatch: o.dispatchMethod,
    requested: formatDate(o.requestedDate),
    delivery: o.expectedDeliveryDate ? formatDate(o.expectedDeliveryDate) : '-',
    contract: o.contractNumber ?? '-',
    _status: o.status,
  })), [orders])

  const columns = [
    { key: 'orderNumber', label: 'Order #', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'customerType', label: 'Type' },
    { key: 'units', label: 'Units', align: 'center' as const, sortable: true },
    { key: 'monthly', label: 'Monthly Rental', align: 'right' as const, sortable: true },
    { key: 'deposit', label: 'Deposit', align: 'right' as const },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'annexure', label: 'Annexure' },
    { key: 'dispatch', label: 'Dispatch' },
    { key: 'requested', label: 'Requested', sortable: true },
    { key: 'delivery', label: 'Expected Delivery' },
    { key: 'contract', label: 'Contract' },
  ]

  const tabs: TabConfig[] = useMemo(() => [
    { id: 'all', label: `All (${rows.length})`, columns, data: rows },
    { id: 'active', label: `Active (${rows.filter((r) => !['Delivered', 'Cancelled'].includes(r._status)).length})`, columns, data: rows.filter((r) => !['Delivered', 'Cancelled'].includes(r._status)) },
    { id: 'pending', label: `Pending Approval (${rows.filter((r) => r._status === 'Pending Approval').length})`, columns, data: rows.filter((r) => r._status === 'Pending Approval') },
    { id: 'delivered', label: `Delivered (${rows.filter((r) => r._status === 'Delivered').length})`, columns, data: rows.filter((r) => r._status === 'Delivered') },
  ], [rows])

  const cellFormatter: CellFormatter = useCallback((value, key, row) => {
    if (key === 'orderNumber') return { display: <span style={{ fontWeight: 600 }}>{String(value)}</span> }
    if (key === 'monthly' || key === 'deposit') return { display: <span className="cpt-num" style={{ fontWeight: 550 }}>{fmtINR(value as number)}</span> }
    if (key === 'status') return { display: <StatusBadge variant={STATUS_VARIANT[value as RentalOrder['status']]}>{String(value)}</StatusBadge> }
    if (key === 'annexure') return { display: <StatusBadge variant={ANNEXURE_VARIANT[String(value)] ?? 'neutral'}>{String(value)}</StatusBadge> }
    if (key === 'customerType') {
      return { display: <span className="cpt-tag">{String(value)}</span> }
    }
    if (key === 'contract' && value !== '-') return { display: <span className="cpt-mono">{String(value)}</span> }
    return null
  }, [])

  return (
    <div className="space-y-6">
      <div className="cpt-page-header">
        <div>
          <h1 className="cpt-page-title">Rental Orders</h1>
          <div className="cpt-page-sub">Track orders from request through staging, dispatch, and delivery confirmation</div>
        </div>
        <div className="cpt-row">
          <button className="cpt-btn" onClick={() => toast.success('Export started')}>Export</button>
          <button className="cpt-btn cpt-btn-primary" onClick={() => toast.success('New order form')}>+ New Order</button>
        </div>
      </div>

      <StatsRow stats={kpiStats} />
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} persistKey="rentals-orders" />
    </div>
  )
}

export default RentalOrdersPage
