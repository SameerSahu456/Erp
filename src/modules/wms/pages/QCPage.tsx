import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Check, X, Minus, ChevronDown, ChevronRight, Camera, Upload, Printer, Paperclip } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  INSPECTION_CHECKLIST_ITEMS,
  type Device,
  type QCRecord,
  type InspectionResult,
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
  const [qcDialogOpen, setQcDialogOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [checklist, setChecklist] = useState<ChecklistState>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [qcResult, setQcResult] = useState<'PASSED' | 'FAILED' | null>(null)
  const [grade, setGrade] = useState<'A' | 'B' | ''>('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [deviceImages, setDeviceImages] = useState<File[]>([])
  const [qcAssignments, setQcAssignments] = useState<Record<string, string>>({})

  const handleAssignQCEngineer = (deviceId: string, engineer: string) => {
    setQcAssignments((prev) => ({ ...prev, [deviceId]: engineer }))
    const device = mockDevices.find((d) => d.id === deviceId)
    toast.success(`${device?.barcode ?? deviceId} assigned to ${engineer}`)
  }

  const pendingDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'AWAITING_QC'),
    [],
  )

  const inwardQCRecords = useMemo(
    () => mockQCRecords.filter((r) => r.qcType === 'INWARD'),
    [],
  )

  const pendingRows = useMemo(
    () =>
      pendingDevices.map((d) => ({
        id: d.id,
        barcode: d.barcode,
        model: d.model,
        brand: d.brand,
        qcFailCount: d.qcFailCount,
        assignedTo: qcAssignments[d.id] ?? d.assignedTo ?? '',
        actions: '',
      })),
    [pendingDevices, qcAssignments],
  )

  const completedRows = useMemo(
    () =>
      inwardQCRecords.map((r) => ({
        id: r.id,
        barcode: r.deviceBarcode,
        qcType: r.qcType,
        result: r.result,
        grade: r.grade ?? '-',
        inspectedBy: r.inspectedBy,
        date: formatDate(r.inspectedAt),
      })),
    [inwardQCRecords],
  )

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'pending',
        label: `Pending QC (${pendingRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'model', label: 'Model', sortable: true },
          { key: 'brand', label: 'Brand', sortable: true },
          { key: 'qcFailCount', label: 'QC Fail Count', sortable: true, align: 'center' as const },
          { key: 'assignedTo', label: 'Assigned To' },
          { key: 'actions', label: 'Actions' },
        ],
        data: pendingRows,
      },
      {
        id: 'completed',
        label: `Completed (${completedRows.length})`,
        columns: [
          { key: 'barcode', label: 'Device Barcode', sortable: true },
          { key: 'qcType', label: 'QC Type' },
          { key: 'result', label: 'Result' },
          { key: 'grade', label: 'Grade' },
          { key: 'inspectedBy', label: 'Inspected By' },
          { key: 'date', label: 'Date', sortable: true },
        ],
        data: completedRows,
      },
    ],
    [pendingRows, completedRows],
  )

  const handleStartQC = (device: Device) => {
    setSelectedDevice(device)
    setChecklist({})
    setCollapsedGroups({})
    setQcResult(null)
    setGrade('')
    setAdditionalNotes('')
    setAttachments([])
    setDeviceImages([])
    setQcDialogOpen(true)
  }

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
      if (key === 'actions' && row.model !== undefined) {
        return {
          display: (
            <Button
              size="xs"
              onClick={() => {
                const device = mockDevices.find((d) => d.id === row.id)
                if (device) handleStartQC(device)
              }}
            >
              Start QC
            </Button>
          ),
        }
      }
      if (key === 'assignedTo' && row.model !== undefined) {
        const deviceId = row.id as string
        const currentValue = value as string
        return {
          display: (
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
          ),
        }
      }
      if (key === 'qcFailCount') {
        const count = value as number
        if (count > 0) {
          return {
            className: 'bg-destructive/10 text-destructive font-medium',
            display: String(count),
          }
        }
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

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return
    setDeviceImages((prev) => [...prev, ...Array.from(files)])
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

  const removeImage = (index: number) => {
    setDeviceImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmitQC = () => {
    if (deviceImages.length === 0) {
      toast.error('Please upload at least one device image.')
      return
    }
    if (checkedCount < INSPECTION_CHECKLIST_ITEMS.length) {
      toast.error('Please complete all checklist items.')
      return
    }
    if (!qcResult) {
      toast.error('Please select a QC result (Pass/Fail).')
      return
    }
    if (qcResult === 'PASSED' && !grade) {
      toast.error('Please select a grade.')
      return
    }
    toast.success(
      qcResult === 'PASSED'
        ? `QC passed for ${selectedDevice?.barcode} - Grade ${grade} (${grade === 'A' ? 'Excellent' : 'Good'})`
        : `QC failed for ${selectedDevice?.barcode} - sent back to repair`,
    )
    setQcDialogOpen(false)
    setSelectedDevice(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Quality Control</h1>
        <p className="text-sm text-muted-foreground">
          Perform inward quality checks on repaired devices.
        </p>
      </div>

      {/* QC Queue Table */}
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />

      {/* QC Dialog */}
      <Dialog open={qcDialogOpen} onOpenChange={setQcDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>QC: {selectedDevice?.barcode}</DialogTitle>
            {selectedDevice && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
              </div>
            )}
          </DialogHeader>

          <div className="space-y-6">
            {/* Device Images */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Device Images <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-wrap gap-3">
                {deviceImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <div className="w-20 h-20 rounded-md border bg-muted overflow-hidden">
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`Device ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(idx)}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                  <Camera className="size-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Photo</span>
                </label>
                <label className="w-20 h-20 rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                  <Upload className="size-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                </label>
              </div>
            </div>

            {/* Progress */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {checkedCount}/{INSPECTION_CHECKLIST_ITEMS.length} items checked
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
                    Pass: {passCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2.5 rounded-full bg-destructive" />
                    Fail: {failCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2.5 rounded-full bg-muted-foreground" />
                    N/A: {naCount}
                  </span>
                </div>
              </div>
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

            {/* Checklist */}
            {GROUP_ORDER.map((group) => {
              const items = CHECKLIST_GROUPS[group]
              if (!items) return null
              const isCollapsed = collapsedGroups[group] ?? false
              const groupChecked = items.filter((i) => checklist[i.id]).length
              return (
                <Collapsible key={group} open={!isCollapsed}>
                  <CollapsibleTrigger
                    className="flex w-full items-center justify-between rounded-md border bg-muted/40 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors"
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
                    <span className="text-xs text-muted-foreground">
                      {groupChecked}/{items.length}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 pt-2">
                      {items.map((item) => {
                        const state = checklist[item.id]
                        return (
                          <div key={item.id} className="rounded-lg border bg-card">
                            <div className="flex items-center justify-between gap-4 px-4 py-3">
                              <p className="text-sm font-medium">{item.label}</p>
                              <div className="flex shrink-0 gap-1.5">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className={
                                    state?.result === 'PASS'
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400'
                                      : 'border-emerald-200 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800'
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
                                      ? 'border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20'
                                      : 'border-[#f1416c]/30 text-[#f1416c] hover:border-[#f1416c]/60 hover:bg-[#fff5f8]'
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
                                      : 'text-muted-foreground hover:bg-muted'
                                  }
                                  onClick={() => handleChecklistChange(item.id, 'NOT_APPLICABLE')}
                                >
                                  <Minus className="size-3.5" /> N/A
                                </Button>
                              </div>
                            </div>
                            {state?.result === 'FAIL' && (
                              <div className="border-t px-4 py-2.5">
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
                  Fail
                </Button>
              </div>
            </div>

            {/* Grade (only on pass) */}
            {qcResult === 'PASSED' && (
              <div className="space-y-3 rounded-lg border p-4">
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
            {qcResult === 'FAILED' && selectedDevice && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  Device will be sent back to repair. Current QC fail count:{' '}
                  <span className="font-bold">{selectedDevice.qcFailCount}</span>
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
              />
            </div>

            {/* Attachments */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Attachments</Label>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, or PDF files (max 5 MB each)
              </p>
              <div className="space-y-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                    <Paperclip className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      className="text-destructive hover:text-destructive/80"
                      onClick={() => removeAttachment(idx)}
                    >
                      <X className="size-4" />
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
                  <Paperclip className="size-4" />
                  Add Attachment
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
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
