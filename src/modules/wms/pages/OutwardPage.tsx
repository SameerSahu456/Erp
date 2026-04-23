import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Truck, ClipboardCheck, PackageCheck, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import type { OutwardType, OutwardRecord } from '../types'
import { mockOutwardRecords } from '../data/outward'
import { mockReturnRecords } from '../data/returns'

const TYPE_VARIANT: Record<OutwardType, 'info' | 'warning' | 'neutral' | 'success' | 'error'> = {
  SALES: 'info',
  RENTAL: 'warning',
  DEMO: 'neutral',
  INTERNAL_TRANSFER: 'neutral',
  RETURN_REPLACEMENT: 'error',
}

const TYPE_LABELS: Record<OutwardType, string> = {
  SALES: 'Sales',
  RENTAL: 'Rental',
  DEMO: 'Demo',
  INTERNAL_TRANSFER: 'Internal Transfer',
  RETURN_REPLACEMENT: 'Return / Replacement',
}

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

function getStatusVariant(status: OutwardRecord['status']): StatusVariant {
  switch (status) {
    case 'Dispatched':
    case 'Delivered':
      return 'success'
    case 'QC Passed':
    case 'Ready for Dispatch':
      return 'info'
    case 'Pending QC':
    case 'Packed':
    case 'Picking':
    case 'Approved':
    case 'Pending Approval':
      return 'warning'
    case 'Partially Returned':
      return 'error'
    case 'Draft':
    default:
      return 'neutral'
  }
}

const REASON_LABELS: Record<string, string> = {
  QC_FAILED: 'QC Failed',
  CUSTOMER_RETURN: 'Customer Return',
  DAMAGE_IN_TRANSIT: 'Damage in Transit',
  WRONG_ITEM: 'Wrong Item',
}

const ACTION_LABELS: Record<string, string> = {
  Repair: 'Repair',
  Restock: 'Restock',
  Scrap: 'Scrap',
  Pending: 'Pending',
}

function toRow(r: OutwardRecord) {
  return {
    id: r.id,
    outwardNumber: r.outwardNumber,
    type: r.type,
    customerName: r.customerName,
    devicesCount: r.devices.length,
    qcStatus: r.qcStatus,
    status: r.status,
    storeManager: r.storeManager,
    expectedDate: r.expectedDispatchDate,
  }
}

const outwardColumns = [
  { key: 'outwardNumber', label: 'Outward #', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'devicesCount', label: 'Devices', sortable: true, align: 'right' as const },
  { key: 'qcStatus', label: 'QC Status', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'storeManager', label: 'Store Manager', sortable: true },
  { key: 'expectedDate', label: 'Expected Date', sortable: true },
]

const returnColumns = [
  { key: 'returnNumber', label: 'Return #', sortable: true },
  { key: 'outwardNumber', label: 'Outward #', sortable: true },
  { key: 'reason', label: 'Reason', sortable: true },
  { key: 'devicesCount', label: 'Devices', sortable: true, align: 'right' as const },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'actions', label: 'Action' },
]

export default function OutwardPage() {
  const stats = useMemo(() => {
    const total = mockOutwardRecords.length
    const pendingQc = mockOutwardRecords.filter((r) => r.status === 'Pending QC').length
    const readyToShip = mockOutwardRecords.filter((r) =>
      r.status === 'QC Passed' || r.status === 'Ready for Dispatch'
    ).length
    const dispatchedToday = mockOutwardRecords.filter((r) => {
      if (!r.actualDispatchDate) return false
      return r.actualDispatchDate === new Date().toISOString().split('T')[0]
    }).length

    return [
      { label: 'Total Dispatches', value: total, icon: Truck },
      { label: 'Pending QC', value: pendingQc, icon: ClipboardCheck },
      { label: 'Ready to Ship', value: readyToShip, icon: PackageCheck },
      { label: 'Dispatched Today', value: dispatchedToday, icon: Send },
    ]
  }, [])

  const tabs: TabConfig[] = useMemo(() => {
    const activeStatuses = ['Draft', 'Pending Approval', 'Approved', 'Picking', 'Packed', 'Pending QC', 'QC Passed', 'Ready for Dispatch']
    const active = mockOutwardRecords
      .filter((r) => activeStatuses.includes(r.status))
      .map(toRow)
    const dispatched = mockOutwardRecords
      .filter((r) => r.status === 'Dispatched' || r.status === 'Delivered' || r.status === 'Partially Returned')
      .map(toRow)
    const all = mockOutwardRecords.map(toRow)

    const returnRows = mockReturnRecords.map((r) => ({
      id: r.id,
      returnNumber: r.returnNumber,
      outwardNumber: r.outwardNumber,
      reason: r.reason,
      devicesCount: r.devices.length,
      status: r.status,
      actions: r.devices.map((d) => d.action).join(', '),
    }))

    return [
      { id: 'active', label: `Active (${active.length})`, columns: outwardColumns, data: active },
      { id: 'dispatched', label: `Dispatched (${dispatched.length})`, columns: outwardColumns, data: dispatched },
      { id: 'returns', label: `Returns (${returnRows.length})`, columns: returnColumns, data: returnRows },
      { id: 'all', label: `All (${all.length})`, columns: outwardColumns, data: all },
    ]
  }, [])

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'outwardNumber' && typeof value === 'string') {
      // Check if it's a return row or outward row by checking if returnNumber exists
      if (row.returnNumber) {
        return null
      }
      return {
        display: (
          <Link
            to={`/wms/outward/${row.id as string}`}
            className="font-medium text-primary hover:underline"
          >
            {value}
          </Link>
        ),
      }
    }
    if (key === 'returnNumber' && typeof value === 'string') {
      return {
        display: (
          <span className="font-medium">{value}</span>
        ),
      }
    }
    if (key === 'type' && typeof value === 'string') {
      const t = value as OutwardType
      return {
        display: (
          <StatusBadge variant={TYPE_VARIANT[t]}>
            {TYPE_LABELS[t]}
          </StatusBadge>
        ),
      }
    }
    if (key === 'qcStatus' && typeof value === 'string') {
      const variant: StatusVariant =
        value === 'Passed' ? 'success'
          : value === 'Failed' ? 'error'
            : value === 'Partial' ? 'warning'
              : value === 'In Progress' ? 'info'
                : 'neutral'
      return {
        display: <StatusBadge variant={variant}>{value}</StatusBadge>,
        className: value === 'Failed' ? 'bg-destructive/10' : undefined,
      }
    }
    if (key === 'status' && typeof value === 'string') {
      // For return statuses
      if (['Initiated', 'Received', 'Inspected', 'Resolved'].includes(value)) {
        const variant: StatusVariant =
          value === 'Resolved' ? 'success'
            : value === 'Inspected' ? 'info'
              : value === 'Received' ? 'warning'
                : 'neutral'
        return {
          display: <StatusBadge variant={variant}>{value}</StatusBadge>,
        }
      }
      // For outward statuses
      return {
        display: <StatusBadge variant={getStatusVariant(value as OutwardRecord['status'])}>{value}</StatusBadge>,
      }
    }
    if (key === 'reason' && typeof value === 'string') {
      return {
        display: <StatusBadge variant="error">{REASON_LABELS[value] ?? value}</StatusBadge>,
      }
    }
    if (key === 'actions' && typeof value === 'string') {
      const actions = value.split(', ')
      return {
        display: (
          <div className="flex gap-1">
            {actions.map((a) => (
              <StatusBadge
                key={a}
                variant={a === 'Scrap' ? 'error' : a === 'Repair' ? 'warning' : a === 'Restock' ? 'success' : 'neutral'}
              >
                {ACTION_LABELS[a] ?? a}
              </StatusBadge>
            ))}
          </div>
        ),
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="cpt-page-title">
          Dispatch Management
        </h1>
        <Button render={<Link to="/wms/outward/new" />}>
          <Plus className="mr-2 size-4" />
          Create Dispatch
        </Button>
      </div>

      <StatsRow stats={stats} />

      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} persistKey="wms-outward" />
    </div>
  )
}
