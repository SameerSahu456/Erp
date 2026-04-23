import { useMemo, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Package,
  Cpu,
  Tag,
  Layers,
  Wrench,
  Paintbrush,
  CheckCircle2,
  MapPin,
  ClipboardCheck,
  AlertCircle,
  Check,
  Plus,
  Play,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { Timeline, type TimelineEntry } from '@/components/common/Timeline'
import { EmptyState } from '@/components/common/EmptyState'
import { useNavigateBack } from '@/hooks/use-navigate-back'

import { mockDevices } from '../data/devices'
import { mockInspections } from '../data/inspections'
import { mockRepairJobs } from '../data/repairs'
import { mockPaintJobs } from '../data/paint-jobs'
import { mockQCRecords } from '../data/qc-records'
import { mockSpareRequests } from '../data/spare-requests'
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  type DeviceStatus,
  type PaintPanelType,
} from '../types'

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
}

const PANEL_LABELS: Record<PaintPanelType, string> = {
  TOP_COVER: 'Top Cover',
  BOTTOM_COVER: 'Bottom Cover',
}

const SPARE_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  Requested: 'warning',
  'In Stock': 'info',
  Ordered: 'neutral',
  Fulfilled: 'success',
}

type DetailContext = 'inspection' | 'repair' | 'spares' | 'paint' | 'qc' | 'rack' | null

function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const goBack = useNavigateBack('/wms/inward')

  const rawFrom = searchParams.get('from')
  const from: DetailContext = (
    rawFrom === 'inspection' ||
    rawFrom === 'repair' ||
    rawFrom === 'spares' ||
    rawFrom === 'paint' ||
    rawFrom === 'qc' ||
    rawFrom === 'rack'
      ? rawFrom
      : null
  )

  const device = useMemo(() => mockDevices.find((d) => d.id === id), [id])
  const [flagOverrides, setFlagOverrides] = useState<{ spares?: boolean; paint?: boolean }>({})
  const requiresSpares = flagOverrides.spares ?? device?.requiresSpares ?? false
  const requiresPaint = flagOverrides.paint ?? device?.requiresPaint ?? false

  const toggleFlag = (flag: 'spares' | 'paint') => {
    const current = flag === 'spares' ? requiresSpares : requiresPaint
    const next = !current
    setFlagOverrides((prev) => ({ ...prev, [flag]: next }))
    toast.success(
      `${device?.barcode ?? ''}: ${flag === 'spares' ? 'Spares' : 'Paint'} ${next ? 'required' : 'cleared'}`,
    )
  }
  const inspection = useMemo(
    () => mockInspections.find((r) => r.deviceId === id),
    [id],
  )
  const repairJobs = useMemo(
    () => mockRepairJobs.filter((r) => r.deviceId === id),
    [id],
  )
  const paintJobs = useMemo(
    () => mockPaintJobs.filter((p) => p.deviceId === id),
    [id],
  )
  const qcRecords = useMemo(
    () => mockQCRecords.filter((q) => q.deviceId === id),
    [id],
  )
  const spareRequests = useMemo(
    () => mockSpareRequests.filter((s) => s.deviceId === id),
    [id],
  )

  if (!device) {
    return (
      <EmptyState
        title="Device not found"
        description="The device you are looking for does not exist."
        action={{ label: 'Back', onClick: goBack }}
      />
    )
  }

  const timelineEntries: TimelineEntry[] = []

  timelineEntries.push({
    id: 'received',
    icon: Package,
    title: 'Received',
    description: `Device received and added to ${device.batchNumber}.`,
    timestamp: formatDate(device.receivedAt),
    variant: 'default',
  })

  if (inspection) {
    const failures = inspection.checklist.filter((c) => c.result === 'FAIL').length
    timelineEntries.push({
      id: 'inspection',
      icon: ClipboardCheck,
      title: failures > 0 ? `Inspected — ${failures} issue(s) found` : 'Inspected — all checks passed',
      description: inspection.overallNotes,
      user: inspection.inspectedBy,
      timestamp: formatDate(inspection.inspectedAt),
      variant: failures > 0 ? 'warning' : 'success',
    })
  }

  repairJobs.forEach((job) => {
    timelineEntries.push({
      id: `repair-${job.id}`,
      icon: Wrench,
      title: `${job.repairType} repair — ${job.status}`,
      description: job.notes,
      user: job.assignedTo,
      timestamp: formatDate(job.completedAt ?? job.startedAt),
      variant:
        job.status === 'Failed'
          ? 'error'
          : job.status === 'Completed'
            ? 'success'
            : 'warning',
    })
  })

  paintJobs.forEach((job) => {
    timelineEntries.push({
      id: `paint-${job.id}`,
      icon: Paintbrush,
      title: `Paint (${job.panelType === 'TOP_COVER' ? 'Top Cover' : 'Bottom Cover'}) — ${job.status.replace(/_/g, ' ').toLowerCase()}`,
      user: job.assignedTo,
      timestamp: formatDate(job.completedAt ?? job.startedAt),
      variant: job.status === 'COLLECTED' || job.status === 'READY_FOR_COLLECTION' ? 'success' : 'default',
    })
  })

  qcRecords.forEach((rec) => {
    timelineEntries.push({
      id: `qc-${rec.id}`,
      icon: CheckCircle2,
      title: `${rec.qcType === 'INWARD' ? 'Inward QC' : 'Outward QC'} — ${rec.result === 'PASSED' ? 'Passed' : 'Failed'}${rec.grade ? ` (Grade ${rec.grade})` : ''}`,
      description: rec.notes,
      user: rec.inspectedBy,
      timestamp: formatDate(rec.inspectedAt),
      variant: rec.result === 'PASSED' ? 'success' : 'error',
    })
  })

  if (device.qcPassedAt && !qcRecords.length) {
    timelineEntries.push({
      id: 'qc-passed',
      icon: CheckCircle2,
      title: `QC Passed${device.grade ? ` — Grade ${device.grade}` : ''}`,
      timestamp: formatDate(device.qcPassedAt),
      variant: 'success',
    })
  }

  const status = device.status as DeviceStatus

  const infoItems = [
    { icon: Tag, label: 'Barcode', value: device.barcode },
    { icon: Cpu, label: 'Serial No', value: device.serialNumber },
    { icon: Package, label: 'Part No / Model', value: `${device.brand} ${device.model}` },
    { icon: Layers, label: 'Batch', value: device.batchNumber },
    { icon: MapPin, label: 'Location', value: device.rackLocation ?? device.location },
    { icon: AlertCircle, label: 'Category', value: device.category },
  ]

  const flags: { label: string; completed: boolean; required: boolean }[] = [
    { label: 'Repair', required: device.requiresRepair, completed: device.repairCompleted },
    { label: 'Paint', required: requiresPaint, completed: device.paintCompleted },
    { label: 'Spares', required: requiresSpares, completed: device.sparesIssued },
  ]

  // Context-driven visibility:
  // - inspection / rack: hide both toggles
  // - spares / qc: hide paint only
  // - paint: hide spares only
  // - repair / null: show both
  const showSparesToggle = from !== 'inspection' && from !== 'paint' && from !== 'rack'
  const showPaintToggle =
    from !== 'inspection' && from !== 'spares' && from !== 'qc' && from !== 'rack'
  const showRequirementsBlock = showSparesToggle || showPaintToggle

  const canStartInspection =
    from === 'inspection' && device.status === 'PENDING_INSPECTION'
  const startableRepair =
    from === 'repair'
      ? repairJobs.find((j) => j.status === 'Assigned')
      : undefined

  const paintPanelJobs = paintJobs.length > 0
    ? paintJobs
    : requiresPaint
      ? (['TOP_COVER', 'BOTTOM_COVER'] as PaintPanelType[]).map((p) => ({
          id: `paint-placeholder-${p}`,
          deviceId: device.id,
          deviceBarcode: device.barcode,
          panelType: p,
          status: 'AWAITING_PAINT' as const,
        }))
      : []

  const handleStartInspection = () => {
    toast.success(`Opening inspection for ${device.barcode}…`)
    navigate(`/wms/inspection?open=${device.id}`)
  }

  const handleStartRepair = () => {
    if (!startableRepair) return
    toast.success(`Opening repair for ${device.barcode}…`)
    navigate(`/wms/repair?open=${startableRepair.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={goBack}>
            <ArrowLeft />
          </Button>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="cpt-page-title">{device.barcode}</h1>
              <StatusBadge variant={DEVICE_STATUS_VARIANT[status]}>
                {DEVICE_STATUS_LABELS[status]}
              </StatusBadge>
              {device.grade && (
                <StatusBadge variant={device.grade === 'A' ? 'success' : 'info'}>
                  Grade {device.grade}
                </StatusBadge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {device.brand} {device.model} · S/N {device.serialNumber}
            </p>
          </div>
        </div>

        {(canStartInspection || startableRepair) && (
          <div className="flex shrink-0 items-center gap-2">
            {canStartInspection && (
              <Button onClick={handleStartInspection}>
                <Play className="size-4" />
                Start Inspection
              </Button>
            )}
            {startableRepair && (
              <Button onClick={handleStartRepair}>
                <Play className="size-4" />
                Start Repair
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Device Info */}
      <Card>
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <item.icon className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
          {device.assignedTo && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs text-muted-foreground">Assigned to</p>
              <p className="text-sm font-medium">{device.assignedTo}</p>
            </div>
          )}

          {showRequirementsBlock && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">Requirements</p>
              <div className="flex flex-wrap gap-2">
                {showSparesToggle && (
                  <button
                    type="button"
                    onClick={() => toggleFlag('spares')}
                    className={
                      requiresSpares
                        ? 'inline-flex items-center gap-1.5 rounded-full border border-[#f6c000]/60 bg-[#fff5d6] px-3 py-1 text-xs font-medium text-[#8a6a00] hover:bg-[#ffecb3] transition-colors'
                        : 'inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/40 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors'
                    }
                  >
                    {requiresSpares ? <Check className="size-3" /> : <Plus className="size-3" />}
                    Spares {requiresSpares ? 'required' : 'needed?'}
                  </button>
                )}
                {showPaintToggle && (
                  <button
                    type="button"
                    onClick={() => toggleFlag('paint')}
                    className={
                      requiresPaint
                        ? 'inline-flex items-center gap-1.5 rounded-full border border-[#f6c000]/60 bg-[#fff5d6] px-3 py-1 text-xs font-medium text-[#8a6a00] hover:bg-[#ffecb3] transition-colors'
                        : 'inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/40 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors'
                    }
                  >
                    {requiresPaint ? <Check className="size-3" /> : <Plus className="size-3" />}
                    Paint {requiresPaint ? 'required' : 'needed?'}
                  </button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spares Requested — shown only from the spares context */}
      {from === 'spares' && (
        <Card>
          <CardHeader>
            <CardTitle>Spares Requested</CardTitle>
          </CardHeader>
          <CardContent>
            {spareRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spare parts have been requested for this device.
              </p>
            ) : (
              <div className="divide-y">
                {spareRequests.map((sr) => (
                  <div key={sr.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{sr.spareName}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty {sr.qty} · Requested by {sr.requestedBy} on {formatDate(sr.requestedAt)}
                      </p>
                    </div>
                    <StatusBadge variant={SPARE_STATUS_VARIANT[sr.status] ?? 'neutral'}>
                      {sr.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paint Panels — shown only from the paint context */}
      {from === 'paint' && (
        <Card>
          <CardHeader>
            <CardTitle>Paint Required</CardTitle>
          </CardHeader>
          <CardContent>
            {paintPanelJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No paint work has been logged for this device.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {paintPanelJobs.map((pj) => {
                  const label = PANEL_LABELS[pj.panelType]
                  const done = pj.status === 'COLLECTED'
                  return (
                    <div
                      key={pj.id}
                      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                        done
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-[#f6c000]/60 bg-[#fff5d6] text-[#8a6a00]'
                      }`}
                    >
                      <Paintbrush className="size-3.5" />
                      <span className="font-medium">{label}</span>
                      <span className="text-xs">
                        · {pj.status.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Workflow Flags */}
      {flags.some((f) => f.required) && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {flags
                .filter((f) => f.required)
                .map((flag) => {
                  const completedLabel = flag.label === 'Spares' ? 'Issued' : 'Done'
                  return (
                    <div key={flag.label} className="flex items-center gap-2">
                      <StatusBadge variant={flag.completed ? 'success' : 'warning'}>
                        {flag.completed ? completedLabel : 'Pending'}
                      </StatusBadge>
                      <span className="text-sm font-medium">{flag.label}</span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow History</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineEntries.length > 0 ? (
            <Timeline entries={timelineEntries} />
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DeviceDetailPage
