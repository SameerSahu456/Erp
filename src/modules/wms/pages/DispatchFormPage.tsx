import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { toast } from 'sonner'
import {
  Save,
  Plus,
  Ticket,
  X as XIcon,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Package2,
  Layers,
  Check,
  UploadCloud,
  FileText,
  Monitor,
  Receipt,
  Clock,
  ArrowLeftRight,
  RotateCcw,
  MapPin,
  Minus,
  ChevronsUpDown,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

import { salesOrders } from '@/modules/crm/data/sales-orders'
import { demoRequests } from '@/modules/crm/data/demo-requests'
import { mockParts } from '@/modules/ims/data/parts'
import { mockVariants } from '@/modules/ims/data/variants'
import {
  getDispatchById,
  upsertDispatch,
  nextDispatchNumber,
} from '../data/dispatches'
import { mockBOMs } from '../data/boms'
import { mockReplacementRequests } from '../data/replacement-requests'
import { mockWarehouses } from '../data/warehouses'
import type {
  Dispatch,
  DispatchAction,
  DispatchRequestStatus,
  DispatchLineItem,
  DispatchDocument,
  DispatchVarianceReason,
  DispatchDocumentType,
  VariantCondition,
  BillOfMaterials,
} from '../types'
import { DISPATCH_REQUEST_STATUSES } from '../types'

// ── Local editor types ──────────────────────────────────────────────────────

type EditorLine = {
  id: string
  soLineItemId?: string
  variantId: string
  condition: VariantCondition
  variantSku: string
  partId: string
  partName: string
  partSku: string
  category: string
  brand: string
  action: DispatchAction
  plannedQty: number
  fittedQty: number
  serialNumbersText: string   // comma-separated for easy editing
  replacedVariantId?: string
  replacedDisplayName?: string
  replacedSerialNumbersText: string
  reason?: DispatchVarianceReason
  notes: string
  rate: number
}

type EditorDocument = {
  id: string
  type: DispatchDocumentType
  documentNumber: string
  issuedDate: string
  notes: string
  fileName?: string
  fileSize?: number
}

// BOM component state for an assembled-server line. Stored per parent line
// so that we can emit additional DispatchLineItems at save time. Each row is
// either an original component (kept or removed) or a freshly added one.
type BomComponentState = {
  bomItemId: string
  partName: string
  partSku: string
  partId: string
  variantId: string
  variantSku: string
  condition: VariantCondition
  qty: number
  rate: number
  // Optional rack location for picking the component during assembly,
  // e.g. "Mumbai · Row1 · A · Bin2".
  rackLocation?: string
  // Comma-separated serial numbers entered manually by the picker.
  serialNumbers?: string
}

const DOC_TYPE_OPTIONS: DispatchDocumentType[] = [
  'Invoice',
  'E-way Bill',
  'Delivery Challan',
]

const DOC_TYPE_HINTS: Partial<Record<DispatchDocumentType, string>> = {
  'Invoice': 'Tally invoice / customer billing',
  'E-way Bill': 'State e-way bill for transport',
  'Delivery Challan': 'Goods movement challan',
}

// ── Layout helpers ─────────────────────────

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

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function parseSerials(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// ── Source-type tile config ─────────────────────────────────────────────────
// Search-and-select options for the BOM Part Number combobox. We expand parts
// across their variant conditions (New / Refurbished / New Pull) so the picker
// shows one row per (part × condition), with the condition rendered as a badge
// on the right side of each row.
type ComboOption = {
  value: string
  label: string
  subtitle?: string
  trailing?: string
  keywords?: string[]
}

type PartOption = ComboOption & {
  partSku: string
  partName: string
  partId: string
  variantId: string
  variantSku: string
  condition: VariantCondition
}

const PART_OPTIONS: PartOption[] = mockVariants.flatMap((v) => {
  const part = mockParts.find((p) => p.id === v.partId)
  if (!part) return []
  return [
    {
      value: v.variantSku,
      label: part.sku,
      subtitle: part.name,
      trailing: v.condition,
      keywords: [v.variantSku, part.sku, part.name, part.brand, v.condition].filter(
        Boolean,
      ) as string[],
      partSku: part.sku,
      partName: part.name,
      partId: part.id,
      variantId: v.id,
      variantSku: v.variantSku,
      condition: v.condition,
    },
  ]
})

type DispatchSourceType =
  | 'SALES'
  | 'RENTAL'
  | 'DEMO'
  | 'INTERNAL_TRANSFER'
  | 'RETURN_REPLACEMENT'

const DISPATCH_SOURCE_OPTIONS: {
  value: DispatchSourceType
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    value: 'SALES',
    label: 'Sales',
    description: 'Ship against a Sales Order',
    icon: Receipt,
  },
  {
    value: 'RENTAL',
    label: 'Rental',
    description: 'Ship against a rental order',
    icon: Clock,
  },
  {
    value: 'DEMO',
    label: 'Demo',
    description: 'Send device for demonstration',
    icon: Monitor,
  },
  {
    value: 'INTERNAL_TRANSFER',
    label: 'Internal Transfer',
    description: 'Issue to an employee',
    icon: ArrowLeftRight,
  },
  {
    value: 'RETURN_REPLACEMENT',
    label: 'Replacement',
    description: 'Replace a dispatched device',
    icon: RotateCcw,
  },
]

function buildPlannedLinesFromDemo(demoRequestId: string): EditorLine[] {
  const dr = demoRequests.find((d) => d.id === demoRequestId)
  if (!dr) return []
  return dr.items.map((li) => ({
    id: genId('EL'),
    variantId: li.variantId,
    condition: li.condition,
    variantSku: li.variantSku,
    partId: li.partId,
    partName: li.partName,
    partSku: li.partSku,
    category: li.category,
    brand: li.brand,
    action: 'PLANNED' as DispatchAction,
    plannedQty: li.qty,
    fittedQty: li.qty,
    serialNumbersText: (li.serialNumbers ?? []).join(', '),
    replacedSerialNumbersText: '',
    notes: '',
    rate: 0,
  }))
}

function buildPlannedLinesFromSO(salesOrderId: string): EditorLine[] {
  const so = salesOrders.find((o) => o.id === salesOrderId)
  if (!so) return []
  return so.lineItems.map((li) => {
    // Synthesize a single sample serial number per line so the dispatch UI
    // shows realistic inventory data. Format mirrors the inventory pattern
    // (`{partSku}-SN-001`).
    const serial = `${li.partSku}-SN-001`
    return {
      id: genId('EL'),
      soLineItemId: li.id,
      variantId: li.variantId,
      condition: li.condition,
      variantSku: li.variantSku,
      partId: li.partId,
      partName: li.partName,
      partSku: li.partSku,
      category: li.category,
      brand: li.brand,
      action: 'PLANNED' as DispatchAction,
      plannedQty: li.qty,
      fittedQty: li.qty,
      serialNumbersText: serial,
      replacedSerialNumbersText: '',
      notes: '',
      rate: li.rate,
    }
  })
}

// Find the assembly BOM tied to a planned line. Prefer the SO line's explicit
// bomId; otherwise fall back to the first ASSEMBLY BOM whose parent matches.
function findBOMForPlannedLine(
  line: EditorLine,
  so: ReturnType<typeof salesOrders.find>,
): BillOfMaterials | undefined {
  const soLine = so?.lineItems.find((li) => li.id === line.soLineItemId)
  if (soLine?.bomId) {
    const byId = mockBOMs.find((b) => b.id === soLine.bomId || b.bomNumber === soLine.bomId)
    if (byId) return byId
  }
  return mockBOMs.find((b) => b.parentPartId === line.partId && b.type === 'ASSEMBLY')
}

function dispatchLineToEditor(li: DispatchLineItem): EditorLine {
  return {
    id: li.id,
    soLineItemId: li.soLineItemId,
    variantId: li.variantId,
    condition: li.condition,
    variantSku: li.variantSku,
    partId: li.partId,
    partName: li.partName,
    partSku: li.partSku,
    category: li.category,
    brand: li.brand,
    action: li.action,
    plannedQty: li.plannedQty,
    fittedQty: li.fittedQty,
    serialNumbersText: (li.serialNumbers ?? []).join(', '),
    replacedVariantId: li.replacedVariantId,
    replacedDisplayName: li.replacedDisplayName,
    replacedSerialNumbersText: (li.replacedSerialNumbers ?? []).join(', '),
    reason: li.reason,
    notes: li.notes ?? '',
    rate: li.rate,
  }
}

function editorToDispatchLine(l: EditorLine): DispatchLineItem {
  const serials = parseSerials(l.serialNumbersText)
  const replacedSerials = parseSerials(l.replacedSerialNumbersText)
  return {
    id: l.id,
    soLineItemId: l.soLineItemId,
    variantId: l.variantId,
    condition: l.condition,
    variantSku: l.variantSku,
    partId: l.partId,
    partName: l.partName,
    partSku: l.partSku,
    category: l.category,
    brand: l.brand,
    action: l.action,
    plannedQty: l.plannedQty,
    fittedQty: l.fittedQty,
    serialNumbers: serials.length > 0 ? serials : undefined,
    replacedVariantId: l.replacedVariantId,
    replacedDisplayName: l.replacedDisplayName,
    replacedSerialNumbers: replacedSerials.length > 0 ? replacedSerials : undefined,
    reason: l.reason,
    notes: l.notes || undefined,
    rate: l.rate,
    amount: l.fittedQty * l.rate,
  }
}

function dispatchDocToEditor(d: DispatchDocument): EditorDocument {
  return {
    id: d.id,
    type: d.type,
    documentNumber: d.documentNumber,
    issuedDate: d.issuedDate ?? '',
    notes: d.notes ?? '',
    fileName: d.fileName,
  }
}

function editorToDispatchDoc(d: EditorDocument, uploadedBy: string): DispatchDocument {
  return {
    id: d.id,
    type: d.type,
    documentNumber: d.documentNumber,
    issuedDate: d.issuedDate || undefined,
    fileName: d.fileName,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    notes: d.notes || undefined,
  }
}

function inferDocType(fileName: string): DispatchDocumentType {
  const n = fileName.toLowerCase()
  if (n.includes('eway') || n.includes('e-way')) return 'E-way Bill'
  if (n.includes('challan') || n.includes('dc')) return 'Delivery Challan'
  if (n.includes('warranty')) return 'Warranty Card'
  if (n.includes('agreement') || n.includes('sla')) return 'Service Agreement'
  if (n.includes('invoice') || n.includes('inv')) return 'Invoice'
  return 'Invoice'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocTypeSlot({
  type,
  hint,
  docs,
  onAddFiles,
  onUpdate,
  onRemove,
}: {
  type: DispatchDocumentType
  hint: string
  docs: EditorDocument[]
  onAddFiles: (files: FileList | File[], type: DispatchDocumentType) => void
  onUpdate: (id: string, patch: Partial<EditorDocument>) => void
  onRemove: (id: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div className="grid gap-3 px-4 py-3 md:grid-cols-[200px_1fr]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{type}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="space-y-2">
        {docs.length === 0 ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (!dragging) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              if (e.dataTransfer.files?.length) onAddFiles(e.dataTransfer.files, type)
            }}
            className={cn(
              'flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-3 text-xs transition-colors',
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
            )}
          >
            <UploadCloud className="size-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Click to upload</span>
            <span className="text-muted-foreground">or drag &amp; drop</span>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="space-y-2 rounded-md border bg-muted/20 p-2">
                <div className="flex items-center gap-2 text-xs">
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{doc.fileName ?? 'No file attached'}</span>
                  {doc.fileSize !== undefined && (
                    <span className="text-muted-foreground">· {formatFileSize(doc.fileSize)}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(doc.id)}
                    aria-label="Remove document"
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_140px_1fr]">
                  <Input
                    placeholder="Document number"
                    className="h-8 font-mono text-xs"
                    value={doc.documentNumber}
                    onChange={(e) => onUpdate(doc.id, { documentNumber: e.target.value })}
                  />
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={doc.issuedDate}
                    onChange={(e) => onUpdate(doc.id, { issuedDate: e.target.value })}
                  />
                  <Input
                    placeholder="Notes"
                    className="h-8 text-xs"
                    value={doc.notes}
                    onChange={(e) => onUpdate(doc.id, { notes: e.target.value })}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => inputRef.current?.click()}
            >
              <Plus className="mr-1 size-3" />
              Add another
            </Button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAddFiles(e.target.files, type)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
      </div>
    </div>
  )
}

function DispatchFormPage() {
  const navigate = useNavigate()
  const goBack = useNavigateBack('/wms/dispatches')
  const { id: editId } = useParams<{ id: string }>()
  const [search] = useSearchParams()
  const initialSO = search.get('so') ?? ''
  const existing = editId ? getDispatchById(editId) : undefined
  const isEditMode = !!existing

  // ── Source type ──
  // Dispatches can ship against a Sales Order (default), Rental, Demo, etc.
  const [sourceType, setSourceType] = useState<DispatchSourceType>(existing?.dispatchType ?? 'SALES')
  const [demoRequestId, setDemoRequestId] = useState<string>('')
  const [rentalSalesOrderId, setRentalSalesOrderId] = useState<string>('')
  const [employeeName, setEmployeeName] = useState<string>('')
  const [employeeEmail, setEmployeeEmail] = useState<string>('')
  const [replacementRequestId, setReplacementRequestId] = useState<string>('')

  // ── Header fields ──
  const [salesOrderId, setSalesOrderId] = useState<string>(existing?.salesOrderId ?? initialSO)
  const [status, setStatus] = useState<DispatchRequestStatus>(existing?.status ?? 'Draft')
  const [externalTicketNumber, setExternalTicketNumber] = useState(existing?.externalTicketNumber ?? '')
  const [externalSystem, setExternalSystem] = useState(existing?.externalSystem ?? 'Freshdesk')
  const [storeManager, setStoreManager] = useState(existing?.storeManager ?? '')
  const [billingPerson, setBillingPerson] = useState(existing?.billingPerson ?? '')
  const [shippingAddress, setShippingAddress] = useState(existing?.shippingAddress ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [invoiceAmount, setInvoiceAmount] = useState<string>(
    existing?.invoiceAmount !== undefined ? String(existing.invoiceAmount) : '',
  )

  // ── Line items ──
  const [lines, setLines] = useState<EditorLine[]>(() => {
    if (existing) return existing.lineItems.map(dispatchLineToEditor)
    if (initialSO) return buildPlannedLinesFromSO(initialSO)
    return []
  })

  // ── BOM breakdown state (per parent line id) ──
  // The breakdown stays collapsed until the user opens "View BOM". Once open,
  // they enter Add and Remove rows manually — Adds emit ADDED dispatch lines
  // and Removes emit REMOVED dispatch lines at save time.
  const [bomExpanded, setBomExpanded] = useState<Record<string, boolean>>({})
  const [bomState, setBomState] = useState<Record<string, BomComponentState[]>>({})

  // Components the user has removed from a BOM. Kept around so we can emit
  // REMOVED dispatch lines at save time with the return-rack location captured
  // when the user clicked the X on the component row.
  const [removedBomComponents, setRemovedBomComponents] = useState<
    Record<string, BomComponentState[]>
  >({})

  // ── Documents ──
  const [documents, setDocuments] = useState<EditorDocument[]>(() =>
    existing ? existing.documents.map(dispatchDocToEditor) : [],
  )

  // If user navigates between /new and /:id/edit without remount, reload state.
  useEffect(() => {
    if (existing) {
      setSalesOrderId(existing.salesOrderId)
      setStatus(existing.status)
      setExternalTicketNumber(existing.externalTicketNumber ?? '')
      setExternalSystem(existing.externalSystem ?? 'Freshdesk')
      setStoreManager(existing.storeManager)
      setBillingPerson(existing.billingPerson ?? '')
      setShippingAddress(existing.shippingAddress ?? '')
      setNotes(existing.notes ?? '')
      setInvoiceAmount(existing.invoiceAmount !== undefined ? String(existing.invoiceAmount) : '')
      setLines(existing.lineItems.map(dispatchLineToEditor))
      setDocuments(existing.documents.map(dispatchDocToEditor))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  const selectedSO = useMemo(() => salesOrders.find((o) => o.id === salesOrderId), [salesOrderId])
  const selectedDemo = useMemo(
    () => demoRequests.find((d) => d.id === demoRequestId),
    [demoRequestId],
  )

  function handleSOChange(value: string | null) {
    const next = value ?? ''
    setSalesOrderId(next)
    setRemovedBomComponents({})
    setBomExpanded({})
    setBomState({})
    setLines(next ? buildPlannedLinesFromSO(next) : [])
  }

  function handleDemoChange(value: string | null) {
    const next = value ?? ''
    setDemoRequestId(next)
    setLines(next ? buildPlannedLinesFromDemo(next) : [])
    // Pull customer's shipping address from the demo unless the user already typed one.
    const dr = next ? demoRequests.find((d) => d.id === next) : undefined
    if (dr && !shippingAddress) setShippingAddress(dr.shippingAddress)
  }

  function handleSourceTypeChange(next: DispatchSourceType) {
    if (next === sourceType) return
    setSourceType(next)
    // Clear the other source's selection + reset the lines table so the
    // user starts the new flow from a clean slate.
    setSalesOrderId('')
    setDemoRequestId('')
    setRentalSalesOrderId('')
    setEmployeeName('')
    setEmployeeEmail('')
    setReplacementRequestId('')
    setLines([])
    setBomExpanded({})
    setBomState({})
    setRemovedBomComponents({})
  }

  function updateLine(id: string, patch: Partial<EditorLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
    setBomState((prev) => {
      const { [id]: _removed, ...rest } = prev
      return rest
    })
    setBomExpanded((prev) => {
      const { [id]: _removed, ...rest } = prev
      return rest
    })
    setRemovedBomComponents((prev) => {
      const { [id]: _removed, ...rest } = prev
      return rest
    })
  }

  function findBOMForLine(line: EditorLine) {
    return findBOMForPlannedLine(line, selectedSO)
  }

  function toggleBomExpansion(line: EditorLine) {
    const bom = findBOMForLine(line)
    if (!bom) return
    setBomExpanded((prev) => ({ ...prev, [line.id]: !prev[line.id] }))
    setBomState((prev) => {
      if (prev[line.id]) return prev
      // Always start empty — the picker adds components manually via the Add
      // button below. No auto-fetch from the BOM definition.
      return { ...prev, [line.id]: [] }
    })
  }

  function removeBomComponent(lineId: string, bomItemId: string) {
    setBomState((prev) => ({
      ...prev,
      [lineId]: (prev[lineId] ?? []).filter((c) => c.bomItemId !== bomItemId),
    }))
  }

  function addBomComponent(
    lineId: string,
    input: {
      partNumber: string
      partName?: string
      partId?: string
      variantId?: string
      variantSku?: string
      condition?: VariantCondition
      serialNumber: string
      qty: number
    },
  ) {
    setBomState((prev) => {
      const existing = prev[lineId] ?? []
      return {
        ...prev,
        [lineId]: [
          ...existing,
          {
            bomItemId: genId('BC'),
            partName: input.partName ?? input.partNumber,
            partSku: input.partNumber,
            partId: input.partId ?? '',
            variantId: input.variantId ?? '',
            variantSku: input.variantSku ?? input.serialNumber,
            condition: input.condition ?? 'New',
            qty: input.qty,
            rate: 0,
            serialNumbers: input.serialNumber || undefined,
          },
        ],
      }
    })
  }

  function recordRemovedBomComponent(
    lineId: string,
    input: {
      partNumber: string
      partName?: string
      partId?: string
      variantId?: string
      variantSku?: string
      condition?: VariantCondition
      serialNumber: string
      qty: number
      rack: string
      bin: string
    },
  ) {
    const location = [input.rack, input.bin].filter(Boolean).join(' · ')
    setRemovedBomComponents((prev) => ({
      ...prev,
      [lineId]: [
        ...(prev[lineId] ?? []),
        {
          bomItemId: genId('BC'),
          partName: input.partName ?? input.partNumber,
          partSku: input.partNumber,
          partId: input.partId ?? '',
          variantId: input.variantId ?? '',
          variantSku: input.variantSku ?? input.serialNumber,
          condition: input.condition ?? 'New',
          qty: input.qty,
          rate: 0,
          rackLocation: location || undefined,
          serialNumbers: input.serialNumber || undefined,
        },
      ],
    }))
  }

  function undoRemovedBomComponent(lineId: string, bomItemId: string) {
    setRemovedBomComponents((prev) => ({
      ...prev,
      [lineId]: (prev[lineId] ?? []).filter((c) => c.bomItemId !== bomItemId),
    }))
  }

  function addDocumentsFromFiles(fileList: FileList | File[], type?: DispatchDocumentType) {
    const files = Array.from(fileList)
    if (files.length === 0) return
    const today = new Date().toISOString().split('T')[0]
    setDocuments((prev) => [
      ...prev,
      ...files.map((f) => ({
        id: genId('DOC'),
        type: type ?? inferDocType(f.name),
        documentNumber: '',
        issuedDate: today,
        notes: '',
        fileName: f.name,
        fileSize: f.size,
      })),
    ])
  }

  function updateDocument(id: string, patch: Partial<EditorDocument>) {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  function removeDocument(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  function handleSave() {
    if (sourceType === 'SALES' && !salesOrderId) {
      toast.error('Select a Sales Order first')
      return
    }
    if (sourceType === 'DEMO' && !demoRequestId) {
      toast.error('Select a Demo Request first')
      return
    }
    if (!storeManager) {
      toast.error('Store Manager is required')
      return
    }
    if (lines.length === 0) {
      toast.error('Add at least one line item')
      return
    }

    const so = sourceType === 'SALES' ? selectedSO : undefined
    if (sourceType === 'SALES' && !so) {
      toast.error('Sales Order not found')
      return
    }
    const dr = sourceType === 'DEMO' ? selectedDemo : undefined
    if (sourceType === 'DEMO' && !dr) {
      toast.error('Demo Request not found')
      return
    }

    const ids = existing ?? { id: '', dispatchNumber: '' }
    const { id, dispatchNumber } = isEditMode
      ? { id: ids.id, dispatchNumber: ids.dispatchNumber }
      : nextDispatchNumber()

    // Demo dispatches reuse salesOrderNumber as the visible source label.
    const sourceHeader = so
      ? {
          salesOrderId: so.id,
          salesOrderNumber: so.orderNumber,
          accountId: so.accountId,
          accountName: so.accountName,
        }
      : {
          salesOrderId: '',
          salesOrderNumber: dr!.demoNumber,
          accountId: dr!.accountId,
          accountName: dr!.accountName,
        }

    const next: Dispatch = {
      id,
      dispatchNumber,
      dispatchType: sourceType,
      ...sourceHeader,
      shippingAddress: shippingAddress || dr?.shippingAddress || undefined,
      status,
      externalTicketNumber: externalTicketNumber || undefined,
      externalSystem: externalSystem || undefined,
      storeManager,
      billingPerson: billingPerson || undefined,
      createdBy: existing?.createdBy ?? storeManager,
      assemblyStartedAt: existing?.assemblyStartedAt,
      assemblyCompletedAt: existing?.assemblyCompletedAt,
      billingCompletedAt: existing?.billingCompletedAt,
      dispatchedAt: existing?.dispatchedAt,
      deliveredAt: existing?.deliveredAt,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: notes || undefined,
      invoiceAmount: invoiceAmount ? Number(invoiceAmount) : undefined,
      lineItems: [
        ...lines.map(editorToDispatchLine),
        // Emit BOM components as ADDED dispatch lines tied back to the parent.
        ...lines.flatMap((line) => {
          const components = bomState[line.id]
          if (!components) return []
          return components.map<DispatchLineItem>((c) => {
            const serials = parseSerials(c.serialNumbers ?? '')
            return {
              id: `${line.id}-${c.bomItemId}`,
              soLineItemId: line.soLineItemId,
              variantId: c.variantId,
              condition: c.condition,
              variantSku: c.variantSku,
              partId: c.partId,
              partName: c.partName,
              partSku: c.partSku,
              category: line.category,
              brand: line.brand,
              action: 'ADDED' as DispatchAction,
              plannedQty: 0,
              fittedQty: c.qty,
              serialNumbers: serials.length > 0 ? serials : undefined,
              rate: c.rate,
              amount: c.qty * c.rate,
              notes: c.rackLocation ? `Pick from ${c.rackLocation}` : undefined,
            }
          })
        }),
        // Emit components the user removed from the BOM as REMOVED dispatch
        // lines. The rack picked at remove-time is recorded in notes so the
        // warehouse team knows where the leftover part should be returned.
        ...lines.flatMap((line) => {
          const removed = removedBomComponents[line.id]
          if (!removed) return []
          return removed.map<DispatchLineItem>((c) => ({
            id: `${line.id}-${c.bomItemId}-removed`,
            soLineItemId: line.soLineItemId,
            variantId: c.variantId,
            condition: c.condition,
            variantSku: c.variantSku,
            partId: c.partId,
            partName: c.partName,
            partSku: c.partSku,
            category: line.category,
            brand: line.brand,
            action: 'REMOVED' as DispatchAction,
            plannedQty: c.qty,
            fittedQty: 0,
            rate: 0,
            amount: 0,
            notes: c.rackLocation ? `Returned to ${c.rackLocation}` : undefined,
          }))
        }),
      ],
      documents: documents.map((d) => editorToDispatchDoc(d, storeManager)),
    }

    upsertDispatch(next)
    toast.success(
      isEditMode
        ? `Saved ${dispatchNumber} · ${lines.length} lines`
        : `Created ${dispatchNumber} · ${lines.length} lines`,
    )
    navigate(`/wms/dispatches/${id}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const fittedTotal = lines.reduce((sum, l) => sum + l.fittedQty * l.rate, 0)

  const nextNumbers = !isEditMode ? nextDispatchNumber() : null

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={isEditMode ? `Edit ${existing!.dispatchNumber}` : 'Create Dispatch Request'}
        subtitle="Record what was actually fitted against the SO plan. Required fields are marked with an asterisk (*)."
        breadcrumbs={[
          { label: 'WMS' },
          { label: 'Dispatches', href: '/wms/dispatches' },
          { label: isEditMode ? existing!.dispatchNumber : 'New' },
        ]}
        backHref="/wms/dispatches"
        actions={
          nextNumbers ? (
            <div className="hidden sm:flex flex-col items-end gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Dispatch #
              </span>
              <span className="font-mono text-sm font-semibold">{nextNumbers.dispatchNumber}</span>
            </div>
          ) : null
        }
      />

      {/* 1. Dispatch Info */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={1}
            title="Dispatch Info"
            description="Pick what this dispatch ships against. Lines will auto-populate from the chosen source."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Source-type tile selector */}
          <div className="space-y-2">
            <FieldLabel required>Type</FieldLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {DISPATCH_SOURCE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const selected = sourceType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSourceTypeChange(opt.value)}
                    aria-pressed={selected}
                    className={cn(
                      'relative flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40',
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <Icon className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')} />
                      {selected && <Check className="size-3.5 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-[13px] font-semibold leading-tight', selected ? 'text-primary' : 'text-foreground')}>
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

          {/* Conditional source picker — grouped in a contextual sub-section */}
          <div className="rounded-lg border border-dashed bg-muted/20 p-3 space-y-3">
            {sourceType === 'SALES' && (
              <div className="space-y-2">
                <FieldLabel required>Sales Order</FieldLabel>
                <Select value={salesOrderId || undefined} onValueChange={handleSOChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a Sales Order…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {salesOrders.map((so) => (
                      <SelectItem key={so.id} value={so.id}>
                        <span className="flex w-full min-w-0 items-center gap-2">
                          <span className="font-mono text-[12px] shrink-0">{so.orderNumber}</span>
                          <span className="truncate text-muted-foreground">
                            {so.accountName}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSO && (
                  <p className="text-xs text-muted-foreground">
                    Planned: {selectedSO.lineItems.length} line{selectedSO.lineItems.length === 1 ? '' : 's'} ·{' '}
                    <Link to={`/crm/sales-orders/${selectedSO.id}`} className="wms-link">
                      View SO &rarr;
                    </Link>
                  </p>
                )}
              </div>
            )}

            {sourceType === 'RENTAL' && (
              <div className="space-y-2">
                <FieldLabel required>Sales Order (Rental)</FieldLabel>
                <Select
                  value={rentalSalesOrderId || undefined}
                  onValueChange={(v) => setRentalSalesOrderId(v ?? '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a Sales Order…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {salesOrders.map((so) => (
                      <SelectItem key={so.id} value={so.id}>
                        <span className="flex w-full min-w-0 items-center gap-2">
                          <span className="font-mono text-[12px] shrink-0">{so.orderNumber}</span>
                          <span className="truncate text-muted-foreground">
                            {so.accountName}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sourceType === 'DEMO' && (
              <div className="space-y-2">
                <FieldLabel required>Demo Request</FieldLabel>
                <Select value={demoRequestId || undefined} onValueChange={handleDemoChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a Demo Request…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {demoRequests.map((dr) => (
                      <SelectItem key={dr.id} value={dr.id}>
                        <span className="flex w-full min-w-0 items-center gap-2">
                          <span className="font-mono text-[12px] shrink-0">{dr.demoNumber}</span>
                          <span className="truncate text-muted-foreground">{dr.accountName}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDemo && (
                  <p className="text-xs text-muted-foreground">
                    Planned: {selectedDemo.items.length} item
                    {selectedDemo.items.length === 1 ? '' : 's'} ·{' '}
                    {selectedDemo.items.reduce((n, i) => n + i.qty, 0)} unit
                    {selectedDemo.items.reduce((n, i) => n + i.qty, 0) === 1 ? '' : 's'}
                    {selectedDemo.expectedReturnDate
                      ? ` · expected return ${selectedDemo.expectedReturnDate}`
                      : ''}
                  </p>
                )}
              </div>
            )}

            {sourceType === 'INTERNAL_TRANSFER' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel required>Employee Name</FieldLabel>
                  <Input
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="e.g. Ravi Kumar"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Employee Email</FieldLabel>
                  <Input
                    type="email"
                    value={employeeEmail}
                    onChange={(e) => setEmployeeEmail(e.target.value)}
                    placeholder="name@company.com"
                  />
                </div>
              </div>
            )}

            {sourceType === 'RETURN_REPLACEMENT' && (
              <div className="space-y-2">
                <FieldLabel required>Replacement Request</FieldLabel>
                <Select
                  value={replacementRequestId || undefined}
                  onValueChange={(v) => setReplacementRequestId(v ?? '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a Replacement Request…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {mockReplacementRequests.map((rr) => (
                      <SelectItem key={rr.id} value={rr.id}>
                        <span className="flex w-full min-w-0 items-center gap-2">
                          <span className="font-mono text-[12px] shrink-0">{rr.requestNumber}</span>
                          <span className="truncate text-muted-foreground">
                            {rr.customer} · {rr.originalPartName}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. External ticket + billing metadata */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={2}
            title="External Ticket &amp; Billing"
            description="Link the third-party ticket, store + billing owners, and shipping address."
          />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <FieldLabel>External Ticket #</FieldLabel>
              <div className="relative">
                <Ticket className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="FD-TKT-12345"
                  value={externalTicketNumber}
                  onChange={(e) => setExternalTicketNumber(e.target.value)}
                  className="pl-9 font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>External System</FieldLabel>
              <Input
                placeholder="Freshdesk / Zendesk / …"
                value={externalSystem}
                onChange={(e) => setExternalSystem(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel required>Store Manager</FieldLabel>
              <Input
                placeholder="Name"
                value={storeManager}
                onChange={(e) => setStoreManager(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Billing Person</FieldLabel>
              <Input
                placeholder="Name"
                value={billingPerson}
                onChange={(e) => setBillingPerson(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Invoice Amount (₹)</FieldLabel>
              <Input
                type="number"
                placeholder="0"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Status</FieldLabel>
              <Select value={status} onValueChange={(v) => setStatus((v ?? 'Draft') as DispatchRequestStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISPATCH_REQUEST_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-3">
              <FieldLabel>Shipping Address</FieldLabel>
              <Input
                placeholder="Street, city, pincode"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Line items editor */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={3}
            title="Line Items"
            description="Auto-populated from the source above. Adjust qty if needed; lines you don't ship can be removed."
            trailing={
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {lines.length} line{lines.length === 1 ? '' : 's'}
              </span>
            }
          />
        </CardHeader>
        <CardContent className="p-0 border-t">
          {lines.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <ClipboardList className="mx-auto mb-2 size-6" />
              {sourceType === 'DEMO'
                ? 'Select a Demo Request above to auto-fill lines.'
                : 'Select a Sales Order above to auto-fill lines.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Variant</th>
                    <th className="px-3 py-2 text-left font-medium">Serial Number</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="w-10 px-1 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line) => {
                    const bom = findBOMForLine(line)
                    const expanded = !!bomExpanded[line.id]
                    const components = bomState[line.id]
                    return (
                      <LineEditorRow
                        key={line.id}
                        line={line}
                        bomName={bom?.name}
                        bomExpanded={expanded}
                        bomComponentCount={components?.length}
                        onToggleBom={bom ? () => toggleBomExpansion(line) : undefined}
                        onChange={(patch) => updateLine(line.id, patch)}
                        onRemove={() => removeLine(line.id)}
                      >
                        {expanded && bom && components && (
                          <BomBreakdown
                            lineId={line.id}
                            bomName={bom.name}
                            bomNumber={bom.bomNumber}
                            components={components}
                            removedComponents={removedBomComponents[line.id] ?? []}
                            onAddComponent={(input) => addBomComponent(line.id, input)}
                            onRemoveAddedComponent={(bomItemId) =>
                              removeBomComponent(line.id, bomItemId)
                            }
                            onRecordRemoval={(input) =>
                              recordRemovedBomComponent(line.id, input)
                            }
                            onUndoRemoval={(bomItemId) =>
                              undoRemovedBomComponent(line.id, bomItemId)
                            }
                          />
                        )}
                      </LineEditorRow>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Documents editor */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={4}
            title="Documents"
            description="Drop the right file into each slot once billing is done."
            trailing={
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {documents.length} attached
              </span>
            }
          />
        </CardHeader>
        <CardContent className="p-0 border-t">
          <div className="divide-y">
            {DOC_TYPE_OPTIONS.map((t) => (
              <DocTypeSlot
                key={t}
                type={t}
                hint={DOC_TYPE_HINTS[t] ?? ''}
                docs={documents.filter((d) => d.type === t)}
                onAddFiles={addDocumentsFromFiles}
                onUpdate={updateDocument}
                onRemove={removeDocument}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 5. Notes */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={5}
            title="Notes"
            description="Optional. Assembly team notes, customer acknowledgements, special instructions."
          />
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Additional notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Sticky footer */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 border-t bg-background/95 px-4 sm:px-6 py-3 backdrop-blur-sm">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            <span>
              Fitted value:{' '}
              <span className="font-medium text-foreground tabular-nums">
                ₹{fittedTotal.toLocaleString('en-IN')}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goBack}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="mr-1 size-4" />
              {isEditMode ? 'Save Changes' : 'Create Dispatch Request'}
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}

function LineEditorRow({
  line,
  onChange,
  onRemove,
  bomName,
  bomExpanded,
  bomComponentCount,
  onToggleBom,
  children,
}: {
  line: EditorLine
  onChange: (patch: Partial<EditorLine>) => void
  onRemove: () => void
  bomName?: string
  bomExpanded?: boolean
  bomComponentCount?: number
  onToggleBom?: () => void
  children?: React.ReactNode
}) {
  return (
    <>
    <tr>
      <td className="px-3 py-2">
        <div className="text-sm font-medium">{line.partName}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">{line.variantSku}</span>
          <Badge variant="outline" className="text-[10px]">{line.condition}</Badge>
        </div>
        {onToggleBom && bomName && (
          <button
            type="button"
            onClick={onToggleBom}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium wms-link-btn"
          >
            {bomExpanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            <Package2 className="size-3" />
            {bomExpanded ? 'Hide BOM' : 'View BOM'} · {bomName}
            {bomComponentCount ? (
              <Badge variant="outline" className="ml-1 text-[10px]">
                {bomComponentCount} component{bomComponentCount === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </button>
        )}
      </td>
      <td className="px-3 py-2">
        {line.serialNumbersText.trim() ? (
          <span className="font-mono text-xs text-foreground">
            {line.serialNumbersText}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          className="h-8 w-16 ml-auto text-right text-xs"
          value={line.fittedQty}
          onChange={(e) => onChange({ fittedQty: Number(e.target.value) || 0 })}
        />
      </td>
      <td className="px-1 py-2">
        <Button variant="ghost" size="icon-sm" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <XIcon className="size-4" />
        </Button>
      </td>
    </tr>
    {children && (
      <tr>
        <td colSpan={4} className="bg-muted/20 p-0">
          {children}
        </td>
      </tr>
    )}
    </>
  )
}

function BomBreakdown({
  lineId,
  bomName,
  bomNumber,
  components,
  removedComponents,
  onAddComponent,
  onRemoveAddedComponent,
  onRecordRemoval,
  onUndoRemoval,
}: {
  lineId: string
  bomName: string
  bomNumber: string
  components: BomComponentState[]
  removedComponents: BomComponentState[]
  onAddComponent: (input: {
    partNumber: string
    partName?: string
    partId?: string
    variantId?: string
    variantSku?: string
    condition?: VariantCondition
    serialNumber: string
    qty: number
  }) => void
  onRemoveAddedComponent: (bomItemId: string) => void
  onRecordRemoval: (input: {
    partNumber: string
    partName?: string
    partId?: string
    variantId?: string
    variantSku?: string
    condition?: VariantCondition
    serialNumber: string
    qty: number
    rack: string
    bin: string
  }) => void
  onUndoRemoval: (bomItemId: string) => void
}) {
  const locationOptions = useMemo(() => {
    const out: Array<{ id: string; label: string; bins: { id: string; name: string }[] }> = []
    for (const wh of mockWarehouses) {
      for (const row of wh.rows) {
        for (const rack of row.racks) {
          out.push({
            id: `${wh.id}/${row.id}/${rack.id}`,
            label: `${wh.name} · ${row.name} · ${rack.name}`,
            bins: rack.bins.map((b) => ({ id: b.id, name: b.name })),
          })
        }
      }
    }
    return out
  }, [])

  const [addPartNumber, setAddPartNumber] = useState('')
  const [addSerialNumber, setAddSerialNumber] = useState('')
  const [addQty, setAddQty] = useState('')

  const [removePartNumber, setRemovePartNumber] = useState('')
  const [removeSerialNumber, setRemoveSerialNumber] = useState('')
  const [removeQty, setRemoveQty] = useState('')
  const [removeLocationId, setRemoveLocationId] = useState('')
  const [removeBinId, setRemoveBinId] = useState('')

  const selectedLocation = locationOptions.find((l) => l.id === removeLocationId)

  function submitAdd() {
    if (!addPartNumber.trim()) return
    const opt = PART_OPTIONS.find((o) => o.value === addPartNumber)
    onAddComponent({
      partNumber: opt?.partSku ?? addPartNumber.trim(),
      partName: opt?.partName,
      partId: opt?.partId,
      variantId: opt?.variantId,
      variantSku: opt?.variantSku,
      condition: opt?.condition,
      serialNumber: addSerialNumber.trim(),
      qty: Number(addQty) || 0,
    })
    setAddPartNumber('')
    setAddSerialNumber('')
    setAddQty('')
  }

  function submitRemove() {
    if (!removePartNumber.trim()) return
    const opt = PART_OPTIONS.find((o) => o.value === removePartNumber)
    const loc = locationOptions.find((l) => l.id === removeLocationId)
    const bin = loc?.bins.find((b) => b.id === removeBinId)
    onRecordRemoval({
      partNumber: opt?.partSku ?? removePartNumber.trim(),
      partName: opt?.partName,
      partId: opt?.partId,
      variantId: opt?.variantId,
      variantSku: opt?.variantSku,
      condition: opt?.condition,
      serialNumber: removeSerialNumber.trim(),
      qty: Number(removeQty) || 0,
      rack: loc?.label ?? '',
      bin: bin?.name ?? '',
    })
    setRemovePartNumber('')
    setRemoveSerialNumber('')
    setRemoveQty('')
    setRemoveLocationId('')
    setRemoveBinId('')
  }

  const canSubmitRemove =
    removePartNumber.trim().length > 0 && !!removeLocationId && !!removeBinId

  return (
    <div className="border-t bg-muted/30 px-4 py-4 space-y-3">
      {/* BOM identifier strip */}
      <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
        <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Layers className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-foreground">{bomName}</div>
          <div className="text-[11px] text-muted-foreground">
            <span className="font-mono">{bomNumber}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <Badge variant="outline" className="border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Plus className="mr-0.5 size-2.5" />
            {components.length} added
          </Badge>
          <Badge variant="outline" className="border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <Minus className="mr-0.5 size-2.5" />
            {removedComponents.length} removed
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {/* ── Add Card (left) ─────────────────────────────────── */}
        <Card className="overflow-hidden border-emerald-200/70 dark:border-emerald-900/40">
          <CardHeader className="border-b bg-emerald-50/60 px-3 py-2 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <Plus className="size-3.5" />
                </span>
                <CardTitle className="text-[13px] leading-tight">Add Components</CardTitle>
              </div>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {components.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-3 py-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_90px]">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium">Part Number</Label>
                <SearchSelect
                  value={addPartNumber}
                  onChange={setAddPartNumber}
                  options={PART_OPTIONS}
                  placeholder="Search part number…"
                  searchPlaceholder="Search by SKU, name, brand…"
                  emptyText="No matching parts."
                  triggerClassName="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium">Serial Number</Label>
                <Input
                  placeholder="e.g. SN-AB1234"
                  className="h-9 font-mono text-xs"
                  value={addSerialNumber}
                  onChange={(e) => setAddSerialNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium">Qty</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  className="h-9 text-xs"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={submitAdd}
                disabled={!addPartNumber.trim()}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus className="mr-1 size-3.5" />
                Save Add
              </Button>
            </div>

            <div className="overflow-hidden rounded-md border bg-background">
              {components.length === 0 ? (
                <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
                  <Plus className="size-4 text-muted-foreground/50" />
                  <p className="text-[11px] text-muted-foreground">No components added yet</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-1.5 text-left font-medium">Part Number</th>
                      <th className="px-3 py-1.5 text-left font-medium">Serial Number</th>
                      <th className="w-16 px-3 py-1.5 text-right font-medium">Qty</th>
                      <th className="w-9 px-1 py-1.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {components.map((c) => (
                      <tr key={`${lineId}-${c.bomItemId}`} className="hover:bg-muted/30">
                        <td className="px-3 py-1.5 font-medium">{c.partName}</td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">
                          {c.serialNumbers || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{c.qty}</td>
                        <td className="px-1 py-1.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onRemoveAddedComponent(c.bomItemId)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete added row"
                          >
                            <XIcon className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Remove Card (right) ─────────────────────────────── */}
        <Card className="overflow-hidden border-rose-200/70 dark:border-rose-900/40">
          <CardHeader className="border-b bg-rose-50/60 px-3 py-2 dark:bg-rose-950/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300">
                  <Minus className="size-3.5" />
                </span>
                <CardTitle className="text-[13px] leading-tight">Remove Components</CardTitle>
              </div>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {removedComponents.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-3 py-3">
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_80px]">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Part Number</Label>
                  <SearchSelect
                    value={removePartNumber}
                    onChange={setRemovePartNumber}
                    options={PART_OPTIONS}
                    placeholder="Search part number…"
                    searchPlaceholder="Search by SKU, name, brand…"
                    emptyText="No matching parts."
                    triggerClassName="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Serial Number</Label>
                  <Input
                    placeholder="e.g. SN-AB1234"
                    className="h-9 font-mono text-xs"
                    value={removeSerialNumber}
                    onChange={(e) => setRemoveSerialNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    className="h-9 text-xs"
                    value={removeQty}
                    onChange={(e) => setRemoveQty(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Location</Label>
                  <Select
                    value={removeLocationId || undefined}
                    onValueChange={(v) => {
                      setRemoveLocationId(v ?? '')
                      setRemoveBinId('')
                    }}
                  >
                    <SelectTrigger className="h-9 w-full text-xs">
                      <SelectValue placeholder="Pick warehouse · row · rack" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {locationOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Bin</Label>
                  <Select
                    value={removeBinId || undefined}
                    onValueChange={(v) => setRemoveBinId(v ?? '')}
                    disabled={!selectedLocation}
                  >
                    <SelectTrigger className="h-9 w-full text-xs">
                      <SelectValue
                        placeholder={selectedLocation ? 'Pick bin' : 'Select location first'}
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {selectedLocation?.bins.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={submitRemove}
                disabled={!canSubmitRemove}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                <Minus className="mr-1 size-3.5" />
                Save Remove
              </Button>
            </div>

            <div className="overflow-hidden rounded-md border bg-background">
              {removedComponents.length === 0 ? (
                <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
                  <Minus className="size-4 text-muted-foreground/50" />
                  <p className="text-[11px] text-muted-foreground">No components removed yet</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-1.5 text-left font-medium">Part Number</th>
                      <th className="px-3 py-1.5 text-left font-medium">Serial Number</th>
                      <th className="w-14 px-3 py-1.5 text-right font-medium">Qty</th>
                      <th className="px-3 py-1.5 text-left font-medium">Location · Bin</th>
                      <th className="w-9 px-1 py-1.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {removedComponents.map((c) => (
                      <tr key={`${lineId}-rm-${c.bomItemId}`} className="hover:bg-muted/30">
                        <td className="px-3 py-1.5 font-medium">{c.partName}</td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">
                          {c.serialNumbers || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{c.qty}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {c.rackLocation ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" />
                              {c.rackLocation}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-1 py-1.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onUndoRemoval(c.bomItemId)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete removed row"
                          >
                            <XIcon className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches.',
  triggerClassName,
}: {
  value: string
  onChange: (v: string) => void
  options: ComboOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const selected = options.find((o) => o.value === value)

  // Position the floating dropdown below the trigger using viewport coords.
  // Recomputes on open, scroll, and resize so the panel stays anchored.
  useLayoutEffect(() => {
    if (!open) return
    function update() {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    const raf = requestAnimationFrame(update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return
    function onDocPointerDown(e: PointerEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (popupRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointerDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        className={cn('w-full justify-between font-normal', triggerClassName)}
        onClick={() => {
          setPos(null)
          setOpen((o) => !o)
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              'truncate text-left',
              !selected && 'text-muted-foreground',
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          {selected?.trailing && (
            <Badge
              variant="outline"
              className="ml-auto shrink-0 px-1.5 py-0 text-[10px] font-medium"
            >
              {selected.trailing}
            </Badge>
          )}
        </span>
        <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
      </Button>
      {open && pos &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              minWidth: 260,
              zIndex: 50,
            }}
            className="overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            <Command>
              <CommandInput placeholder={searchPlaceholder} />
              <CommandList>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((o) => (
                    <CommandItem
                      key={o.value}
                      value={o.value}
                      keywords={o.keywords ?? [o.label, o.subtitle ?? '']}
                      onSelect={() => {
                        onChange(o.value)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 size-3.5 shrink-0',
                          value === o.value ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{o.label}</div>
                        {o.subtitle && (
                          <div className="truncate text-xs text-muted-foreground">{o.subtitle}</div>
                        )}
                      </div>
                      {o.trailing && (
                        <Badge
                          variant="outline"
                          className="ml-2 shrink-0 px-1.5 py-0 text-[10px] font-medium"
                        >
                          {o.trailing}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>,
          document.body,
        )}
    </>
  )
}

export default DispatchFormPage
