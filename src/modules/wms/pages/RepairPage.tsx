import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'

import type { RepairJob, RepairType } from '../types'
import { mockRepairJobs } from '../data/repairs'

const REPAIR_TYPE_LABELS: Record<RepairType, string> = {
  L2: 'L2 Repair',
  L3: 'L3 Repair',
  DISPLAY: 'Display',
  BATTERY: 'Battery',
}

const REPAIR_TYPE_VARIANT: Record<RepairType, StatusBadgeVariant> = {
  L2: 'info',
  L3: 'warning',
  DISPLAY: 'neutral',
  BATTERY: 'success',
}

const STATUS_VARIANT: Record<RepairJob['status'], StatusBadgeVariant> = {
  Assigned: 'info',
  'In Progress': 'warning',
  Completed: 'success',
  Failed: 'error',
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function RepairPage() {
  const [jobs, setJobs] = useState<RepairJob[]>(mockRepairJobs)

  const handleAction = (jobId: string, action: 'start' | 'complete' | 'fail') => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job
        switch (action) {
          case 'start':
            toast.success(`Repair started for ${job.deviceBarcode}`)
            return { ...job, status: 'In Progress' as const, startedAt: new Date().toISOString() }
          case 'complete':
            toast.success(`Repair completed for ${job.deviceBarcode}`)
            return {
              ...job,
              status: 'Completed' as const,
              completedAt: new Date().toISOString(),
            }
          case 'fail':
            toast.error(`Repair failed for ${job.deviceBarcode}`)
            return {
              ...job,
              status: 'Failed' as const,
              completedAt: new Date().toISOString(),
            }
          default:
            return job
        }
      }),
    )
  }

  const summaryStats = useMemo(() => {
    const total = jobs.length
    const inProgress = jobs.filter((j) => j.status === 'In Progress').length
    const completedToday = jobs.filter((j) => {
      if (!j.completedAt) return false
      const today = new Date().toDateString()
      return new Date(j.completedAt).toDateString() === today
    }).length
    const reworkCount = jobs.filter((j) => j.isRework).length
    return { total, inProgress, completedToday, reworkCount }
  }, [jobs])

  const buildRows = useCallback(
    (filtered: RepairJob[]) =>
      filtered.map((job) => ({
        id: job.id,
        barcode: job.deviceBarcode,
        type: job.repairType,
        status: job.status,
        assignedTo: job.assignedTo,
        rework: job.isRework ? 'Yes' : 'No',
        isRework: job.isRework,
        started: formatDate(job.startedAt),
        notes: job.notes ?? '-',
        _status: job.status,
      })),
    [],
  )

  const columns = [
    { key: 'barcode', label: 'Device Barcode', sortable: true },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'assignedTo', label: 'Assigned To', sortable: true },
    { key: 'rework', label: 'Rework' },
    { key: 'started', label: 'Started', sortable: true },
    { key: 'notes', label: 'Notes' },
    { key: 'actions', label: 'Actions' },
  ]

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'all',
        label: 'All Jobs',
        columns,
        data: buildRows(jobs),
      },
      {
        id: 'l2',
        label: 'L2 Repair',
        columns,
        data: buildRows(jobs.filter((j) => j.repairType === 'L2')),
      },
      {
        id: 'l3',
        label: 'L3 Repair',
        columns,
        data: buildRows(jobs.filter((j) => j.repairType === 'L3')),
      },
      {
        id: 'display',
        label: 'Display',
        columns,
        data: buildRows(jobs.filter((j) => j.repairType === 'DISPLAY')),
      },
      {
        id: 'battery',
        label: 'Battery',
        columns,
        data: buildRows(jobs.filter((j) => j.repairType === 'BATTERY')),
      },
    ],
    [jobs, buildRows],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'type') {
        const repairType = value as RepairType
        return {
          display: (
            <StatusBadge variant={REPAIR_TYPE_VARIANT[repairType]}>
              {REPAIR_TYPE_LABELS[repairType]}
            </StatusBadge>
          ),
        }
      }
      if (key === 'status') {
        const status = value as RepairJob['status']
        return {
          display: (
            <StatusBadge variant={STATUS_VARIANT[status]}>{status}</StatusBadge>
          ),
        }
      }
      if (key === 'rework' && value === 'Yes') {
        return {
          className: 'bg-destructive/10 text-destructive',
          display: 'Yes',
        }
      }
      if (key === 'actions') {
        const status = row._status as RepairJob['status']
        const jobId = row.id as string
        return {
          display: (
            <div className="flex gap-1">
              {status === 'Assigned' && (
                <Button size="xs" variant="outline" onClick={() => handleAction(jobId, 'start')}>
                  Start
                </Button>
              )}
              {status === 'In Progress' && (
                <>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleAction(jobId, 'complete')}
                  >
                    Complete
                  </Button>
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={() => handleAction(jobId, 'fail')}
                  >
                    Failed
                  </Button>
                </>
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
        <h1 className="font-display text-2xl font-semibold tracking-tight">Repair Station</h1>
        <p className="text-sm text-muted-foreground">
          Manage L2, L3, Display, and Battery repair jobs.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summaryStats.total}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{summaryStats.inProgress}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{summaryStats.completedToday}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">Rework Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{summaryStats.reworkCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Repair Jobs Table */}
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />
    </div>
  )
}

export default RepairPage
