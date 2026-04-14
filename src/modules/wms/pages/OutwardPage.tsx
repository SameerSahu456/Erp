import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import type { OutwardType, OutwardRecord } from '../types'
import { mockOutwardRecords } from '../data/outward'

const TYPE_VARIANT: Record<OutwardType, 'info' | 'warning' | 'neutral'> = {
  SALES: 'info',
  RENTAL: 'warning',
  RETURN_REPLACEMENT: 'neutral',
}

const TYPE_LABELS: Record<OutwardType, string> = {
  SALES: 'Sales',
  RENTAL: 'Rental',
  RETURN_REPLACEMENT: 'Return / Replacement',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toRow(r: OutwardRecord) {
  return {
    id: r.id,
    outwardNumber: r.outwardNumber,
    type: r.type,
    customerName: r.customerName,
    devicesCount: r.devices.length,
    status: r.status,
    createdBy: r.createdBy,
    date: formatDate(r.createdAt),
  }
}

const columns = [
  { key: 'outwardNumber', label: 'Outward #', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'devicesCount', label: 'Devices', sortable: true, align: 'right' as const },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'createdBy', label: 'Created By', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
]

export default function OutwardPage() {
  const tabs: TabConfig[] = useMemo(() => {
    const pendingQc = mockOutwardRecords
      .filter((r) => r.status === 'Pending QC')
      .map(toRow)
    const qcPassed = mockOutwardRecords
      .filter((r) => r.status === 'QC Passed')
      .map(toRow)
    const dispatched = mockOutwardRecords
      .filter((r) => r.status === 'Dispatched')
      .map(toRow)
    const all = mockOutwardRecords.map(toRow)

    return [
      { id: 'pending-qc', label: 'Pending QC', columns, data: pendingQc },
      { id: 'qc-passed', label: 'QC Passed', columns, data: qcPassed },
      { id: 'dispatched', label: 'Dispatched', columns, data: dispatched },
      { id: 'all', label: 'All', columns, data: all },
    ]
  }, [])

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'outwardNumber' && typeof value === 'string') {
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
    if (key === 'status' && typeof value === 'string') {
      const variant =
        value === 'Dispatched'
          ? 'success'
          : value === 'QC Passed'
            ? 'info'
            : 'warning'
      return {
        display: <StatusBadge variant={variant}>{value}</StatusBadge>,
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Outward / Dispatch
        </h1>
        <Button render={<Link to="/wms/outward/new" />}>
          <Plus className="mr-2 size-4" />
          Create Dispatch
        </Button>
      </div>

      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />
    </div>
  )
}
