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
import { StatsRow, type StatCardData } from '@/components/common/StatsRow'
import { mockBOMs } from '../data/boms'
import type { BOMStatus, BOMType } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount?: number) {
  if (!amount) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const STATUS_VARIANT: Record<BOMStatus, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  Draft: 'neutral',
  Active: 'success',
  Revision: 'warning',
  Obsolete: 'error',
}

const TYPE_VARIANT: Record<BOMType, 'info' | 'warning'> = {
  ASSEMBLY: 'info',
  DISASSEMBLY: 'warning',
}

const columns = [
  { key: 'bomNumber', label: 'BOM #', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'type', label: 'Type', filterable: true },
  { key: 'parentPart', label: 'Product' },
  { key: 'components', label: 'Components', align: 'right' as const },
  { key: 'version', label: 'Ver.', align: 'right' as const },
  { key: 'estimatedCost', label: 'Est. Cost', align: 'right' as const, sortable: true },
  { key: 'status', label: 'Status', filterable: true },
  { key: 'createdAt', label: 'Created', sortable: true },
  { key: 'actions', label: '' },
]

function BOMListPage() {
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      mockBOMs.map((b) => ({
        id: b.id,
        bomNumber: b.bomNumber,
        name: b.name,
        type: b.type,
        parentPart: b.parentPartName,
        components: b.items.length,
        version: `v${b.version}`,
        estimatedCost: b.estimatedCost,
        estimatedCostDisplay: formatCurrency(b.estimatedCost),
        status: b.status,
        createdAt: formatDate(b.createdAt),
      })),
    []
  )

  const assemblyBOMs = useMemo(() => rows.filter((r) => r.type === 'ASSEMBLY'), [rows])
  const disassemblyBOMs = useMemo(() => rows.filter((r) => r.type === 'DISASSEMBLY'), [rows])
  const activeBOMs = useMemo(() => rows.filter((r) => r.status === 'Active'), [rows])

  const stats: StatCardData[] = [
    { label: 'Total BOMs', value: rows.length },
    { label: 'Assembly', value: assemblyBOMs.length },
    { label: 'Disassembly', value: disassemblyBOMs.length },
    { label: 'Active', value: activeBOMs.length },
  ]

  const tabs: TabConfig[] = [
    { id: 'all', label: `All BOMs (${rows.length})`, columns, data: rows },
    { id: 'assembly', label: `Assembly (${assemblyBOMs.length})`, columns, data: assemblyBOMs },
    { id: 'disassembly', label: `Disassembly (${disassemblyBOMs.length})`, columns, data: disassemblyBOMs },
  ]

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'bomNumber') {
      return {
        display: (
          <Link to={`/wms/bom/${row.id}`} className="font-medium text-primary hover:underline">
            {value as string}
          </Link>
        ),
      }
    }
    if (key === 'type') {
      const t = value as BOMType
      return {
        display: (
          <StatusBadge variant={TYPE_VARIANT[t]}>
            {t === 'ASSEMBLY' ? 'Assembly' : 'Disassembly'}
          </StatusBadge>
        ),
      }
    }
    if (key === 'status') {
      return {
        display: (
          <StatusBadge variant={STATUS_VARIANT[value as BOMStatus]}>
            {value as string}
          </StatusBadge>
        ),
      }
    }
    if (key === 'estimatedCost') {
      return { display: <span>{row.estimatedCostDisplay as string}</span> }
    }
    if (key === 'actions') {
      return {
        display: (
          <Link
            to={`/wms/bom/${row.id}`}
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
        <h1 className="cpt-page-title">
          Bill of Materials
        </h1>
        <Button onClick={() => navigate('/wms/bom/new')}>
          <Plus className="size-4" data-icon="inline-start" />
          Create BOM
        </Button>
      </div>

      <StatsRow stats={stats} />
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-bom"
        onRowClick={(row) => navigate(`/wms/bom/${row.id}`)}
      />
    </div>
  )
}

export { BOMListPage }
export default BOMListPage
