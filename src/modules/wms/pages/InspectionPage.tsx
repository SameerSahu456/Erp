import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Check, X, Minus, Camera, Upload, Printer, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import { mockDevices } from '../data/devices'
import { mockInspections } from '../data/inspections'
import {
  INSPECTION_CHECKLIST_ITEMS,
  type Device,
  type InspectionResult,
  type PaintPanelType,
} from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Group checklist items by their group field
const CHECKLIST_GROUPS = INSPECTION_CHECKLIST_ITEMS.reduce<
  Record<string, typeof INSPECTION_CHECKLIST_ITEMS[number][]>
>((acc, item) => {
  const group = item.group
  if (!acc[group]) acc[group] = []
  acc[group].push(item)
  return acc
}, {})

const GROUP_ORDER = ['Panels', 'Display', 'Input', 'Audio', 'Power', 'Hardware', 'Ports']

const INSPECTION_ENGINEERS = ['Ravi Kumar', 'Priya Nair', 'Sanjay Gupta']

const AVAILABLE_SPARES = [
  'Keyboard', 'Touchpad', 'Screen Panel', 'Battery', 'SSD 256GB', 'SSD 512GB',
  'RAM 8GB', 'RAM 16GB', 'Fan Assembly', 'Hinge Set', 'Speaker Module',
  'USB Port Board', 'HDMI Port Board', 'Power Jack', 'Webcam Module',
  'LCD Cable', 'Motherboard', 'Charger', 'Palm Rest',
]

type ChecklistState = Record<string, { result: InspectionResult; notes: string }>

interface SpareRequest {
  spareName: string
  qty: number
}

function handlePrintBarcode(barcode: string, model: string, serial: string) {
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
          <div style="font-size: 12px; margin-top: 8px; color: #555;">${model}</div>
          <div style="font-size: 11px; margin-top: 4px; color: #777;">S/N: ${serial}</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

function InspectionPage() {
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [checklist, setChecklist] = useState<ChecklistState>({})
  const [requiresSpares, setRequiresSpares] = useState(false)
  const [spareRequests, setSpareRequests] = useState<SpareRequest[]>([])
  const [requiresPaint, setRequiresPaint] = useState(false)
  const [paintPanels, setPaintPanels] = useState<PaintPanelType[]>([])
  const [overallNotes, setOverallNotes] = useState('')
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [deviceImages, setDeviceImages] = useState<File[]>([])

  const handleAssignEngineer = (deviceId: string, engineer: string) => {
    setAssignments((prev) => ({ ...prev, [deviceId]: engineer }))
    const device = mockDevices.find((d) => d.id === deviceId)
    toast.success(`${device?.barcode ?? deviceId} assigned to ${engineer}`)
  }

  const hasFailures = useMemo(
    () => Object.values(checklist).some((item) => item.result === 'FAIL'),
    [checklist],
  )

  const checkedCount = useMemo(
    () => Object.keys(checklist).length,
    [checklist],
  )

  const passCount = useMemo(
    () => Object.values(checklist).filter((i) => i.result === 'PASS').length,
    [checklist],
  )

  const failCount = useMemo(
    () => Object.values(checklist).filter((i) => i.result === 'FAIL').length,
    [checklist],
  )

  const naCount = useMemo(
    () => Object.values(checklist).filter((i) => i.result === 'NOT_APPLICABLE').length,
    [checklist],
  )

  const pendingDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'PENDING_INSPECTION'),
    [],
  )

  const completedDevices = useMemo(() => {
    const statusOrder: Device['status'][] = [
      'INSPECTED',
      'WAITING_FOR_SPARES',
      'READY_FOR_REPAIR',
      'UNDER_REPAIR',
      'IN_L3_REPAIR',
      'IN_DISPLAY_REPAIR',
      'IN_BATTERY_BOOST',
      'IN_PAINT_SHOP',
      'AWAITING_QC',
      'UNDER_QC',
      'READY_FOR_STOCK',
      'IN_STOCK',
      'AWAITING_OUTWARD_QC',
      'UNDER_OUTWARD_QC',
      'READY_FOR_DISPATCH',
      'DISPATCHED',
      'SCRAPPED',
    ]
    return mockDevices.filter((d) => statusOrder.includes(d.status))
  }, [])

  const pendingRows = useMemo(
    () =>
      pendingDevices.map((d) => ({
        id: d.id,
        barcode: d.barcode,
        model: d.model,
        brand: d.brand,
        batch: d.batchNumber,
        receivedDate: formatDate(d.receivedAt),
        assignedTo: assignments[d.id] ?? '',
        actions: '',
      })),
    [pendingDevices, assignments],
  )

  const completedRows = useMemo(
    () =>
      completedDevices.map((d) => {
        const insp = mockInspections.find((i) => i.deviceId === d.id)
        return {
          id: d.id,
          barcode: d.barcode,
          model: d.model,
          result: insp
            ? insp.checklist.every((c) => c.result !== 'FAIL')
              ? 'All Pass'
              : 'Has Failures'
            : '-',
          repair: d.requiresRepair ? 'Yes' : 'No',
          paint: d.requiresPaint ? 'Yes' : 'No',
          spares: d.requiresSpares ? 'Yes' : 'No',
          date: d.inspectedAt ? formatDate(d.inspectedAt) : '-',
        }
      }),
    [completedDevices],
  )

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'pending',
        label: `Pending (${pendingRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'model', label: 'Model', sortable: true },
          { key: 'brand', label: 'Brand', sortable: true },
          { key: 'batch', label: 'Batch' },
          { key: 'receivedDate', label: 'Received Date', sortable: true },
          { key: 'assignedTo', label: 'Assign' },
          { key: 'actions', label: 'Actions' },
        ],
        data: pendingRows,
      },
      {
        id: 'completed',
        label: `Completed (${completedRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'model', label: 'Model', sortable: true },
          { key: 'result', label: 'Result' },
          { key: 'repair', label: 'Repair' },
          { key: 'paint', label: 'Paint' },
          { key: 'spares', label: 'Spares' },
          { key: 'date', label: 'Date', sortable: true },
        ],
        data: completedRows,
      },
    ],
    [pendingRows, completedRows],
  )

  const handleStartInspection = (device: Device) => {
    setSelectedDevice(device)
    setChecklist({})
    setRequiresSpares(false)
    setSpareRequests([])
    setRequiresPaint(false)
    setPaintPanels([])
    setOverallNotes('')
    setCollapsedGroups({})
    setDeviceImages([])
    setInspectionDialogOpen(true)
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
                onClick={() => {
                  const device = mockDevices.find((d) => d.id === row.id)
                  if (device) handlePrintBarcode(device.barcode, device.model, device.serialNumber)
                }}
                title="Print barcode"
              >
                <Printer className="size-3.5" />
              </Button>
            </div>
          ),
        }
      }
      if (key === 'actions' && row.batch !== undefined) {
        // Only for pending tab rows
        return {
          display: (
            <Button
              size="xs"
              onClick={() => {
                const device = mockDevices.find((d) => d.id === row.id)
                if (device) handleStartInspection(device)
              }}
            >
              Start Inspection
            </Button>
          ),
        }
      }
      if (key === 'assignedTo' && row.batch !== undefined) {
        const deviceId = row.id as string
        const currentValue = value as string
        return {
          display: (
            <Select
              value={currentValue || ''}
              onValueChange={(val) => { if (val) handleAssignEngineer(deviceId, val) }}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Assign..." />
              </SelectTrigger>
              <SelectContent>
                {INSPECTION_ENGINEERS.map((eng) => (
                  <SelectItem key={eng} value={eng}>
                    {eng}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
        }
      }
      if (key === 'result') {
        const variant = value === 'All Pass' ? 'success' : 'warning'
        return { display: <StatusBadge variant={variant}>{String(value)}</StatusBadge> }
      }
      if ((key === 'repair' || key === 'paint' || key === 'spares') && value === 'Yes') {
        return { display: <StatusBadge variant="warning">Yes</StatusBadge> }
      }
      return null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

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

  const togglePaintPanel = (panel: PaintPanelType) => {
    setPaintPanels((prev) =>
      prev.includes(panel) ? prev.filter((p) => p !== panel) : [...prev, panel],
    )
  }

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const addSpareRequest = () => {
    setSpareRequests((prev) => [...prev, { spareName: '', qty: 1 }])
  }

  const updateSpareRequest = (index: number, field: 'spareName' | 'qty', value: string | number) => {
    setSpareRequests((prev) =>
      prev.map((sr, i) => (i === index ? { ...sr, [field]: value } : sr))
    )
  }

  const removeSpareRequest = (index: number) => {
    setSpareRequests((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files)
    setDeviceImages((prev) => [...prev, ...newFiles])
  }

  const removeImage = (index: number) => {
    setDeviceImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (deviceImages.length === 0) {
      toast.error('Please upload at least one device image before submitting.')
      return
    }
    const filledCount = Object.keys(checklist).length
    if (filledCount < INSPECTION_CHECKLIST_ITEMS.length) {
      toast.error('Please complete all checklist items before submitting.')
      return
    }
    if (requiresSpares && spareRequests.length === 0) {
      toast.error('Please add at least one spare part.')
      return
    }
    if (requiresSpares && spareRequests.some((sr) => !sr.spareName)) {
      toast.error('Please select a spare part for all spare requests.')
      return
    }
    toast.success(`Inspection completed for ${selectedDevice?.barcode}. Sent to repair section.`)
    setInspectionDialogOpen(false)
    setSelectedDevice(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Inspection</h1>
        <p className="text-sm text-muted-foreground">
          Process device inspections and flag issues for repair, paint, or spares.
        </p>
      </div>

      {/* Device Queue */}
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />

      {/* Inspection Dialog */}
      <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Sticky Header */}
          <div className="shrink-0 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Inspecting: {selectedDevice?.barcode}
              </DialogTitle>
              {selectedDevice && (
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
                </div>
              )}
            </DialogHeader>

            {/* Sticky progress bar */}
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex-1">
                <Progress
                  value={
                    INSPECTION_CHECKLIST_ITEMS.length > 0
                      ? Math.round(
                          (checkedCount / INSPECTION_CHECKLIST_ITEMS.length) * 100,
                        )
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
            {/* Device Images - Mandatory */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Device Images <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload or take photos of the device (mandatory)
              </p>
              <div className="flex flex-wrap gap-2.5">
                {deviceImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <div className="w-16 h-16 rounded-md border bg-muted overflow-hidden">
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
                <label className="w-16 h-16 rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                  <Camera className="size-4 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground mt-0.5">Photo</span>
                </label>
                <label className="w-16 h-16 rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                  <Upload className="size-4 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground mt-0.5">Upload</span>
                </label>
              </div>
              {deviceImages.length === 0 && (
                <p className="text-xs text-destructive">At least one image is required</p>
              )}
            </div>

            {/* Checklist grouped by category */}
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
                                  onClick={() =>
                                    handleChecklistChange(item.id, 'PASS')
                                  }
                                >
                                  <Check className="size-3.5" />
                                  Pass
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className={
                                    state?.result === 'FAIL'
                                      ? 'border-destructive bg-destructive text-white hover:bg-destructive/90'
                                      : 'border-muted-foreground/20 text-[#f1416c] hover:border-[#f1416c]/60 hover:bg-[#fff5f8] dark:text-[#f1416c] dark:hover:bg-red-950'
                                  }
                                  onClick={() =>
                                    handleChecklistChange(item.id, 'FAIL')
                                  }
                                >
                                  <X className="size-3.5" />
                                  Fail
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className={
                                    state?.result === 'NOT_APPLICABLE'
                                      ? 'border-muted-foreground/50 bg-muted text-muted-foreground'
                                      : 'border-muted-foreground/20 text-muted-foreground hover:bg-muted'
                                  }
                                  onClick={() =>
                                    handleChecklistChange(item.id, 'NOT_APPLICABLE')
                                  }
                                >
                                  <Minus className="size-3.5" />
                                  N/A
                                </Button>
                              </div>
                            </div>
                            {state?.result === 'FAIL' && (
                              <div className="border-t px-3 py-2">
                                <Input
                                  placeholder="Describe the issue..."
                                  value={state.notes}
                                  onChange={(e) =>
                                    handleChecklistNotes(item.id, e.target.value)
                                  }
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

            {/* Requires Spares */}
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="cursor-pointer">
                <Checkbox
                  checked={requiresSpares}
                  onCheckedChange={(val) => {
                    setRequiresSpares(val as boolean)
                    if (!val) setSpareRequests([])
                  }}
                />
                Requires Spares
              </Label>
              {requiresSpares && (
                <div className="ml-6 space-y-2">
                  {spareRequests.map((sr, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select
                        value={sr.spareName}
                        onValueChange={(val) => updateSpareRequest(idx, 'spareName', val)}
                      >
                        <SelectTrigger className="w-48 text-sm">
                          <SelectValue placeholder="Select spare..." />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_SPARES.map((spare) => (
                            <SelectItem key={spare} value={spare}>
                              {spare}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={sr.qty}
                        onChange={(e) => updateSpareRequest(idx, 'qty', parseInt(e.target.value) || 1)}
                        className="w-20 h-9 text-sm"
                        placeholder="Qty"
                      />
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeSpareRequest(idx)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button size="xs" variant="outline" onClick={addSpareRequest}>
                    <Plus className="size-3.5" />
                    Add Spare
                  </Button>
                </div>
              )}
            </div>

            {/* Paint Option */}
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="cursor-pointer">
                <Checkbox
                  checked={requiresPaint}
                  onCheckedChange={(val) => {
                    setRequiresPaint(val as boolean)
                    if (!val) setPaintPanels([])
                  }}
                />
                Requires Paint
              </Label>
              {requiresPaint && (
                <div className="ml-6 flex flex-wrap gap-3">
                  {(['TOP_COVER', 'BOTTOM_COVER'] as PaintPanelType[]).map(
                    (panel) => (
                      <Label key={panel} className="cursor-pointer">
                        <Checkbox
                          checked={paintPanels.includes(panel)}
                          onCheckedChange={() => togglePaintPanel(panel)}
                        />
                        {panel === 'TOP_COVER' ? 'Top Cover' : 'Bottom Cover'}
                      </Label>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            {checkedCount > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold mb-2">Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 p-2.5">
                    <p className="text-xl font-bold text-emerald-600">{passCount}</p>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                  <div className="rounded-md bg-red-50 dark:bg-red-950/40 p-2.5">
                    <p className="text-xl font-bold text-destructive">{failCount}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div className="rounded-md bg-muted p-2.5">
                    <p className="text-xl font-bold text-muted-foreground">{naCount}</p>
                    <p className="text-xs text-muted-foreground">N/A</p>
                  </div>
                </div>
              </div>
            )}

            {/* Overall notes */}
            <div className="space-y-2">
              <Label htmlFor="overall-notes">Overall Notes</Label>
              <Textarea
                id="overall-notes"
                placeholder="Additional notes about this inspection..."
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <DialogFooter className="shrink-0 rounded-b-xl">
            <Button variant="outline" onClick={() => setInspectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Complete Inspection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InspectionPage
