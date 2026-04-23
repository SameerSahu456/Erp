import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { mockRentalContracts } from '../data/contracts'
import type { RentalContractStatus } from '../types'

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`
}

const STATUS_VARIANT: Record<RentalContractStatus, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  Draft: 'neutral',
  Active: 'success',
  Extended: 'info',
  Overdue: 'error',
  Returned: 'warning',
  Closed: 'neutral',
  Terminated: 'error',
}

function contractToRow(c: (typeof mockRentalContracts)[number]) {
  return {
    id: c.id,
    contractNumber: c.contractNumber,
    customerName: c.customerName,
    deviceCount: c.devices.length,
    variant: [...new Set(c.devices.map((d) => d.variant))].join(', '),
    monthlyRate: c.monthlyRental,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
    totalBilled: c.totalBilled,
    totalPaid: c.totalPaid,
  }
}

const columns = [
  { key: 'contractNumber', label: 'Contract #', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'deviceCount', label: 'Devices', sortable: true, align: 'center' as const },
  { key: 'variant', label: 'Variant', filterable: true },
  { key: 'monthlyRate', label: 'Monthly Rate', sortable: true, align: 'right' as const },
  { key: 'startDate', label: 'Start Date', sortable: true },
  { key: 'endDate', label: 'End Date', sortable: true },
  { key: 'status', label: 'Status', filterable: true },
  { key: 'totalBilled', label: 'Total Billed', sortable: true, align: 'right' as const },
  { key: 'totalPaid', label: 'Total Paid', sortable: true, align: 'right' as const },
]

export default function RentalContractsPage() {
  const navigate = useNavigate()
  const allRows = useMemo(() => mockRentalContracts.map(contractToRow), [])

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'active',
        label: `Active (${allRows.filter((r) => r.status === 'Active' || r.status === 'Extended').length})`,
        columns,
        data: allRows.filter((r) => r.status === 'Active' || r.status === 'Extended'),
      },
      {
        id: 'overdue',
        label: `Overdue (${allRows.filter((r) => r.status === 'Overdue').length})`,
        columns,
        data: allRows.filter((r) => r.status === 'Overdue'),
      },
      {
        id: 'returned',
        label: `Returned (${allRows.filter((r) => r.status === 'Returned' || r.status === 'Closed').length})`,
        columns,
        data: allRows.filter((r) => r.status === 'Returned' || r.status === 'Closed'),
      },
      {
        id: 'all',
        label: `All (${allRows.length})`,
        columns,
        data: allRows,
      },
    ],
    [allRows],
  )

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'contractNumber') {
      return {
        display: (
          <Link
            to={`/rentals/contracts/${row['id'] as string}`}
            className="font-medium text-primary hover:underline"
          >
            {value as string}
          </Link>
        ),
      }
    }

    if (key === 'variant') {
      const variants = (value as string).split(', ')
      return {
        display: (
          <div className="flex gap-1">
            {variants.map((v) => (
              <StatusBadge key={v} variant={v === 'Refurbished' ? 'warning' : 'info'}>
                {v}
              </StatusBadge>
            ))}
          </div>
        ),
      }
    }

    if (key === 'monthlyRate' || key === 'totalBilled') {
      return { display: formatCurrency(value as number) }
    }

    if (key === 'totalPaid') {
      const paid = value as number
      const billed = row['totalBilled'] as number
      return {
        display: formatCurrency(paid),
        className: paid < billed ? 'bg-destructive/10 text-destructive font-medium' : undefined,
      }
    }

    if (key === 'status') {
      const status = value as RentalContractStatus
      return {
        display: <StatusBadge variant={STATUS_VARIANT[status]}>{status}</StatusBadge>,
        className: status === 'Overdue' ? 'bg-destructive/10' : undefined,
      }
    }

    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="cpt-page-title">
          Rental Contracts
        </h1>
        <Button render={<Link to="/rentals/contracts/new" />}>
          <Plus className="mr-2 size-4" />
          Create Contract
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        onRowClick={(row) => navigate(`/rentals/contracts/${row.id}`)}
      />
    </div>
  )
}
