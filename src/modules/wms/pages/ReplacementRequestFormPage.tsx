import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle2,
  PackageCheck,
  ArrowRight,
  IndianRupee,
  Truck,
  ChevronsUpDown,
  Check,
  Ticket,
  Search,
  Plus,
  Trash2,
  Package,
} from 'lucide-react'

import {
  mockReplacementRequests,
  type ReplacementRequest,
  type ReplacementReason,
  type ReplacementPriority,
  type ReplacementType,
  type ReplacementMode,
  type ReplacementNextStep,
} from '../data/replacement-requests'
import { salesOrders } from '@/modules/crm/data/sales-orders'
import { mockParts } from '@/modules/ims/data/parts'
import type { SalesOrder, SalesOrderLineItem } from '@/modules/crm/types'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PageHeader } from '@/components/page'

function StepHeader({
  step,
  title,
  required,
  description,
  trailing,
}: {
  step: number | string
  title: string
  required?: boolean
  description?: string
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {step}
        </span>
        <div className="min-w-0">
          <CardTitle className="text-[15px] leading-tight">
            {title}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </CardTitle>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {trailing}
    </div>
  )
}

const REASON_OPTIONS: ReplacementReason[] = [
  'DOA',
  'Defective',
  'Wrong Item',
  'Damaged in Transit',
  'Customer Request',
  'Failed Customer QC',
]

const PRIORITY_OPTIONS: ReplacementPriority[] = ['Low', 'Medium', 'High', 'Critical']

const ELIGIBLE_SO_STATUSES: SalesOrder['status'][] = ['Shipped', 'Delivered', 'Ready for Dispatch']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

interface ReplacementLine {
  lineId: string
  partId: string
  partName: string
  partSku: string
  qty: number
  rate: number
}

interface NewRequestForm {
  ticketNumber: string
  salesOrderId: string
  lineItemId: string
  reason: ReplacementReason | ''
  priority: ReplacementPriority
  description: string
  replacementType: ReplacementType | ''
  replacementMode: ReplacementMode
  replacementLines: ReplacementLine[]
}

const EMPTY_FORM: NewRequestForm = {
  ticketNumber: '',
  salesOrderId: '',
  lineItemId: '',
  reason: '',
  priority: 'Medium',
  description: '',
  replacementType: '',
  replacementMode: 'Normal',
  replacementLines: [],
}

function ReplacementRequestFormPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<NewRequestForm>(EMPTY_FORM)
  const [soComboOpen, setSoComboOpen] = useState(false)
  const [lineComboOpen, setLineComboOpen] = useState(false)
  const [partSearchOpen, setPartSearchOpen] = useState(false)

  const eligibleSOs = useMemo(
    () => salesOrders.filter((so) => ELIGIBLE_SO_STATUSES.includes(so.status) && so.lineItems.length > 0),
    [],
  )

  const selectedSO = useMemo(
    () => eligibleSOs.find((so) => so.id === form.salesOrderId),
    [eligibleSOs, form.salesOrderId],
  )

  const selectedLineItem = useMemo<SalesOrderLineItem | undefined>(
    () => selectedSO?.lineItems.find((li) => li.id === form.lineItemId),
    [selectedSO, form.lineItemId],
  )

  const replacementTotal = useMemo(
    () => form.replacementLines.reduce((sum, l) => sum + l.qty * l.rate, 0),
    [form.replacementLines],
  )

  const originalTotal = useMemo(
    () => (selectedLineItem ? selectedLineItem.rate * selectedLineItem.qty : 0),
    [selectedLineItem],
  )

  const totalDelta = useMemo(() => {
    if (form.replacementType !== 'Different Part') return 0
    if (form.replacementLines.length === 0) return 0
    return replacementTotal - originalTotal
  }, [form.replacementType, form.replacementLines.length, replacementTotal, originalTotal])

  const availableParts = useMemo(() => {
    const excludedId = form.replacementType === 'Different Part' ? selectedLineItem?.partId : null
    const addedIds = new Set(form.replacementLines.map((l) => l.partId))
    return mockParts.filter(
      (p) => p.isActive && p.id !== excludedId && !addedIds.has(p.id),
    )
  }, [form.replacementType, form.replacementLines, selectedLineItem])

  const addReplacementPart = (partId: string) => {
    const part = mockParts.find((p) => p.id === partId)
    if (!part || !selectedLineItem) return
    const rate = part.sellPrice ?? selectedLineItem.rate
    setForm((f) => ({
      ...f,
      replacementLines: [
        ...f.replacementLines,
        {
          lineId: `rl-${Date.now()}-${f.replacementLines.length}`,
          partId: part.id,
          partName: part.name,
          partSku: part.sku,
          qty: 1,
          rate,
        },
      ],
    }))
    setPartSearchOpen(false)
  }

  const updateLine = (lineId: string, patch: Partial<ReplacementLine>) => {
    setForm((f) => ({
      ...f,
      replacementLines: f.replacementLines.map((l) =>
        l.lineId === lineId ? { ...l, ...patch } : l,
      ),
    }))
  }

  const removeLine = (lineId: string) => {
    setForm((f) => ({
      ...f,
      replacementLines: f.replacementLines.filter((l) => l.lineId !== lineId),
    }))
  }

  const submitNewRequest = () => {
    if (!form.salesOrderId || !form.lineItemId || !form.reason || !form.replacementType) {
      toast.error('Please fill all required fields.')
      return
    }
    if (!selectedSO || !selectedLineItem) {
      toast.error('Please select a valid Sales Order and line item.')
      return
    }

    let replacementPartId: string
    let replacementPartName: string
    let replacementPartSku: string
    let replacementRate: number
    let replacementQty: number

    if (form.replacementType === 'Same Part') {
      replacementPartId = selectedLineItem.partId
      replacementPartName = selectedLineItem.partName
      replacementPartSku = selectedLineItem.partSku
      replacementRate = selectedLineItem.rate
      replacementQty = selectedLineItem.qty
    } else {
      if (form.replacementLines.length === 0) {
        toast.error('Add at least one replacement part.')
        return
      }
      const invalid = form.replacementLines.find((l) => l.qty <= 0 || l.rate <= 0)
      if (invalid) {
        toast.error('Each replacement line needs a positive qty and rate.')
        return
      }
      const primary = form.replacementLines[0]!
      replacementPartId = primary.partId
      replacementPartName =
        form.replacementLines.length === 1
          ? primary.partName
          : `${primary.partName} +${form.replacementLines.length - 1} more`
      replacementPartSku = primary.partSku
      replacementRate = replacementTotal
      replacementQty = primary.qty
    }

    const priceDelta =
      form.replacementType === 'Same Part' ? 0 : replacementTotal - originalTotal
    const nextStep: ReplacementNextStep =
      form.replacementType === 'Same Part' ? 'Dispatch' : 'Pricing Update'

    const nextSeq = String(mockReplacementRequests.length + 1).padStart(3, '0')
    const newRequest: ReplacementRequest = {
      id: `rpl-${Date.now()}`,
      requestNumber: `RPL-2026-${nextSeq}`,
      ticketNumber: form.ticketNumber.trim() || undefined,
      salesOrderId: selectedSO.id,
      salesOrderNumber: selectedSO.orderNumber,
      customer: selectedSO.accountName,
      lineItemId: selectedLineItem.id,
      originalPartId: selectedLineItem.partId,
      originalPartName: selectedLineItem.partName,
      originalPartSku: selectedLineItem.partSku,
      originalRate: selectedLineItem.rate,
      qty: replacementQty,
      replacementType: form.replacementType,
      replacementMode: form.replacementMode,
      replacementPartId,
      replacementPartName,
      replacementPartSku,
      replacementRate,
      priceDelta,
      nextStep,
      reason: form.reason as ReplacementReason,
      description: form.description.trim() || `${form.reason} on ${selectedLineItem.partName}`,
      priority: form.priority,
      status: 'Pending',
      requestedBy: 'You',
      requestedAt: new Date().toISOString(),
    }
    mockReplacementRequests.unshift(newRequest)
    const routeMsg =
      nextStep === 'Dispatch'
        ? 'Routed to Dispatch (same part).'
        : 'Routed to Pricing Update (different part).'
    toast.success(`${newRequest.requestNumber} created. ${routeMsg}`)
    navigate('/wms/replacements')
  }

  const stepLocked = (n: number) => {
    if (n >= 2 && !selectedSO) return true
    if (n >= 3 && !selectedLineItem) return true
    if (n >= 4 && !form.replacementType) return true
    return false
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Replacement Request"
        subtitle="Raised against a dispatched Sales Order. Same-part replacements ship from stock; different-part replacements amend SO pricing."
        breadcrumbs={[
          { label: 'Warehouse' },
          { label: 'Replacement Requests', href: '/wms/replacements' },
          { label: 'New' },
        ]}
        backHref="/wms/replacements"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/wms/replacements')}>
              Cancel
            </Button>
            <Button onClick={submitNewRequest}>Create Request</Button>
          </div>
        }
      />

      {/* Step 1 — Sales Order */}
      <Card>
        <CardHeader>
          <StepHeader step={1} title="Sales Order" required />
        </CardHeader>
        <CardContent className="space-y-3">
            <Popover open={soComboOpen} onOpenChange={setSoComboOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    type="button"
                    className="h-10 w-full justify-between font-normal"
                  />
                }
              >
                <span className={cn('truncate', !selectedSO && 'text-muted-foreground')}>
                  {selectedSO ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-mono text-xs">{selectedSO.orderNumber}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate">{selectedSO.accountName}</span>
                    </span>
                  ) : (
                    'Search and select a dispatched SO...'
                  )}
                </span>
                <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[var(--anchor-width)] min-w-[360px] p-0">
                <Command>
                  <CommandInput placeholder="Search by SO #, customer..." />
                  <CommandList>
                    <CommandEmpty>No sales orders found.</CommandEmpty>
                    <CommandGroup>
                      {eligibleSOs.map((so) => (
                        <CommandItem
                          key={so.id}
                          value={`${so.orderNumber} ${so.accountName}`}
                          keywords={[so.orderNumber, so.accountName, so.status]}
                          onSelect={() => {
                            setForm((f) => ({
                              ...f,
                              salesOrderId: so.id,
                              lineItemId: '',
                              replacementType: '',
                              replacementLines: [],
                            }))
                            setSoComboOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-3.5',
                              form.salesOrderId === so.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="font-mono text-xs">{so.orderNumber}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="truncate">{so.accountName}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{so.status}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedSO && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="truncate font-medium">{selectedSO.accountName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SO Total</p>
                  <p className="font-medium">{formatINR(selectedSO.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(selectedSO.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge variant="info" className="mt-0.5">{selectedSO.status}</StatusBadge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Step 2 — Line Item */}
          <Card className={cn(stepLocked(2) && 'pointer-events-none opacity-50')}>
            <CardHeader>
              <StepHeader step={2} title="Line Item to Replace" required />
            </CardHeader>
            <CardContent className="space-y-3">
            <Popover
              open={lineComboOpen}
              onOpenChange={(open) => {
                if (!selectedSO) return
                setLineComboOpen(open)
              }}
            >
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    type="button"
                    disabled={!selectedSO}
                    className="h-10 w-full justify-between font-normal"
                  />
                }
              >
                <span className={cn('truncate', !selectedLineItem && 'text-muted-foreground')}>
                  {selectedLineItem ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="truncate">{selectedLineItem.partName}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {selectedLineItem.partSku}
                      </span>
                    </span>
                  ) : selectedSO ? (
                    'Search and select line item...'
                  ) : (
                    'Pick a Sales Order first'
                  )}
                </span>
                <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[var(--anchor-width)] min-w-[360px] p-0">
                <Command>
                  <CommandInput placeholder="Search by part name, SKU..." />
                  <CommandList>
                    <CommandEmpty>No line items found.</CommandEmpty>
                    <CommandGroup>
                      {selectedSO?.lineItems.map((li) => (
                        <CommandItem
                          key={li.id}
                          value={`${li.partName} ${li.partSku}`}
                          keywords={[li.partName, li.partSku]}
                          onSelect={() => {
                            setForm((f) => ({
                              ...f,
                              lineItemId: li.id,
                              replacementType: '',
                              replacementLines: [],
                            }))
                            setLineComboOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-3.5',
                              form.lineItemId === li.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="truncate">{li.partName}</span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {li.partSku}
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              Qty {li.qty} · {formatINR(li.rate)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedLineItem && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background">
                  <PackageCheck className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{selectedLineItem.partName}</p>
                  <p className="text-xs font-mono text-muted-foreground">{selectedLineItem.partSku}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Qty</p>
                  <p className="font-semibold tabular-nums">{selectedLineItem.qty}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="font-semibold tabular-nums">{formatINR(selectedLineItem.rate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Line Total</p>
                  <p className="font-semibold tabular-nums">{formatINR(selectedLineItem.rate * selectedLineItem.qty)}</p>
                </div>
              </div>
            )}
            </CardContent>
          </Card>

          {/* Step 3 — Replacement Decision */}
          <Card className={cn(stepLocked(3) && 'pointer-events-none opacity-50')}>
            <CardHeader>
              <StepHeader step={3} title="Replacement Decision" required />
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <button
                type="button"
                disabled={!selectedLineItem}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    replacementType: 'Same Part',
                    replacementLines: [],
                  }))
                }
                className={cn(
                  'group relative flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                  form.replacementType === 'Same Part'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                    : 'border-border hover:border-emerald-500/40 hover:bg-muted/40',
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                  <Truck className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Same Part</span>
                    {form.replacementType === 'Same Part' && (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    Same SKU from stock → Dispatch.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={!selectedLineItem}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    replacementType: 'Different Part',
                  }))
                }
                className={cn(
                  'group relative flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                  form.replacementType === 'Different Part'
                    ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20'
                    : 'border-border hover:border-amber-500/40 hover:bg-muted/40',
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                  <IndianRupee className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Different Part</span>
                    {form.replacementType === 'Different Part' && (
                      <CheckCircle2 className="size-4 shrink-0 text-amber-600" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    Different SKU(s) → Pricing Update.
                  </p>
                </div>
              </button>
            </div>
            </CardContent>
          </Card>

          {/* Step 4 — Replacement Parts (only for Different Part) */}
          {form.replacementType === 'Different Part' && selectedLineItem && (
            <Card>
              <CardHeader>
                <StepHeader
                  step={4}
                  title="Replacement Parts"
                  required
                  trailing={
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {form.replacementLines.length} added
                    </span>
                  }
                />
              </CardHeader>
              <CardContent className="space-y-4">
              <Popover open={partSearchOpen} onOpenChange={setPartSearchOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      type="button"
                      className="h-10 w-full justify-start font-normal"
                    />
                  }
                >
                  <Search className="mr-2 size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Search and add a replacement part…
                  </span>
                  <Plus className="ml-auto size-4 text-muted-foreground" />
                </PopoverTrigger>
                <PopoverContent className="w-[var(--anchor-width)] min-w-[420px] p-0">
                  <Command>
                    <CommandInput placeholder="Search by part name, SKU, brand, category..." />
                    <CommandList>
                      <CommandEmpty>No parts found.</CommandEmpty>
                      <CommandGroup>
                        {availableParts.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.name} ${p.sku} ${p.brand} ${p.categoryName}`}
                            keywords={[p.name, p.sku, p.brand, p.categoryName, ...(p.aliases ?? [])]}
                            onSelect={() => addReplacementPart(p.id)}
                          >
                            <Package className="mr-2 size-3.5 text-muted-foreground" />
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="truncate font-medium">{p.name}</span>
                              <span className="text-xs font-mono text-muted-foreground">{p.sku}</span>
                              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                                {p.sellPrice ? formatINR(p.sellPrice) : '—'}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {form.replacementLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 py-10 text-center">
                  <Package className="size-8 text-muted-foreground/60" />
                  <p className="mt-2 text-sm font-medium">No replacement parts added</p>
                  <p className="text-xs text-muted-foreground">
                    Use the search above to find and add one or more parts.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-12 gap-3 bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <div className="col-span-6">Part</div>
                    <div className="col-span-2 text-right">Qty</div>
                    <div className="col-span-2 text-right">Rate (₹)</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>
                  <div className="divide-y">
                    {form.replacementLines.map((line) => (
                      <div key={line.lineId} className="grid grid-cols-12 items-center gap-3 px-3 py-2.5 text-sm">
                        <div className="col-span-6 min-w-0">
                          <p className="truncate font-medium">{line.partName}</p>
                          <p className="text-xs font-mono text-muted-foreground">{line.partSku}</p>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min={1}
                            value={line.qty}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10)
                              updateLine(line.lineId, { qty: Number.isNaN(v) ? 1 : Math.max(1, v) })
                            }}
                            className="h-8 text-right tabular-nums"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min={0}
                            value={line.rate}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value)
                              updateLine(line.lineId, { rate: Number.isNaN(v) ? 0 : v })
                            }}
                            className="h-8 text-right tabular-nums"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <span className="font-semibold tabular-nums">{formatINR(line.qty * line.rate)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => removeLine(line.lineId)}
                            className="size-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-12 items-center gap-3 border-t bg-muted/30 px-3 py-2.5 text-sm">
                    <div className="col-span-10 text-right text-xs uppercase tracking-wide text-muted-foreground">
                      Replacement Total
                    </div>
                    <div className="col-span-2 text-right font-semibold tabular-nums">
                      {formatINR(replacementTotal)}
                    </div>
                  </div>
                </div>
              )}

              {form.replacementLines.length > 0 && (
                <div className="grid grid-cols-3 items-center gap-2 rounded-md border bg-background p-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Original Line</p>
                    <p className="truncate font-medium">{selectedLineItem.partSku}</p>
                    <p className="font-semibold tabular-nums">{formatINR(originalTotal)}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <ArrowRight className="size-4 text-muted-foreground" />
                    <span
                      className={cn(
                        'mt-1 text-xs font-semibold tabular-nums',
                        totalDelta > 0
                          ? 'text-amber-600'
                          : totalDelta < 0
                            ? 'text-emerald-600'
                            : 'text-muted-foreground',
                      )}
                    >
                      {totalDelta > 0 ? '+' : ''}{formatINR(totalDelta)}
                    </span>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Replacement</p>
                    <p className="truncate font-medium">
                      {form.replacementLines.length === 1
                        ? form.replacementLines[0]!.partSku
                        : `${form.replacementLines.length} parts`}
                    </p>
                    <p className="font-semibold tabular-nums">{formatINR(replacementTotal)}</p>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>
          )}

          {/* Step — Replacement Mode */}
          <Card className={cn(stepLocked(4) && 'pointer-events-none opacity-50')}>
            <CardHeader>
              <StepHeader
                step={form.replacementType === 'Different Part' ? 5 : 4}
                title="Replacement Mode"
                required
              />
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <button
                type="button"
                disabled={!form.replacementType}
                onClick={() => setForm((f) => ({ ...f, replacementMode: 'Normal' }))}
                className={cn(
                  'group relative flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                  form.replacementMode === 'Normal'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Normal</span>
                    {form.replacementMode === 'Normal' && (
                      <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    Customer returns first; replacement ships after receipt.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={!form.replacementType}
                onClick={() => setForm((f) => ({ ...f, replacementMode: 'Advance' }))}
                className={cn(
                  'group relative flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                  form.replacementMode === 'Advance'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Advance</span>
                    {form.replacementMode === 'Advance' && (
                      <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    Replacement ships first; customer returns later.
                  </p>
                </div>
              </button>
            </div>
            </CardContent>
          </Card>

          {/* Step — Issue Details */}
          <Card className={cn(stepLocked(4) && 'pointer-events-none opacity-50')}>
            <CardHeader>
              <StepHeader
                step={form.replacementType === 'Different Part' ? 6 : 5}
                title="Issue Details"
              />
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="rr-ticket" className="text-xs">
                  Ticket No <span className="text-muted-foreground">(optional)</span>
                </Label>
                <div className="relative">
                  <Ticket className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="rr-ticket"
                    value={form.ticketNumber}
                    onChange={(e) => setForm((f) => ({ ...f, ticketNumber: e.target.value }))}
                    placeholder="e.g. TKT-2026-0007"
                    className="pl-8 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.reason}
                  onValueChange={(v) => setForm((f) => ({ ...f, reason: v as ReplacementReason }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {REASON_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as ReplacementPriority }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rr-desc" className="text-xs">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="rr-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the issue customer is reporting…"
                rows={3}
              />
            </div>
            </CardContent>
          </Card>
    </div>
  )
}

export default ReplacementRequestFormPage
