import { Package, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { StatsRow } from '@/components/common/StatsRow'
import { ListPageShell } from '@/components/page'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { mockGRNMatches } from '@/modules/procurement/data/grn-matching'
import type { GRNMatchEntry } from '@/modules/procurement/types'

/* ── helpers ── */

function getGRNStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Matched': return 'success'
    case 'Partial': return 'warning'
    case 'Pending': return 'info'
    case 'Over Received': return 'error'
    case 'Discrepancy': return 'error'
    default: return 'neutral'
  }
}

/* ── stats ── */

const totalMatched = mockGRNMatches.filter((g) => g.status === 'Matched').length
const totalPending = mockGRNMatches.filter((g) => g.status === 'Pending' || g.status === 'Partial').length
const totalDiscrepancies = mockGRNMatches.filter(
  (g) => g.status === 'Discrepancy' || g.status === 'Over Received'
).length

/* ── table config ── */

const columns = [
  { key: 'poNumber', label: 'PO#', sortable: true },
  { key: 'partName', label: 'Part', sortable: true },
  { key: 'qtyOrdered', label: 'Qty Ordered', sortable: true, align: 'right' as const },
  { key: 'qtyReceived', label: 'Qty Received', sortable: true, align: 'right' as const },
  { key: 'qtyPending', label: 'Qty Pending', sortable: true, align: 'right' as const },
  { key: 'batchNumber', label: 'Batch#' },
  { key: 'status', label: 'Status' },
  { key: 'discrepancyNotes', label: 'Discrepancy Notes' },
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
    batchNumber: g.batchNumber ?? '-',
    status: g.status,
    discrepancyNotes: g.discrepancyNotes ?? '-',
  }))
}

const tabs: TabConfig[] = [
  { id: 'all', label: 'All', columns, data: buildData() },
  { id: 'pending', label: 'Pending', columns, data: buildData(['Pending', 'Partial']) },
  { id: 'matched', label: 'Matched', columns, data: buildData('Matched') },
  { id: 'discrepancy', label: 'Discrepancy', columns, data: buildData(['Discrepancy', 'Over Received']) },
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
      display: <span className="text-destructive text-xs">{value}</span>,
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
      title="GRN Matching"
      subtitle="Match goods received against purchase orders and flag discrepancies."
      breadcrumbs={[{ label: 'Procurement' }, { label: 'GRN Matching' }]}
      stats={
        <StatsRow
          stats={[
            { label: 'Total Entries', value: mockGRNMatches.length, icon: Package, accent: 'primary' as const },
            { label: 'Matched', value: totalMatched, icon: CheckCircle, accent: 'success' as const },
            { label: 'Pending', value: totalPending, icon: Clock, accent: 'warning' as const },
            {
              label: 'Discrepancies',
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
            title: 'No GRN entries to match',
            description: 'Goods receipts from vendors will appear here for matching against POs.',
          }}
        />
      </div>
    </ListPageShell>
  )
}

export default GRNMatchingPage
