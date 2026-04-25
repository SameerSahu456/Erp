import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Check, X, Camera, Upload, Plus, Trash2, Server, Trash, Warehouse as WarehouseIcon, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
import { PageHeader } from '@/components/page'
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
import { mockWarehouses } from '../data/warehouses'
import { mockParts } from '../../ims/data/parts'
import {
  INSPECTION_CHECKLIST_ITEMS,
  SERVER_INSPECTION_CHECKLIST_ITEMS,
  type Device,
  type InspectionResult,
  type PaintPanelType,
} from '../types'

type ChecklistItem = { readonly id: string; readonly label: string; readonly group: string }

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const LAPTOP_GROUP_ORDER = ['Panels', 'Display', 'Input', 'Audio', 'Power', 'Hardware', 'Ports']
const SERVER_GROUP_ORDER = ['Chassis', 'Power', 'Compute', 'Memory', 'Storage', 'Cooling', 'Networking', 'Ports']

function groupChecklistItems(items: readonly ChecklistItem[]): Record<string, ChecklistItem[]> {
  const acc: Record<string, ChecklistItem[]> = {}
  for (const item of items) {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
  }
  return acc
}

const INSPECTION_ENGINEERS = ['Ravi Kumar', 'Priya Nair', 'Sanjay Gupta']
const DISPLAY_ENGINEERS = ['Karthik Rao', 'Neha Bansal']

const AVAILABLE_SPARES = [
  'Keyboard', 'Touchpad', 'Screen Panel', 'Battery', 'SSD 256GB', 'SSD 512GB',
  'RAM 8GB', 'RAM 16GB', 'Fan Assembly', 'Hinge Set', 'Speaker Module',
  'USB Port Board', 'HDMI Port Board', 'Power Jack', 'Webcam Module',
  'LCD Cable', 'Motherboard', 'Charger', 'Palm Rest',
]

type ChecklistState = Record<
  string,
  {
    result: InspectionResult
    notes: string
    scrapWarehouseId?: string
    scrapRackId?: string
  }
>

interface LaptopSpareRequestDraft {
  spareName: string
  qty: number
}

// Server build-sheet entry — captured from the inline component search below
// the device images. Identifies the part and how many of it are installed in
// this specific server. We don't pre-load these from a BOM because every
// server in the demo has a different physical configuration.
interface ServerComponentDraft {
  partId: string
  name: string
  sku: string
  qty: number
}

function InspectionPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [checklist, setChecklist] = useState<ChecklistState>({})
  const [requiresSpares, setRequiresSpares] = useState(false)
  const [spareRequests, setSpareRequests] = useState<LaptopSpareRequestDraft[]>([])
  const [requiresPaint, setRequiresPaint] = useState(false)
  const [paintPanels, setPaintPanels] = useState<PaintPanelType[]>([])
  const [overallNotes, setOverallNotes] = useState('')
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  // Per-device engineer assignments captured inside the inspection dialog
  const [l1l2Engineer, setL1L2Engineer] = useState<string>('')
  const [displayEngineer, setDisplayEngineer] = useState<string>('')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [deviceImages, setDeviceImages] = useState<File[]>([])
  // Server-only: free-form component search → add → set qty.
  const [componentSearch, setComponentSearch] = useState('')
  const [serverComponents, setServerComponents] = useState<ServerComponentDraft[]>([])

  const handleAssignEngineer = (deviceId: string, engineer: string) => {
    setAssignments((prev) => ({ ...prev, [deviceId]: engineer }))
    const device = mockDevices.find((d) => d.id === deviceId)
    toast.success(`${device?.barcode ?? deviceId} assigned to ${engineer}`)
  }

  /* ------------- Checklist template selection (server vs. laptop) ------------- */
  const isAssembly = selectedDevice?.deviceKind === 'ASSEMBLY'
  const checklistItems: readonly ChecklistItem[] = isAssembly
    ? SERVER_INSPECTION_CHECKLIST_ITEMS
    : INSPECTION_CHECKLIST_ITEMS
  const checklistGroups = useMemo(
    () => groupChecklistItems(checklistItems),
    [checklistItems],
  )
  const groupOrder = isAssembly ? SERVER_GROUP_ORDER : LAPTOP_GROUP_ORDER

  /* ------------- Server component search (assembly devices only) ------------- */
  // Restrict suggestions to active server-hardware parts and skip variants so
  // the dropdown lists each part once.
  const componentCandidates = useMemo(
    () =>
      mockParts.filter(
        (p) => p.isActive && p.hardwareType && p.productType !== 'variant',
      ),
    [],
  )
  const filteredComponents = useMemo(() => {
    const q = componentSearch.trim().toLowerCase()
    if (!q) return []
    const addedIds = new Set(serverComponents.map((c) => c.partId))
    return componentCandidates
      .filter((p) => !addedIds.has(p.id))
      .filter((p) => {
        const haystack = [p.name, p.sku, ...(p.aliases ?? [])]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .slice(0, 8)
  }, [componentSearch, componentCandidates, serverComponents])

  const addServerComponent = useCallback(
    (part: { id: string; name: string; sku: string }) => {
      setServerComponents((prev) =>
        prev.some((c) => c.partId === part.id)
          ? prev
          : [...prev, { partId: part.id, name: part.name, sku: part.sku, qty: 1 }],
      )
      setComponentSearch('')
    },
    [],
  )
  const updateServerComponentQty = useCallback((index: number, qty: number) => {
    setServerComponents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, qty: Math.max(1, qty) } : c)),
    )
  }, [])
  const removeServerComponent = useCallback((index: number) => {
    setServerComponents((prev) => prev.filter((_, i) => i !== index))
  }, [])

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

  const scrapCount = useMemo(
    () => Object.values(checklist).filter((i) => i.result === 'SCRAP').length,
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
        partSerial: `${d.model}\n${d.serialNumber}`,
        biosNo: d.biosNo ?? '-',
        category: d.category,
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
          partSerial: `${d.model}\n${d.serialNumber}`,
          biosNo: d.biosNo ?? '-',
          category: d.category,
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
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'category', label: 'Category', sortable: true },
          { key: 'brand', label: 'Brand', sortable: true },
          { key: 'batch', label: 'Batch' },
          { key: 'receivedDate', label: 'Received Date', sortable: true },
          { key: 'assignedTo', label: 'Assigned to' },
          { key: 'actions', label: 'Actions' },
        ],
        data: pendingRows,
      },
      {
        id: 'completed',
        label: `Completed (${completedRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'category', label: 'Category', sortable: true },
          { key: 'result', label: 'Result' },
          { key: 'repair', label: 'Repair' },
          { key: 'paint', label: 'Paint' },
          { key: 'spares', label: 'Spares' },
          { key: 'date', label: 'Date', sortable: true },
          { key: 'actions', label: 'Action' },
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
    setComponentSearch('')
    setServerComponents([])
    setL1L2Engineer(assignments[device.id] ?? '')
    setDisplayEngineer('')
    setInspectionDialogOpen(true)
  }

  // Auto-open the inspection dialog when arriving with ?open=<deviceId>
  // (used by the "Start Inspection" button on the device detail page).
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    const device = mockDevices.find((d) => d.id === openId)
    if (device) handleStartInspection(device)
    const next = new URLSearchParams(searchParams)
    next.delete('open')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'barcode') {
        return {
          display: <span className="font-medium">{String(value)}</span>,
        }
      }
      if (key === 'partSerial') {
        const [part, serial] = String(value).split('\n')
        const device = mockDevices.find((d) => d.id === row.id)
        const isAssemblyRow = device?.deviceKind === 'ASSEMBLY'
        return {
          display: (
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-1.5 font-medium">
                {isAssemblyRow && (
                  <Server className="size-3.5 text-primary" aria-label="Assembly" />
                )}
                {part}
              </span>
              <span className="text-xs text-muted-foreground">
                S/N: {serial}
              </span>
            </div>
          ),
        }
      }
      if (key === 'actions') {
        const device = mockDevices.find((d) => d.id === row.id)
        return {
          display: (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {row.batch !== undefined && (
                <button
                  type="button"
                  className="wms-link text-sm font-medium"
                  onClick={() => {
                    if (device) handleStartInspection(device)
                  }}
                >
                  Inspect
                </button>
              )}
            </div>
          ),
        }
      }
      if (key === 'assignedTo' && row.batch !== undefined) {
        const deviceId = row.id as string
        const currentValue = value as string
        return {
          display: (
            <div onClick={(e) => e.stopPropagation()}>
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
            </div>
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
    if (!selectedDevice) return
    if (deviceImages.length === 0) {
      toast.error('Please upload at least one device image before submitting.')
      return
    }

    const filledCount = Object.keys(checklist).length
    if (filledCount < checklistItems.length) {
      toast.error('Please complete all checklist items before submitting.')
      return
    }
    // Scrapped items must have a destination warehouse + rack.
    const missingScrapLocation = checklistItems.find((item) => {
      const s = checklist[item.id]
      return s?.result === 'SCRAP' && (!s.scrapWarehouseId || !s.scrapRackId)
    })
    if (missingScrapLocation) {
      toast.error(`Pick warehouse and rack for scrapped "${missingScrapLocation.label}".`)
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
      <PageHeader
        title="Inspection"
        subtitle="Process device inspections and flag issues for repair, paint, or spares."
        breadcrumbs={[{ label: 'WMS' }, { label: 'Inspection' }]}
      />

      {/* Device Queue */}
      <div className="bmt-search-lg">
        <BusinessMetricsTable
          tabs={tabs}
          cellFormatter={cellFormatter}
          persistKey="wms-inspection"
          onRowClick={(row) => navigate(`/wms/devices/${row.id}?from=inspection`)}
          emptyState={{
            title: 'No devices pending inspection',
            description: 'All inward devices are either already inspected or queued elsewhere in the pipeline.',
          }}
        />
      </div>

      {/* Inspection Dialog */}
      <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Sticky Header */}
          <div className="shrink-0 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                Inspecting: {selectedDevice?.barcode}
                {isAssembly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Server className="size-3" />
                    Server
                  </span>
                )}
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
                    <span className="font-medium text-foreground">
                      {isAssembly ? 'Chassis S/N' : 'Serial'}:
                    </span>{' '}
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
                    checklistItems.length > 0
                      ? Math.round((checkedCount / checklistItems.length) * 100)
                      : 0
                  }
                >
                  <ProgressLabel className="sr-only">Progress</ProgressLabel>
                  <ProgressValue className="sr-only" />
                </Progress>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <span className="font-medium">
                  {checkedCount}/{checklistItems.length}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                  {passCount}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-destructive" />
                  {failCount}
                </span>
                <span className="flex items-center gap-1" title="Scrap">
                  <span className="inline-block size-2 rounded-full bg-amber-500" />
                  {scrapCount}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Engineer Assignments */}
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <Label className="text-sm font-semibold">Engineer Assignments</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assign the repair engineers for this device. Display engineer is optional and only needed when a display panel is involved.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    L3 Engineer
                  </Label>
                  <Select
                    value={l1l2Engineer}
                    onValueChange={(val) => { if (val) setL1L2Engineer(val) }}
                  >
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder="Select engineer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSPECTION_ENGINEERS.map((eng) => (
                        <SelectItem key={eng} value={eng}>
                          {eng}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Display Engineer <span className="text-muted-foreground">(if applicable)</span>
                  </Label>
                  <Select
                    value={displayEngineer}
                    onValueChange={(val) => { if (val) setDisplayEngineer(val) }}
                  >
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder="Select display engineer…" />
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

            {/* Device Images - Mandatory */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-semibold">
                    Device Images <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Capture or upload photos of the device. At least one image is required.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files)}
                    />
                    <Camera className="size-3.5" />
                    Take Photo
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files)}
                    />
                    <Upload className="size-3.5" />
                    Upload
                  </label>
                </div>
              </div>
              {deviceImages.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {deviceImages.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square">
                      <div className="size-full rounded-md border bg-muted overflow-hidden">
                        <img
                          src={URL.createObjectURL(img)}
                          alt={`Device ${idx + 1}`}
                          className="size-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(idx)}
                        aria-label="Remove image"
                      >
                        <X className="size-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 px-4 py-8 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                  <Camera className="size-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Add device images</p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop or click to browse
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* Server line items — search → add → set qty (servers only) */}
            {isAssembly && (
              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <Label className="text-sm font-semibold">Line items</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Search and add the parts installed in this server. Set the
                    quantity for each.
                  </p>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search line items by name or SKU…"
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                    className="pl-8"
                  />
                  {componentSearch.trim() && (
                    <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                      {filteredComponents.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          No matching line items.
                        </p>
                      ) : (
                        filteredComponents.map((part) => (
                          <button
                            key={part.id}
                            type="button"
                            onClick={() => addServerComponent(part)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{part.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {part.sku}
                                {part.hardwareType ? ` · ${part.hardwareType}` : ''}
                              </span>
                            </span>
                            <Plus className="size-4 shrink-0 text-muted-foreground" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {serverComponents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No line items added yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {serverComponents.map((c, idx) => (
                      <div
                        key={c.partId}
                        className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.sku}</p>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          value={c.qty}
                          onChange={(e) =>
                            updateServerComponentQty(idx, parseInt(e.target.value) || 1)
                          }
                          className="h-8 w-20 text-sm"
                          placeholder="Qty"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-8 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => removeServerComponent(idx)}
                          aria-label={`Remove ${c.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Inspection template — checklist grouped by category */}
            {groupOrder.map((group) => {
              const items = checklistGroups[group]
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
                        const itemWarehouse = state?.scrapWarehouseId
                          ? mockWarehouses.find((w) => w.id === state.scrapWarehouseId)
                          : undefined
                        const itemRacks = itemWarehouse
                          ? itemWarehouse.rows.flatMap((r) => r.racks)
                          : []
                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border transition-colors ${
                              state?.result === 'PASS'
                                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
                                : state?.result === 'FAIL'
                                  ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30'
                                  : state?.result === 'SCRAP'
                                    ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30'
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
                                    state?.result === 'SCRAP'
                                      ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
                                      : 'border-muted-foreground/20 text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950'
                                  }
                                  onClick={() =>
                                    handleChecklistChange(item.id, 'SCRAP')
                                  }
                                >
                                  <Trash className="size-3.5" />
                                  Scrap
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
                            {state?.result === 'SCRAP' && (
                              <div className="space-y-2 border-t bg-amber-50/40 px-3 py-2 dark:bg-amber-950/20">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                                  <WarehouseIcon className="size-3.5" />
                                  Scrap Destination
                                  <span className="text-destructive">*</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <Select
                                    value={state.scrapWarehouseId ?? ''}
                                    onValueChange={(val) => {
                                      if (!val) return
                                      setChecklist((prev) => {
                                        const existing = prev[item.id] ?? { result: 'SCRAP' as InspectionResult, notes: '' }
                                        return {
                                          ...prev,
                                          [item.id]: {
                                            ...existing,
                                            scrapWarehouseId: val,
                                            scrapRackId: undefined,
                                          },
                                        }
                                      })
                                    }}
                                  >
                                    <SelectTrigger className="h-8 bg-background text-sm">
                                      <SelectValue placeholder="Warehouse location…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {mockWarehouses.map((wh) => (
                                        <SelectItem key={wh.id} value={wh.id}>
                                          {wh.name} ({wh.code})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={state.scrapRackId ?? ''}
                                    onValueChange={(val) => {
                                      if (!val) return
                                      setChecklist((prev) => {
                                        const existing = prev[item.id] ?? { result: 'SCRAP' as InspectionResult, notes: '' }
                                        return {
                                          ...prev,
                                          [item.id]: { ...existing, scrapRackId: val },
                                        }
                                      })
                                    }}
                                    disabled={!itemWarehouse}
                                  >
                                    <SelectTrigger className="h-8 bg-background text-sm">
                                      <SelectValue
                                        placeholder={
                                          itemWarehouse ? 'Rack location…' : 'Select warehouse first'
                                        }
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {itemRacks.map((r) => (
                                        <SelectItem key={r.id} value={r.id}>
                                          {r.name} ({r.capacityUsed}% used)
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
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
                        <SelectTrigger className="h-10 flex-1 min-w-[16rem] text-sm">
                          <SelectValue placeholder="Select spare..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-80 min-w-[16rem]">
                          {AVAILABLE_SPARES.map((spare) => (
                            <SelectItem key={spare} value={spare} className="text-sm">
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
                        className="w-20 h-10 text-sm"
                        placeholder="Qty"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeSpareRequest(idx)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={addSpareRequest}>
                    <Plus className="size-3.5" />
                    Add Spare
                  </Button>
                </div>
              )}
            </div>

            {/* Paint Option (laptop only — keep paint flow gated by device kind) */}
            {!isAssembly && (
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
                <div className="ml-6 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Select the panels to be painted
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                    {(['TOP_COVER', 'BOTTOM_COVER'] as PaintPanelType[]).map(
                      (panel) => {
                        const selected = paintPanels.includes(panel)
                        const label = panel === 'TOP_COVER' ? 'Top Cover' : 'Bottom Cover'
                        return (
                          <button
                            key={panel}
                            type="button"
                            onClick={() => togglePaintPanel(panel)}
                            aria-pressed={selected}
                            className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                              selected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-input bg-background text-foreground hover:bg-muted/60'
                            }`}
                          >
                            <span>{label}</span>
                            {selected ? (
                              <Check className="size-4" />
                            ) : (
                              <Plus className="size-4 text-muted-foreground" />
                            )}
                          </button>
                        )
                      },
                    )}
                  </div>
                  {paintPanels.length === 0 && (
                    <p className="text-xs text-destructive">
                      Select at least one panel
                    </p>
                  )}
                </div>
              )}
            </div>
            )}

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
                  <div className="rounded-md bg-amber-50 p-2.5 dark:bg-amber-950/40">
                    <p className="text-xl font-bold text-amber-700">{scrapCount}</p>
                    <p className="text-xs text-muted-foreground">Scrap</p>
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
