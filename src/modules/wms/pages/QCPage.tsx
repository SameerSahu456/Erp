import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, Check, X, Minus, ChevronDown, ChevronRight, Printer, Paperclip } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
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

import { mockDevices } from '../data/devices'
import { mockQCRecords } from '../data/qc-records'
import { mockOutwardRecords } from '../data/outward'
import {
  INSPECTION_CHECKLIST_ITEMS,
  type Device,
  type QCRecord,
  type InspectionResult,
  type OutwardDevice,
  type OutwardRecord,
} from '../types'

const QC_ENGINEERS = ['Deepak Verma', 'Anita Sharma']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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
type QCType = 'INWARD' | 'OUTWARD'

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024 // 5 MB

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

function QCPage() {
  const navigate = useNavigate()
  const [qcDialogOpen, setQcDialogOpen] = useState(false)
  const [qcType, setQcType] = useState<QCType>('INWARD')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [selectedOutwardCtx, setSelectedOutwardCtx] = useState<{ outward: OutwardRecord; device: OutwardDevice } | null>(null)
  const [checklist, setChecklist] = useState<ChecklistState>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [qcResult, setQcResult] = useState<'PASSED' | 'FAILED' | null>(null)
  const [grade, setGrade] = useState<'A' | 'B' | ''>('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [qcAssignments, setQcAssignments] = useState<Record<string, string>>({})

  const handleAssignQCEngineer = (deviceId: string, engineer: string) => {
    setQcAssignments((prev) => ({ ...prev, [deviceId]: engineer }))
    const device = mockDevices.find((d) => d.id === deviceId)
    toast.success(`${device?.barcode ?? deviceId} assigned to ${engineer}`)
  }

  // ── Inward QC ──────────────────────────────────────────────────────────
  const inwardPendingDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'AWAITING_QC'),
    [],
  )
  const inwardQCRecords = useMemo(
    () => mockQCRecords.filter((r) => r.qcType === 'INWARD'),
    [],
  )

  const inwardPendingRows = useMemo(
    () =>
      inwardPendingDevices.map((d) => ({
        id: d.id,
        _deviceId: d.id,
        _qcType: 'INWARD' as const,
        barcode: d.barcode,
        partSerial: `${d.model}\n${d.serialNumber}`,
        biosNo: d.biosNo ?? '-',
        brand: d.brand,
        rework: d.qcFailCount,
        assignedTo: qcAssignments[d.id] ?? d.assignedTo ?? '',
        actions: '',
      })),
    [inwardPendingDevices, qcAssignments],
  )

  const inwardCompletedRows = useMemo(
    () =>
      inwardQCRecords.map((r) => {
        const device = mockDevices.find((d) => d.id === r.deviceId)
        return {
          id: r.id,
          _deviceId: r.deviceId,
          barcode: r.deviceBarcode,
          partSerial: `${device?.model ?? '-'}\n${device?.serialNumber ?? '-'}`,
          biosNo: device?.biosNo ?? '-',
          result: r.result,
          grade: r.grade ?? '-',
          rework: device?.qcFailCount ?? 0,
          inspectedBy: r.inspectedBy,
          date: formatDate(r.inspectedAt),
        }
      }),
    [inwardQCRecords],
  )

  // ── Outward QC ─────────────────────────────────────────────────────────
  const outwardPendingOutwards = useMemo(
    () => mockOutwardRecords.filter((r) => r.status === 'Pending QC' || r.status === 'Packed'),
    [],
  )
  const outwardQCRecords = useMemo(
    () => mockQCRecords.filter((r) => r.qcType === 'OUTWARD'),
    [],
  )

  const outwardPendingRows = useMemo(() => {
    const rows: Record<string, unknown>[] = []
    outwardPendingOutwards.forEach((outward) => {
      outward.devices
        .filter((d) => d.qcResult === 'Pending')
        .forEach((device) => {
          const base = mockDevices.find((x) => x.id === device.deviceId)
          rows.push({
            id: `${outward.id}-${device.deviceId}`,
            _deviceId: device.deviceId,
            _qcType: 'OUTWARD' as const,
            _outwardId: outward.id,
            outwardNumber: outward.outwardNumber,
            customerName: outward.customerName,
            barcode: device.barcode,
            partSerial: `${device.model}\n${device.serialNumber}`,
            biosNo: base?.biosNo ?? '-',
            grade: device.grade ?? '-',
            rework: base?.outwardQcFailCount ?? 0,
          })
        })
    })
    return rows
  }, [outwardPendingOutwards])

  const outwardCompletedRows = useMemo(
    () =>
      outwardQCRecords.map((r) => {
        const device = mockDevices.find((d) => d.id === r.deviceId)
        return {
          id: r.id,
          _deviceId: r.deviceId,
          barcode: r.deviceBarcode,
          partSerial: `${device?.model ?? '-'}\n${device?.serialNumber ?? '-'}`,
          biosNo: device?.biosNo ?? '-',
          result: r.result,
          rework: device?.outwardQcFailCount ?? 0,
          inspectedBy: r.inspectedBy,
          date: formatDate(r.inspectedAt),
          notes: r.notes ?? '-',
        }
      }),
    [outwardQCRecords],
  )

  const inwardTabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'inward-pending',
        label: `Pending (${inwardPendingRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'brand', label: 'Brand', sortable: true },
          { key: 'rework', label: 'Rework', align: 'center' as const, sortable: true },
          { key: 'assignedTo', label: 'Assigned To' },
          { key: 'actions', label: 'Actions' },
        ],
        data: inwardPendingRows,
      },
      {
        id: 'inward-completed',
        label: `Completed (${inwardCompletedRows.length})`,
        columns: [
          { key: 'barcode', label: 'Device Barcode', sortable: true },
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'result', label: 'Result' },
          { key: 'grade', label: 'Grade' },
          { key: 'rework', label: 'Rework', align: 'center' as const },
          { key: 'inspectedBy', label: 'Inspected By' },
          { key: 'date', label: 'Date', sortable: true },
        ],
        data: inwardCompletedRows,
      },
    ],
    [inwardPendingRows, inwardCompletedRows],
  )

  const outwardTabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'outward-pending',
        label: `Pending (${outwardPendingRows.length})`,
        columns: [
          { key: 'outwardNumber', label: 'Outward #', sortable: true },
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'customerName', label: 'Customer', sortable: true },
          { key: 'grade', label: 'Grade' },
          { key: 'rework', label: 'Rework', align: 'center' as const },
          { key: 'actions', label: 'Actions' },
        ],
        data: outwardPendingRows,
      },
      {
        id: 'outward-completed',
        label: `Completed (${outwardCompletedRows.length})`,
        columns: [
          { key: 'barcode', label: 'Device Barcode', sortable: true },
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'result', label: 'Result' },
          { key: 'rework', label: 'Rework', align: 'center' as const },
          { key: 'inspectedBy', label: 'Inspected By' },
          { key: 'date', label: 'Date', sortable: true },
        ],
        data: outwardCompletedRows,
      },
    ],
    [outwardPendingRows, outwardCompletedRows],
  )

  const handleStartInwardQC = (device: Device) => {
    setQcType('INWARD')
    setSelectedDevice(device)
    setSelectedOutwardCtx(null)
    setChecklist({})
    setCollapsedGroups({})
    setQcResult(null)
    setGrade('')
    setAdditionalNotes('')
    setAttachments([])
    setQcDialogOpen(true)
  }

  const handleStartOutwardQC = (outwardId: string, deviceId: string) => {
    const outward = mockOutwardRecords.find((o) => o.id === outwardId)
    const device = outward?.devices.find((d) => d.deviceId === deviceId)
    if (!outward || !device) return
    const base = mockDevices.find((x) => x.id === deviceId) ?? null
    setQcType('OUTWARD')
    setSelectedDevice(base)
    setSelectedOutwardCtx({ outward, device })
    setChecklist({})
    setCollapsedGroups({})
    setQcResult(null)
    setGrade('')
    setAdditionalNotes('')
    setAttachments([])
    setQcDialogOpen(true)
  }

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
      if (key === 'outwardNumber') {
        return {
          display: <span className="font-medium text-muted-foreground">{String(value)}</span>,
        }
      }
      if (key === 'actions') {
        const type = row._qcType as QCType | undefined
        const barcode = row.barcode as string
        return {
          display: (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {type === 'INWARD' && (
                <Button
                  size="xs"
                  onClick={() => {
                    const device = mockDevices.find((d) => d.id === row._deviceId)
                    if (device) handleStartInwardQC(device)
                  }}
                >
                  Start Inward QC
                </Button>
              )}
              {type === 'OUTWARD' && (
                <Button
                  size="xs"
                  onClick={() => handleStartOutwardQC(row._outwardId as string, row._deviceId as string)}
                >
                  Start Outward QC
                </Button>
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
      if (key === 'assignedTo' && row._qcType === 'INWARD') {
        const deviceId = row.id as string
        const currentValue = value as string
        return {
          display: (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={currentValue || ''}
                onValueChange={(val) => { if (val) handleAssignQCEngineer(deviceId, val) }}
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Assign..." />
                </SelectTrigger>
                <SelectContent>
                  {QC_ENGINEERS.map((eng) => (
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
      if (key === 'result') {
        const result = value as QCRecord['result']
        const variant = result === 'PASSED' ? 'success' : 'error'
        return {
          display: <StatusBadge variant={variant}>{result === 'PASSED' ? 'Pass' : 'Fail'}</StatusBadge>,
          className: result === 'FAILED' ? 'bg-destructive/10' : undefined,
        }
      }
      return null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const checkedCount = Object.keys(checklist).length
  const passCount = Object.values(checklist).filter((i) => i.result === 'PASS').length
  const failCount = Object.values(checklist).filter((i) => i.result === 'FAIL').length
  const naCount = Object.values(checklist).filter((i) => i.result === 'NOT_APPLICABLE').length

  const handleChecklistChange = (itemId: string, result: InspectionResult) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: { result, notes: prev[itemId]?.notes ?? '' },
    }))
  }

  const handleChecklistNotes = (itemId: string, notes: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], result: prev[itemId]?.result ?? 'FAIL', notes },
    }))
  }

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const handleAttachmentUpload = (files: FileList | null) => {
    if (!files) return
    const validFiles: File[] = []
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`"${file.name}" exceeds 5 MB limit.`)
        continue
      }
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext ?? '')) {
        toast.error(`"${file.name}" is not a supported file type (jpg, png, pdf only).`)
        continue
      }
      validFiles.push(file)
    }
    setAttachments((prev) => [...prev, ...validFiles])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmitQC = () => {
    if (checkedCount < INSPECTION_CHECKLIST_ITEMS.length) {
      toast.error('Please complete all checklist items.')
      return
    }
    if (!qcResult) {
      toast.error('Please select a QC result (Pass/Fail).')
      return
    }
    if (qcType === 'INWARD' && qcResult === 'PASSED' && !grade) {
      toast.error('Please select a grade.')
      return
    }

    if (qcType === 'INWARD') {
      toast.success(
        qcResult === 'PASSED'
          ? `Inward QC passed for ${selectedDevice?.barcode} - Grade ${grade} (${grade === 'A' ? 'Excellent' : 'Good'}) — ready for rack assignment`
          : `Inward QC failed for ${selectedDevice?.barcode} - sent back to repair`,
      )
    } else {
      const deviceBarcode = selectedOutwardCtx?.device.barcode
      const outwardNumber = selectedOutwardCtx?.outward.outwardNumber
      toast.success(
        qcResult === 'PASSED'
          ? `Outward QC passed for ${deviceBarcode} (${outwardNumber}) - eligible for dispatch`
          : `Outward QC failed for ${deviceBarcode} (${outwardNumber}) - sent back to repair`,
      )
    }
    setQcDialogOpen(false)
    setSelectedDevice(null)
    setSelectedOutwardCtx(null)
  }

  const dialogTitle =
    qcType === 'INWARD'
      ? `Inward QC: ${selectedDevice?.barcode ?? ''}`
      : `Outward QC: ${selectedOutwardCtx?.device.barcode ?? ''}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cpt-page-title">Quality Control</h1>
        <p className="text-sm text-muted-foreground">
          Inward QC gates rack assignment. Outward QC gates dispatch — failed devices are sent back to repair.
        </p>
      </div>

      {/* Inward QC — gates rack assignment */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Inward QC</h2>
          <p className="text-sm text-muted-foreground">
            Quality check on repaired devices before rack assignment.
          </p>
        </div>
        <BusinessMetricsTable
          tabs={inwardTabs}
          cellFormatter={cellFormatter}
          persistKey="wms-qc-inward"
          onRowClick={(row) => navigate(`/wms/devices/${row._deviceId}?from=qc`)}
        />
      </div>

      {/* Outward QC — gates dispatch */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Outward QC</h2>
          <p className="text-sm text-muted-foreground">
            Pre-dispatch check. Only devices that pass Outward QC are eligible for outward; failed devices are sent back to repair.
          </p>
        </div>
        <BusinessMetricsTable
          tabs={outwardTabs}
          cellFormatter={cellFormatter}
          persistKey="wms-qc-outward"
          onRowClick={(row) => navigate(`/wms/devices/${row._deviceId}?from=qc`)}
        />
      </div>

      {/* QC Dialog */}
      <Dialog open={qcDialogOpen} onOpenChange={setQcDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Sticky Header */}
          <div className="shrink-0 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg">{dialogTitle}</DialogTitle>
              {qcType === 'INWARD' && selectedDevice && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-1">
                  <span>
                    <span className="font-medium text-foreground">Model:</span>{' '}
                    {selectedDevice.model}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Brand:</span>{' '}
                    {selectedDevice.brand}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Serial:</span>{' '}
                    {selectedDevice.serialNumber}
                  </span>
                  {selectedDevice.biosNo && (
                    <span>
                      <span className="font-medium text-foreground">BIOS:</span>{' '}
                      {selectedDevice.biosNo}
                    </span>
                  )}
                </div>
              )}
              {qcType === 'OUTWARD' && selectedOutwardCtx && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-1">
                  <span>
                    <span className="font-medium text-foreground">Outward:</span>{' '}
                    {selectedOutwardCtx.outward.outwardNumber}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Customer:</span>{' '}
                    {selectedOutwardCtx.outward.customerName}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Model:</span>{' '}
                    {selectedOutwardCtx.device.model}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Serial:</span>{' '}
                    {selectedOutwardCtx.device.serialNumber}
                  </span>
                  {selectedDevice?.biosNo && (
                    <span>
                      <span className="font-medium text-foreground">BIOS:</span>{' '}
                      {selectedDevice.biosNo}
                    </span>
                  )}
                </div>
              )}
            </DialogHeader>

            {/* Sticky progress bar */}
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

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Checklist */}
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

            {/* QC Result */}
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="text-sm font-semibold">QC Result</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={qcResult === 'PASSED' ? 'default' : 'outline'}
                  className={
                    qcResult === 'PASSED'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : ''
                  }
                  onClick={() => setQcResult('PASSED')}
                >
                  <Check className="size-4" />
                  Pass
                </Button>
                <Button
                  size="sm"
                  variant={qcResult === 'FAILED' ? 'default' : 'outline'}
                  className={
                    qcResult === 'FAILED'
                      ? 'bg-destructive text-white hover:bg-destructive/90'
                      : ''
                  }
                  onClick={() => {
                    setQcResult('FAILED')
                    setGrade('')
                  }}
                >
                  <X className="size-4" />
                  Fail
                </Button>
              </div>
            </div>

            {/* Grade (only on inward pass) */}
            {qcType === 'INWARD' && qcResult === 'PASSED' && (
              <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30 p-4">
                <Label className="text-sm font-semibold">Grade</Label>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    variant={grade === 'A' ? 'default' : 'outline'}
                    className={grade === 'A' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                    onClick={() => setGrade('A')}
                  >
                    Grade A - Excellent
                  </Button>
                  <Button
                    size="sm"
                    variant={grade === 'B' ? 'default' : 'outline'}
                    className={grade === 'B' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                    onClick={() => setGrade('B')}
                  >
                    Grade B - Good
                  </Button>
                </div>
              </div>
            )}

            {/* QC Failed warning */}
            {qcResult === 'FAILED' && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  {qcType === 'INWARD' ? (
                    <>
                      Device will be sent back to repair. Current inward QC fail count:{' '}
                      <span className="font-bold">{selectedDevice?.qcFailCount ?? 0}</span>
                    </>
                  ) : (
                    <>
                      Device will be sent back to repair — not eligible for outward until Outward QC passes.
                      Current outward QC fail count:{' '}
                      <span className="font-bold">{selectedDevice?.outwardQcFailCount ?? 0}</span>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="qc-notes">Additional Notes</Label>
              <Textarea
                id="qc-notes"
                placeholder="Additional observations, comments..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Attachments</Label>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, or PDF files (max 5 MB each)
              </p>
              <div className="space-y-1.5">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      className="text-destructive hover:text-destructive/80 shrink-0"
                      onClick={() => removeAttachment(idx)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAttachmentUpload(e.target.files)}
                  />
                  <Paperclip className="size-3.5" />
                  Add Attachment
                </label>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <DialogFooter className="shrink-0 rounded-b-xl">
            <Button variant="outline" onClick={() => setQcDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitQC}>Submit QC Result</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default QCPage
