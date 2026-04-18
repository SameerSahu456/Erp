import { useMemo } from 'react'
import {
  Package,
  Wrench,
  ClipboardCheck,
  Truck,
  Search,
  Eye,
  Clock,
  Paintbrush,
  ShieldCheck,
  PackageCheck,
  Warehouse,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { WorkflowStepper, type StepConfig } from '@/components/common/WorkflowStepper'
import { Timeline, type TimelineEntry } from '@/components/common/Timeline'
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  WMS_WORKFLOW_STAGES,
  type DeviceStatus,
} from '../types'
import { mockDevices } from '../data/devices'
import { mockStockMovements } from '../data/stock-movements'

// Map device statuses to workflow stage IDs
const STATUS_TO_STAGE: Record<DeviceStatus, string> = {
  RECEIVED: 'inward',
  PENDING_INSPECTION: 'inward',
  UNDER_INSPECTION: 'inspection',
  INSPECTED: 'inspection',
  WAITING_FOR_SPARES: 'repair',
  READY_FOR_REPAIR: 'repair',
  UNDER_REPAIR: 'repair',
  IN_L3_REPAIR: 'repair',
  IN_DISPLAY_REPAIR: 'repair',
  IN_BATTERY_BOOST: 'repair',
  IN_PAINT_SHOP: 'repair',
  AWAITING_QC: 'qc',
  UNDER_QC: 'qc',
  READY_FOR_STOCK: 'inventory',
  IN_STOCK: 'inventory',
  AWAITING_OUTWARD_QC: 'outward-qc',
  UNDER_OUTWARD_QC: 'outward-qc',
  READY_FOR_DISPATCH: 'dispatch',
  DISPATCHED: 'dispatch',
  SCRAPPED: 'inventory',
}

const REPAIR_STATUSES: DeviceStatus[] = [
  'WAITING_FOR_SPARES',
  'READY_FOR_REPAIR',
  'UNDER_REPAIR',
  'IN_L3_REPAIR',
  'IN_DISPLAY_REPAIR',
  'IN_BATTERY_BOOST',
  'IN_PAINT_SHOP',
]

// Analytics stage definitions — the key pipeline stages the user tracks
const ANALYTICS_STAGES = [
  { key: 'assignmentPending', label: 'Assignment Pending', color: '#94a3b8', statuses: ['RECEIVED'] as DeviceStatus[] },
  { key: 'pendingInspection', label: 'Pending Inspection', color: '#f59e0b', statuses: ['PENDING_INSPECTION', 'UNDER_INSPECTION'] as DeviceStatus[] },
  { key: 'inspected', label: 'Inspected', color: '#6366f1', statuses: ['INSPECTED'] as DeviceStatus[] },
  { key: 'waitingForSpares', label: 'Waiting for Spares', color: '#ef4444', statuses: ['WAITING_FOR_SPARES'] as DeviceStatus[] },
  { key: 'inPaint', label: 'In Paint', color: '#ec4899', statuses: ['IN_PAINT_SHOP'] as DeviceStatus[] },
  { key: 'inRepair', label: 'In Repair', color: '#8b5cf6', statuses: ['READY_FOR_REPAIR', 'UNDER_REPAIR', 'IN_L3_REPAIR', 'IN_DISPLAY_REPAIR', 'IN_BATTERY_BOOST'] as DeviceStatus[] },
  { key: 'inQC', label: 'In QC', color: '#3b82f6', statuses: ['AWAITING_QC', 'UNDER_QC'] as DeviceStatus[] },
  { key: 'readyForStock', label: 'Ready for Stock', color: '#14b8a6', statuses: ['READY_FOR_STOCK'] as DeviceStatus[] },
  { key: 'inStock', label: 'In Stock', color: '#22c55e', statuses: ['IN_STOCK'] as DeviceStatus[] },
] as const

const PIE_COLORS = ['#94a3b8', '#f59e0b', '#6366f1', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#22c55e']

function WmsDashboard() {
  // Count devices per stage
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const stage of WMS_WORKFLOW_STAGES) {
      counts[stage.id] = 0
    }
    for (const device of mockDevices) {
      const stageId = STATUS_TO_STAGE[device.status]
      if (stageId && counts[stageId] !== undefined) {
        counts[stageId]++
      }
    }
    return counts
  }, [])

  // Find active stage (stage with most devices)
  const activeStageId = useMemo(() => {
    let maxCount = 0
    let maxStageId: string = WMS_WORKFLOW_STAGES[0].id
    for (const stage of WMS_WORKFLOW_STAGES) {
      const count = stageCounts[stage.id] ?? 0
      if (count > maxCount) {
        maxCount = count
        maxStageId = stage.id
      }
    }
    return maxStageId
  }, [stageCounts])

  // Build stepper steps
  const workflowSteps: StepConfig[] = useMemo(() => {
    const activeIdx = WMS_WORKFLOW_STAGES.findIndex((s) => s.id === activeStageId)
    return WMS_WORKFLOW_STAGES.map((stage, idx) => ({
      id: stage.id,
      label: stage.label,
      description: `${stageCounts[stage.id]} devices`,
      status:
        idx < activeIdx
          ? 'completed' as const
          : idx === activeIdx
            ? 'active' as const
            : 'pending' as const,
    }))
  }, [activeStageId, stageCounts])

  // Analytics stage counts
  const analyticsCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const stage of ANALYTICS_STAGES) {
      counts[stage.key] = mockDevices.filter((d) =>
        stage.statuses.includes(d.status)
      ).length
    }
    return counts
  }, [])

  // Chart data for bar chart
  const barChartData = useMemo(() =>
    ANALYTICS_STAGES.map((stage) => ({
      name: stage.label,
      count: analyticsCounts[stage.key],
      color: stage.color,
    })),
    [analyticsCounts]
  )

  // Pie chart data (exclude zero-count stages)
  const pieChartData = useMemo(() =>
    ANALYTICS_STAGES
      .map((stage, i) => ({
        name: stage.label,
        value: analyticsCounts[stage.key],
        color: PIE_COLORS[i],
      }))
      .filter((d) => d.value > 0),
    [analyticsCounts]
  )

  // Stats KPIs
  const totalDevices = mockDevices.length
  const inRepair = mockDevices.filter((d) => REPAIR_STATUSES.includes(d.status)).length
  const pendingQC = mockDevices.filter(
    (d) => d.status === 'AWAITING_QC' || d.status === 'UNDER_QC'
  ).length
  const readyForDispatch = mockDevices.filter(
    (d) => d.status === 'READY_FOR_DISPATCH'
  ).length

  // Status breakdown table
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<DeviceStatus, number>> = {}
    for (const device of mockDevices) {
      counts[device.status] = (counts[device.status] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([status, count]) => ({
        status: status as DeviceStatus,
        statusLabel: DEVICE_STATUS_LABELS[status as DeviceStatus],
        statusVariant: DEVICE_STATUS_VARIANT[status as DeviceStatus],
        count,
        percentage: `${((count / totalDevices) * 100).toFixed(1)}%`,
      }))
      .sort((a, b) => b.count - a.count)
  }, [totalDevices])

  const breakdownTabs: TabConfig[] = [
    {
      id: 'breakdown',
      label: 'All Statuses',
      columns: [
        { key: 'statusLabel', label: 'Status' },
        { key: 'count', label: 'Count', sortable: true, align: 'right' },
        { key: 'percentage', label: 'Percentage', align: 'right' },
      ],
      data: statusCounts.map((row) => ({
        statusLabel: row.statusLabel,
        statusVariant: row.statusVariant,
        count: row.count,
        percentage: row.percentage,
      })),
    },
  ]

  const breakdownFormatter: CellFormatter = (value, key, row) => {
    if (key === 'statusLabel') {
      return {
        display: (
          <StatusBadge variant={row.statusVariant as 'success' | 'warning' | 'error' | 'info' | 'neutral'}>
            {value as string}
          </StatusBadge>
        ),
      }
    }
    return null
  }

  // Recent activity timeline from stock movements
  const recentTimeline: TimelineEntry[] = useMemo(() => {
    const sorted = [...mockStockMovements]
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
      .slice(0, 8)

    return sorted.map((mv) => ({
      id: mv.id,
      title: `${mv.deviceBarcode}: ${DEVICE_STATUS_LABELS[mv.fromStatus]} → ${DEVICE_STATUS_LABELS[mv.toStatus]}`,
      description: mv.notes,
      user: mv.changedBy,
      timestamp: new Date(mv.changedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      variant: mv.toStatus === 'DISPATCHED'
        ? 'success' as const
        : mv.toStatus === 'SCRAPPED'
          ? 'error' as const
          : 'default' as const,
    }))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="cpt-page-title">
        Warehouse Dashboard
      </h1>

      {/* Workflow Stepper */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowStepper steps={workflowSteps} />
        </CardContent>
      </Card>

      {/* KPI Stats — Row 1: Primary overview */}
      <StatsRow
        stats={[
          {
            label: 'Total Devices',
            value: totalDevices,
            icon: Package,
            trend: { value: 12, isPositive: true },
          },
          {
            label: 'In Repair',
            value: inRepair,
            icon: Wrench,
            trend: { value: 5, isPositive: false },
          },
          {
            label: 'Pending QC',
            value: pendingQC,
            icon: ClipboardCheck,
            trend: { value: 8, isPositive: true },
          },
          {
            label: 'Ready for Dispatch',
            value: readyForDispatch,
            icon: Truck,
            trend: { value: 15, isPositive: true },
          },
        ]}
      />

      {/* KPI Stats — Row 2: Pipeline analytics */}
      <StatsRow
        stats={[
          {
            label: 'Assignment Pending',
            value: analyticsCounts.assignmentPending,
            icon: Clock,
            trend: { value: 3, isPositive: false },
          },
          {
            label: 'Pending Inspection',
            value: analyticsCounts.pendingInspection,
            icon: Search,
            trend: { value: 6, isPositive: false },
          },
          {
            label: 'Inspected',
            value: analyticsCounts.inspected,
            icon: Eye,
            trend: { value: 10, isPositive: true },
          },
          {
            label: 'Waiting for Spares',
            value: analyticsCounts.waitingForSpares,
            icon: Package,
            trend: { value: 2, isPositive: false },
          },
        ]}
      />

      {/* KPI Stats — Row 3: Downstream pipeline */}
      <StatsRow
        stats={[
          {
            label: 'In Paint',
            value: analyticsCounts.inPaint,
            icon: Paintbrush,
          },
          {
            label: 'In Repair',
            value: analyticsCounts.inRepair,
            icon: Wrench,
            trend: { value: 4, isPositive: false },
          },
          {
            label: 'In QC',
            value: analyticsCounts.inQC,
            icon: ShieldCheck,
            trend: { value: 7, isPositive: true },
          },
          {
            label: 'Ready for Stock',
            value: analyticsCounts.readyForStock,
            icon: PackageCheck,
            trend: { value: 9, isPositive: true },
          },
        ]}
      />

      {/* KPI Stats — Row 4: Stock */}
      <StatsRow
        stats={[
          {
            label: 'In Stock',
            value: analyticsCounts.inStock,
            icon: Warehouse,
            trend: { value: 14, isPositive: true },
          },
        ]}
        className="lg:grid-cols-4"
      />

      {/* Charts — Pipeline Bar + Distribution Pie */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline Stage Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Devices by Pipeline Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={barChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="count" name="Devices" radius={[0, 4, 4, 0]}>
                  {barChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
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
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout: Status Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Device Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <BusinessMetricsTable
              tabs={breakdownTabs}
              cellFormatter={breakdownFormatter}
              pageSize={25}
            />
          </CardContent>
        </Card>

        {/* Right: Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline entries={recentTimeline} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export { WmsDashboard }
export default WmsDashboard
