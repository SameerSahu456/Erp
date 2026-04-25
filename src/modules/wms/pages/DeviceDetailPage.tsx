import { useMemo, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
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
  Play,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { Timeline, type TimelineEntry } from '@/components/common/Timeline'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/page'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavigateBack } from '@/hooks/use-navigate-back'

import { mockDevices } from '../data/devices'
import { mockInspections } from '../data/inspections'
import { mockRepairJobs } from '../data/repairs'
import { mockPaintJobs, PAINT_VENDORS } from '../data/paint-jobs'
import { mockQCRecords } from '../data/qc-records'
import { mockSpareRequests } from '../data/spare-requests'
import { mockOutwardRecords } from '../data/outward'
import { QCDialog } from '../components/QCDialog'
import { AssignRackDialog } from '../components/AssignRackDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  type Device,
  type DeviceStatus,
  type PaintPanelType,
} from '../types'

// Some outward records reference device ids that don't exist in mockDevices
// (dev-031…dev-045 etc.). Construct a minimal Device from the OutwardDevice
// data so the detail page still renders instead of showing "Device not found".
function synthesizeDeviceFromOutward(id: string): Device | undefined {
  for (const outward of mockOutwardRecords) {
    const od = outward.devices.find((d) => d.deviceId === id)
    if (!od) continue
    return {
      id: od.deviceId,
      barcode: od.barcode,
      batchId: '',
      batchNumber: outward.outwardNumber,
      category: 'Device',
      brand: od.brand,
      model: od.model,
      serialNumber: od.serialNumber,
      status:
        od.qcResult === 'Passed'
          ? 'READY_FOR_DISPATCH'
          : od.qcResult === 'Failed'
            ? 'UNDER_OUTWARD_QC'
            : 'AWAITING_OUTWARD_QC',
      grade: od.grade,
      requiresRepair: false,
      requiresPaint: false,
      requiresSpares: false,
      repairCompleted: true,
      paintCompleted: true,
      sparesIssued: true,
      qcFailCount: 0,
      outwardQcFailCount: od.qcResult === 'Failed' ? 1 : 0,
      receivedAt: outward.createdAt,
      location: outward.customerName,
    }
  }
  return undefined
}

const L1_L2_ENGINEERS = ['Ravi Kumar', 'Priya Nair', 'Sanjay Gupta']
const DISPLAY_ENGINEERS = ['Karthik Rao', 'Neha Bansal']

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

  const device = useMemo(
    () => mockDevices.find((d) => d.id === id) ?? (id ? synthesizeDeviceFromOutward(id) : undefined),
    [id],
  )
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

  // Engineer assignments derived from repair jobs on this device
  const l2Job = useMemo(() => repairJobs.find((j) => j.repairType === 'L2'), [repairJobs])
  const l3Job = useMemo(() => repairJobs.find((j) => j.repairType === 'L3'), [repairJobs])
  const displayJob = useMemo(
    () => repairJobs.find((j) => j.repairType === 'DISPLAY'),
    [repairJobs],
  )

  const [l1l2Engineer, setL1L2Engineer] = useState<string>(
    l2Job?.assignedTo ?? l3Job?.assignedTo ?? '',
  )
  const [displayEngineer, setDisplayEngineer] = useState<string>(displayJob?.assignedTo ?? '')

  const [qcDialogOpen, setQcDialogOpen] = useState(false)
  const [assignRackOpen, setAssignRackOpen] = useState(false)
  const qcOutwardCtx = useMemo(() => {
    if (!id) return null
    for (const outward of mockOutwardRecords) {
      const od = outward.devices.find((d) => d.deviceId === id)
      if (od) return { outward, device: od }
    }
    return null
  }, [id])

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
    const panelLabel = job.panelType === 'TOP_COVER' ? 'Top Cover' : 'Bottom Cover'
    if (job.history && job.history.length > 0) {
      job.history.forEach((entry, idx) => {
        const titleByEvent: Record<typeof entry.event, string> = {
          SENT: `Paint (${panelLabel}) — sent to vendor`,
          REPAINT_SENT: `Paint (${panelLabel}) — sent for repaint`,
          COMPLETED: `Paint (${panelLabel}) — completed`,
        }
        timelineEntries.push({
          id: `paint-${job.id}-${idx}`,
          icon: Paintbrush,
          title: titleByEvent[entry.event],
          description: entry.notes,
          user: entry.vendor,
          timestamp: formatDate(entry.at),
          variant:
            entry.event === 'COMPLETED'
              ? 'success'
              : entry.event === 'REPAINT_SENT'
                ? 'warning'
                : 'default',
        })
      })
    } else {
      timelineEntries.push({
        id: `paint-${job.id}`,
        icon: Paintbrush,
        title: `Paint (${panelLabel}) — ${job.status.replace(/_/g, ' ').toLowerCase()}`,
        user: job.assignedTo,
        timestamp: formatDate(job.completedAt ?? job.startedAt),
        variant: job.status === 'COLLECTED' || job.status === 'READY_FOR_COLLECTION' ? 'success' : 'default',
      })
    }
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
  ]

  const canStartInspection =
    from === 'inspection' && device.status === 'PENDING_INSPECTION'
  const startableRepair =
    from === 'repair'
      ? repairJobs.find((j) => j.status === 'Assigned')
      : undefined
  // Three-stage repair flow: Start → Start QC → Assemble.
  const qcableRepair =
    from === 'repair'
      ? repairJobs.find((j) => j.status === 'In Progress')
      : undefined
  const assemblableRepair =
    from === 'repair'
      ? repairJobs.find((j) => j.status === 'QC Passed')
      : undefined
  const canStartQC =
    from === 'qc' &&
    (device.status === 'AWAITING_QC' ||
      device.status === 'UNDER_QC' ||
      device.status === 'AWAITING_OUTWARD_QC' ||
      device.status === 'UNDER_OUTWARD_QC')
  const canAssignRack =
    from === 'rack' &&
    (device.status === 'READY_FOR_STOCK' ||
      (device.status === 'IN_STOCK' && !device.rackLocation))
  const canReassignRack =
    from === 'rack' && device.status === 'IN_STOCK' && !!device.rackLocation

  const paintPanelJobs = paintJobs

  const handleStartInspection = () => {
    toast.success(`Opening inspection for ${device.barcode}…`)
    navigate(`/wms/inspection?open=${device.id}`)
  }

  const handleStartRepair = () => {
    if (!startableRepair) return
    toast.success(`Opening repair for ${device.barcode}…`)
    navigate(`/wms/repair?open=${startableRepair.id}`)
  }

  const handleStartRepairQc = () => {
    if (!qcableRepair) return
    setQcDialogOpen(true)
  }

  const handleAssembleRepair = () => {
    if (!assemblableRepair) return
    toast.success(`Opening assembly for ${device.barcode}…`)
    navigate(`/wms/repair?assemble=${assemblableRepair.id}`)
  }

  const paintGroupStatus: 'PENDING' | 'SENT' | 'DONE' | null = useMemo(() => {
    if (from !== 'paint' || paintJobs.length === 0) return null
    if (paintJobs.every((j) => j.status === 'COLLECTED')) return 'DONE'
    if (paintJobs.every((j) => j.status === 'AWAITING_PAINT')) return 'PENDING'
    return 'SENT'
  }, [from, paintJobs])

  const [sendVendorOpen, setSendVendorOpen] = useState(false)
  const [isRepaintFlow, setIsRepaintFlow] = useState(false)
  const [paintVendorId, setPaintVendorId] = useState('')
  const [paintNotes, setPaintNotes] = useState('')

  const mutatePaintJobsForDevice = (
    update: (j: (typeof mockPaintJobs)[number]) => (typeof mockPaintJobs)[number],
  ) => {
    paintJobs.forEach((pj) => {
      const idx = mockPaintJobs.findIndex((j) => j.id === pj.id)
      const current = idx >= 0 ? mockPaintJobs[idx] : undefined
      if (current) mockPaintJobs[idx] = update(current)
    })
  }

  const handleConfirmSendVendor = () => {
    if (!paintVendorId) {
      toast.error('Please select a vendor.')
      return
    }
    const vendor = PAINT_VENDORS.find((v) => v.id === paintVendorId)
    if (!vendor) return
    const now = new Date().toISOString()
    const repaint = isRepaintFlow
    mutatePaintJobsForDevice((j) => ({
      ...j,
      status: 'IN_PAINT',
      assignedTo: vendor.name,
      startedAt: repaint ? now : j.startedAt ?? now,
      completedAt: repaint ? undefined : j.completedAt,
      history: [
        ...(j.history ?? []),
        {
          event: repaint ? 'REPAINT_SENT' : 'SENT',
          vendor: vendor.name,
          notes: paintNotes || undefined,
          at: now,
        },
      ],
    }))
    toast.success(
      repaint
        ? `${device.barcode} sent for repaint to ${vendor.name}`
        : `${device.barcode} sent to ${vendor.name} (${paintJobs.length} panel${paintJobs.length > 1 ? 's' : ''})`,
    )
    setSendVendorOpen(false)
    setIsRepaintFlow(false)
    setPaintVendorId('')
    setPaintNotes('')
    navigate('/wms/paint')
  }

  const handleCompletePaint = () => {
    const now = new Date().toISOString()
    mutatePaintJobsForDevice((j) => ({
      ...j,
      status: 'COLLECTED',
      completedAt: j.completedAt ?? now,
      history: [...(j.history ?? []), { event: 'COMPLETED', at: now }],
    }))
    const devIdx = mockDevices.findIndex((d) => d.id === device.id)
    const dev = devIdx >= 0 ? mockDevices[devIdx] : undefined
    if (dev) mockDevices[devIdx] = { ...dev, paintCompleted: true }
    toast.success(`Paint complete for ${device.barcode}`)
    navigate('/wms/paint')
  }

  const handleRepaint = () => {
    setIsRepaintFlow(true)
    setPaintVendorId('')
    setPaintNotes('')
    setSendVendorOpen(true)
  }

  const qcDialogType: 'INWARD' | 'OUTWARD' =
    device.status === 'AWAITING_OUTWARD_QC' ||
    device.status === 'UNDER_OUTWARD_QC' ||
    (!!qcOutwardCtx && device.status !== 'AWAITING_QC' && device.status !== 'UNDER_QC')
      ? 'OUTWARD'
      : 'INWARD'

  const handleStartQC = () => {
    setQcDialogOpen(true)
  }

  const handleEngineerChange = (
    role: 'l1l2' | 'display',
    value: string,
  ) => {
    if (role === 'l1l2') setL1L2Engineer(value)
    else setDisplayEngineer(value)
    toast.success(
      `${device.barcode}: ${role === 'l1l2' ? 'L3' : 'Display'} engineer set to ${value}`,
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={device.barcode}
        subtitle={`${device.brand} ${device.model} · S/N ${device.serialNumber}`}
        status={{
          label: DEVICE_STATUS_LABELS[status],
          variant: DEVICE_STATUS_VARIANT[status],
        }}
        badges={
          device.grade ? (
            <StatusBadge variant={device.grade === 'A' ? 'success' : 'info'}>
              Grade {device.grade}
            </StatusBadge>
          ) : undefined
        }
        breadcrumbs={[
          { label: 'WMS' },
          { label: 'Devices', href: '/wms/devices' },
          { label: device.barcode },
        ]}
        backHref="/wms/devices"
        actions={
          canStartInspection ||
          startableRepair ||
          qcableRepair ||
          assemblableRepair ||
          canStartQC ||
          paintGroupStatus === 'PENDING' ||
          paintGroupStatus === 'SENT' ||
          canAssignRack ||
          canReassignRack ? (
            <>
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
              {qcableRepair && (
                <Button
                  onClick={handleStartRepairQc}
                  className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                >
                  <Play className="size-4" />
                  Start QC
                </Button>
              )}
              {assemblableRepair && (
                <Button
                  onClick={handleAssembleRepair}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <CheckCircle2 className="size-4" />
                  Assemble
                </Button>
              )}
              {canStartQC && (
                <Button onClick={handleStartQC}>
                  <Play className="size-4" />
                  Start QC
                </Button>
              )}
              {paintGroupStatus === 'PENDING' && (
                <Button onClick={() => setSendVendorOpen(true)}>
                  <Paintbrush className="size-4" />
                  Send to vendor
                </Button>
              )}
              {paintGroupStatus === 'SENT' && (
                <>
                  <Button
                    onClick={handleCompletePaint}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="size-4" />
                    Complete
                  </Button>
                  <Button variant="outline" onClick={handleRepaint}>
                    <Paintbrush className="size-4" />
                    Repaint
                  </Button>
                </>
              )}
              {(canAssignRack || canReassignRack) && (
                <Button onClick={() => setAssignRackOpen(true)}>
                  <MapPin className="size-4" />
                  {canReassignRack ? 'Reassign Rack' : 'Assign Rack'}
                </Button>
              )}
            </>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
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
          {(from === 'inspection' || from === 'repair') && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs text-muted-foreground mb-3">Engineer Assignments</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">L3 Engineer</p>
                  <Select
                    value={l1l2Engineer}
                    onValueChange={(val) => { if (val) handleEngineerChange('l1l2', val) }}
                  >
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder="Assign L3 engineer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {L1_L2_ENGINEERS.map((eng) => (
                        <SelectItem key={eng} value={eng}>
                          {eng}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Display Engineer</p>
                  <Select
                    value={displayEngineer}
                    onValueChange={(val) => { if (val) handleEngineerChange('display', val) }}
                  >
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder="Assign Display engineer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPLAY_ENGINEERS.map((eng) => (
                        <SelectItem key={eng} value={eng}>
                          {eng}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line items — server assemblies only, in repair / QC / rack contexts */}
      {device.deviceKind === 'ASSEMBLY' &&
        device.components &&
        device.components.length > 0 &&
        (from === 'repair' || from === 'qc' || from === 'rack') && (
          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Part</th>
                      <th className="py-2 pr-3 font-medium">Part No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {device.components.map((c) => (
                      <tr key={c.slotId} className="border-b last:border-b-0">
                        <td className="py-2 pr-3 font-medium">{c.partName}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{c.serialNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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

      {/* Workflow Flags — hidden when arriving from a workflow stage page */}
      {from !== 'inspection' &&
        from !== 'repair' &&
        from !== 'spares' &&
        from !== 'paint' &&
        from !== 'qc' &&
        flags.some((f) => f.required) && (
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

        </div>

        {/* Right column: Workflow History pinned top-right */}
        <div className="space-y-6 lg:col-span-1">
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
      </div>

      {/* Shared QC popup — opened by Start QC, stays on this detail page. */}
      <QCDialog
        open={qcDialogOpen}
        onOpenChange={setQcDialogOpen}
        qcType={qcDialogType}
        device={device}
        outwardCtx={qcDialogType === 'OUTWARD' ? qcOutwardCtx : null}
      />

      <AssignRackDialog
        open={assignRackOpen}
        onOpenChange={setAssignRackOpen}
        device={device}
        onAssigned={(assignment) => {
          const devIdx = mockDevices.findIndex((d) => d.id === device.id)
          const dev = devIdx >= 0 ? mockDevices[devIdx] : undefined
          if (dev) {
            mockDevices[devIdx] = {
              ...dev,
              status: 'IN_STOCK',
              rackLocation: `${assignment.row}-${assignment.rack}-${assignment.bin}`,
            }
          }
        }}
      />

      <Dialog
        open={sendVendorOpen}
        onOpenChange={(open) => {
          setSendVendorOpen(open)
          if (!open) {
            setIsRepaintFlow(false)
            setPaintVendorId('')
            setPaintNotes('')
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isRepaintFlow ? 'Send for Repaint' : 'Send to Vendor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Device</p>
                  <p className="font-medium">{device.barcode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Panels</p>
                  <p className="font-medium">{paintJobs.length}</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paint-vendor">Vendor</Label>
              <Select
                value={paintVendorId}
                onValueChange={(val) => { if (val) setPaintVendorId(val) }}
              >
                <SelectTrigger id="paint-vendor" className="w-full">
                  <SelectValue placeholder="Select a paint vendor…" />
                </SelectTrigger>
                <SelectContent>
                  {PAINT_VENDORS.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paint-notes">Notes (optional)</Label>
              <Textarea
                id="paint-notes"
                value={paintNotes}
                onChange={(e) => setPaintNotes(e.target.value)}
                placeholder="Special instructions for the vendor…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendVendorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSendVendor}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DeviceDetailPage
