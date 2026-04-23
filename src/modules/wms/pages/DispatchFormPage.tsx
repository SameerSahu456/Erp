import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ArrowLeftRight,
  Ticket,
  X as XIcon,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { PartPickerDialog } from '@/modules/crm/components/PartPickerDialog'
import type { PartPickerResult } from '@/modules/crm/components/PartPickerDialog'
import { salesOrders } from '@/modules/crm/data/sales-orders'
import { getVariantById } from '@/modules/ims/data/variants'
import {
  getDispatchById,
  upsertDispatch,
  nextDispatchNumber,
  nextOutwardNumber,
} from '../data/dispatches'
import type {
  Dispatch,
  DispatchAction,
  DispatchRequestStatus,
  DispatchLineItem,
  DispatchDocument,
  DispatchVarianceReason,
  DispatchDocumentType,
  VariantCondition,
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
}

const ACTION_OPTIONS: DispatchAction[] = ['PLANNED', 'FITTED_AS_PLANNED', 'ADDED', 'REMOVED', 'REPLACED']
const REASON_OPTIONS: DispatchVarianceReason[] = [
  'Faulty Part',
  'Damaged on Receipt',
  'Cheaper Alternative',
  'Better Spec Available',
  'Customer Requested Change',
  'Out of Stock',
  'Other',
]
const DOC_TYPE_OPTIONS: DispatchDocumentType[] = [
  'Invoice',
  'E-way Bill',
  'Delivery Challan',
  'Warranty Card',
  'Service Agreement',
  'Other',
]

// Lines needing a variance reason
function needsReason(action: DispatchAction): boolean {
  return action === 'ADDED' || action === 'REMOVED' || action === 'REPLACED'
}

// ── Layout helpers (mirror OutwardFormPage styling) ─────────────────────────

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

function buildPlannedLinesFromSO(salesOrderId: string): EditorLine[] {
  const so = salesOrders.find((o) => o.id === salesOrderId)
  if (!so) return []
  return so.lineItems.map((li) => ({
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
    serialNumbersText: '',
    replacedSerialNumbersText: '',
    notes: '',
    rate: li.rate,
  }))
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
  }
}

function editorToDispatchDoc(d: EditorDocument, uploadedBy: string): DispatchDocument {
  return {
    id: d.id,
    type: d.type,
    documentNumber: d.documentNumber,
    issuedDate: d.issuedDate || undefined,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    notes: d.notes || undefined,
  }
}

function DispatchFormPage() {
  const navigate = useNavigate()
  const goBack = useNavigateBack('/wms/dispatches')
  const { id: editId } = useParams<{ id: string }>()
  const [search] = useSearchParams()
  const initialSO = search.get('so') ?? ''
  const existing = editId ? getDispatchById(editId) : undefined
  const isEditMode = !!existing

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

  // ── Picker state ──
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'add' | 'replace'>('add')
  const [pickerTargetLineId, setPickerTargetLineId] = useState<string | null>(null)

  const selectedSO = useMemo(() => salesOrders.find((o) => o.id === salesOrderId), [salesOrderId])

  function handleSOChange(value: string | null) {
    const next = value ?? ''
    setSalesOrderId(next)
    setLines(next ? buildPlannedLinesFromSO(next) : [])
  }

  function updateLine(id: string, patch: Partial<EditorLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  function openAddPicker() {
    setPickerMode('add')
    setPickerTargetLineId(null)
    setPickerOpen(true)
  }

  function openReplacePicker(lineId: string) {
    setPickerMode('replace')
    setPickerTargetLineId(lineId)
    setPickerOpen(true)
  }

  function handlePickerSelect(result: PartPickerResult) {
    if (pickerMode === 'add') {
      setLines((prev) => [
        ...prev,
        {
          id: genId('EL'),
          variantId: result.variantId,
          condition: result.condition,
          variantSku: result.variantSku,
          partId: result.partId,
          partName: result.partName,
          partSku: result.partSku,
          category: result.category,
          brand: result.brand,
          action: 'ADDED',
          plannedQty: 0,
          fittedQty: 1,
          serialNumbersText: '',
          replacedSerialNumbersText: '',
          notes: '',
          rate: result.sellPrice,
        },
      ])
    } else if (pickerMode === 'replace' && pickerTargetLineId) {
      // Replace: swap the picked variant in as the fitted variant; the original stays as "replaced"
      const target = lines.find((l) => l.id === pickerTargetLineId)
      if (!target) return
      const originalVariant = getVariantById(target.variantId)
      updateLine(pickerTargetLineId, {
        variantId: result.variantId,
        condition: result.condition,
        variantSku: result.variantSku,
        partId: result.partId,
        partName: result.partName,
        partSku: result.partSku,
        category: result.category,
        brand: result.brand,
        action: 'REPLACED',
        rate: result.sellPrice,
        replacedVariantId: target.variantId,
        replacedDisplayName: originalVariant?.displayName ?? `${target.partName} · ${target.condition}`,
      })
    }
    setPickerOpen(false)
  }

  function addDocument() {
    setDocuments((prev) => [
      ...prev,
      { id: genId('DOC'), type: 'Invoice', documentNumber: '', issuedDate: '', notes: '' },
    ])
  }

  function updateDocument(id: string, patch: Partial<EditorDocument>) {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  function removeDocument(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  function handleSave() {
    if (!salesOrderId) {
      toast.error('Select a Sales Order first')
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
    const varianceLines = lines.filter((l) => needsReason(l.action))
    const missingReason = varianceLines.filter((l) => !l.reason)
    if (missingReason.length > 0) {
      toast.error(`${missingReason.length} variance line${missingReason.length === 1 ? '' : 's'} missing a reason`)
      return
    }

    const so = selectedSO
    if (!so) {
      toast.error('Sales Order not found')
      return
    }

    const ids = existing ?? { id: '', dispatchNumber: '' }
    const { id, dispatchNumber } = isEditMode
      ? { id: ids.id, dispatchNumber: ids.dispatchNumber }
      : nextDispatchNumber()

    // Every dispatch request is linked to an outward — allocate one on create if absent.
    const outward = isEditMode
      ? { id: existing?.outwardId, number: existing?.outwardNumber }
      : (() => {
          const n = nextOutwardNumber()
          return { id: n.id, number: n.outwardNumber }
        })()

    const next: Dispatch = {
      id,
      dispatchNumber,
      salesOrderId,
      salesOrderNumber: so.orderNumber,
      outwardId: outward.id,
      outwardNumber: outward.number,
      accountId: so.accountId,
      accountName: so.accountName,
      shippingAddress: shippingAddress || undefined,
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
      lineItems: lines.map(editorToDispatchLine),
      documents: documents.map((d) => editorToDispatchDoc(d, storeManager)),
    }

    upsertDispatch(next)
    const variance = varianceLines.length
    toast.success(
      isEditMode
        ? `Saved ${dispatchNumber} · ${lines.length} lines, ${variance} variance${variance === 1 ? '' : 's'}`
        : `Created ${dispatchNumber} · ${lines.length} lines, ${variance} variance${variance === 1 ? '' : 's'}`,
    )
    navigate(`/wms/dispatches/${id}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const fittedTotal = lines.reduce((sum, l) => sum + l.fittedQty * l.rate, 0)
  const varianceCount = lines.filter((l) => needsReason(l.action)).length

  const nextNumbers = !isEditMode ? nextDispatchNumber() : null

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={goBack}>
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="cpt-page-title">
              {isEditMode ? `Edit ${existing!.dispatchNumber}` : 'New Dispatch Request'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Record what was actually fitted against the SO plan. Required fields are marked with an asterisk (<span className="text-destructive">*</span>).
            </p>
          </div>
        </div>
        {nextNumbers && (
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Dispatch #
            </span>
            <span className="font-mono text-sm font-semibold">{nextNumbers.dispatchNumber}</span>
          </div>
        )}
      </div>

      {/* 1. Source — Sales Order */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={1}
            title="Sales Order"
            description="Pick the SO this dispatch ships against. Lines will auto-populate from the SO plan."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FieldLabel required>Sales Order</FieldLabel>
            <Select value={salesOrderId || undefined} onValueChange={handleSOChange}>
              <SelectTrigger className="h-11 w-full text-sm">
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
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Planned: {selectedSO.lineItems.length} lines ·{' '}
                <Link to={`/crm/sales-orders/${selectedSO.id}`} className="text-primary hover:underline">
                  View SO &rarr;
                </Link>
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

      {/* Variance summary */}
      {varianceCount > 0 && (
        <div className="rounded-lg border border-[#f6c000]/40 bg-[#fff8dd] px-4 py-2 text-xs dark:bg-[#b88800]/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-[#b88800]" />
            <span className="font-medium text-[#604400] dark:text-[#f6c000]">
              {varianceCount} line{varianceCount === 1 ? '' : 's'} have variance vs. SO plan.
              Each needs a reason before save.
            </span>
          </div>
        </div>
      )}

      {/* 3. Line items editor */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={3}
            title="Line Items"
            description="Capture each fitted variant. Flag ADDED / REMOVED / REPLACED and give a reason when it differs from the SO plan."
            trailing={
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {lines.length} line{lines.length === 1 ? '' : 's'}
                </span>
                <Button variant="outline" size="sm" onClick={openAddPicker}>
                  <Plus className="mr-1 size-3.5" />
                  Add line
                </Button>
              </div>
            }
          />
        </CardHeader>
        <CardContent className="p-0 border-t">
          {lines.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <ClipboardList className="mx-auto mb-2 size-6" />
              {salesOrderId
                ? 'No lines yet. Click "Add line" to pick a variant.'
                : 'Select a Sales Order above to auto-fill planned lines.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Variant</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                    <th className="px-3 py-2 text-right font-medium">Planned</th>
                    <th className="px-3 py-2 text-right font-medium">Fitted</th>
                    <th className="px-3 py-2 text-left font-medium">Serials (fitted)</th>
                    <th className="px-3 py-2 text-left font-medium">Reason / Notes</th>
                    <th className="px-3 py-2 text-right font-medium">Rate</th>
                    <th className="w-10 px-1 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line) => (
                    <LineEditorRow
                      key={line.id}
                      line={line}
                      onChange={(patch) => updateLine(line.id, patch)}
                      onRemove={() => removeLine(line.id)}
                      onReplace={() => openReplacePicker(line.id)}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20 font-medium">
                    <td colSpan={6} className="px-3 py-2 text-right">
                      Fitted value:
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      ₹{fittedTotal.toLocaleString('en-IN')}
                    </td>
                    <td />
                  </tr>
                </tfoot>
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
            description="Attach Invoice, E-way Bill, Delivery Challan, etc. once billing is done."
            trailing={
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {documents.length} attached
                </span>
                <Button variant="outline" size="sm" onClick={addDocument}>
                  <Plus className="mr-1 size-3.5" />
                  Attach
                </Button>
              </div>
            }
          />
        </CardHeader>
        <CardContent className="p-0 border-t">
          {documents.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No documents yet. Click “Attach” to add an Invoice, E-way Bill, Delivery Challan, etc.
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => (
                <div key={doc.id} className="grid items-center gap-2 px-4 py-2 md:grid-cols-[140px_1fr_140px_1fr_40px]">
                  <Select value={doc.type} onValueChange={(v) => updateDocument(doc.id, { type: (v ?? 'Invoice') as DispatchDocumentType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Document number"
                    className="font-mono"
                    value={doc.documentNumber}
                    onChange={(e) => updateDocument(doc.id, { documentNumber: e.target.value })}
                  />
                  <Input
                    type="date"
                    value={doc.issuedDate}
                    onChange={(e) => updateDocument(doc.id, { issuedDate: e.target.value })}
                  />
                  <Input
                    placeholder="Notes"
                    value={doc.notes}
                    onChange={(e) => updateDocument(doc.id, { notes: e.target.value })}
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => removeDocument(doc.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
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

      <PartPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
        title={pickerMode === 'add' ? 'Add line item' : 'Pick replacement variant'}
      />

      {/* Sticky footer */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 border-t bg-background/95 px-4 sm:px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {varianceCount > 0 ? (
              <span className="flex items-center gap-1.5 text-[#b88800]">
                <AlertTriangle className="size-3.5" />
                {varianceCount} variance line{varianceCount === 1 ? '' : 's'} need{varianceCount === 1 ? 's' : ''} a reason before save
              </span>
            ) : (
              <span>
                Fitted value:{' '}
                <span className="font-medium text-foreground tabular-nums">
                  ₹{fittedTotal.toLocaleString('en-IN')}
                </span>
              </span>
            )}
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
  onReplace,
}: {
  line: EditorLine
  onChange: (patch: Partial<EditorLine>) => void
  onRemove: () => void
  onReplace: () => void
}) {
  const showReason = needsReason(line.action)
  const isRemoved = line.action === 'REMOVED'

  return (
    <tr className={
      isRemoved ? 'bg-[#fff5f8]/40 dark:bg-[#991930]/10' :
      line.action === 'REPLACED' ? 'bg-[#fff8dd]/40 dark:bg-[#b88800]/10' :
      line.action === 'ADDED' ? 'bg-[#eef5ff]/40 dark:bg-[#0d4b94]/10' : ''
    }>
      <td className="px-3 py-2">
        <div className={`text-sm font-medium ${isRemoved ? 'line-through text-muted-foreground' : ''}`}>
          {line.partName}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">{line.variantSku}</span>
          <Badge variant="outline" className="text-[10px]">{line.condition}</Badge>
        </div>
        {line.action === 'REPLACED' && line.replacedDisplayName && (
          <div className="mt-1 flex items-center gap-1 text-xs text-[#b88800]">
            <ArrowLeftRight className="size-3" />
            Replaces: {line.replacedDisplayName}
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <Select value={line.action} onValueChange={(v) => onChange({ action: (v ?? 'PLANNED') as DispatchAction })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {line.action === 'REPLACED' && (
            <Button variant="ghost" size="icon-sm" onClick={onReplace} title="Pick different replacement">
              <ArrowLeftRight className="size-3.5" />
            </Button>
          )}
          {line.action !== 'REPLACED' && line.soLineItemId && (
            <Button variant="ghost" size="icon-sm" onClick={onReplace} title="Replace with different variant">
              <ArrowLeftRight className="size-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{line.plannedQty || '—'}</td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          className="h-8 w-16 text-right text-xs"
          value={line.fittedQty}
          onChange={(e) => onChange({ fittedQty: Number(e.target.value) || 0 })}
          disabled={isRemoved}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          placeholder="SN-001, SN-002 ..."
          className="h-8 font-mono text-xs"
          value={line.serialNumbersText}
          onChange={(e) => onChange({ serialNumbersText: e.target.value })}
          disabled={isRemoved}
        />
        {parseSerials(line.serialNumbersText).length > 0 && (
          <div className="mt-1 text-[10px] text-muted-foreground">
            {parseSerials(line.serialNumbersText).length} serial{parseSerials(line.serialNumbersText).length === 1 ? '' : 's'}
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        {showReason ? (
          <div className="space-y-1">
            <Select value={line.reason ?? ''} onValueChange={(v) => onChange({ reason: (v ?? undefined) as DispatchVarianceReason | undefined })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Reason..." />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Notes"
              className="h-8 text-xs"
              value={line.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </div>
        ) : (
          <Input
            placeholder="Notes (optional)"
            className="h-8 text-xs"
            value={line.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        )}
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          className="h-8 w-24 text-right text-xs"
          value={line.rate}
          onChange={(e) => onChange({ rate: Number(e.target.value) || 0 })}
        />
      </td>
      <td className="px-1 py-2">
        <Button variant="ghost" size="icon-sm" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <XIcon className="size-4" />
        </Button>
      </td>
    </tr>
  )
}

export default DispatchFormPage
