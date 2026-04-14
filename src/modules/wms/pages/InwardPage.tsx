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
import { mockBatches } from '../data/batches'
import type { BatchOwnershipType } from '../types'

const OWNERSHIP_TYPE_LABELS: Record<BatchOwnershipType, string> = {
  REFURB_PURCHASE: 'Refurb Purchase',
  RENTAL_RETURN: 'Rental Return',
  ADVANCE_RETURN: 'Advance Return',
}

const OWNERSHIP_TYPE_VARIANT: Record<BatchOwnershipType, 'success' | 'warning' | 'info'> = {
  REFURB_PURCHASE: 'info',
  RENTAL_RETURN: 'warning',
  ADVANCE_RETURN: 'success',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const columns = [
  { key: 'batchNumber', label: 'Batch #', sortable: true },
  { key: 'ownershipType', label: 'Ownership Type' },
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand', sortable: true },
  { key: 'deviceCount', label: 'Devices', sortable: true, align: 'right' as const },
  { key: 'receivedBy', label: 'Received By' },
  { key: 'receivedDate', label: 'Date', sortable: true },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
]

function InwardPage() {
  const navigate = useNavigate()

  const batchRows = useMemo(
    () =>
      mockBatches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        ownershipType: b.ownershipType,
        ownershipLabel: OWNERSHIP_TYPE_LABELS[b.ownershipType],
        category: b.category,
        brand: b.brand,
        deviceCount: b.deviceCount,
        receivedBy: b.receivedBy,
        receivedDate: formatDate(b.receivedDate),
        status: b.status,
      })),
    []
  )

  const openBatches = useMemo(
    () => batchRows.filter((b) => b.status === 'Open'),
    [batchRows]
  )

  const tabs: TabConfig[] = [
    {
      id: 'open',
      label: `Open Batches (${openBatches.length})`,
      columns,
      data: openBatches,
    },
    {
      id: 'all',
      label: `All Batches (${batchRows.length})`,
      columns,
      data: batchRows,
    },
  ]

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'batchNumber') {
      return {
        display: (
          <Link
            to={`/wms/inward/${row.id}/devices`}
            className="font-medium text-primary hover:underline"
          >
            {value as string}
          </Link>
        ),
      }
    }
    if (key === 'ownershipType') {
      const ownershipType = value as BatchOwnershipType
      return {
        display: (
          <StatusBadge variant={OWNERSHIP_TYPE_VARIANT[ownershipType]}>
            {OWNERSHIP_TYPE_LABELS[ownershipType]}
          </StatusBadge>
        ),
      }
    }
    if (key === 'status') {
      return {
        display: (
          <StatusBadge variant={value === 'Open' ? 'success' : 'neutral'}>
            {value as string}
          </StatusBadge>
        ),
      }
    }
    if (key === 'actions') {
      const batchId = row.id as string
      return {
        display: (
          <Link
            to={`/wms/inward/${batchId}/devices`}
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
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Inward / GRN
        </h1>
        <Button onClick={() => navigate('/wms/inward/new')}>
          <Plus className="size-4" data-icon="inline-start" />
          Create Batch
        </Button>
      </div>

      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />
    </div>
  )
}

export { InwardPage }
export default InwardPage
