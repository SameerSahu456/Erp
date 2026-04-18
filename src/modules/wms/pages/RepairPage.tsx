import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Printer, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'

import type { RepairJob, RepairType } from '../types'
import { mockRepairJobs } from '../data/repairs'
import { mockDevices } from '../data/devices'

const REPAIR_ENGINEERS = ['Ravi Kumar', 'Priya Nair', 'Sanjay Gupta', 'Meera Joshi', 'Arjun Patel']

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

function handlePrintBarcode(barcode: string) {
  const printWindow = window.open('', '_blank', 'width=400,height=300')
  if (!printWindow) {
    toast.error('Please allow popups to print barcodes.')
    return
  }
  printWindow.document.write(`
    <html>
      <head><title>Print Barcode</title></head>
      <body style="font-family: monospace; text-align: center; padding: 40px;">
        <div style="border: 2px solid #000; padding: 20px; display: inline-block;">
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${barcode}</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

function RepairPage() {
  // Filter out DISPLAY and BATTERY repair jobs — those are handled separately
  const [jobs, setJobs] = useState<RepairJob[]>(
    mockRepairJobs.filter((j) => j.repairType !== 'DISPLAY' && j.repairType !== 'BATTERY')
  )
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignDeviceId, setAssignDeviceId] = useState('')
  const [assignEngineer, setAssignEngineer] = useState('')

  // Check if device is ready for repair (spares fulfilled + paint done)
  const isDeviceReadyForRepair = (deviceId: string): { ready: boolean; reason?: string } => {
    const device = mockDevices.find((d) => d.id === deviceId)
    if (!device) return { ready: true }

    if (device.requiresSpares && !device.sparesIssued) {
      return { ready: false, reason: 'Waiting for spares' }
    }
    if (device.requiresPaint && !device.paintCompleted) {
      return { ready: false, reason: 'Waiting for paint' }
    }
    return { ready: true }
  }

  const handleAction = (jobId: string, action: 'start' | 'complete' | 'fail') => {
    const job = jobs.find((j) => j.id === jobId)
    if (!job) return

    if (action === 'start') {
      const readiness = isDeviceReadyForRepair(job.deviceId)
      if (!readiness.ready) {
        toast.error(`Cannot start repair: ${readiness.reason}`)
        return
      }
    }

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j
        switch (action) {
          case 'start':
            toast.success(`Repair started for ${j.deviceBarcode}`)
            return { ...j, status: 'In Progress' as const, startedAt: new Date().toISOString() }
          case 'complete':
            toast.success(`Repair completed for ${j.deviceBarcode}`)
            return {
              ...j,
              status: 'Completed' as const,
              completedAt: new Date().toISOString(),
            }
          case 'fail':
            toast.error(`Repair failed for ${j.deviceBarcode}`)
            return {
              ...j,
              status: 'Failed' as const,
              completedAt: new Date().toISOString(),
            }
          default:
            return j
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

  const unassignedJobs = useMemo(
    () => jobs.filter((j) => !j.assignedTo || j.assignedTo === 'Unassigned'),
    [jobs]
  )

  const handleAssignJob = () => {
    if (!assignDeviceId || !assignEngineer) {
      toast.error('Please select both a device and an engineer.')
      return
    }
    setJobs((prev) =>
      prev.map((job) =>
        job.id === assignDeviceId
          ? { ...job, assignedTo: assignEngineer, status: 'Assigned' as const }
          : job
      )
    )
    const job = jobs.find((j) => j.id === assignDeviceId)
    toast.success(`${job?.deviceBarcode ?? 'Device'} assigned to ${assignEngineer}`)
    setAssignDeviceId('')
    setAssignEngineer('')
    setShowAssignForm(false)
  }

  const handleAssignEngineerInline = (jobId: string, engineer: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, assignedTo: engineer } : job
      )
    )
    const job = jobs.find((j) => j.id === jobId)
    toast.success(`${job?.deviceBarcode ?? 'Device'} assigned to ${engineer}`)
  }

  const buildRows = useCallback(
    (filtered: RepairJob[]) =>
      filtered.map((job) => {
        const readiness = isDeviceReadyForRepair(job.deviceId)
        return {
          id: job.id,
          barcode: job.deviceBarcode,
          type: job.repairType,
          status: job.status,
          assignedTo: job.assignedTo,
          rework: job.isRework ? 'Yes' : 'No',
          isRework: job.isRework,
          started: formatDate(job.startedAt),
          readiness: readiness.ready ? 'Ready' : readiness.reason ?? 'Not Ready',
          _isReady: readiness.ready,
          notes: job.notes ?? '-',
          _status: job.status,
          _deviceId: job.deviceId,
        }
      }),
    [],
  )

  const columns = [
    { key: 'barcode', label: 'Device Barcode', sortable: true },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'readiness', label: 'Readiness' },
    { key: 'assignedTo', label: 'Assigned To', sortable: true },
    { key: 'rework', label: 'Rework' },
    { key: 'started', label: 'Started', sortable: true },
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
    ],
    [jobs, buildRows],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'barcode') {
        return {
          display: (
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{String(value)}</span>
              <Button
                size="xs"
                variant="ghost"
                className="size-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handlePrintBarcode(String(value))}
                title="Print barcode"
              >
                <Printer className="size-3.5" />
              </Button>
            </div>
          ),
        }
      }
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
      if (key === 'readiness') {
        const isReady = row._isReady as boolean
        return {
          display: (
            <div className="flex items-center gap-1">
              {isReady ? (
                <StatusBadge variant="success">Ready</StatusBadge>
              ) : (
                <StatusBadge variant="warning">
                  <AlertCircle className="size-3 mr-1" />
                  {String(value)}
                </StatusBadge>
              )}
            </div>
          ),
        }
      }
      if (key === 'assignedTo') {
        const jobId = row.id as string
        const current = value as string
        if (!current || current === 'Unassigned') {
          return {
            display: (
              <Select value="" onValueChange={(val) => { if (val) handleAssignEngineerInline(jobId, val) }}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {REPAIR_ENGINEERS.map((eng) => (
                    <SelectItem key={eng} value={eng}>
                      {eng}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ),
          }
        }
        return null
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
        const isReady = row._isReady as boolean
        return {
          display: (
            <div className="flex gap-1">
              {status === 'Assigned' && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleAction(jobId, 'start')}
                  disabled={!isReady}
                  title={!isReady ? 'Spare/paint must be fulfilled first' : 'Start repair'}
                >
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
        <h1 className="cpt-page-title">Repair Station</h1>
        <p className="text-sm text-muted-foreground">
          Manage L2 and L3 repair jobs. Repair starts once spares are fulfilled and paint is done.
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
            <p className="text-2xl font-bold text-[#f6c000]">{summaryStats.inProgress}</p>
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

      {/* Assign Job */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setShowAssignForm(!showAssignForm)}>
          Assign Job
        </Button>
      </div>

      {showAssignForm && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Repair Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Device</Label>
              <Select value={assignDeviceId} onValueChange={(val) => setAssignDeviceId(val ?? '')}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select unassigned device..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.deviceBarcode} - {REPAIR_TYPE_LABELS[job.repairType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Engineer</Label>
              <Select value={assignEngineer} onValueChange={(val) => setAssignEngineer(val ?? '')}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select engineer..." />
                </SelectTrigger>
                <SelectContent>
                  {REPAIR_ENGINEERS.map((eng) => (
                    <SelectItem key={eng} value={eng}>
                      {eng}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAssignJob}>Assign</Button>
              <Button variant="outline" onClick={() => setShowAssignForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repair Jobs Table */}
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />
    </div>
  )
}

export default RepairPage
