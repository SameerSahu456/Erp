import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  FileText,
  ShoppingCart,
  Clock,
  IndianRupee,
  Star,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { PageHeader } from '@/components/page'
import {
  ChartDefs,
  PremiumTooltip,
  PREMIUM_TOOLTIP_CURSOR_BAR,
  CHART_COLORS,
  horizontalFill,
  radialFill,
  type ChartAccent,
} from '@/components/common/chartTheme'

import { mockPurchaseRequests } from '@/modules/procurement/data/purchase-requests'
import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'
import { mockVendors } from '@/modules/procurement/data/vendors'

// ── Formatters ──

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

const formatShortCurrency = (value: number) => {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`
  return formatCurrency(value)
}

// ── Status helpers ──

function getPRStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Submitted': return 'info'
    case 'Under Review': return 'warning'
    case 'Approved': return 'success'
    case 'Partially Approved': return 'warning'
    case 'Rejected': return 'error'
    case 'Converted to PO': return 'success'
    default: return 'neutral'
  }
}

// ── KPI calculations ──

const openPRs = mockPurchaseRequests.filter(
  (pr) => pr.status !== 'Rejected' && pr.status !== 'Converted to PO'
).length

const activePOs = mockPurchaseOrders.filter(
  (po) => po.status !== 'Closed' && po.status !== 'Cancelled'
).length

const pendingApprovalCount = mockPurchaseRequests.filter(
  (pr) =>
    pr.status === 'Submitted' ||
    pr.status === 'Under Review' ||
    pr.status === 'Partially Approved'
).length

const totalSpendThisMonth = mockPurchaseOrders
  .filter((po) => po.status !== 'Draft' && po.status !== 'Cancelled')
  .reduce((sum, po) => sum + po.grandTotal, 0)

// ── Chart data ──

const prStatusAccents: Record<string, ChartAccent> = {
  Draft: 'slate',
  Submitted: 'indigo',
  'Under Review': 'amber',
  Approved: 'emerald',
  'Partially Approved': 'warning',
  Rejected: 'danger',
  'Converted to PO': 'teal',
}

const prStatusSolid = (status: string): string =>
  CHART_COLORS[prStatusAccents[status] ?? 'slate'].solid

const prStatusData = Object.entries(
  mockPurchaseRequests.reduce<Record<string, number>>((acc, pr) => {
    acc[pr.status] = (acc[pr.status] || 0) + 1
    return acc
  }, {})
).map(([name, value]) => ({ name, value }))

const poSpendByVendor = Object.values(
  mockPurchaseOrders.reduce<Record<string, { name: string; spend: number }>>(
    (acc, po) => {
      if (!acc[po.vendorName]) acc[po.vendorName] = { name: po.vendorName, spend: 0 }
      acc[po.vendorName].spend += po.grandTotal
      return acc
    },
    {}
  )
)
  .sort((a, b) => b.spend - a.spend)
  .slice(0, 8)

// ── Lists ──

const recentPRs = [...mockPurchaseRequests]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5)

const pendingPRs = mockPurchaseRequests.filter(
  (pr) =>
    pr.status === 'Submitted' ||
    pr.status === 'Under Review' ||
    pr.status === 'Partially Approved'
)

const topVendors = [...mockVendors]
  .sort((a, b) => b.totalSpend - a.totalSpend)
  .slice(0, 5)

// ── Custom label for pie chart ──

const renderPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}) => {
  if (percent < 0.08) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ── Star rating renderer ──

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3.5 ${
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  )
}

// ── Component ──

function ProcurementDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement Dashboard"
        subtitle="Overview of purchase requests, orders, vendor performance, and spend analytics."
        breadcrumbs={[{ label: 'Procurement' }, { label: 'Dashboard' }]}
      />

      {/* KPI Stats Row */}
      <StatsRow
        stats={[
          {
            label: 'Open PRs',
            value: openPRs,
            icon: FileText,
            trend: { value: 5, isPositive: true },
            accent: 'info' as const,
          },
          {
            label: 'Active POs',
            value: activePOs,
            icon: ShoppingCart,
            trend: { value: 12, isPositive: true },
            accent: 'violet' as const,
          },
          {
            label: 'Pending Approvals',
            value: pendingApprovalCount,
            icon: Clock,
            accent: 'warning' as const,
          },
          {
            label: 'Total Spend This Month',
            value: formatShortCurrency(totalSpendThisMonth),
            icon: IndianRupee,
            trend: { value: 8, isPositive: true },
            accent: 'teal' as const,
          },
        ]}
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PR Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">PR Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartDefs />
                  <Pie
                    data={prStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderPieLabel}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {prStatusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={radialFill(prStatusAccents[entry.name] ?? 'slate')}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <PremiumTooltip
                        formatter={(value, name) => [
                          `${value} request${Number(value) !== 1 ? 's' : ''}`,
                          name,
                        ]}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {prStatusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span
                    className="inline-block size-2.5 rounded-full ring-2 ring-card"
                    style={{ backgroundColor: prStatusSolid(entry.name) }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PO Spend by Vendor */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">PO Spend by Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={poSpendByVendor}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                >
                  <ChartDefs />
                  <CartesianGrid strokeDasharray="3 6" horizontal={false} className="stroke-border/50" />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatShortCurrency(v)}
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={PREMIUM_TOOLTIP_CURSOR_BAR}
                    content={
                      <PremiumTooltip
                        formatter={(value) => [formatCurrency(Number(value)), 'Spend']}
                      />
                    }
                  />
                  <Bar
                    dataKey="spend"
                    fill={horizontalFill('violet')}
                    radius={[0, 6, 6, 0]}
                    barSize={20}
                    filter="url(#cpt-chart-shadow)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent PRs & Top Vendors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Purchase Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Recent Purchase Requests</CardTitle>
            <Link
              to="/procurement/pr"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPRs.map((pr) => (
                <Link
                  key={pr.id}
                  to={`/procurement/pr/${pr.id}`}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">
                        {pr.prNumber}
                      </span>
                      <StatusBadge variant={getPRStatusVariant(pr.status)}>
                        {pr.status}
                      </StatusBadge>
                    </div>
                    <p className="truncate text-sm">{pr.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {pr.requestedBy} &middot; {pr.requestedDate}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Top Vendors</CardTitle>
            <Link
              to="/procurement/vendors"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topVendors.map((vendor) => (
                <div key={vendor.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/procurement/vendors/${vendor.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {vendor.name}
                      </Link>
                      <StarRating rating={vendor.rating} />
                    </div>
                    <span className="shrink-0 text-sm font-semibold font-sans">
                      {formatShortCurrency(vendor.totalSpend)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-xs text-muted-foreground">
                      On-time {vendor.onTimeDeliveryRate}%
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${vendor.onTimeDeliveryRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingPRs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pendingPRs.map((pr) => (
                <PendingApprovalCard key={pr.id} pr={pr} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

type PendingApprovalCardPR = (typeof mockPurchaseRequests)[number]

function PendingApprovalCard({ pr }: { pr: PendingApprovalCardPR }) {
  const [pending, setPending] = useState<null | 'approve' | 'reject'>(null)

  const handleConfirm = () => {
    if (pending === 'approve') toast.success(`${pr.prNumber} approved`)
    else if (pending === 'reject') toast.success(`${pr.prNumber} rejected`)
    setPending(null)
  }

  return (
    <div className="flex flex-col justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Link
            to={`/procurement/pr/${pr.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {pr.prNumber}
          </Link>
          <StatusBadge variant={getPRStatusVariant(pr.status)}>
            {pr.status}
          </StatusBadge>
        </div>
        <p className="text-sm font-medium">{pr.title}</p>
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>{pr.requestedBy} &middot; {pr.department}</p>
          <p className="font-sans font-semibold text-foreground">
            {formatCurrency(pr.totalEstimated)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
          onClick={() => setPending('reject')}
        >
          <XCircle className="size-3.5" />
          Reject
        </Button>
        <Button size="sm" className="flex-1 gap-1.5" onClick={() => setPending('approve')}>
          <CheckCircle2 className="size-3.5" />
          Approve
        </Button>
      </div>
      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'approve'
                ? `Approve ${pr.prNumber}?`
                : `Reject ${pr.prNumber}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending === 'approve'
                ? `This will approve a request worth ${formatCurrency(pr.totalEstimated)} from ${pr.requestedBy}.`
                : `This will reject the request from ${pr.requestedBy}. The requester will be notified.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={pending === 'reject' ? 'destructive' : 'default'}
              onClick={handleConfirm}
            >
              {pending === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ProcurementDashboard
