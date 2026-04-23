import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Printer, ChevronDown, ChevronRight, Check, X, Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'

import {
  INSPECTION_CHECKLIST_ITEMS,
  type Device,
  type InspectionResult,
  type RepairJob,
  type RepairType,
} from '../types'
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

const READINESS_VARIANT: Record<string, StatusBadgeVariant> = {
  Ready: 'success',
  'In Repair': 'warning',
  'Awaiting Assembly': 'info',
  'Waiting for Paint': 'warning',
  'Waiting for Spares': 'warning',
}

function computeReadiness(job: RepairJob, device: Device | undefined): string[] {
  const statuses: string[] = []
  if (device?.requiresSpares && !device.sparesIssued) statuses.push('Waiting for Spares')
  if (device?.requiresPaint && !device.paintCompleted) statuses.push('Waiting for Paint')
  if (job.status === 'In Progress') {
    statuses.push('In Repair')
  } else if (job.status === 'Assigned') {
    if (device?.requiresSpares && device.sparesIssued && device.requiresPaint && device.paintCompleted) {
      statuses.push('Awaiting Assembly')
    } else if (statuses.length === 0) {
      statuses.push('Ready')
    }
  }
  if (statuses.length === 0) statuses.push('Ready')
  return statuses
}

// Group checklist items
const CHECKLIST_GROUPS = INSPECTION_CHECKLIST_ITEMS.reduce<
  Record<string, typeof INSPECTION_CHECKLIST_ITEMS[number][]>
>((acc, item) => {
  const group = item.group
  if (!acc[group]) acc[group] = []
  acc[group].push(item)
  return acc
}, {})

const GROUP_ORDER = ['Panels', 'Display', 'Input', 'Audio', 'Power', 'Hardware', 'Ports']

type ChecklistState = Record<string, { result: InspectionResult; notes: string }>

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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // Filter out BATTERY — that's handled separately. DISPLAY stays so we can show a tab for it.
  const [jobs, setJobs] = useState<RepairJob[]>(
    mockRepairJobs.filter((j) => j.repairType !== 'BATTERY')
  )
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignDeviceId, setAssignDeviceId] = useState('')
  const [assignEngineer, setAssignEngineer] = useState('')

  // Checklist dialog state
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [activeJob, setActiveJob] = useState<RepairJob | null>(null)
  const [checklist, setChecklist] = useState<ChecklistState>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  // Per-device requires-spares / requires-paint overrides toggled directly from the list
  const [deviceFlags, setDeviceFlags] = useState<Record<string, { spares?: boolean; paint?: boolean }>>({})

  const toggleDeviceFlag = (deviceId: string, flag: 'spares' | 'paint') => {
    const device = mockDevices.find((d) => d.id === deviceId)
    const current =
      deviceFlags[deviceId]?.[flag] ??
      (flag === 'spares' ? device?.requiresSpares : device?.requiresPaint) ??
      false
    const next = !current
    setDeviceFlags((prev) => ({
      ...prev,
      [deviceId]: { ...prev[deviceId], [flag]: next },
    }))
    const label = flag === 'spares' ? 'Spares' : 'Paint'
    const doneLabel = flag === 'spares' ? 'issued' : 'done'
    toast.success(`${device?.barcode ?? deviceId}: ${label} ${next ? doneLabel : 'reset'}`)
  }

  const openChecklist = (job: RepairJob) => {
    setActiveJob(job)
    setChecklist({})
    setCollapsedGroups({})
    setNotes('')
    setChecklistOpen(true)
  }

  // Auto-open the repair checklist when arriving with ?open=<jobId>
  // (used by the "Start Repair" button on the device detail page).
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    const job = jobs.find((j) => j.id === openId)
    if (job) openChecklist(job)
    const next = new URLSearchParams(searchParams)
    next.delete('open')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChecklistChange = (itemId: string, result: InspectionResult) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: { result, notes: prev[itemId]?.notes ?? '' },
    }))
  }
  const handleChecklistNotes = (itemId: string, text: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], result: prev[itemId]?.result ?? 'FAIL', notes: text },
    }))
  }
  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const checkedCount = Object.keys(checklist).length
  const passCount = Object.values(checklist).filter((i) => i.result === 'PASS').length
  const failCount = Object.values(checklist).filter((i) => i.result === 'FAIL').length
  const naCount = Object.values(checklist).filter((i) => i.result === 'NOT_APPLICABLE').length

  const handleSubmitChecklist = () => {
    if (!activeJob) return
    if (checkedCount < INSPECTION_CHECKLIST_ITEMS.length) {
      toast.error('Please complete all checklist items.')
      return
    }
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== activeJob.id) return j
        return { ...j, status: 'In Progress' as const, startedAt: j.startedAt ?? new Date().toISOString() }
      })
    )
    toast.success(`Repair started for ${activeJob.deviceBarcode}`)
    setChecklistOpen(false)
    setActiveJob(null)
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

  const handleAssemble = (jobId: string, barcode: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, status: 'Completed' as const, completedAt: new Date().toISOString() }
          : job,
      ),
    )
    toast.success(`${barcode} assembled and sent to Inward QC.`)
  }

  const buildRows = useCallback(
    (filtered: RepairJob[]) =>
      filtered.map((job) => {
        const device = mockDevices.find((d) => d.id === job.deviceId)
        const readiness = computeReadiness(job, device)
        return {
          id: job.id,
          barcode: job.deviceBarcode,
          partSerial: `${device?.model ?? '-'}\n${device?.serialNumber ?? '-'}`,
          biosNo: device?.biosNo ?? '-',
          type: job.repairType,
          status: job.status,
          assignedTo: job.assignedTo,
          rework: job.reworkCount,
          started: formatDate(job.startedAt),
          readiness: readiness.join(','),
          _readinessList: readiness,
          spares: deviceFlags[job.deviceId]?.spares ?? device?.requiresSpares ?? false,
          paint: deviceFlags[job.deviceId]?.paint ?? device?.requiresPaint ?? false,
          notes: job.notes ?? '-',
          _status: job.status,
          _deviceId: job.deviceId,
        }
      }),
    [deviceFlags],
  )

  const columns = [
    { key: 'barcode', label: 'Device Barcode', sortable: true },
    { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
    { key: 'biosNo', label: 'BIOS No', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'readiness', label: 'Readiness' },
    { key: 'spares', label: 'Spares', align: 'center' as const },
    { key: 'paint', label: 'Paint', align: 'center' as const },
    { key: 'assignedTo', label: 'Assigned To', sortable: true },
    { key: 'rework', label: 'Rework', align: 'center' as const },
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
        label: 'Display Repair',
        columns,
        data: buildRows(jobs.filter((j) => j.repairType === 'DISPLAY')),
      },
    ],
    [jobs, buildRows],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'barcode') {
        return {
          display: <span className="font-medium">{String(value)}</span>,
        }
      }
      if (key === 'partSerial') {
        const [part, serial] = String(value).split('\n')
        return {
          display: (
            <div className="flex flex-col leading-tight">
              <span className="font-medium">{part}</span>
              <span className="text-xs text-muted-foreground">S/N: {serial}</span>
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
        const list = (row._readinessList as string[]) ?? []
        return {
          display: (
            <div className="flex flex-col items-start gap-1">
              {list.map((status) => (
                <StatusBadge key={status} variant={READINESS_VARIANT[status] ?? 'neutral'}>
                  {status}
                </StatusBadge>
              ))}
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
              <div onClick={(e) => e.stopPropagation()}>
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
              </div>
            ),
          }
        }
        return null
      }
      if (key === 'rework') {
        const count = value as number
        if (count > 0) {
          return {
            className: 'bg-destructive/10 text-destructive font-medium',
            display: String(count),
          }
        }
        return { display: <span className="text-muted-foreground">0</span> }
      }
      if ((key === 'spares' || key === 'paint') && typeof value === 'boolean') {
        const deviceId = row._deviceId as string
        const enabled = value
        const onLabel = key === 'spares' ? 'Issued' : 'Done'
        return {
          display: (
            <div onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => toggleDeviceFlag(deviceId, key)}
                className={
                  enabled
                    ? 'inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-2 py-0.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors'
                }
              >
                {enabled ? (
                  <>
                    <Check className="size-3" /> {onLabel}
                  </>
                ) : (
                  <>
                    <Plus className="size-3" /> Add
                  </>
                )}
              </button>
            </div>
          ),
        }
      }
      if (key === 'actions') {
        const status = row._status as RepairJob['status']
        const jobId = row.id as string
        const barcode = row.barcode as string
        const job = jobs.find((j) => j.id === jobId)
        // Mutually exclusive: Start while not yet in progress, Assemble once repair is underway.
        const showStart = status === 'Assigned'
        const showAssemble = status === 'In Progress'
        return {
          display: (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {showStart && (
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  onClick={() => {
                    if (job) openChecklist(job)
                  }}
                >
                  Start
                </button>
              )}
              {showAssemble && (
                <button
                  type="button"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                  onClick={() => handleAssemble(jobId, barcode)}
                >
                  Assemble
                </button>
              )}
              <Button
                size="xs"
                variant="ghost"
                className="size-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handlePrintBarcode(barcode)}
                title="Print barcode"
              >
                <Printer className="size-3.5" />
              </Button>
            </div>
          ),
        }
      }
      return null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobs, deviceFlags],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cpt-page-title">Repair Station</h1>
        <p className="text-sm text-muted-foreground">
          Manage L2, L3, and Display repair jobs. Repair starts once spares are fulfilled and paint is done.
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
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-repair"
        onRowClick={(row) => navigate(`/wms/devices/${row._deviceId}?from=repair`)}
      />

      {/* Repair Checklist Dialog */}
      <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="shrink-0 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Repair Checklist: {activeJob?.deviceBarcode}
              </DialogTitle>
              {activeJob && (
                <p className="text-sm text-muted-foreground mt-1">
                  {REPAIR_TYPE_LABELS[activeJob.repairType]} — Assigned to {activeJob.assignedTo}
                </p>
              )}
            </DialogHeader>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex-1">
                <Progress
                  value={
                    INSPECTION_CHECKLIST_ITEMS.length > 0
                      ? Math.round((checkedCount / INSPECTION_CHECKLIST_ITEMS.length) * 100)
                      : 0
                  }
                >
                  <ProgressLabel className="sr-only">Progress</ProgressLabel>
                  <ProgressValue className="sr-only" />
                </Progress>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <span className="font-medium">{checkedCount}/{INSPECTION_CHECKLIST_ITEMS.length}</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                  {passCount}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-destructive" />
                  {failCount}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-muted-foreground" />
                  {naCount}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {GROUP_ORDER.map((group) => {
              const items = CHECKLIST_GROUPS[group]
              if (!items) return null
              const isCollapsed = collapsedGroups[group] ?? false
              const groupChecked = items.filter((i) => checklist[i.id]).length
              const groupPassed = items.filter((i) => checklist[i.id]?.result === 'PASS').length
              const groupFailed = items.filter((i) => checklist[i.id]?.result === 'FAIL').length
              return (
                <Collapsible key={group} open={!isCollapsed}>
                  <CollapsibleTrigger
                    className="flex w-full items-center justify-between rounded-lg border bg-muted/40 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors"
                    onClick={() => toggleGroup(group)}
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-semibold">{group}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {groupPassed > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          {groupPassed} pass
                        </span>
                      )}
                      {groupFailed > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                          {groupFailed} fail
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {groupChecked}/{items.length}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-1.5 pt-2">
                      {items.map((item) => {
                        const state = checklist[item.id]
                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border transition-colors ${
                              state?.result === 'PASS'
                                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
                                : state?.result === 'FAIL'
                                  ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30'
                                  : 'bg-card'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                              <p className="text-sm font-medium min-w-0 flex-1">{item.label}</p>
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className={
                                    state?.result === 'PASS'
                                      ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700'
                                      : 'border-muted-foreground/20 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-950'
                                  }
                                  onClick={() => handleChecklistChange(item.id, 'PASS')}
                                >
                                  <Check className="size-3.5" /> Pass
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className={
                                    state?.result === 'FAIL'
                                      ? 'border-destructive bg-destructive text-white hover:bg-destructive/90'
                                      : 'border-muted-foreground/20 text-[#f1416c] hover:border-[#f1416c]/60 hover:bg-[#fff5f8] dark:text-[#f1416c] dark:hover:bg-red-950'
                                  }
                                  onClick={() => handleChecklistChange(item.id, 'FAIL')}
                                >
                                  <X className="size-3.5" /> Fail
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className={
                                    state?.result === 'NOT_APPLICABLE'
                                      ? 'border-muted-foreground/50 bg-muted text-muted-foreground'
                                      : 'border-muted-foreground/20 text-muted-foreground hover:bg-muted'
                                  }
                                  onClick={() => handleChecklistChange(item.id, 'NOT_APPLICABLE')}
                                >
                                  <Minus className="size-3.5" /> N/A
                                </Button>
                              </div>
                            </div>
                            {state?.result === 'FAIL' && (
                              <div className="border-t px-3 py-2">
                                <Input
                                  placeholder="Describe the issue..."
                                  value={state.notes}
                                  onChange={(e) => handleChecklistNotes(item.id, e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}

            <div className="space-y-2">
              <Label htmlFor="repair-notes">Notes</Label>
              <Textarea
                id="repair-notes"
                placeholder="Any observations during repair..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 rounded-b-xl">
            <Button variant="outline" onClick={() => setChecklistOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitChecklist}>Start Repair</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RepairPage
