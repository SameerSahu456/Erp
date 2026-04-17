import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Monitor,
  AlertTriangle,
  Activity,
  IndianRupee,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockRentalContracts } from '../data/contracts'

const TODAY = '2026-04-15'

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`
}

function daysBetween(from: string, to: string): number {
  return Math.ceil(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
  )
}

interface DeviceTrackingRow {
  [key: string]: unknown
  id: string
  barcode: string
  model: string
  customer: string
  contractNumber: string
  contractId: string
  dispatchedDate: string
  returnDue: string
  daysRemaining: number
  status: string
}

export default function DeviceTrackingPage() {
  const devices: DeviceTrackingRow[] = useMemo(() => {
    const rows: DeviceTrackingRow[] = []
    for (const c of mockRentalContracts) {
      if (c.status === 'Closed' || c.status === 'Terminated') continue
      for (const d of c.devices) {
        if (d.returnedDate) continue
        const daysRemaining = daysBetween(TODAY, d.returnDueDate)
        let status = 'On Rent'
        if (daysRemaining < 0) status = 'Overdue'
        else if (daysRemaining <= 7) status = 'Due Soon'

        rows.push({
          id: d.deviceId,
          barcode: d.barcode,
          model: d.model,
          customer: c.customerName,
          contractNumber: c.contractNumber,
          contractId: c.id,
          dispatchedDate: d.dispatchedDate,
          returnDue: d.returnDueDate,
          daysRemaining,
          status,
        })
      }
    }
    return rows
  }, [])

  const overdueCount = devices.filter((d) => d.status === 'Overdue').length
  const dueSoonCount = devices.filter((d) => d.status === 'Due Soon').length

  const totalMonthlyRevenue = useMemo(() => {
    const activeContracts = mockRentalContracts.filter(
      (c) => c.status === 'Active' || c.status === 'Extended' || c.status === 'Overdue',
    )
    return activeContracts.reduce((s, c) => s + c.monthlyRental, 0)
  }, [])

  const revenuePerDevice = devices.length > 0 ? Math.round(totalMonthlyRevenue / devices.length) : 0
  const utilization = devices.length > 0 ? Math.round((devices.length / (devices.length + 5)) * 100) : 0 // +5 for available stock

  const columns = [
    { key: 'barcode', label: 'Barcode', sortable: true },
    { key: 'model', label: 'Model', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'contractNumber', label: 'Contract #', sortable: true },
    { key: 'dispatchedDate', label: 'Dispatched', sortable: true },
    { key: 'returnDue', label: 'Return Due', sortable: true },
    { key: 'daysRemaining', label: 'Days Remaining', sortable: true, align: 'right' as const },
    { key: 'status', label: 'Status' },
  ]

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'on-rent',
        label: `On Rent (${devices.filter((d) => d.status === 'On Rent').length})`,
        columns,
        data: devices.filter((d) => d.status === 'On Rent'),
      },
      {
        id: 'due-soon',
        label: `Return Due 7d (${dueSoonCount})`,
        columns,
        data: devices.filter((d) => d.status === 'Due Soon'),
      },
      {
        id: 'overdue',
        label: `Overdue (${overdueCount})`,
        columns,
        data: devices.filter((d) => d.status === 'Overdue'),
      },
      {
        id: 'all',
        label: `All (${devices.length})`,
        columns,
        data: devices,
      },
    ],
    [devices, overdueCount, dueSoonCount],
  )

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'contractNumber') {
      return {
        display: (
          <Link
            to={`/rentals/contracts/${row['contractId'] as string}`}
            className="text-primary hover:underline"
          >
            {value as string}
          </Link>
        ),
      }
    }

    if (key === 'daysRemaining') {
      const days = value as number
      let colorClass = 'text-status-success-text'
      if (days < 0) colorClass = 'bg-destructive/10 text-destructive font-medium'
      else if (days <= 7) colorClass = 'text-[#f6c000] font-medium'

      return {
        display: `${days} days`,
        className: colorClass,
      }
    }

    if (key === 'status') {
      const s = value as string
      return {
        display: (
          <StatusBadge
            variant={
              s === 'Overdue' ? 'error' : s === 'Due Soon' ? 'warning' : 'success'
            }
          >
            {s}
          </StatusBadge>
        ),
      }
    }

    return null
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Device Tracking
      </h1>

      <StatsRow
        stats={[
          { label: 'Total On Rent', value: devices.length, icon: Monitor },
          {
            label: 'Overdue Returns',
            value: overdueCount,
            icon: AlertTriangle,
            className: overdueCount > 0 ? 'border-destructive/40' : undefined,
          },
          { label: 'Avg Utilization', value: `${utilization}%`, icon: Activity },
          { label: 'Revenue / Device', value: formatCurrency(revenuePerDevice), icon: IndianRupee },
        ]}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info('Return reminder emails sent')}
        >
          Send Return Reminder
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info('Extend dialog would open here')}
        >
          Extend
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info('Devices marked as returned')}
        >
          Mark Returned
        </Button>
      </div>

      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />
    </div>
  )
}
