import { useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowLeftRight,
  ArchiveRestore,
  Check,
  FileText,
  Monitor,
  Package,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { mockWarehouses } from '../data/warehouses'
import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'
import type { InwardType, ReturnOriginType } from '../types'

const VENDORS = Array.from(
  new Map(mockPurchaseOrders.map((po) => [po.vendorId, po.vendorName])).entries(),
).map(([id, name]) => ({ id, name }))

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const INWARD_TYPE_OPTIONS: {
  value: InwardType
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    value: 'REFURB_PURCHASE',
    label: 'Refurb Purchase',
    description: 'Stock from refurb vendor',
    icon: Sparkles,
  },
  {
    value: 'RENTAL_RETURN',
    label: 'Rental Return',
    description: 'Returned rental units',
    icon: RotateCcw,
  },
  {
    value: 'DEMO_RETURN',
    label: 'Demo Return',
    description: 'Demo units coming back',
    icon: Monitor,
  },
  {
    value: 'ADVANCE_RETURN',
    label: 'Return',
    description: 'Customer return against a Sale or earlier Return',
    icon: ArchiveRestore,
  },
  {
    value: 'INTERNAL_TRANSFER',
    label: 'Internal Transfer',
    description: 'From another department',
    icon: ArrowLeftRight,
  },
]

const STOCK_VARIANTS = [
  { value: 'New', label: 'New' },
  { value: 'Refurbished', label: 'Refurbished' },
  { value: 'New Pull', label: 'New Pull' },
] as const

const BRANDS = ['Dell', 'HP', 'Lenovo', 'Apple', 'Cisco', 'Synology', 'Fortinet', 'APC'] as const

const ITEM_CONDITIONS = ['Good', 'Damaged', 'Untested'] as const
type ItemCondition = (typeof ITEM_CONDITIONS)[number]

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface InwardItem {
  id: string
  serialNumber: string
  barcode: string
  model: string
  condition: ItemCondition
  notes: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function suggestStockVariant(inwardType: InwardType): string {
  switch (inwardType) {
    case 'REFURB_PURCHASE':
      return 'Refurbished'
    case 'RENTAL_RETURN':
    case 'ADVANCE_RETURN':
      return 'Refurbished'
    case 'DEMO_RETURN':
      return 'New Pull'
    case 'INTERNAL_TRANSFER':
      return 'Refurbished'
    default:
      return 'New'
  }
}

function generateBatchNumber() {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `BATCH-2026-${num}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function generateBarcode(br: string): string {
  const brandPrefix = br.slice(0, 3).toUpperCase()
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${brandPrefix}-${num}`
}

let _itemIdCounter = 0
function createEmptyItem(): InwardItem {
  _itemIdCounter += 1
  return {
    id: `item-${Date.now()}-${_itemIdCounter}`,
    serialNumber: '',
    barcode: '',
    model: '',
    condition: 'Untested',
    notes: '',
  }
}

/* ------------------------------------------------------------------ */
/*  Shared small components (mirror OutwardFormPage)                  */
/* ------------------------------------------------------------------ */

function SectionHeader({
  step,
  title,
  description,
  trailing,
}: {
  step: number
  title: string
  description: string
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {step}
        </span>
        <div className="min-w-0">
          <CardTitle className="text-[15px] leading-tight">{title}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {trailing}
    </div>
  )
}

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode
  required?: boolean
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

function InwardFormPage() {
  const navigate = useNavigate()
  const goBack = useNavigateBack('/wms/inward')

  /* --- Basic info state --- */
  const [batchNumber] = useState(generateBatchNumber)
  const [inwardType, setInwardType] = useState<InwardType>('REFURB_PURCHASE')
  const [brand, setBrand] = useState<string>(BRANDS[0])
  const [notes, setNotes] = useState('')
  const [stockVariant, setStockVariant] = useState<string>('Refurbished')

  /* --- Conditional source fields --- */
  const [vendorName, setVendorName] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceRef, setSourceRef] = useState('')
  const [sourceDept, setSourceDept] = useState('')
  const [salesOrderNumber, setSalesOrderNumber] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [employeeDept, setEmployeeDept] = useState('')
  // For ADVANCE_RETURN (labelled "Return"): did this return originate from a Sale or a prior Return?
  const [originType, setOriginType] = useState<ReturnOriginType>('Sale')

  /* --- Delivery challan --- */
  const [dcFile, setDcFile] = useState<File | null>(null)
  const [isDraggingDc, setIsDraggingDc] = useState(false)
  const dcFileInputRef = useRef<HTMLInputElement>(null)

  /* --- Items --- */
  const [items, setItems] = useState<InwardItem[]>([createEmptyItem()])

  /* --- Warehouse --- */
  const [warehouseId, setWarehouseId] = useState(mockWarehouses[0]?.id ?? 'wh-001')

  /* --- Handlers --- */
  const handleInwardTypeChange = (nextType: InwardType) => {
    setInwardType(nextType)
    setStockVariant(suggestStockVariant(nextType))
    setVendorName('')
    setPoNumber('')
    setSourceName('')
    setSourceRef('')
    setSourceDept('')
    setSalesOrderNumber('')
    setCustomerContact('')
    setEmployeeName('')
    setEmployeeId('')
    setEmployeeDept('')
  }

  const handleDcFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setDcFile(file)
  }

  /* --- Item helpers --- */
  const updateItem = useCallback(
    (id: string, field: keyof InwardItem, value: string) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      )
    },
    [],
  )

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id)
      return next.length === 0 ? [createEmptyItem()] : next
    })
  }, [])

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()])
  }, [])

  const addFiveItems = useCallback(() => {
    setItems((prev) => [
      ...prev,
      createEmptyItem(),
      createEmptyItem(),
      createEmptyItem(),
      createEmptyItem(),
      createEmptyItem(),
    ])
  }, [])

  const autogenerateBarcode = useCallback(
    (id: string) => {
      const bc = generateBarcode(brand)
      updateItem(id, 'barcode', bc)
    },
    [brand, updateItem],
  )

  /* --- Derived flags --- */
  const showRefurbPurchaseFields = inwardType === 'REFURB_PURCHASE'
  const showReturnFields = inwardType === 'RENTAL_RETURN' || inwardType === 'DEMO_RETURN' || inwardType === 'ADVANCE_RETURN'
  const showCustomerReturnFields = inwardType === 'ADVANCE_RETURN'
  const showInternalTransferFields = inwardType === 'INTERNAL_TRANSFER'

  const validItemCount = items.filter((i) => i.serialNumber.trim() !== '').length

  const missingPieces: string[] = []
  if (showRefurbPurchaseFields && !vendorName) missingPieces.push('Vendor')
  if (showRefurbPurchaseFields && !poNumber.trim()) missingPieces.push('PO number')
  if (showReturnFields && !sourceName) {
    missingPieces.push(
      inwardType === 'RENTAL_RETURN' || inwardType === 'ADVANCE_RETURN' || inwardType === 'DEMO_RETURN'
        ? 'Customer name'
        : 'Source name',
    )
  }
  if (inwardType === 'RENTAL_RETURN' && !salesOrderNumber.trim()) missingPieces.push('SO number')
  if (showInternalTransferFields && !sourceDept) missingPieces.push('Source department')
  if (showInternalTransferFields && !employeeName.trim()) missingPieces.push('Employee name')
  if (!warehouseId) missingPieces.push('Warehouse')
  if (validItemCount === 0) missingPieces.push('At least one item')

  const canSubmit = missingPieces.length === 0

  /* --- Submit --- */
  const handleSaveDraft = () => {
    toast.success(`Batch ${batchNumber} saved as draft.`)
  }

  const handleCreate = () => {
    if (!canSubmit) {
      toast.error(`Missing: ${missingPieces.join(', ')}`)
      return
    }
    toast.success('Batch created successfully', {
      description: `${batchNumber} with ${validItemCount} item${validItemCount > 1 ? 's' : ''}`,
    })
    navigate(`/wms/inward/batch-new/devices`)
  }

  /* --- Dynamic step numbering (mirrors OutwardFormPage) --- */
  let step = 1
  const stepInwardInfo = step++
  const stepBatchDetails = step++
  const stepChallan = step++
  const stepItems = step++
  const stepNotes = step++

  /* --- Render --- */
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={goBack}>
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="cpt-page-title">Create Inward Batch</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill each section below. Required fields are marked with an asterisk (<span className="text-destructive">*</span>).
            </p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Batch #
          </span>
          <span className="font-mono text-sm font-semibold">{batchNumber}</span>
        </div>
      </div>

      {/* 1. Inward Info */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={stepInwardInfo}
            title="Inward Info"
            description="Pick how this stock is arriving and its source reference."
          />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type — large tile buttons */}
          <div className="space-y-2">
            <FieldLabel required>Type</FieldLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {INWARD_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const selected = inwardType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleInwardTypeChange(opt.value)}
                    className={cn(
                      'relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40',
                    )}
                    aria-pressed={selected}
                  >
                    <div className="flex w-full items-center justify-between">
                      <Icon className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')} />
                      {selected && <Check className="size-3.5 text-primary" />}
                    </div>
                    <div>
                      <p className={cn('text-sm font-semibold', selected ? 'text-primary' : 'text-foreground')}>
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Type-specific reference */}
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 space-y-4">
            {showRefurbPurchaseFields && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel required>Vendor</FieldLabel>
                  <Select
                    value={vendorName}
                    onValueChange={(val) => { if (val) setVendorName(val) }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select vendor…" />
                    </SelectTrigger>
                    <SelectContent>
                      {VENDORS.map((v) => (
                        <SelectItem key={v.id} value={v.name}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel required hint="Source PO for this refurb batch">
                    Purchase Order #
                  </FieldLabel>
                  <Input
                    placeholder="e.g., PO-2026-1020"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                  />
                </div>
              </div>
            )}

            {showReturnFields && (
              <div className="space-y-4">
                {showCustomerReturnFields && (
                  <div className="space-y-2">
                    <FieldLabel required hint="Did this return originate from a Sale or a prior Return?">
                      Origin Type
                    </FieldLabel>
                    <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
                      {(['Sale', 'Return'] as ReturnOriginType[]).map((opt) => {
                        const selected = originType === opt
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setOriginType(opt)}
                            aria-pressed={selected}
                            className={cn(
                              'flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors',
                              selected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-input bg-background text-foreground hover:bg-muted/60',
                            )}
                          >
                            <span>{opt}</span>
                            {selected && <Check className="size-4" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel required>
                      Customer Name
                    </FieldLabel>
                    <Input
                      placeholder={
                        inwardType === 'RENTAL_RETURN'
                          ? 'e.g., TCS Pune Office'
                          : inwardType === 'DEMO_RETURN'
                            ? 'e.g., Infosys BPO'
                            : 'e.g., Wipro Ltd'
                      }
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel hint={showCustomerReturnFields ? (originType === 'Sale' ? 'SO number' : 'Original Return #') : 'Optional'}>
                      {showCustomerReturnFields
                        ? (originType === 'Sale' ? 'Sales Order #' : 'Original Return #')
                        : inwardType === 'RENTAL_RETURN'
                          ? 'Rental Contract #'
                          : 'Demo Request #'}
                    </FieldLabel>
                    <Input
                      placeholder={
                        showCustomerReturnFields
                          ? (originType === 'Sale' ? 'e.g., SO-2026-0011' : 'e.g., RET-2026-014')
                          : inwardType === 'RENTAL_RETURN'
                            ? 'e.g., RC-2026-0023'
                            : 'e.g., DEMO-2026-042'
                      }
                      value={sourceRef}
                      onChange={(e) => setSourceRef(e.target.value)}
                    />
                  </div>
                </div>
                {inwardType === 'RENTAL_RETURN' && (
                  <div className="w-full sm:max-w-sm space-y-2">
                    <FieldLabel required hint="Original SO the rental was fulfilled from">
                      Sales Order #
                    </FieldLabel>
                    <Input
                      placeholder="e.g., SO-2026-0007"
                      value={salesOrderNumber}
                      onChange={(e) => setSalesOrderNumber(e.target.value)}
                    />
                  </div>
                )}
                {inwardType === 'DEMO_RETURN' && (
                  <div className="w-full sm:max-w-sm space-y-2">
                    <FieldLabel hint="Phone or email of the customer contact">
                      Customer Contact
                    </FieldLabel>
                    <Input
                      placeholder="e.g., rohit@infosys.com · +91 98..."
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {showInternalTransferFields && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel required>Source Department</FieldLabel>
                    <Input
                      placeholder="e.g., IT Department"
                      value={sourceDept}
                      onChange={(e) => setSourceDept(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel hint="Branch/team the employee belongs to">
                      Employee Department
                    </FieldLabel>
                    <Input
                      placeholder="e.g., Operations"
                      value={employeeDept}
                      onChange={(e) => setEmployeeDept(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel required>Employee Name</FieldLabel>
                    <Input
                      placeholder="e.g., Rahul Mehta"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel hint="Internal ID or email">
                      Employee ID
                    </FieldLabel>
                    <Input
                      placeholder="e.g., EMP-2041"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Batch Details */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={stepBatchDetails}
            title="Batch Details"
            description="Stock classification and the receiving warehouse."
          />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel required>Brand</FieldLabel>
              <Select value={brand} onValueChange={(val) => { if (val) setBrand(val) }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <FieldLabel required hint="Auto-suggested from type">
                Stock Variant
              </FieldLabel>
              <Select
                value={stockVariant}
                onValueChange={(val) => { if (val) setStockVariant(val) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_VARIANTS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel required>Warehouse</FieldLabel>
              <Select
                value={warehouseId}
                onValueChange={(val) => { if (val) setWarehouseId(val) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select warehouse…" />
                </SelectTrigger>
                <SelectContent>
                  {mockWarehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Delivery Challan */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={stepChallan}
            title="Delivery Challan"
            description="Attach the DC received with this batch. PDF or image."
            trailing={dcFile ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Attached
              </span>
            ) : (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                Optional
              </span>
            )}
          />
        </CardHeader>
        <CardContent>
          <input
            ref={dcFileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleDcFileChange}
          />
          {dcFile ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{dcFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(dcFile.size)}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => dcFileInputRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setDcFile(null)
                  if (dcFileInputRef.current) dcFileInputRef.current.value = ''
                }}
                aria-label="Remove file"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => dcFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDraggingDc(true)
              }}
              onDragLeave={() => setIsDraggingDc(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDraggingDc(false)
                const file = e.dataTransfer.files?.[0]
                if (file) setDcFile(file)
              }}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
                isDraggingDc
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
              )}
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UploadCloud className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF or image files (PNG, JPG)</p>
              </div>
            </button>
          )}
        </CardContent>
      </Card>

      {/* 4. Items */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={stepItems}
            title="Items"
            description="Add the devices received in this batch."
            trailing={
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  validItemCount > 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {validItemCount} item{validItemCount === 1 ? '' : 's'}
              </span>
            }
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={addFiveItems}>
              <Plus className="mr-1 size-3.5" />
              Add 5
            </Button>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1 size-3.5" />
              Add item
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Serial Number <span className="text-destructive">*</span>
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Barcode</th>
                  <th className="px-3 py-2 text-left font-medium">Model</th>
                  <th className="w-32 px-3 py-2 text-left font-medium">Condition</th>
                  <th className="px-3 py-2 text-left font-medium">Notes</th>
                  <th className="w-10 px-1 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        className="h-8 text-sm"
                        placeholder="e.g., SN-12345678"
                        value={item.serialNumber}
                        onChange={(e) => updateItem(item.id, 'serialNumber', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex gap-1">
                        <Input
                          className="h-8 text-sm"
                          placeholder="e.g., L-DEL-4521"
                          value={item.barcode}
                          onChange={(e) => updateItem(item.id, 'barcode', e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8 shrink-0"
                          title="Auto-generate barcode"
                          onClick={() => autogenerateBarcode(item.id)}
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        className="h-8 text-sm"
                        placeholder="e.g., Latitude 5540"
                        value={item.model}
                        onChange={(e) => updateItem(item.id, 'model', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Select
                        value={item.condition}
                        onValueChange={(val) => { if (val) updateItem(item.id, 'condition', val) }}
                      >
                        <SelectTrigger className="h-8 w-full text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_CONDITIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        className="h-8 text-sm"
                        placeholder="Optional notes"
                        value={item.notes}
                        onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                      />
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <Package className="mx-auto mb-2 size-5 opacity-50" />
                      No items yet. Click "Add item" to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Notes */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={stepNotes}
            title="Notes"
            description="Optional. Anything the inspection team should know."
          />
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes…"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Sticky footer */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 border-t bg-background/95 px-4 sm:px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {canSubmit ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" /> Ready to submit
              </span>
            ) : (
              <span>
                Still needed:{' '}
                <span className="font-medium text-foreground">{missingPieces.join(' · ')}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" render={<Link to="/wms/inward" />}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button onClick={handleCreate} disabled={!canSubmit}>
              Create Batch
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { InwardFormPage }
export default InwardFormPage
