import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PageHeader } from '@/components/page'
import { cn } from '@/lib/utils'
import type { DataCardProps } from '@/components/common/DataCard'
import { formatINRShort } from '@/lib/currency'

import { mockRentalAssets } from '../data/assets'
import { mockRentalContracts } from '../data/contracts'
import { mockSupportTickets, mockRentalPartners } from '../data/tickets'
import { ASSET_CATEGORY_LABELS } from '../types'

type PeriodKey = 'MTD' | 'QTD' | 'YTD'
const PERIODS: PeriodKey[] = ['MTD', 'QTD', 'YTD']

function PeriodToggle({ value, onChange }: { value: PeriodKey; onChange: (v: PeriodKey) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            'rounded-md px-3 py-1 text-[12.5px] font-medium transition-colors',
            value === p
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function RentalAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>('MTD')

  const totalAUM = useMemo(() => mockRentalAssets.reduce((s, a) => s + a.acquisitionCost, 0), [])
  const deployed = mockRentalAssets.filter((a) => a.status === 'Deployed').length
  const utilization = Math.round((deployed / mockRentalAssets.length) * 100)
  const monthlyRevenue = mockRentalContracts
    .filter((c) => c.status === 'Active' || c.status === 'Extended')
    .reduce((s, c) => s + c.monthlyRental, 0)
  const totalOverdue = mockRentalContracts.reduce((s, c) => s + c.totalOverdue, 0)
  const openTickets = mockSupportTickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length
  const activePartners = mockRentalPartners.filter((p) => p.status === 'Active').length

  const execKPIs: DataCardProps[] = [
    { label: 'AUM (Assets Under Management)', value: formatINRShort(totalAUM), sub: `${mockRentalAssets.length} assets` },
    { label: 'Monthly Recurring Revenue', value: formatINRShort(monthlyRevenue), sub: 'Active contracts', trend: { value: 12, isPositive: true } },
    { label: 'Fleet Utilization', value: `${utilization}%`, sub: `${deployed} of ${mockRentalAssets.length} deployed` },
    { label: 'DSO (Days Sales Outstanding)', value: '42 days', sub: 'Target: 45 days', trend: { value: 5, isPositive: true } },
    { label: 'Dispute Rate', value: '1.2%', sub: 'Target: < 1%', trend: { value: 0.3, isPositive: true } },
  ]

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; deployed: number; value: number }> = {}
    for (const a of mockRentalAssets) {
      const cat = ASSET_CATEGORY_LABELS[a.category]
      if (!map[cat]) map[cat] = { count: 0, deployed: 0, value: 0 }
      map[cat].count++
      if (a.status === 'Deployed') map[cat].deployed++
      map[cat].value += a.bookValue
    }
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count)
  }, [])

  const topPartners = useMemo(
    () =>
      [...mockRentalPartners]
        .filter((p) => p.status === 'Active')
        .sort((a, b) => b.deployedAssets - a.deployedAssets)
        .slice(0, 5),
    []
  )

  const supportMetrics: [string, string][] = [
    ['Open Tickets', String(openTickets)],
    ['SLA Compliance', '96%'],
    ['Avg Resolution', '6.2 hours'],
    ['Advance Replacements (MTD)', '1'],
  ]

  const totalOutstanding = totalOverdue + mockRentalPartners.reduce((s, p) => s + p.outstandingAmount, 0)
  const receivablesMetrics: [string, string][] = [
    ['Total Outstanding', formatINRShort(totalOutstanding)],
    ['Overdue (>30 days)', formatINRShort(totalOverdue)],
    ['Active Partners', String(activePartners)],
    ['Dispute Rate', '1.2%'],
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rental Analytics"
        subtitle="Executive dashboard — fleet performance, margin analysis, and partner insights."
        breadcrumbs={[{ label: 'Rentals' }, { label: 'Analytics' }]}
        actions={
          <>
            <PeriodToggle value={period} onChange={setPeriod} />
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 size-4" />
              Export
            </Button>
          </>
        }
      />

      {/* Executive KPIs */}
      <StatsRow stats={execKPIs} />

      {/* Two-column layout: 1fr / 380px on desktop */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Fleet by Category */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Fleet by Category</CardTitle>
            <span className="text-xs text-muted-foreground">{mockRentalAssets.length} total assets</span>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Deployed</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                    <TableHead className="text-right">Book Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryBreakdown.map(([cat, data]) => {
                    const ratio = data.deployed / data.count
                    return (
                      <TableRow key={cat}>
                        <TableCell className="font-medium">{cat}</TableCell>
                        <TableCell className="text-right tabular-nums">{data.count}</TableCell>
                        <TableCell className="text-right tabular-nums">{data.deployed}</TableCell>
                        <TableCell className="text-right">
                          <StatusBadge variant={ratio > 0.7 ? 'success' : ratio > 0.4 ? 'warning' : 'error'}>
                            {Math.round(ratio * 100)}%
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatINRShort(data.value)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right sidebar: Support / Partners / Receivables */}
        <div className="flex flex-col gap-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Support Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {supportMetrics.map(([k, v]) => (
                <MetricRow key={k} label={k} value={v} />
              ))}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Top Partners</CardTitle>
            </CardHeader>
            <CardContent>
              {topPartners.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-b py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.deployedAssets} assets · {p.city}
                    </div>
                  </div>
                  <StatusBadge variant={p.tier === 'Platinum' ? 'info' : p.tier === 'Gold' ? 'warning' : 'neutral'}>
                    {p.tier}
                  </StatusBadge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Receivables</CardTitle>
            </CardHeader>
            <CardContent>
              {receivablesMetrics.map(([k, v]) => (
                <MetricRow key={k} label={k} value={v} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default RentalAnalyticsPage
