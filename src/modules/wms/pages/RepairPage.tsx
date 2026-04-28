import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Check, X, Minus, Plus, Server } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Wrench, PlayCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { StatsRow } from '@/components/common/StatsRow'
import { PageHeader } from '@/components/page'
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
  SERVER_INSPECTION_CHECKLIST_ITEMS,
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
  'QC Passed': 'success',
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

type ChecklistItem = { id: string; label: string; group: string }

function groupChecklist(items: readonly ChecklistItem[]) {
  return items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})
}

const SERVER_CHECKLIST_GROUPS = groupChecklist(SERVER_INSPECTION_CHECKLIST_ITEMS)
const SERVER_GROUP_ORDER = [
  'Chassis',
  'Power',
  'Compute',
  'Memory',
  'Storage',
  'Cooling',
  'Networking',
  'Ports',
]

type ChecklistState = Record<string, { result: InspectionResult; notes: string }>

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function RepairPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // Filter out BATTERY — that's handled separately. DISPLAY stays so we can show a tab for it.
  const [jobs, setJobs] = useState<RepairJob[]>(
    mockRepairJobs.filter((j) => j.repairType !== 'BATTERY')
  )

  // Checklist dialog state
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [activeJob, setActiveJob] = useState<RepairJob | null>(null)
  const [checklist, setChecklist] = useState<ChecklistState>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')

  // Repair-stage QC dialog (uses inspection template by category)
  const [qcOpen, setQcOpen] = useState(false)
  const [qcJob, setQcJob] = useState<RepairJob | null>(null)
  const [qcChecklist, setQcChecklist] = useState<ChecklistState>({})
  const [qcCollapsedGroups, setQcCollapsedGroups] = useState<Record<string, boolean>>({})

  // Assemble notes dialog
  const [assembleOpen, setAssembleOpen] = useState(false)
  const [assembleJob, setAssembleJob] = useState<RepairJob | null>(null)
  const [assembleNotes, setAssembleNotes] = useState('')

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

  const openQc = (job: RepairJob) => {
    setQcJob(job)
    setQcChecklist({})
    setQcCollapsedGroups({})
    setQcOpen(true)
  }

  const openAssemble = (job: RepairJob) => {
    setAssembleJob(job)
    setAssembleNotes('')
    setAssembleOpen(true)
  }

  // Auto-open the repair checklist / QC / assemble dialog when arriving with
  // ?open=<jobId>, ?qc=<jobId>, or ?assemble=<jobId> (used by the device detail
  // page action buttons).
  useEffect(() => {
    const openId = searchParams.get('open')
    const qcId = searchParams.get('qc')
    const assembleId = searchParams.get('assemble')
    if (!openId && !qcId && !assembleId) return
    if (openId) {
      const job = jobs.find((j) => j.id === openId)
      if (job) openChecklist(job)
    } else if (qcId) {
      const job = jobs.find((j) => j.id === qcId)
      if (job) openQc(job)
    } else if (assembleId) {
      const job = jobs.find((j) => j.id === assembleId)
      if (job) openAssemble(job)
    }
    const next = new URLSearchParams(searchParams)
    next.delete('open')
    next.delete('qc')
    next.delete('assemble')
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

  /* ----------------- Repair-stage QC (category-aware) ----------------- */
  const qcDevice = useMemo(
    () => mockDevices.find((d) => d.id === qcJob?.deviceId),
    [qcJob],
  )
  const qcIsAssembly = qcDevice?.deviceKind === 'ASSEMBLY'
  const qcItems: readonly ChecklistItem[] = qcIsAssembly
    ? SERVER_INSPECTION_CHECKLIST_ITEMS
    : INSPECTION_CHECKLIST_ITEMS
  const qcGroups = qcIsAssembly ? SERVER_CHECKLIST_GROUPS : CHECKLIST_GROUPS
  const qcGroupOrder = qcIsAssembly ? SERVER_GROUP_ORDER : GROUP_ORDER

  const handleQcChange = (itemId: string, result: InspectionResult) => {
    setQcChecklist((prev) => ({
      ...prev,
      [itemId]: { result, notes: prev[itemId]?.notes ?? '' },
    }))
  }
  const handleQcNotes = (itemId: string, text: string) => {
    setQcChecklist((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], result: prev[itemId]?.result ?? 'FAIL', notes: text },
    }))
  }
  const toggleQcGroup = (group: string) => {
    setQcCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const qcCheckedCount = Object.keys(qcChecklist).length
  const qcPassCount = Object.values(qcChecklist).filter((i) => i.result === 'PASS').length
  const qcFailCount = Object.values(qcChecklist).filter((i) => i.result === 'FAIL').length
  const qcNaCount = Object.values(qcChecklist).filter((i) => i.result === 'NOT_APPLICABLE').length

  const handleSubmitQc = () => {
    if (!qcJob) return
    if (qcCheckedCount < qcItems.length) {
      toast.error('Please complete all QC checklist items.')
      return
    }
    if (qcFailCount > 0) {
      toast.error('Resolve failed items before passing QC.')
      return
    }
    setJobs((prev) =>
      prev.map((j) => (j.id === qcJob.id ? { ...j, status: 'QC Passed' as const } : j)),
    )
    toast.success(`${qcJob.deviceBarcode} passed repair QC. Ready for assembly.`)
    setQcOpen(false)
    setQcJob(null)
  }

  const handleSubmitAssemble = () => {
    if (!assembleJob) return
    if (!assembleNotes.trim()) {
      toast.error('Describe the assembly work performed.')
      return
    }
    const now = new Date().toISOString()
    setJobs((prev) =>
      prev.map((job) =>
        job.id === assembleJob.id
          ? {
              ...job,
              status: 'Completed' as const,
              completedAt: now,
              notes: assembleNotes.trim(),
            }
          : job,
      ),
    )
    // Mirror the device record so it lands in Inward QC.
    const devIdx = mockDevices.findIndex((d) => d.id === assembleJob.deviceId)
    if (devIdx >= 0) {
      mockDevices[devIdx] = {
        ...mockDevices[devIdx],
        status: 'AWAITING_QC',
        repairCompleted: true,
        repairedAt: now,
      }
    }
    toast.success(`${assembleJob.deviceBarcode} assembled and sent to Inward QC.`)
    setAssembleOpen(false)
    setAssembleJob(null)
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

  // Float ASSEMBLY (server) jobs to the top of the list on every tab so the
  // higher-value component-scoped repairs land on page 1.
  const sortAssemblyFirst = useCallback((arr: RepairJob[]): RepairJob[] => {
    return [...arr].sort((a, b) => {
      const da = mockDevices.find((d) => d.id === a.deviceId)
      const db = mockDevices.find((d) => d.id === b.deviceId)
      const aAsm = da?.deviceKind === 'ASSEMBLY' ? 0 : 1
      const bAsm = db?.deviceKind === 'ASSEMBLY' ? 0 : 1
      return aAsm - bAsm
    })
  }, [])

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
        const device = mockDevices.find((d) => d.id === job.deviceId)
        const readiness = computeReadiness(job, device)
        return {
          id: job.id,
          barcode: job.deviceBarcode,
          partNo: device?.model ?? '-',
          serialNo: device?.serialNumber ?? '-',
          biosNo: device?.biosNo ?? '-',
          category: device?.category ?? '-',
          type: job.repairType,
          status: job.status,
          assignedTo: job.assignedTo,
          rework: job.reworkCount,
          started: formatDate(job.startedAt),
          readiness: readiness.join(','),
          _readinessList: readiness,
          spares: deviceFlags[job.deviceId]?.spares ?? device?.requiresSpares ?? false,
          paint: deviceFlags[job.deviceId]?.paint ?? device?.requiresPaint ?? false,
          _category: device?.category ?? '-',
          notes: job.notes ?? '-',
          _status: job.status,
          _deviceId: job.deviceId,
        }
      }),
    [deviceFlags],
  )

  const columns = [
    { key: 'barcode', label: 'Device Barcode', sortable: true },
    { key: 'partNo', label: 'Part No', sortable: true },
    { key: 'serialNo', label: 'Serial No', sortable: true },
    { key: 'biosNo', label: 'BIOS No', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
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
        data: buildRows(sortAssemblyFirst(jobs)),
      },
      {
        id: 'l2',
        label: 'L2 Repair',
        columns,
        data: buildRows(sortAssemblyFirst(jobs.filter((j) => j.repairType === 'L2'))),
      },
      {
        id: 'l3',
        label: 'L3 Repair',
        columns,
        data: buildRows(sortAssemblyFirst(jobs.filter((j) => j.repairType === 'L3'))),
      },
      {
        id: 'display',
        label: 'Display Repair',
        columns,
        data: buildRows(sortAssemblyFirst(jobs.filter((j) => j.repairType === 'DISPLAY'))),
      },
    ],
    [jobs, buildRows, sortAssemblyFirst],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'barcode') {
        return {
          display: <span className="font-medium">{String(value)}</span>,
        }
      }
      if (key === 'partNo') {
        const device = mockDevices.find((d) => d.id === row._deviceId)
        const isAssembly = device?.deviceKind === 'ASSEMBLY'
        return {
          display: (
            <span className="flex items-center gap-1.5 font-medium">
              {isAssembly && (
                <Server className="size-3.5 text-primary" aria-label="Assembly" />
              )}
              {String(value)}
            </span>
          ),
        }
      }
      if (key === 'serialNo') {
        return {
          display: <span className="text-sm">{String(value)}</span>,
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
        if (key === 'paint' && row._category === 'Server') {
          return { display: <span className="text-muted-foreground">—</span> }
        }
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
        const job = jobs.find((j) => j.id === jobId)
        // Three-stage flow: Start (repair) → Start QC → Assemble (with notes).
        const showStart = status === 'Assigned'
        const showStartQc = status === 'In Progress'
        const showAssemble = status === 'QC Passed'
        return {
          display: (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {showStart && (
                <button
                  type="button"
                  className="wms-link text-sm font-medium"
                  onClick={() => {
                    if (job) openChecklist(job)
                  }}
                >
                  Start
                </button>
              )}
              {showStartQc && (
                <button
                  type="button"
                  className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline"
                  onClick={() => {
                    if (job) openQc(job)
                  }}
                >
                  Start QC
                </button>
              )}
              {showAssemble && (
                <button
                  type="button"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                  onClick={() => {
                    if (job) openAssemble(job)
                  }}
                >
                  Assemble
                </button>
              )}
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
      <PageHeader
        title="Repair"
        subtitle="Manage L2, L3, and Display repair jobs. Repair starts once spares are fulfilled and paint is done."
        breadcrumbs={[{ label: 'WMS' }, { label: 'Repair' }]}
      />

      <StatsRow
        stats={[
          { label: 'Total Jobs', value: summaryStats.total, icon: Wrench },
          { label: 'In Progress', value: summaryStats.inProgress, icon: PlayCircle },
          { label: 'Completed Today', value: summaryStats.completedToday, icon: CheckCircle2 },
          { label: 'Rework Count', value: summaryStats.reworkCount, icon: RefreshCw },
        ]}
      />

      {/* Repair Jobs Table */}
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-repair"
        onRowClick={(row) => navigate(`/wms/devices/${row._deviceId}?from=repair`)}
        emptyState={{
          title: 'No repair jobs',
          description: 'Repair jobs appear here once devices are inspected and routed for repair.',
        }}
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

      {/* Repair-stage QC Dialog */}
      <Dialog open={qcOpen} onOpenChange={setQcOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="shrink-0 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                Repair QC: {qcJob?.deviceBarcode}
                {qcIsAssembly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Server className="size-3" />
                    Server
                  </span>
                )}
              </DialogTitle>
              {qcJob && (
                <p className="text-sm text-muted-foreground mt-1">
                  {REPAIR_TYPE_LABELS[qcJob.repairType]} — Inspection template ({qcIsAssembly ? 'Server' : 'Laptop'})
                </p>
              )}
            </DialogHeader>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex-1">
                <Progress
                  value={
                    qcItems.length > 0
                      ? Math.round((qcCheckedCount / qcItems.length) * 100)
                      : 0
                  }
                >
                  <ProgressLabel className="sr-only">Progress</ProgressLabel>
                  <ProgressValue className="sr-only" />
                </Progress>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <span className="font-medium">{qcCheckedCount}/{qcItems.length}</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                  {qcPassCount}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-destructive" />
                  {qcFailCount}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-muted-foreground" />
                  {qcNaCount}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {qcGroupOrder.map((group) => {
              const items = qcGroups[group]
              if (!items) return null
              const isCollapsed = qcCollapsedGroups[group] ?? false
              const groupChecked = items.filter((i) => qcChecklist[i.id]).length
              const groupPassed = items.filter((i) => qcChecklist[i.id]?.result === 'PASS').length
              const groupFailed = items.filter((i) => qcChecklist[i.id]?.result === 'FAIL').length
              return (
                <Collapsible key={group} open={!isCollapsed}>
                  <CollapsibleTrigger
                    className="flex w-full items-center justify-between rounded-lg border bg-muted/40 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors"
                    onClick={() => toggleQcGroup(group)}
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
                        const state = qcChecklist[item.id]
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
                                  onClick={() => handleQcChange(item.id, 'PASS')}
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
                                  onClick={() => handleQcChange(item.id, 'FAIL')}
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
                                  onClick={() => handleQcChange(item.id, 'NOT_APPLICABLE')}
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
                                  onChange={(e) => handleQcNotes(item.id, e.target.value)}
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
          </div>

          <DialogFooter className="shrink-0 rounded-b-xl">
            <Button variant="outline" onClick={() => setQcOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitQc}>Pass QC</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assemble Dialog */}
      <Dialog open={assembleOpen} onOpenChange={setAssembleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assemble {assembleJob?.deviceBarcode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="assemble-notes">
              Assembly work performed <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="assemble-notes"
              placeholder="Describe what was assembled (parts re-seated, screws torqued, panels closed, etc.)…"
              value={assembleNotes}
              onChange={(e) => setAssembleNotes(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              On submit, the device moves to Inward QC.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssembleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAssemble}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Send to Inward QC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RepairPage
