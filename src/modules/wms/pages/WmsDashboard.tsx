import { useMemo } from 'react'
import {
  Package,
  Wrench,
  ClipboardCheck,
  Truck,
} from 'lucide-react'

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
      <h1 className="font-display text-2xl font-semibold tracking-tight">
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

      {/* KPI Stats */}
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

      {/* Two-column layout */}
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
