import { Package, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { StatsRow } from '@/components/common/display/StatsRow'
import { ListPageShell } from '@/components/page-shells'
import { Typography } from "@/components/ui/typography"
import { BusinessMetricsTable } from '@/components/common/tables/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/tables/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { mockGRNMatches } from '@/modules/procurement/data/grn-matching'
import type { GRNMatchEntry } from '@/modules/procurement/types'
import { getGRNStatusVariant } from '../../components/grns/GRNDetailBody'
import { GRN_STRINGS } from '../../components/grns/grns.strings'

/* ── stats ── */

const totalMatched = mockGRNMatches.filter((g) => g.status === 'Matched').length
const totalPending = mockGRNMatches.filter((g) => g.status === 'Pending' || g.status === 'Partial').length
const totalDiscrepancies = mockGRNMatches.filter(
  (g) => g.status === 'Discrepancy' || g.status === 'Over Received'
).length

/* ── table config ── */

const columns = [
  { key: 'poNumber', label: GRN_STRINGS.list.columns.poNumber, sortable: true },
  { key: 'partName', label: GRN_STRINGS.list.columns.partName, sortable: true },
  { key: 'qtyOrdered', label: GRN_STRINGS.list.columns.qtyOrdered, sortable: true, align: 'right' as const },
  { key: 'qtyReceived', label: GRN_STRINGS.list.columns.qtyReceived, sortable: true, align: 'right' as const },
  { key: 'qtyPending', label: GRN_STRINGS.list.columns.qtyPending, sortable: true, align: 'right' as const },
  { key: 'batchNumber', label: GRN_STRINGS.list.columns.batchNumber },
  { key: 'status', label: GRN_STRINGS.list.columns.status },
  { key: 'discrepancyNotes', label: GRN_STRINGS.list.columns.discrepancyNotes },
]

function buildData(filter?: GRNMatchEntry['status'] | GRNMatchEntry['status'][]) {
  let entries = mockGRNMatches
  if (filter) {
    const filters = Array.isArray(filter) ? filter : [filter]
    entries = entries.filter((g) => filters.includes(g.status))
  }
  return entries.map((g) => ({
    id: g.id,
    poId: g.poId,
    poNumber: g.poNumber,
    partName: g.partName,
    qtyOrdered: g.qtyOrdered,
    qtyReceived: g.qtyReceived,
    qtyPending: g.qtyPending,
    batchNumber: g.batchNumber ?? '—',
    status: g.status,
    discrepancyNotes: g.discrepancyNotes ?? '—',
  }))
}

const tabs: TabConfig[] = [
  { id: 'all', label: GRN_STRINGS.list.tabs.all, columns, data: buildData() },
  { id: 'pending', label: GRN_STRINGS.list.tabs.pending, columns, data: buildData(['Pending', 'Partial']) },
  { id: 'matched', label: GRN_STRINGS.list.tabs.matched, columns, data: buildData('Matched') },
  { id: 'discrepancy', label: GRN_STRINGS.list.tabs.discrepancy, columns, data: buildData(['Discrepancy', 'Over Received']) },
]

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'poNumber' && typeof value === 'string') {
    return {
      display: (
        <Link
          to={`/procurement/po/${row['poId']}`}
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:underline font-medium"
        >
          {value}
        </Link>
      ),
    }
  }
  if (key === 'status' && typeof value === 'string') {
    const variant = getGRNStatusVariant(value)
    return {
      display: <StatusBadge variant={variant}>{value}</StatusBadge>,
      className: (value === 'Discrepancy' || value === 'Over Received') ? 'bg-destructive/10' : undefined,
    }
  }
  if (key === 'discrepancyNotes' && typeof value === 'string' && value !== '-') {
    return {
      display: <Typography variant="helper" tone="danger" asChild><span>{value}</span></Typography>,
      className: 'bg-destructive/10',
    }
  }
  return null
}

/* ── page component ── */

function GRNMatchingPage() {
  const navigate = useNavigate()
  return (
    <ListPageShell
      title={GRN_STRINGS.list.title}
      subtitle={GRN_STRINGS.list.subtitle}
      breadcrumbs={[
        { label: GRN_STRINGS.list.breadcrumbs.procurement },
        { label: GRN_STRINGS.list.breadcrumbs.grnMatching },
      ]}
      stats={
        <StatsRow
          stats={[
            { label: GRN_STRINGS.list.stats.totalEntries, value: mockGRNMatches.length, icon: Package, accent: 'primary' as const },
            { label: GRN_STRINGS.list.stats.matched, value: totalMatched, icon: CheckCircle, accent: 'success' as const },
            { label: GRN_STRINGS.list.stats.pending, value: totalPending, icon: Clock, accent: 'warning' as const },
            {
              label: GRN_STRINGS.list.stats.discrepancies,
              value: totalDiscrepancies,
              icon: AlertTriangle,
              accent: 'danger' as const,
              ...(totalDiscrepancies > 0 ? { className: 'border-destructive/40 bg-destructive/5' } : {}),
            },
          ]}
        />
      }
    >
      <div className="bmt-search-lg">
        <BusinessMetricsTable
          tabs={tabs}
          cellFormatter={cellFormatter}
          pageSize={10}
          persistKey="procurement-grn"
          onRowClick={(row) => navigate(`/procurement/grn-matching/${row.id}`)}
          emptyState={{
            title: GRN_STRINGS.list.empty.title,
            description: GRN_STRINGS.list.empty.description,
          }}
        />
      </div>
    </ListPageShell>
  )
}

export default GRNMatchingPage
