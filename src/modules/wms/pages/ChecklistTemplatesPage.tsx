import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockChecklistTemplates } from '../data/checklist-templates'
import type { ChecklistType } from '../types'

const TYPE_LABELS: Record<ChecklistType, string> = {
  INWARD: 'Inward',
  OUTWARD: 'Outward',
  INSPECTION: 'Inspection',
  QC: 'QC',
}

const TYPE_VARIANT: Record<ChecklistType, 'success' | 'warning' | 'info' | 'neutral'> = {
  INWARD: 'info',
  INSPECTION: 'warning',
  OUTWARD: 'success',
  QC: 'neutral',
}

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'type', label: 'Type', filterable: true },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'itemCount', label: 'Items', sortable: true, align: 'right' as const },
  { key: 'status', label: 'Status', filterable: true },
  { key: 'createdBy', label: 'Created By' },
]

function ChecklistTemplatesPage() {
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      mockChecklistTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        assignedTo: `${t.assignedTo.level === 'category' ? 'Category' : t.assignedTo.level === 'subcategory' ? 'Subcategory' : 'Part'}: ${t.assignedTo.name}`,
        itemCount: t.items.length,
        status: t.isActive ? 'Active' : 'Inactive',
        createdBy: t.createdBy,
      })),
    [],
  )

  const filterByType = (type?: ChecklistType) =>
    type ? rows.filter((r) => r.type === type) : rows

  const tabs: TabConfig[] = useMemo(
    () => [
      { id: 'all', label: `All (${rows.length})`, columns, data: rows },
      { id: 'inward', label: `Inward (${filterByType('INWARD').length})`, columns, data: filterByType('INWARD') },
      { id: 'inspection', label: `Inspection (${filterByType('INSPECTION').length})`, columns, data: filterByType('INSPECTION') },
      { id: 'outward', label: `Outward (${filterByType('OUTWARD').length})`, columns, data: filterByType('OUTWARD') },
      { id: 'qc', label: `QC (${filterByType('QC').length})`, columns, data: filterByType('QC') },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  )

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'name') {
      return {
        display: (
          <button
            className="font-medium text-primary hover:underline"
            onClick={() => navigate(`/wms/checklists/${row.id}/edit`)}
          >
            {String(value)}
          </button>
        ),
      }
    }
    if (key === 'type') {
      const type = value as ChecklistType
      return {
        display: (
          <StatusBadge variant={TYPE_VARIANT[type]}>{TYPE_LABELS[type]}</StatusBadge>
        ),
      }
    }
    if (key === 'status') {
      return {
        display: (
          <StatusBadge variant={value === 'Active' ? 'success' : 'neutral'}>
            {String(value)}
          </StatusBadge>
        ),
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Checklist Templates
        </h1>
        <Button onClick={() => navigate('/wms/checklists/new')}>
          <Plus className="size-4" data-icon="inline-start" />
          Create Template
        </Button>
      </div>

      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />
    </div>
  )
}

export default ChecklistTemplatesPage
