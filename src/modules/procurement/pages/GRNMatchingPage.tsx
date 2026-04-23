import { Package, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/common/StatsRow'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { mockGRNMatches } from '@/modules/procurement/data/grn-matching'
import type { GRNMatchEntry } from '@/modules/procurement/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

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

/* ── donut chart data ── */

const STATUS_COLORS: Record<string, string> = {
  Matched: '#22c55e',
  Partial: '#f59e0b',
  Pending: '#6366f1',
  'Over Received': '#ef4444',
  Discrepancy: '#ef4444',
}

const statusCounts = mockGRNMatches.reduce<Record<string, number>>((acc, g) => {
  acc[g.status] = (acc[g.status] || 0) + 1
  return acc
}, {})

const chartData = Object.entries(statusCounts).map(([name, value]) => ({
  name,
  value,
}))

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
        <Link to={`/procurement/po/${row['poId']}`} className="text-primary hover:underline font-medium">
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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="cpt-page-title">GRN Matching</h2>
        <p className="text-sm text-muted-foreground">Match goods received against purchase orders</p>
      </div>

      {/* Stats Row */}
      <StatsRow
        stats={[
          {
            label: 'Total Entries',
            value: mockGRNMatches.length,
            icon: Package,
          },
          {
            label: 'Matched',
            value: totalMatched,
            icon: CheckCircle,
          },
          {
            label: 'Pending',
            value: totalPending,
            icon: Clock,
          },
          {
            label: 'Discrepancies',
            value: totalDiscrepancies,
            icon: AlertTriangle,
            ...(totalDiscrepancies > 0 ? { className: 'border-amber-500/40 bg-amber-50 dark:bg-amber-950/20' } : {}),
          },
        ]}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — Table */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <BusinessMetricsTable
              tabs={tabs}
              cellFormatter={cellFormatter}
              pageSize={10}
              persistKey="procurement-grn"
            />
          </CardContent>
        </Card>

        {/* Right — Donut Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] ?? '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {chartData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[entry.name] ?? '#94a3b8' }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default GRNMatchingPage
