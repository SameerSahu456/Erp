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
import { ListPageShell } from '@/components/page'
import { mockBatches } from '../data/batches'
import type { InwardType } from '../types'

const INWARD_TYPE_LABELS: Record<InwardType, string> = {
  PURCHASE_ORDER: 'Purchase Order',
  DEMO_RETURN: 'Demo Return',
  INTERNAL_TRANSFER: 'Internal Transfer',
  ADVANCE_RETURN: 'Return',
  REPLACEMENT: 'Replacement',
}

const INWARD_TYPE_VARIANT: Record<InwardType, 'success' | 'warning' | 'info' | 'neutral'> = {
  PURCHASE_ORDER: 'info',
  DEMO_RETURN: 'neutral',
  INTERNAL_TRANSFER: 'success',
  ADVANCE_RETURN: 'success',
  REPLACEMENT: 'warning',
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
            className="font-medium wms-link"
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
    <ListPageShell
      title="Inward / GRN"
      subtitle="Incoming device batches — from POs, returns, demos, and transfers."
      breadcrumbs={[{ label: 'WMS' }, { label: 'Inward' }]}
      actions={
        <Button onClick={() => navigate('/wms/inward/new')}>
          <Plus className="size-4" data-icon="inline-start" />
          Create Batch
        </Button>
      }
    >
      <div className="bmt-search-md">
        <BusinessMetricsTable
          tabs={tabs}
          cellFormatter={cellFormatter}
          persistKey="wms-inward"
          onRowClick={(row) => navigate(`/wms/inward/${row.id}/devices`)}
          emptyState={{
            title: 'No batches yet',
            description: 'Create an inward batch to register devices arriving at the warehouse.',
            action: {
              label: 'Create Batch',
              onClick: () => navigate('/wms/inward/new'),
            },
          }}
        />
      </div>
    </ListPageShell>
  )
}

export { InwardPage }
export default InwardPage
