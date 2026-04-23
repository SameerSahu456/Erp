import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockBatches } from '../data/batches'
import type { InwardType } from '../types'

const INWARD_TYPE_LABELS: Record<InwardType, string> = {
  PURCHASE_ORDER: 'Purchase Order',
  RENTAL_RETURN: 'Rental Return',
  DEMO_RETURN: 'Demo Return',
  INTERNAL_TRANSFER: 'Internal Transfer',
  ADVANCE_RETURN: 'Advance Return',
  REFURB_PURCHASE: 'Refurb Purchase',
}

const INWARD_TYPE_VARIANT: Record<InwardType, 'success' | 'warning' | 'info' | 'neutral'> = {
  PURCHASE_ORDER: 'info',
  RENTAL_RETURN: 'warning',
  DEMO_RETURN: 'neutral',
  INTERNAL_TRANSFER: 'success',
  ADVANCE_RETURN: 'success',
  REFURB_PURCHASE: 'info',
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
  { key: 'inwardType', label: 'Inward Type' },
  { key: 'category', label: 'Category' },
  { key: 'deviceCount', label: 'Devices', sortable: true, align: 'right' as const },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'receivedBy', label: 'Received By' },
  { key: 'receivedDate', label: 'Date', sortable: true },
  { key: 'status', label: 'Status' },
]

function InwardPage() {
  const navigate = useNavigate()

  const batchRows = useMemo(
    () =>
      mockBatches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        inwardType: b.inwardType,
        category: b.category,
        deviceCount: b.deviceCount,
        warehouse: b.warehouseName,
        receivedBy: b.receivedBy,
        receivedDate: formatDate(b.createdAt),
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
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-primary hover:underline"
          >
            {value as string}
          </Link>
        ),
      }
    }
    if (key === 'inwardType') {
      const inwardType = value as InwardType
      return {
        display: (
          <StatusBadge variant={INWARD_TYPE_VARIANT[inwardType]}>
            {INWARD_TYPE_LABELS[inwardType]}
          </StatusBadge>
        ),
      }
    }
    if (key === 'status') {
      const variant = value === 'Open' ? 'success' : 'neutral'
      return {
        display: (
          <StatusBadge variant={variant}>
            {value as string}
          </StatusBadge>
        ),
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="cpt-page-title">
          Inward / GRN
        </h1>
        <Button onClick={() => navigate('/wms/inward/new')}>
          <Plus className="size-4" data-icon="inline-start" />
          Create Batch
        </Button>
      </div>

      <div className="bmt-search-md">
        <BusinessMetricsTable
          tabs={tabs}
          cellFormatter={cellFormatter}
          persistKey="wms-inward"
          onRowClick={(row) => navigate(`/wms/inward/${row.id}/devices`)}
        />
      </div>
    </div>
  )
}

export { InwardPage }
export default InwardPage
