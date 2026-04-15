import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, ArrowDownRight, RefreshCw, Plug, Replace } from 'lucide-react'

import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { StatsRow, type StatCardData } from '@/components/common/StatsRow'
import { mockRelatedParts } from '../data/related-parts'
import { mockParts } from '@/modules/ims/data/parts'
import type { PartRelationType } from '../types'

const RELATION_LABELS: Record<PartRelationType, string> = {
  REPLACEMENT: 'Replacement',
  ALTERNATIVE: 'Alternative',
  UPGRADE: 'Upgrade',
  DOWNGRADE: 'Downgrade',
  COMPATIBLE: 'Compatible',
}

const RELATION_VARIANT: Record<PartRelationType, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  REPLACEMENT: 'warning',
  ALTERNATIVE: 'info',
  UPGRADE: 'success',
  DOWNGRADE: 'neutral',
  COMPATIBLE: 'info',
}

const RELATION_ICON: Record<PartRelationType, React.ReactNode> = {
  REPLACEMENT: <Replace className="size-3.5" />,
  ALTERNATIVE: <RefreshCw className="size-3.5" />,
  UPGRADE: <ArrowUpRight className="size-3.5" />,
  DOWNGRADE: <ArrowDownRight className="size-3.5" />,
  COMPATIBLE: <Plug className="size-3.5" />,
}

const columns = [
  { key: 'sourcePart', label: 'Source Part', sortable: true },
  { key: 'relation', label: 'Relation' },
  { key: 'relatedPart', label: 'Related Part', sortable: true },
  { key: 'sourceBrand', label: 'Source Brand' },
  { key: 'relatedBrand', label: 'Related Brand' },
  { key: 'category', label: 'Category' },
  { key: 'priority', label: 'Priority', align: 'right' as const, sortable: true },
  { key: 'notes', label: 'Notes' },
  { key: 'status', label: 'Status' },
]

function RelatedPartsPage() {
  const rows = useMemo(
    () =>
      mockRelatedParts.map((rp) => {
        const source = mockParts.find((p) => p.id === rp.partId)
        const related = mockParts.find((p) => p.id === rp.relatedPartId)
        return {
          id: rp.id,
          sourcePart: source?.name ?? rp.partId,
          sourcePartId: rp.partId,
          sourceBrand: source?.brand ?? '—',
          relation: rp.relationType,
          relatedPart: related?.name ?? rp.relatedPartId,
          relatedPartId: rp.relatedPartId,
          relatedBrand: related?.brand ?? '—',
          category: source?.categoryName ?? '—',
          priority: rp.priority,
          notes: rp.notes ?? '—',
          status: rp.isActive ? 'Active' : 'Inactive',
        }
      }),
    []
  )

  const alternatives = useMemo(() => rows.filter((r) => r.relation === 'ALTERNATIVE'), [rows])
  const upgrades = useMemo(() => rows.filter((r) => r.relation === 'UPGRADE'), [rows])
  const downgrades = useMemo(() => rows.filter((r) => r.relation === 'DOWNGRADE'), [rows])
  const compatible = useMemo(() => rows.filter((r) => r.relation === 'COMPATIBLE'), [rows])

  const stats: StatCardData[] = [
    { label: 'Total Mappings', value: rows.length },
    { label: 'Alternatives', value: alternatives.length },
    { label: 'Upgrades', value: upgrades.length },
    { label: 'Compatible', value: compatible.length },
  ]

  const tabs: TabConfig[] = [
    { id: 'all', label: `All (${rows.length})`, columns, data: rows },
    { id: 'alternatives', label: `Alternatives (${alternatives.length})`, columns, data: alternatives },
    { id: 'upgrades', label: `Upgrades (${upgrades.length})`, columns, data: upgrades },
    { id: 'downgrades', label: `Downgrades (${downgrades.length})`, columns, data: downgrades },
    { id: 'compatible', label: `Compatible (${compatible.length})`, columns, data: compatible },
  ]

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'sourcePart') {
      return {
        display: (
          <span className="font-medium">{value as string}</span>
        ),
      }
    }
    if (key === 'relation') {
      const rel = value as PartRelationType
      return {
        display: (
          <StatusBadge variant={RELATION_VARIANT[rel]}>
            <span className="mr-1">{RELATION_ICON[rel]}</span>
            {RELATION_LABELS[rel]}
          </StatusBadge>
        ),
      }
    }
    if (key === 'relatedPart') {
      return {
        display: (
          <span className="flex items-center gap-1 font-medium">
            <ArrowRight className="size-3 text-muted-foreground" />
            {value as string}
          </span>
        ),
      }
    }
    if (key === 'status') {
      return {
        display: (
          <StatusBadge variant={value === 'Active' ? 'success' : 'neutral'}>
            {value as string}
          </StatusBadge>
        ),
      }
    }
    if (key === 'priority') {
      return {
        display: (
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {value as number}
          </span>
        ),
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Related & Replaceable Parts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage part alternatives, upgrades, downgrades, and compatibility mappings
          </p>
        </div>
      </div>

      <StatsRow stats={stats} />
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />
    </div>
  )
}

export { RelatedPartsPage }
export default RelatedPartsPage
