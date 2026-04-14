import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'

import type { PaintJob, PaintStatus, PaintPanelType } from '../types'
import { mockPaintJobs } from '../data/paint-jobs'

const PAINT_STATUS_LABELS: Record<PaintStatus, string> = {
  AWAITING_PAINT: 'Awaiting Paint',
  IN_PAINT: 'In Paint',
  READY_FOR_COLLECTION: 'Ready for Collection',
  COLLECTED: 'Collected',
}

const PAINT_STATUS_VARIANT: Record<PaintStatus, StatusBadgeVariant> = {
  AWAITING_PAINT: 'warning',
  IN_PAINT: 'info',
  READY_FOR_COLLECTION: 'success',
  COLLECTED: 'neutral',
}

const PANEL_LABELS: Record<PaintPanelType, string> = {
  TOP_COVER: 'Top Cover',
  BOTTOM_COVER: 'Bottom Cover',
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function PaintPage() {
  const [paintJobs, setPaintJobs] = useState<PaintJob[]>(mockPaintJobs)

  const handleAction = (
    jobId: string,
    action: 'start' | 'ready' | 'collect',
  ) => {
    setPaintJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job
        switch (action) {
          case 'start':
            toast.success(`Painting started for ${job.deviceBarcode} - ${PANEL_LABELS[job.panelType]}`)
            return {
              ...job,
              status: 'IN_PAINT' as const,
              startedAt: new Date().toISOString(),
              assignedTo: job.assignedTo ?? 'Current User',
            }
          case 'ready':
            toast.success(`Paint ready for collection: ${job.deviceBarcode}`)
            return {
              ...job,
              status: 'READY_FOR_COLLECTION' as const,
              completedAt: new Date().toISOString(),
            }
          case 'collect':
            toast.success(`Panel collected: ${job.deviceBarcode}`)
            return { ...job, status: 'COLLECTED' as const }
          default:
            return job
        }
      }),
    )
  }

  const statusCounts = useMemo(() => {
    const counts: Record<PaintStatus, number> = {
      AWAITING_PAINT: 0,
      IN_PAINT: 0,
      READY_FOR_COLLECTION: 0,
      COLLECTED: 0,
    }
    paintJobs.forEach((j) => counts[j.status]++)
    return counts
  }, [paintJobs])

  const buildRows = useCallback(
    (filtered: PaintJob[]) =>
      filtered.map((job) => ({
        id: job.id,
        barcode: job.deviceBarcode,
        panel: PANEL_LABELS[job.panelType],
        status: job.status,
        assignedTo: job.assignedTo ?? '-',
        started: formatDate(job.startedAt),
        completed: formatDate(job.completedAt),
        _status: job.status,
      })),
    [],
  )

  const columns = [
    { key: 'barcode', label: 'Device Barcode', sortable: true },
    { key: 'panel', label: 'Panel' },
    { key: 'status', label: 'Status' },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'started', label: 'Started', sortable: true },
    { key: 'completed', label: 'Completed', sortable: true },
    { key: 'actions', label: 'Actions' },
  ]

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'awaiting',
        label: `Awaiting Paint (${statusCounts.AWAITING_PAINT})`,
        columns,
        data: buildRows(paintJobs.filter((j) => j.status === 'AWAITING_PAINT')),
      },
      {
        id: 'in-paint',
        label: `In Paint (${statusCounts.IN_PAINT})`,
        columns,
        data: buildRows(paintJobs.filter((j) => j.status === 'IN_PAINT')),
      },
      {
        id: 'ready',
        label: `Ready (${statusCounts.READY_FOR_COLLECTION})`,
        columns,
        data: buildRows(
          paintJobs.filter((j) => j.status === 'READY_FOR_COLLECTION'),
        ),
      },
      {
        id: 'all',
        label: `All (${paintJobs.length})`,
        columns,
        data: buildRows(paintJobs),
      },
    ],
    [paintJobs, statusCounts, buildRows],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'status') {
        const status = value as PaintStatus
        return {
          display: (
            <StatusBadge variant={PAINT_STATUS_VARIANT[status]}>
              {PAINT_STATUS_LABELS[status]}
            </StatusBadge>
          ),
        }
      }
      if (key === 'actions') {
        const status = row._status as PaintStatus
        const jobId = row.id as string
        return {
          display: (
            <div className="flex gap-1">
              {status === 'AWAITING_PAINT' && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleAction(jobId, 'start')}
                >
                  Start Painting
                </Button>
              )}
              {status === 'IN_PAINT' && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleAction(jobId, 'ready')}
                >
                  Mark Ready
                </Button>
              )}
              {status === 'READY_FOR_COLLECTION' && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleAction(jobId, 'collect')}
                >
                  Collect
                </Button>
              )}
            </div>
          ),
        }
      }
      return null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Paint Shop</h1>
        <p className="text-sm text-muted-foreground">
          Track panel painting jobs through the paint shop workflow.
        </p>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(statusCounts) as PaintStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-2">
            <StatusBadge variant={PAINT_STATUS_VARIANT[status]}>
              {PAINT_STATUS_LABELS[status]}
            </StatusBadge>
            <span className="text-sm font-medium">{statusCounts[status]}</span>
          </div>
        ))}
      </div>

      {/* Paint Jobs Table */}
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />
    </div>
  )
}

export { PaintPage }
