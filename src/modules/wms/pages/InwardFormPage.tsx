import { Fragment, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  ArchiveRestore,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  Mail,
  MapPin,
  Monitor,
  Package,
  Package2,
  Phone,
  Receipt,
  Replace,
  RotateCcw,
  Search,
  Server,
  Sparkles,
  Truck,
  User,
  UploadCloud,
  X,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'
import { salesOrders } from '@/modules/crm/data/sales-orders'
import { demoRequests } from '@/modules/crm/data/demo-requests'
import { mockCustomerRegistrations } from '@/modules/customers/data/customers'
import { mockRentalContracts } from '@/modules/rentals/data/contracts'
import { mockParts } from '@/modules/ims/data/parts'
import { mockVariants } from '@/modules/ims/data/variants'
import { getActiveAssemblyBOMs, findBOMById } from '../data/assembly-helpers'
import { mockReplacementRequests } from '../data/replacement-requests'
import type { ReplacementRequest } from '../data/replacement-requests'
import type { PurchaseOrder } from '@/modules/procurement/types'
import type { SalesOrder } from '@/modules/crm/types'
import type { DemoRequest } from '@/modules/crm/types'
import type { RentalContract } from '@/modules/rentals/types'
import type { InwardType, ReturnOriginType } from '../types'

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
    value: 'PURCHASE_ORDER',
    label: 'Purchase Order',
    description: 'New stock against a vendor PO',
    icon: FileText,
  },
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
    description: 'Customer return against a Sale or Rental',
    icon: ArchiveRestore,
  },
  {
    value: 'INTERNAL_TRANSFER',
    label: 'Internal Transfer',
    description: 'From another department',
    icon: ArrowLeftRight,
  },
  {
    value: 'REPLACEMENT',
    label: 'Replacement',
    description: 'Replacement stock following an internal transfer',
    icon: Replace,
  },
]

const ITEM_CONDITIONS = ['Good', 'Damaged', 'Untested'] as const
type ItemCondition = (typeof ITEM_CONDITIONS)[number]

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface InwardItemComponent {
  bomItemId: string
  slotIndex: number
  partId: string
  partName: string
  partSku: string
  position?: string
  serialNumber: string
  barcode: string
}

// Line-level inward row: one entry per source line (PO line, SO line, demo
// item, rental device-group). Per-unit serials/barcodes are captured later
// on the devices page after the batch is created.
interface InwardItem {
  id: string
  partId?: string
  partName: string
  partSku?: string
  variantId?: string
  variantSku?: string
  category?: string
  brand?: string
  condition: ItemCondition
  qty: number
  notes: string
  // Assembly fields — populated when the inward line is a server/workstation build.
  bomId?: string
  bomNumber?: string
  bomName?: string
  components?: InwardItemComponent[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function generateBatchNumber() {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `BATCH-2026-${num}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

let _itemIdCounter = 0
function nextItemId(): string {
  _itemIdCounter += 1
  return `item-${Date.now()}-${_itemIdCounter}`
}

/* ------------------------------------------------------------------ */
/*  Source → InwardItem[] expanders                                   */
/*  Each picks one source record (PO / SO / rental contract / demo    */
/*  request) and explodes it into per-unit inward rows so the items   */
/*  table is pre-populated.                                           */
/* ------------------------------------------------------------------ */

const MAX_AUTOFILL_ROWS = 200

function clampRows<T>(rows: T[]): T[] {
  return rows.length > MAX_AUTOFILL_ROWS ? rows.slice(0, MAX_AUTOFILL_ROWS) : rows
}

function buildItemsFromPO(po: PurchaseOrder): InwardItem[] {
  return clampRows(
    po.items.map((li) => ({
      id: nextItemId(),
      partId: li.partId,
      partName: li.partName,
      partSku: li.partSku,
      variantId: li.variantId,
      variantSku: li.variantSku,
      category: li.category,
      condition: 'Untested',
      qty: li.qtyOrdered,
      notes: '',
    })),
  )
}

function buildItemsFromSO(so: SalesOrder): InwardItem[] {
  return clampRows(
    so.lineItems.map((li) => ({
      id: nextItemId(),
      partId: li.partId,
      partName: li.partName,
      partSku: li.partSku,
      variantId: li.variantId,
      variantSku: li.variantSku,
      category: li.category,
      brand: li.brand,
      condition: 'Untested',
      qty: li.qty,
      notes: '',
    })),
  )
}

// Rental contracts carry a serial-level device list. Group by model so each
// unique device kind shows as one line with its returned-unit count.
function buildItemsFromRentalContract(rc: RentalContract): InwardItem[] {
  const grouped = new Map<string, InwardItem>()
  for (const d of rc.devices) {
    const key = `${d.model}::${d.brand ?? ''}`
    const existing = grouped.get(key)
    if (existing) {
      existing.qty += 1
      continue
    }
    grouped.set(key, {
      id: nextItemId(),
      partName: d.model,
      partSku: d.barcode || undefined,
      brand: d.brand,
      condition: 'Untested',
      qty: 1,
      notes: '',
    })
  }
  return clampRows(Array.from(grouped.values()))
}

function buildItemsFromReplacementRequest(rr: ReplacementRequest): InwardItem[] {
  return clampRows([
    {
      id: nextItemId(),
      partId: rr.originalPartId,
      partName: rr.originalPartName,
      partSku: rr.originalPartSku,
      condition: 'Untested',
      qty: rr.qty,
      notes: '',
    },
  ])
}

function buildItemsFromDemoRequest(dr: DemoRequest): InwardItem[] {
  return clampRows(
    dr.items.map((li) => ({
      id: nextItemId(),
      partId: li.partId,
      partName: li.partName,
      partSku: li.partSku,
      variantId: li.variantId,
      variantSku: li.variantSku,
      category: li.category,
      brand: li.brand,
      condition: 'Untested',
      qty: li.qty,
      notes: '',
    })),
  )
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
/*  Source details card                                               */
/*  Rendered below each PO / SO / contract / demo picker to surface   */
/*  the vendor or customer info that came with the selected record.   */
/* ------------------------------------------------------------------ */

function DetailPair({
  label,
  value,
  icon: Icon,
  mono,
}: {
  label: string
  value?: React.ReactNode
  icon?: LucideIcon
  mono?: boolean
}) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn('truncate text-sm font-medium text-foreground', mono && 'font-mono text-xs')}>
          {value}
        </div>
      </div>
    </div>
  )
}

function formatINR(n: number | undefined): string {
  if (n === undefined || n === null) return ''
  return `₹ ${n.toLocaleString('en-IN')}`
}

function SourceDetailsCard({
  kind,
  title,
  badge,
  rows,
}: {
  kind: 'po' | 'so' | 'rental' | 'demo' | 'replacement'
  title: string
  badge?: string
  rows: React.ReactNode
}) {
  const kindIcon: Record<typeof kind, LucideIcon> = {
    po: Truck,
    so: Receipt,
    rental: RotateCcw,
    demo: Monitor,
    replacement: Replace,
  }
  const kindLabel: Record<typeof kind, string> = {
    po: 'Vendor details',
    so: 'Customer details',
    rental: 'Customer details',
    demo: 'Customer details',
    replacement: 'Replacement details',
  }
  const Icon = kindIcon[kind]
  return (
    <div className="mt-3 rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {kindLabel[kind]}
            </p>
            <p className="truncate text-sm font-semibold">{title}</p>
          </div>
        </div>
        {badge && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{rows}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Inline item search (used in INTERNAL_TRANSFER Line Items card)     */
/* ------------------------------------------------------------------ */

interface InlineSearchRow {
  variantId: string
  variantSku: string
  partId: string
  partName: string
  partSku: string
  category: string
  brand: string
}

const inlineSearchRows: InlineSearchRow[] = (() => {
  const partMap = new Map(mockParts.map((p) => [p.id, p]))
  return mockVariants
    .filter((v) => v.isActive)
    .map((v) => {
      const part = partMap.get(v.partId)
      return {
        variantId: v.id,
        variantSku: v.variantSku,
        partId: v.partId,
        partName: part?.name ?? v.displayName.replace(/ · [A-Za-z ]+$/, ''),
        partSku: part?.sku ?? v.variantSku,
        category: part?.categoryName ?? 'Components',
        brand: part?.brand ?? '',
      }
    })
})()

function InlineItemSearch({ onPick }: { onPick: (row: InlineSearchRow) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return []
    return inlineSearchRows
      .filter((r) =>
        r.partName.toLowerCase().includes(q) ||
        r.partSku.toLowerCase().includes(q) ||
        r.variantSku.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [query])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleSelect = (row: InlineSearchRow) => {
    onPick(row)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search items by name, SKU or brand to add…"
          className="pl-9"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {open && query.trim() !== '' && (
        <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {matches.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No matches.</p>
          ) : (
            <ul className="divide-y">
              {matches.map((row) => (
                <li key={row.variantId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(row)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60"
                  >
                    <Package className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{row.partName}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{row.variantSku}</span>
                        {row.brand && (
                          <>
                            <span>·</span>
                            <span className="truncate">{row.brand}</span>
                          </>
                        )}
                        {row.category && (
                          <>
                            <span>·</span>
                            <span className="truncate">{row.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Add
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

function InwardFormPage() {
  const navigate = useNavigate()

  /* --- Basic info state --- */
  const [batchNumber] = useState(generateBatchNumber)
  const [inwardType, setInwardType] = useState<InwardType>('REFURB_PURCHASE')
  const [notes, setNotes] = useState('')

  /* --- Conditional source fields --- */
  const [poNumber, setPoNumber] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceRef, setSourceRef] = useState('')
  const [sourceDept, setSourceDept] = useState('')
  const [salesOrderNumber, setSalesOrderNumber] = useState('')
  const [replacementRequestNumber, setReplacementRequestNumber] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  // For ADVANCE_RETURN (labelled "Return"): did this return originate from a Sale or a prior Return?
  const [originType, setOriginType] = useState<ReturnOriginType>('Sale')

  /* --- Delivery challan --- */
  const [dcFile, setDcFile] = useState<File | null>(null)
  const [isDraggingDc, setIsDraggingDc] = useState(false)
  const dcFileInputRef = useRef<HTMLInputElement>(null)

  /* --- Items --- */
  const [items, setItems] = useState<InwardItem[]>([])

  /* --- BOM expansion state (per item id). When an item has a BOM linked,
         users can click the row's "View BOM" toggle to reveal the captured
         components inline beneath the row. --- */
  const [bomExpanded, setBomExpanded] = useState<Record<string, boolean>>({})

  /* --- BOM capture dialog state (server / assembly items) --- */
  const [bomDialogOpen, setBomDialogOpen] = useState(false)
  const [bomDialogItemId, setBomDialogItemId] = useState<string | null>(null)
  const [bomDraftBomId, setBomDraftBomId] = useState<string>('')
  const [bomDraftComponents, setBomDraftComponents] = useState<InwardItemComponent[]>([])

  const activeAssemblyBOMs = useMemo(() => getActiveAssemblyBOMs(), [])

  /* --- Source dropdowns: show the 5 most recent so inward picking is quick.
         Full lists stay searchable via the picker's built-in search; we just
         trim the visible options to avoid overwhelming the inward clerk. --- */
  const PICKER_LIMIT = 5
  const pickerPOs = useMemo(
    () => [...mockPurchaseOrders]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, PICKER_LIMIT),
    [],
  )
  const pickerSalesOrders = useMemo(
    () => [...salesOrders]
      .sort((a, b) => (b.createdAt ?? b.date ?? '').localeCompare(a.createdAt ?? a.date ?? ''))
      .slice(0, PICKER_LIMIT),
    [],
  )
  const pickerRentalContracts = useMemo(
    () => [...mockRentalContracts]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, PICKER_LIMIT),
    [],
  )
  const pickerDemoRequests = useMemo(
    () => [...demoRequests]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, PICKER_LIMIT),
    [],
  )
  const pickerReplacementRequests = useMemo(
    () => [...mockReplacementRequests]
      .sort((a, b) => (b.requestedAt ?? '').localeCompare(a.requestedAt ?? ''))
      .slice(0, PICKER_LIMIT),
    [],
  )

  /* --- Resolved source records (for the details card below each picker). --- */
  const selectedPO = useMemo(
    () => (poNumber ? mockPurchaseOrders.find((p) => p.poNumber === poNumber) : undefined),
    [poNumber],
  )
  const selectedSO = useMemo(
    () => (sourceRef ? salesOrders.find((s) => s.orderNumber === sourceRef) : undefined),
    [sourceRef],
  )
  const selectedReplacementRequest = useMemo(
    () => (replacementRequestNumber
      ? mockReplacementRequests.find((r) => r.requestNumber === replacementRequestNumber)
      : undefined),
    [replacementRequestNumber],
  )
  const selectedContract = useMemo(
    () => (sourceRef ? mockRentalContracts.find((r) => r.contractNumber === sourceRef) : undefined),
    [sourceRef],
  )
  const selectedDemo = useMemo(
    () => (sourceRef ? demoRequests.find((d) => d.demoNumber === sourceRef) : undefined),
    [sourceRef],
  )

  /* Contact/address lookup for a SO's account. SOs don't carry contact info
     directly, so we fuzzy-match the accountName against mockCustomerRegistrations
     to pull the primary contact and billing address. */
  const customerForAccount = useCallback((accountName?: string) => {
    if (!accountName) return undefined
    const norm = accountName.toLowerCase().replace(/\s+(ltd|limited|pvt|private)\.?$/i, '').trim()
    return mockCustomerRegistrations.find((c) => {
      const cn = c.companyName.toLowerCase()
      return cn === accountName.toLowerCase() || cn.startsWith(norm) || norm.startsWith(cn)
    })
  }, [])

  /* --- Handlers --- */
  const handleInwardTypeChange = (nextType: InwardType) => {
    setInwardType(nextType)
    setPoNumber('')
    setSourceName('')
    setSourceRef('')
    setSourceDept('')
    setSalesOrderNumber('')
    setReplacementRequestNumber('')
    setCustomerContact('')
    setEmployeeName('')
    setEmployeeId('')
    // Drop previously-autofilled rows so the new source picks start clean.
    setItems([])
    setBomExpanded({})
  }

  const handleDcFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setDcFile(file)
  }

  /* --- Item helpers --- */
  const updateItem = useCallback(
    <K extends keyof InwardItem>(id: string, field: K, value: InwardItem[K]) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      )
    },
    [],
  )

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setBomExpanded((prev) => {
      const { [id]: _removed, ...rest } = prev
      return rest
    })
  }, [])

  const handleInlinePick = useCallback((row: InlineSearchRow) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.variantId === row.variantId)
      if (existing) {
        return prev.map((it) =>
          it.id === existing.id ? { ...it, qty: it.qty + 1 } : it,
        )
      }
      return [
        ...prev,
        {
          id: nextItemId(),
          partId: row.partId,
          partName: row.partName,
          partSku: row.partSku,
          variantId: row.variantId,
          variantSku: row.variantSku,
          category: row.category,
          brand: row.brand,
          condition: 'Untested',
          qty: 1,
          notes: '',
        },
      ]
    })
  }, [])

  const toggleBomExpansion = useCallback((id: string) => {
    setBomExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  /* --- BOM dialog helpers --- */
  const expandBomToDraft = useCallback((bomId: string): InwardItemComponent[] => {
    const bom = findBOMById(bomId)
    if (!bom) return []
    const out: InwardItemComponent[] = []
    for (const bi of bom.items) {
      for (let i = 1; i <= bi.quantity; i += 1) {
        out.push({
          bomItemId: bi.id,
          slotIndex: i,
          partId: bi.partId,
          partName: bi.partName,
          partSku: bi.partSku,
          position: bi.position,
          serialNumber: '',
          barcode: '',
        })
      }
    }
    return out
  }, [])

  const openBomDialog = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId)
      setBomDialogItemId(itemId)
      if (item?.bomId) {
        setBomDraftBomId(item.bomId)
        setBomDraftComponents(item.components ?? [])
      } else {
        setBomDraftBomId('')
        setBomDraftComponents([])
      }
      setBomDialogOpen(true)
    },
    [items],
  )

  const handleBomSelect = useCallback(
    (bomId: string) => {
      setBomDraftBomId(bomId)
      setBomDraftComponents(expandBomToDraft(bomId))
    },
    [expandBomToDraft],
  )

  const updateDraftComponent = useCallback(
    (idx: number, field: 'serialNumber' | 'barcode', value: string) => {
      setBomDraftComponents((prev) =>
        prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
      )
    },
    [],
  )

  const handleBomDialogSave = useCallback(() => {
    if (!bomDialogItemId || !bomDraftBomId) {
      toast.error('Pick a BOM before saving.')
      return
    }
    const bom = findBOMById(bomDraftBomId)
    if (!bom) return
    const missing = bomDraftComponents.filter((c) => !c.serialNumber.trim()).length
    if (missing > 0) {
      toast.error(`Enter serial numbers for all ${bomDraftComponents.length} components (${missing} missing).`)
      return
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id === bomDialogItemId
          ? {
              ...it,
              partName: it.partName || bom.parentPartName,
              bomId: bom.id,
              bomNumber: bom.bomNumber,
              bomName: bom.name,
              components: bomDraftComponents,
            }
          : it,
      ),
    )
    setBomDialogOpen(false)
    setBomDialogItemId(null)
    toast.success(`Components captured for ${bom.parentPartName} (${bomDraftComponents.length} slots)`)
  }, [bomDialogItemId, bomDraftBomId, bomDraftComponents])

  const clearItemBom = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, bomId: undefined, bomNumber: undefined, bomName: undefined, components: undefined }
          : it,
      ),
    )
  }, [])

  /* --- Derived flags --- */
  const showVendorPoFields = inwardType === 'REFURB_PURCHASE' || inwardType === 'PURCHASE_ORDER'
  const showReturnFields = inwardType === 'RENTAL_RETURN' || inwardType === 'DEMO_RETURN' || inwardType === 'ADVANCE_RETURN'
  const showCustomerReturnFields = inwardType === 'ADVANCE_RETURN'
  const showInternalTransferFields = inwardType === 'INTERNAL_TRANSFER'
  const showReplacementFields = inwardType === 'REPLACEMENT'

  const validItemCount = items.filter((i) => i.partName.trim() !== '' && i.qty > 0).length
  const totalUnits = items.reduce((sum, i) => sum + (i.qty || 0), 0)
  const sourceSelected =
    !!poNumber || !!sourceRef || !!salesOrderNumber || !!replacementRequestNumber || !!sourceName || !!sourceDept

  const missingPieces: string[] = []
  if (showVendorPoFields && !poNumber.trim()) missingPieces.push('PO number')
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
  const stepItems = step++
  const stepChallan = step++
  const stepNotes = step++

  /* --- Render --- */
  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Create Inward Batch"
        subtitle="Fill each section below. Required fields are marked with an asterisk (*)."
        breadcrumbs={[
          { label: 'WMS' },
          { label: 'Inward', href: '/wms/inward' },
          { label: 'New Batch' },
        ]}
        backHref="/wms/inward"
        actions={
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Batch #
            </span>
            <span className="font-mono text-sm font-semibold">{batchNumber}</span>
          </div>
        }
      />

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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
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
            {showVendorPoFields && (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <FieldLabel
                    required
                    hint={inwardType === 'REFURB_PURCHASE' ? 'Source PO for this refurb batch' : 'Vendor PO reference'}
                  >
                    Purchase Order #
                  </FieldLabel>
                  <Select
                    value={poNumber}
                    onValueChange={(val) => {
                      if (!val) return
                      setPoNumber(val)
                      const po = mockPurchaseOrders.find((p) => p.poNumber === val)
                      if (!po) return
                      const rows = buildItemsFromPO(po)
                      if (rows.length > 0) {
                        setItems(rows)
                        toast.success(`Loaded ${rows.length} item${rows.length === 1 ? '' : 's'} from ${po.poNumber}`)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select purchase order…" />
                    </SelectTrigger>
                    <SelectContent>
                      {pickerPOs.map((po) => (
                        <SelectItem key={po.id} value={po.poNumber}>
                          {po.poNumber} · {po.vendorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPO && (
                  <SourceDetailsCard
                    kind="po"
                    title={selectedPO.vendorName}
                    badge={selectedPO.status}
                    rows={
                      <>
                        <DetailPair label="PO #" value={selectedPO.poNumber} icon={FileText} mono />
                        <DetailPair label="Contact" value={selectedPO.vendorContact} icon={User} />
                        <DetailPair label="Email" value={selectedPO.vendorEmail} icon={Mail} />
                        <DetailPair label="Address" value={selectedPO.vendorAddress} icon={MapPin} />
                        <DetailPair label="Expected Delivery" value={selectedPO.expectedDelivery} icon={Calendar} />
                        <DetailPair label="Grand Total" value={formatINR(selectedPO.grandTotal)} icon={Receipt} />
                        <DetailPair label="Payment Terms" value={selectedPO.paymentTerms} />
                        <DetailPair label="Line Items" value={`${selectedPO.items.length} lines · ${selectedPO.items.reduce((n, li) => n + li.qtyOrdered, 0)} units`} icon={Package} />
                      </>
                    }
                  />
                )}
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
                        const label = opt === 'Return' ? 'Rental' : opt
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
                            <span>{label}</span>
                            {selected && <Check className="size-4" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {inwardType === 'RENTAL_RETURN' ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <FieldLabel required hint="Original SO the rental was fulfilled from">
                        Sales Order #
                      </FieldLabel>
                      <Select
                        value={salesOrderNumber}
                        onValueChange={(val) => {
                          if (!val) return
                          setSalesOrderNumber(val)
                          const so = salesOrders.find((s) => s.orderNumber === val)
                          if (!so) return
                          if (!sourceName.trim()) setSourceName(so.accountName)
                          const cust = customerForAccount(so.accountName)
                          const primary = cust?.contacts?.find((c) => c.isPrimary) ?? cust?.contacts?.[0]
                          if (primary && !customerContact) setCustomerContact(primary.email || primary.phone || '')
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select sales order…" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickerSalesOrders.map((so) => (
                            <SelectItem key={so.id} value={so.orderNumber}>
                              {so.orderNumber} · {so.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel required>Customer Name</FieldLabel>
                      <Select
                        value={sourceName}
                        onValueChange={(val) => { if (val) setSourceName(val) }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select customer…" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockCustomerRegistrations.map((c) => (
                            <SelectItem key={c.id} value={c.companyName}>
                              {c.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel hint="Auto-fills devices into Line Items">
                        Contract Number
                      </FieldLabel>
                      <Select
                        value={sourceRef}
                        onValueChange={(val) => {
                          if (!val) return
                          setSourceRef(val)
                          const rc = mockRentalContracts.find((r) => r.contractNumber === val)
                          if (!rc) return
                          setSourceName(rc.customerName)
                          if (rc.contactPhone) setCustomerContact(rc.contactPhone)
                          const rows = buildItemsFromRentalContract(rc)
                          if (rows.length > 0) {
                            setItems(rows)
                            toast.success(`Loaded ${rows.length} device${rows.length === 1 ? '' : 's'} from ${rc.contractNumber}`)
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select rental contract…" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickerRentalContracts.map((rc) => (
                            <SelectItem key={rc.id} value={rc.contractNumber}>
                              {rc.contractNumber} · {rc.customerName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : inwardType === 'DEMO_RETURN' ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <FieldLabel hint="Auto-fills items into Line Items">
                        Demo Request #
                      </FieldLabel>
                      <Select
                        value={sourceRef}
                        onValueChange={(val) => {
                          if (!val) return
                          setSourceRef(val)
                          const dr = demoRequests.find((d) => d.demoNumber === val)
                          if (!dr) return
                          setSourceName(dr.accountName)
                          if (dr.contactPhone || dr.contactEmail) {
                            setCustomerContact(dr.contactEmail || dr.contactPhone || '')
                          }
                          const rows = buildItemsFromDemoRequest(dr)
                          if (rows.length > 0) {
                            setItems(rows)
                            toast.success(`Loaded ${rows.length} item${rows.length === 1 ? '' : 's'} from ${dr.demoNumber}`)
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select demo request…" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickerDemoRequests.map((dr) => (
                            <SelectItem key={dr.id} value={dr.demoNumber}>
                              {dr.demoNumber} · {dr.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel required>Customer Name</FieldLabel>
                      <Select
                        value={sourceName}
                        onValueChange={(val) => { if (val) setSourceName(val) }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select customer…" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockCustomerRegistrations.map((c) => (
                            <SelectItem key={c.id} value={c.companyName}>
                              {c.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel hint="Phone or email of the customer contact">
                        Customer Contact Number
                      </FieldLabel>
                      <Input
                        placeholder="e.g., rohit@infosys.com · +91 98..."
                        value={customerContact}
                        onChange={(e) => setCustomerContact(e.target.value)}
                      />
                    </div>
                  </div>
                ) : showCustomerReturnFields && originType === 'Return' ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel required hint="Original SO the rental was fulfilled from">
                        Sales Order #
                      </FieldLabel>
                      <Select
                        value={sourceRef}
                        onValueChange={(val) => {
                          if (!val) return
                          setSourceRef(val)
                          const so = salesOrders.find((s) => s.orderNumber === val)
                          if (!so) return
                          setSourceName(so.accountName)
                          const cust = customerForAccount(so.accountName)
                          const primary = cust?.contacts?.find((c) => c.isPrimary) ?? cust?.contacts?.[0]
                          if (primary) setCustomerContact(primary.email || primary.phone || '')
                          const rows = buildItemsFromSO(so)
                          if (rows.length > 0) {
                            setItems(rows)
                            toast.success(`Loaded ${rows.length} item${rows.length === 1 ? '' : 's'} from ${so.orderNumber}`)
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select sales order…" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickerSalesOrders.map((so) => (
                            <SelectItem key={so.id} value={so.orderNumber}>
                              {so.orderNumber} · {so.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel required>Customer Name</FieldLabel>
                      <Select
                        value={sourceName}
                        onValueChange={(val) => { if (val) setSourceName(val) }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select customer…" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockCustomerRegistrations.map((c) => (
                            <SelectItem key={c.id} value={c.companyName}>
                              {c.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel required>Customer Name</FieldLabel>
                      <Select
                        value={sourceName}
                        onValueChange={(val) => { if (val) setSourceName(val) }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select customer…" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockCustomerRegistrations.map((c) => (
                            <SelectItem key={c.id} value={c.companyName}>
                              {c.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel hint="SO number">Sales Order #</FieldLabel>
                      <Select
                        value={sourceRef}
                        onValueChange={(val) => {
                          if (!val) return
                          setSourceRef(val)
                          const so = salesOrders.find((s) => s.orderNumber === val)
                          if (!so) return
                          setSourceName(so.accountName)
                          const cust = customerForAccount(so.accountName)
                          const primary = cust?.contacts?.find((c) => c.isPrimary) ?? cust?.contacts?.[0]
                          if (primary) setCustomerContact(primary.email || primary.phone || '')
                          const rows = buildItemsFromSO(so)
                          if (rows.length > 0) {
                            setItems(rows)
                            toast.success(`Loaded ${rows.length} item${rows.length === 1 ? '' : 's'} from ${so.orderNumber}`)
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select sales order…" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickerSalesOrders.map((so) => (
                            <SelectItem key={so.id} value={so.orderNumber}>
                              {so.orderNumber} · {so.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Source details — surfaces customer info for the picked record. */}
                {showCustomerReturnFields && selectedSO && (() => {
                  const cust = customerForAccount(selectedSO.accountName)
                  const primary = cust?.contacts?.find((c) => c.isPrimary) ?? cust?.contacts?.[0]
                  const billingAddress = cust
                    ? [cust.billingAddress, cust.billingCity, cust.billingState, cust.billingPincode].filter(Boolean).join(', ')
                    : undefined
                  return (
                    <SourceDetailsCard
                      kind="so"
                      title={selectedSO.accountName}
                      badge={selectedSO.status}
                      rows={
                        <>
                          <DetailPair label="SO #" value={selectedSO.orderNumber} icon={FileText} mono />
                          <DetailPair label="Order Date" value={selectedSO.date} icon={Calendar} />
                          <DetailPair label="Total" value={formatINR(selectedSO.total)} icon={Receipt} />
                          <DetailPair label="Line Items" value={`${selectedSO.lineItems.length} lines · ${selectedSO.lineItems.reduce((n, li) => n + li.qty, 0)} units`} icon={Package} />
                          <DetailPair label="Contact" value={primary?.name} icon={User} />
                          <DetailPair label="Phone" value={primary?.phone} icon={Phone} />
                          <DetailPair label="Email" value={primary?.email} icon={Mail} />
                          <DetailPair label="Billing Address" value={billingAddress} icon={MapPin} />
                        </>
                      }
                    />
                  )
                })()}
                {inwardType === 'RENTAL_RETURN' && selectedContract && (
                  <SourceDetailsCard
                    kind="rental"
                    title={selectedContract.customerName}
                    badge={selectedContract.status}
                    rows={
                      <>
                        <DetailPair label="Contract #" value={selectedContract.contractNumber} icon={FileText} mono />
                        <DetailPair label="Contact" value={selectedContract.contactPerson} icon={User} />
                        <DetailPair label="Phone" value={selectedContract.contactPhone} icon={Phone} />
                        <DetailPair label="Address" value={selectedContract.shippingAddress} icon={MapPin} />
                        <DetailPair label="Start" value={selectedContract.startDate} icon={Calendar} />
                        <DetailPair label="End" value={selectedContract.endDate} icon={Calendar} />
                        <DetailPair label="Units" value={`${selectedContract.devices.length} devices`} icon={Package} />
                        <DetailPair label="Monthly Rental" value={formatINR(selectedContract.monthlyRental)} icon={Receipt} />
                      </>
                    }
                  />
                )}
                {inwardType === 'DEMO_RETURN' && selectedDemo && (
                  <SourceDetailsCard
                    kind="demo"
                    title={selectedDemo.accountName}
                    badge={selectedDemo.status}
                    rows={
                      <>
                        <DetailPair label="Demo #" value={selectedDemo.demoNumber} icon={FileText} mono />
                        <DetailPair label="Contact" value={selectedDemo.contactName} icon={User} />
                        <DetailPair label="Phone" value={selectedDemo.contactPhone} icon={Phone} />
                        <DetailPair label="Email" value={selectedDemo.contactEmail} icon={Mail} />
                        <DetailPair label="Shipping Address" value={selectedDemo.shippingAddress} icon={MapPin} />
                        <DetailPair label="Dispatched" value={selectedDemo.dispatchDate} icon={Calendar} />
                        <DetailPair label="Expected Return" value={selectedDemo.expectedReturnDate} icon={Calendar} />
                        <DetailPair label="Items" value={`${selectedDemo.items.length} items · ${selectedDemo.items.reduce((n, li) => n + li.qty, 0)} units`} icon={Package} />
                      </>
                    }
                  />
                )}

              </div>
            )}

            {showInternalTransferFields && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <FieldLabel required>Source Department</FieldLabel>
                  <Input
                    placeholder="e.g., IT Department"
                    value={sourceDept}
                    onChange={(e) => setSourceDept(e.target.value)}
                  />
                </div>
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
            )}

            {showReplacementFields && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <FieldLabel required hint="Pick the customer's replacement request this stock fulfils">
                      Replacement Request
                    </FieldLabel>
                    <Select
                      value={replacementRequestNumber}
                      onValueChange={(val) => {
                        if (!val) return
                        setReplacementRequestNumber(val)
                        const rr = mockReplacementRequests.find((r) => r.requestNumber === val)
                        if (!rr) return
                        setSalesOrderNumber(rr.salesOrderNumber)
                        if (!sourceName.trim()) setSourceName(rr.customer)
                        const cust = customerForAccount(rr.customer)
                        const primary = cust?.contacts?.find((c) => c.isPrimary) ?? cust?.contacts?.[0]
                        if (primary && !customerContact) setCustomerContact(primary.email || primary.phone || '')
                        const rows = buildItemsFromReplacementRequest(rr)
                        if (rows.length > 0) {
                          setItems(rows)
                          toast.success(`Loaded ${rows.length} item${rows.length === 1 ? '' : 's'} from ${rr.requestNumber}`)
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select replacement request…" />
                      </SelectTrigger>
                      <SelectContent>
                        {pickerReplacementRequests.map((rr) => (
                          <SelectItem key={rr.id} value={rr.requestNumber}>
                            {rr.requestNumber} · {rr.customer} · {rr.originalPartName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedReplacementRequest && (
                  <SourceDetailsCard
                    kind="replacement"
                    title={selectedReplacementRequest.customer}
                    badge={selectedReplacementRequest.status}
                    rows={
                      <>
                        <DetailPair label="Request #" value={selectedReplacementRequest.requestNumber} icon={FileText} mono />
                        <DetailPair label="Sales Order #" value={selectedReplacementRequest.salesOrderNumber} icon={Receipt} mono />
                        <DetailPair label="Reason" value={selectedReplacementRequest.reason} icon={ArchiveRestore} />
                        <DetailPair label="Priority" value={selectedReplacementRequest.priority} icon={Sparkles} />
                        <DetailPair
                          label="Original Part"
                          value={`${selectedReplacementRequest.originalPartName} (${selectedReplacementRequest.originalPartSku})`}
                          icon={Package}
                        />
                        <DetailPair label="Qty" value={`${selectedReplacementRequest.qty} unit${selectedReplacementRequest.qty === 1 ? '' : 's'}`} icon={Package2} />
                        {selectedReplacementRequest.replacementPartName && (
                          <DetailPair
                            label="Replacement Part"
                            value={`${selectedReplacementRequest.replacementPartName} (${selectedReplacementRequest.replacementPartSku})`}
                            icon={Replace}
                          />
                        )}
                        <DetailPair label="Next Step" value={selectedReplacementRequest.nextStep} icon={ChevronRight} />
                        <DetailPair label="Requested By" value={selectedReplacementRequest.requestedBy} icon={User} />
                        <DetailPair label="Requested At" value={selectedReplacementRequest.requestedAt?.split('T')[0]} icon={Calendar} />
                        {selectedReplacementRequest.deviceBarcode && (
                          <DetailPair label="Original Barcode" value={selectedReplacementRequest.deviceBarcode} mono />
                        )}
                      </>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Line Items */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={stepItems}
            title="Line Items"
            description="Lines auto-populate from the source above. Adjust qty as needed. Per-unit serial / barcode entry happens on the next step."
            trailing={
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {items.length} line{items.length === 1 ? '' : 's'}
                {totalUnits > 0 ? ` · ${totalUnits} unit${totalUnits === 1 ? '' : 's'}` : ''}
              </span>
            }
          />
        </CardHeader>
        <CardContent className="p-0 border-t">
          {showInternalTransferFields && (
            <div className="border-b p-3">
              <InlineItemSearch onPick={handleInlinePick} />
            </div>
          )}
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 size-6" />
              {showInternalTransferFields
                ? 'No lines yet. Use the search above to add items.'
                : sourceSelected
                  ? 'No lines yet — pick a source above to load lines.'
                  : 'Select a source above to auto-fill lines.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="w-24 px-3 py-2 text-right font-medium">Qty</th>
                    <th className="w-10 px-1 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => {
                    const expanded = !!bomExpanded[item.id]
                    return (
                      <Fragment key={item.id}>
                        <tr>
                          <td className="px-3 py-2">
                            <div className="text-sm font-medium">
                              {item.partName || (
                                <span className="text-muted-foreground italic">Unnamed line</span>
                              )}
                            </div>
                            {(item.variantSku || item.partSku) && (
                              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="font-mono">{item.variantSku || item.partSku}</span>
                                {item.brand && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate">{item.brand}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {item.bomId && (
                              <button
                                type="button"
                                onClick={() => toggleBomExpansion(item.id)}
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium wms-link-btn"
                              >
                                {expanded ? (
                                  <ChevronDown className="size-3" />
                                ) : (
                                  <ChevronRight className="size-3" />
                                )}
                                <Package2 className="size-3" />
                                {expanded ? 'Hide BOM' : 'View BOM'} · {item.bomName}
                                <Badge variant="outline" className="ml-1 text-[10px]">
                                  {item.components?.length ?? 0} component
                                  {(item.components?.length ?? 0) === 1 ? '' : 's'}
                                </Badge>
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-20 ml-auto text-right text-xs"
                              value={item.qty}
                              onChange={(e) =>
                                updateItem(item.id, 'qty', Number(e.target.value) || 0)
                              }
                            />
                          </td>
                          <td className="px-1 py-2 align-top">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeItem(item.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="size-4" />
                            </Button>
                          </td>
                        </tr>
                        {item.bomId && expanded && (
                          <tr className="bg-muted/20">
                            <td colSpan={3} className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                                  <Cpu className="size-3" />
                                  Assembly · {item.bomName}
                                </span>
                                <span className="text-muted-foreground">
                                  {item.components?.length ?? 0} components captured (
                                  {item.bomNumber})
                                </span>
                                <div className="ml-auto flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => openBomDialog(item.id)}
                                  >
                                    Edit components
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => clearItemBom(item.id)}
                                  >
                                    Clear BOM
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Delivery Challan */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            step={stepChallan}
            title="Delivery Challan"
            description="Attach the DC received with this batch. PDF or image."
            trailing={dcFile ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Attached
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Optional
              </span>
            )}
          />
        </CardHeader>
        <CardContent className="pt-0">
          <input
            ref={dcFileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleDcFileChange}
          />
          {dcFile ? (
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
              <FileText className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{dcFile.name}</p>
                <p className="text-[11px] text-muted-foreground">{formatFileSize(dcFile.size)}</p>
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
                'flex w-full items-center gap-3 rounded-md border border-dashed px-3 py-2.5 text-left transition-colors',
                isDraggingDc
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30',
              )}
            >
              <UploadCloud className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm text-muted-foreground">
                Click to upload or drag and drop · PDF, PNG, JPG
              </span>
              <span className="text-[11px] font-medium text-primary">Browse</span>
            </button>
          )}
        </CardContent>
      </Card>

      {/* 4. Notes */}
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
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      {/* BOM capture dialog (server / assembly line) */}
      <Dialog open={bomDialogOpen} onOpenChange={setBomDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="shrink-0 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Server className="size-5 text-primary" />
                Load Assembly BOM
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Pick a BOM for this server / workstation build, then enter the serial number
                on each component shipped in this chassis.
              </p>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium">BOM</Label>
              <Select value={bomDraftBomId} onValueChange={(val) => { if (val) handleBomSelect(val) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an active BOM…" />
                </SelectTrigger>
                <SelectContent>
                  {activeAssemblyBOMs.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.parentPartName} — {b.name} ({b.bomNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bomDraftBomId && (
                <p className="text-xs text-muted-foreground">
                  {bomDraftComponents.length} component slot
                  {bomDraftComponents.length === 1 ? '' : 's'} to capture
                </p>
              )}
            </div>

            {bomDraftComponents.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="w-10 px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">Component</th>
                      <th className="px-3 py-2 text-left font-medium">Position</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Serial Number <span className="text-destructive">*</span>
                      </th>
                      <th className="px-3 py-2 text-left font-medium">Barcode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bomDraftComponents.map((c, idx) => (
                      <tr key={`${c.bomItemId}-${c.slotIndex}`}>
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium">
                              {c.partName}
                              {' '}
                              <span className="text-xs text-muted-foreground">#{c.slotIndex}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">{c.partSku}</span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">
                          {c.position ?? '—'}
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-8 text-sm"
                            placeholder="Serial #"
                            value={c.serialNumber}
                            onChange={(e) => updateDraftComponent(idx, 'serialNumber', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-8 text-sm"
                            placeholder="Barcode (optional)"
                            value={c.barcode}
                            onChange={(e) => updateDraftComponent(idx, 'barcode', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-3">
            <Button variant="outline" onClick={() => setBomDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBomDialogSave} disabled={!bomDraftBomId}>
              Save Components
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { InwardFormPage }
export default InwardFormPage
