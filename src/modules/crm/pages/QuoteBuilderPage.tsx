import { useState, useMemo, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Package,
  FileText,
  Cpu,
  Check,
  X,
  ArrowLeftRight,
  Info,
  Search,
  Tag,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EntityHeader } from '../components/EntityHeader'
import { TotalsSection } from '../components/TotalsSection'
import { PartPickerDialog } from '../components/PartPickerDialog'
import { SwapComponentDialog } from '../components/SwapComponentDialog'
import type { PartPickerResult } from '../components/PartPickerDialog'
import type { SwapResult } from '../components/SwapComponentDialog'
import { accounts } from '../data/accounts'
import { mockBOMs } from '@/modules/wms/data/boms'
import type { BOMItem } from '@/modules/wms/types'

// ── Types ──

type LineItemType = 'ims_part' | 'description'
type BOMComponentAction = 'INCLUDE' | 'EXCLUDE' | 'SWAP'

interface BOMComponentConfig {
  bomItemId: string
  partId: string
  partName: string
  partSku: string
  quantity: number
  position?: string
  isOptional: boolean
  action: BOMComponentAction
  /** For SWAP: the replacement part */
  swapPartId?: string
  swapPartName?: string
  swapPartSku?: string
  notes?: string
}

type AdditionalComponentType = 'ims_part' | 'description'

interface AdditionalComponent {
  id: string
  type: AdditionalComponentType
  partId?: string
  partName: string
  partSku?: string
  description: string
  quantity: number
  rate: number
}

interface QuoteBuilderLineItem {
  id: string
  type: LineItemType
  // IMS Part fields
  partId?: string
  partName?: string
  partSku?: string
  category?: string
  brand?: string
  variantType?: string  // 'New' | 'Refurbished' | 'New Pool'
  bomId?: string
  bomName?: string
  // Description-based fields
  itemName?: string
  itemDescription?: string
  // Common fields
  qty: number
  rate: number
  // BOM configuration
  bomComponents: BOMComponentConfig[]
  additionalComponents: AdditionalComponent[]
  configNotes?: string
  /** UI state */
  isBomExpanded: boolean
}

// ── Helpers ──

function genId(prefix = 'qb'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function fmt(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Build BOM component configs from a BOM's items */
function buildBomConfigs(bomItems: BOMItem[]): BOMComponentConfig[] {
  return bomItems.map((item) => ({
    bomItemId: item.id,
    partId: item.partId,
    partName: item.partName,
    partSku: item.partSku,
    quantity: item.quantity,
    position: item.position,
    isOptional: item.isOptional,
    action: 'INCLUDE' as BOMComponentAction,
    notes: item.notes,
  }))
}

function createEmptyLineItem(): QuoteBuilderLineItem {
  return {
    id: genId(),
    type: 'description',
    qty: 1,
    rate: 0,
    bomComponents: [],
    additionalComponents: [],
    isBomExpanded: false,
  }
}

/** Parts that have an active assembly BOM */
const partsWithBOM = mockBOMs
  .filter((b) => b.type === 'ASSEMBLY' && b.status === 'Active')
  .map((b) => ({
    bomId: b.id,
    bomName: b.name,
    partId: b.parentPartId,
    partName: b.parentPartName,
    partSku: b.parentPartSku,
    items: b.items,
  }))


// ── Main Component ──

function QuoteBuilderPage() {
  const navigate = useNavigate()

  const [quoteNumber] = useState(`Q-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`)
  const [accountId, setAccountId] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [discount, setDiscount] = useState(0)

  const [lineItems, setLineItems] = useState<QuoteBuilderLineItem[]>([createEmptyLineItem()])

  // ── Dialog state ──
  const [partPickerOpen, setPartPickerOpen] = useState(false)
  const [partPickerTarget, setPartPickerTarget] = useState<{ lineItemId: string; mode: 'main' | 'additional'; additionalCompId?: string } | null>(null)
  const [swapDialogOpen, setSwapDialogOpen] = useState(false)
  const [swapTarget, setSwapTarget] = useState<{ lineItemId: string; bomItemId: string; currentPartId: string; currentPartName: string; substituteIds: string[] } | null>(null)

  // ── Line Item CRUD ──

  function updateLineItem(id: string, updates: Partial<QuoteBuilderLineItem>) {
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, ...updates } : li)))
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, createEmptyLineItem()])
  }

  function removeLineItem(id: string) {
    if (lineItems.length <= 1) return
    setLineItems((prev) => prev.filter((li) => li.id !== id))
  }

  function switchLineItemType(id: string, type: LineItemType) {
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === id
          ? {
              ...li,
              type,
              // Reset fields when switching
              partId: undefined,
              partName: undefined,
              partSku: undefined,
              category: undefined,
              brand: undefined,
              bomId: undefined,
              bomName: undefined,
              itemName: undefined,
              itemDescription: undefined,
              bomComponents: [],
              additionalComponents: [],
              isBomExpanded: false,
              rate: 0,
            }
          : li
      )
    )
  }

  function openPartPicker(lineItemId: string, mode: 'main' | 'additional' = 'main', additionalCompId?: string) {
    setPartPickerTarget({ lineItemId, mode, additionalCompId })
    setPartPickerOpen(true)
  }

  function handlePartPickerSelect(result: PartPickerResult) {
    if (!partPickerTarget) return

    if (partPickerTarget.mode === 'main') {
      // Main line item part selection
      const bom = partsWithBOM.find((b) => b.partId === result.partId)

      updateLineItem(partPickerTarget.lineItemId, {
        partId: result.partId,
        partName: result.partName,
        partSku: result.partSku,
        category: result.category,
        brand: result.brand,
        variantType: result.variantType,
        rate: result.unitPrice,
        bomId: bom?.bomId,
        bomName: bom?.bomName,
        bomComponents: bom ? buildBomConfigs(bom.items) : [],
        additionalComponents: [],
        isBomExpanded: false,
      })
    } else if (partPickerTarget.mode === 'additional' && partPickerTarget.additionalCompId) {
      // Additional component selection
      updateAdditionalComponent(partPickerTarget.lineItemId, partPickerTarget.additionalCompId, {
        partId: result.partId,
        partName: result.partName,
        partSku: result.partSku,
        rate: result.unitPrice,
      })
    }

    setPartPickerTarget(null)
  }

  function openSwapDialog(lineItemId: string, bomItemId: string, currentPartId: string, currentPartName: string, substituteIds: string[]) {
    setSwapTarget({ lineItemId, bomItemId, currentPartId, currentPartName, substituteIds })
    setSwapDialogOpen(true)
  }

  function handleSwapSelect(result: SwapResult) {
    if (!swapTarget) return

    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== swapTarget.lineItemId) return li
        return {
          ...li,
          bomComponents: li.bomComponents.map((c) =>
            c.bomItemId === swapTarget.bomItemId
              ? {
                  ...c,
                  action: 'SWAP' as BOMComponentAction,
                  swapPartId: result.partId,
                  swapPartName: result.partName,
                  swapPartSku: result.partSku,
                }
              : c
          ),
        }
      })
    )

    setSwapTarget(null)
  }

  // ── BOM Component Actions ──

  function toggleBomComponent(lineItemId: string, bomItemId: string) {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== lineItemId) return li
        return {
          ...li,
          bomComponents: li.bomComponents.map((c) =>
            c.bomItemId === bomItemId
              ? { ...c, action: c.action === 'INCLUDE' ? 'EXCLUDE' : 'INCLUDE' }
              : c
          ),
        }
      })
    )
  }

  function updateComponentQuantity(lineItemId: string, bomItemId: string, qty: number) {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== lineItemId) return li
        return {
          ...li,
          bomComponents: li.bomComponents.map((c) =>
            c.bomItemId === bomItemId ? { ...c, quantity: qty } : c
          ),
        }
      })
    )
  }

  function resetSwap(lineItemId: string, bomItemId: string) {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== lineItemId) return li
        return {
          ...li,
          bomComponents: li.bomComponents.map((c) =>
            c.bomItemId === bomItemId
              ? { ...c, action: 'INCLUDE', swapPartId: undefined, swapPartName: undefined, swapPartSku: undefined }
              : c
          ),
        }
      })
    )
  }

  // ── Additional Components ──

  function addAdditionalComponent(lineItemId: string, type: AdditionalComponentType = 'ims_part') {
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === lineItemId
          ? {
              ...li,
              additionalComponents: [
                ...li.additionalComponents,
                { id: genId('add'), type, partName: '', description: '', quantity: 1, rate: 0 },
              ],
            }
          : li
      )
    )
  }

  function updateAdditionalComponent(
    lineItemId: string,
    compId: string,
    updates: Partial<AdditionalComponent>
  ) {
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === lineItemId
          ? {
              ...li,
              additionalComponents: li.additionalComponents.map((c) =>
                c.id === compId ? { ...c, ...updates } : c
              ),
            }
          : li
      )
    )
  }

  function removeAdditionalComponent(lineItemId: string, compId: string) {
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === lineItemId
          ? { ...li, additionalComponents: li.additionalComponents.filter((c) => c.id !== compId) }
          : li
      )
    )
  }

  // ── Totals ──

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0),
    [lineItems]
  )

  // ── Actions ──

  function handleSaveDraft() {
    if (!accountId) return
    toast.success('Quote saved as draft')
    navigate('/crm/quotes')
  }

  function handleSendQuote() {
    if (!accountId) return
    toast.success('Quote sent successfully')
    navigate('/crm/quotes')
  }

  // ── Summary counts per line item ──

  function getConfigSummary(li: QuoteBuilderLineItem) {
    const excluded = li.bomComponents.filter((c) => c.action === 'EXCLUDE').length
    const swapped = li.bomComponents.filter((c) => c.action === 'SWAP').length
    const added = li.additionalComponents.length
    return { excluded, swapped, added, hasChanges: excluded > 0 || swapped > 0 || added > 0 }
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title="Quote Builder"
        subtitle="Build quotes with BOM component configuration"
        backHref="/crm/quotes"
      />

      <Card>
        <CardHeader>
          <CardTitle>New Quote</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Header Fields */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Quote Number</Label>
                <Input value={quoteNumber} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-ui">
                  Account <span className="text-destructive">*</span>
                </Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-ui">Valid Until</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">Status</Label>
                <Input value="Draft" readOnly className="bg-muted/50" />
              </div>
            </div>
          </div>

          {/* ── Line Items ── */}
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Line Items
            </h3>

            <div className="space-y-4">
              {lineItems.map((li, idx) => {
                const bom = li.bomId ? partsWithBOM.find((b) => b.bomId === li.bomId) : null
                const configSummary = getConfigSummary(li)
                const amount = li.qty * li.rate

                return (
                  <Fragment key={li.id}>
                    <Card className="border-l-4 border-l-primary/20">
                      <CardContent className="space-y-4 pt-4">
                        {/* Row 1: Type toggle + item selector + qty + rate + amount + remove */}
                        <div className="flex items-start gap-3">
                          {/* Line number */}
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {idx + 1}
                          </div>

                          {/* Type toggle */}
                          <div className="flex shrink-0 rounded-lg border p-0.5">
                            <button
                              type="button"
                              onClick={() => switchLineItemType(li.id, 'ims_part')}
                              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                li.type === 'ims_part'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <Package className="size-3.5" />
                              IMS Part
                            </button>
                            <button
                              type="button"
                              onClick={() => switchLineItemType(li.id, 'description')}
                              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                li.type === 'description'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <FileText className="size-3.5" />
                              Description
                            </button>
                          </div>

                          {/* Item selector / description fields */}
                          <div className="min-w-0 flex-1 space-y-2">
                            {li.type === 'ims_part' ? (
                              <div className="space-y-2">
                                {li.partId ? (
                                  <button
                                    type="button"
                                    onClick={() => openPartPicker(li.id, 'main')}
                                    className="flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/50"
                                  >
                                    <Package className="size-4 shrink-0 text-primary" />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium">{li.partName}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {li.partSku} &middot; {li.brand}
                                      </div>
                                    </div>
                                    {li.variantType && (
                                      <Badge
                                        className={`shrink-0 text-[10px] ${
                                          li.variantType === 'New'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : li.variantType === 'Refurbished'
                                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                        }`}
                                      >
                                        <Tag className="mr-1 size-3" />
                                        {li.variantType}
                                      </Badge>
                                    )}
                                    <Search className="size-3.5 shrink-0 text-muted-foreground" />
                                  </button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2 font-normal text-muted-foreground"
                                    onClick={() => openPartPicker(li.id, 'main')}
                                  >
                                    <Search className="size-4" />
                                    Search and select part from IMS...
                                  </Button>
                                )}

                                {li.partId && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{li.partSku}</Badge>
                                    <Badge variant="secondary">{li.category}</Badge>
                                    {li.bomId && (
                                      <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                        <Cpu className="mr-1 size-3" />
                                        Has BOM
                                      </Badge>
                                    )}
                                    {configSummary.hasChanges && (
                                      <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                        {configSummary.excluded > 0 && `${configSummary.excluded} removed`}
                                        {configSummary.excluded > 0 && configSummary.swapped > 0 && ', '}
                                        {configSummary.swapped > 0 && `${configSummary.swapped} swapped`}
                                        {(configSummary.excluded > 0 || configSummary.swapped > 0) &&
                                          configSummary.added > 0 &&
                                          ', '}
                                        {configSummary.added > 0 && `${configSummary.added} added`}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Input
                                  placeholder="Item name (e.g. Custom Server Config, Installation Service)"
                                  value={li.itemName ?? ''}
                                  onChange={(e) => updateLineItem(li.id, { itemName: e.target.value })}
                                />
                                <Input
                                  placeholder="Description (specs, notes, details...)"
                                  value={li.itemDescription ?? ''}
                                  onChange={(e) =>
                                    updateLineItem(li.id, { itemDescription: e.target.value })
                                  }
                                />
                              </div>
                            )}
                          </div>

                          {/* Qty / Rate / Amount */}
                          <div className="flex shrink-0 items-start gap-2">
                            <div className="w-20">
                              <Label className="text-xs text-muted-foreground">Qty</Label>
                              <Input
                                type="number"
                                min={1}
                                className="text-right"
                                value={li.qty}
                                onChange={(e) =>
                                  updateLineItem(li.id, { qty: Number(e.target.value) || 1 })
                                }
                              />
                            </div>
                            <div className="w-28">
                              <Label className="text-xs text-muted-foreground">Rate</Label>
                              <Input
                                type="number"
                                min={0}
                                className="text-right"
                                value={li.rate}
                                onChange={(e) =>
                                  updateLineItem(li.id, { rate: Number(e.target.value) || 0 })
                                }
                              />
                            </div>
                            <div className="w-32 pt-5 text-right">
                              <span className="text-sm font-semibold tabular-nums">
                                &#8377;{fmt(amount)}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="mt-5 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLineItem(li.id)}
                              disabled={lineItems.length <= 1}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>

                        {/* BOM Configuration Toggle */}
                        {li.type === 'ims_part' && li.bomId && bom && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                updateLineItem(li.id, { isBomExpanded: !li.isBomExpanded })
                              }
                              className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                            >
                              {li.isBomExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                              <Cpu className="size-4" />
                              Configure Components
                              <span className="text-xs font-normal">
                                ({li.bomComponents.length} components in {bom.bomName})
                              </span>
                              {configSummary.hasChanges && (
                                <Badge
                                  variant="outline"
                                  className="ml-auto border-amber-300 text-amber-600"
                                >
                                  Customized
                                </Badge>
                              )}
                            </button>

                            {/* ── Expanded BOM Panel ── */}
                            {li.isBomExpanded && (
                              <div className="ml-10 space-y-3 rounded-lg border bg-muted/30 p-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold">
                                    BOM Components &mdash; {bom.bomName}
                                  </h4>
                                  <span className="text-xs text-muted-foreground">
                                    Uncheck to remove, use swap to replace
                                  </span>
                                </div>

                                {/* Standard BOM Components */}
                                <div className="overflow-x-auto rounded-lg border bg-background">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b bg-muted/50">
                                        <th className="w-10 px-3 py-2" />
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                          Component
                                        </th>
                                        <th className="w-24 px-3 py-2 text-left font-medium text-muted-foreground">
                                          SKU
                                        </th>
                                        <th className="w-28 px-3 py-2 text-left font-medium text-muted-foreground">
                                          Position
                                        </th>
                                        <th className="w-16 px-3 py-2 text-center font-medium text-muted-foreground">
                                          Qty
                                        </th>
                                        <th className="w-24 px-3 py-2 text-center font-medium text-muted-foreground">
                                          Status
                                        </th>
                                        <th className="w-20 px-3 py-2" />
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {li.bomComponents.map((comp) => {
                                        const bomItem = bom.items.find(
                                          (i) => i.id === comp.bomItemId
                                        )
                                        const substitutes = bomItem?.substitutePartIds ?? []

                                        return (
                                          <tr
                                            key={comp.bomItemId}
                                            className={`border-b last:border-b-0 transition-colors ${
                                              comp.action === 'EXCLUDE'
                                                ? 'bg-red-50/50 dark:bg-red-950/20'
                                                : comp.action === 'SWAP'
                                                  ? 'bg-blue-50/50 dark:bg-blue-950/20'
                                                  : ''
                                            }`}
                                          >
                                            {/* Checkbox */}
                                            <td className="px-3 py-2 text-center">
                                              {comp.isOptional || true ? (
                                                <Checkbox
                                                  checked={comp.action !== 'EXCLUDE'}
                                                  onCheckedChange={() =>
                                                    toggleBomComponent(li.id, comp.bomItemId)
                                                  }
                                                />
                                              ) : (
                                                <Check className="mx-auto size-4 text-green-600" />
                                              )}
                                            </td>

                                            {/* Component name */}
                                            <td className="px-3 py-2">
                                              <div className="space-y-0.5">
                                                <div
                                                  className={`font-medium ${comp.action === 'EXCLUDE' ? 'line-through text-muted-foreground' : ''}`}
                                                >
                                                  {comp.action === 'SWAP'
                                                    ? comp.swapPartName
                                                    : comp.partName}
                                                </div>
                                                {comp.action === 'SWAP' && (
                                                  <div className="flex items-center gap-1 text-xs text-blue-600">
                                                    <ArrowLeftRight className="size-3" />
                                                    Replaces: {comp.partName}
                                                  </div>
                                                )}
                                                {comp.isOptional && (
                                                  <span className="text-xs text-muted-foreground">
                                                    Optional
                                                  </span>
                                                )}
                                                {comp.notes && (
                                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Info className="size-3" />
                                                    {comp.notes}
                                                  </div>
                                                )}
                                              </div>
                                            </td>

                                            {/* SKU */}
                                            <td className="px-3 py-2 text-xs text-muted-foreground">
                                              {comp.action === 'SWAP'
                                                ? comp.swapPartSku
                                                : comp.partSku}
                                            </td>

                                            {/* Position */}
                                            <td className="px-3 py-2 text-xs text-muted-foreground">
                                              {comp.position ?? '—'}
                                            </td>

                                            {/* Quantity */}
                                            <td className="px-3 py-2">
                                              <Input
                                                type="number"
                                                min={1}
                                                className="h-7 w-14 text-center text-xs"
                                                value={comp.quantity}
                                                disabled={comp.action === 'EXCLUDE'}
                                                onChange={(e) =>
                                                  updateComponentQuantity(
                                                    li.id,
                                                    comp.bomItemId,
                                                    Number(e.target.value) || 1
                                                  )
                                                }
                                              />
                                            </td>

                                            {/* Status badge */}
                                            <td className="px-3 py-2 text-center">
                                              {comp.action === 'EXCLUDE' && (
                                                <Badge
                                                  variant="outline"
                                                  className="border-red-300 text-red-600"
                                                >
                                                  <X className="mr-1 size-3" />
                                                  Removed
                                                </Badge>
                                              )}
                                              {comp.action === 'SWAP' && (
                                                <Badge
                                                  variant="outline"
                                                  className="border-blue-300 text-blue-600"
                                                >
                                                  <ArrowLeftRight className="mr-1 size-3" />
                                                  Swapped
                                                </Badge>
                                              )}
                                              {comp.action === 'INCLUDE' && (
                                                <Badge
                                                  variant="outline"
                                                  className="border-green-300 text-green-600"
                                                >
                                                  <Check className="mr-1 size-3" />
                                                  Included
                                                </Badge>
                                              )}
                                            </td>

                                            {/* Swap action */}
                                            <td className="px-3 py-2">
                                              {comp.action !== 'EXCLUDE' && (
                                                <>
                                                  {comp.action === 'SWAP' ? (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 text-xs"
                                                      onClick={() =>
                                                        resetSwap(li.id, comp.bomItemId)
                                                      }
                                                    >
                                                      Reset
                                                    </Button>
                                                  ) : (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-7 text-xs"
                                                      onClick={() =>
                                                        openSwapDialog(
                                                          li.id,
                                                          comp.bomItemId,
                                                          comp.partId,
                                                          comp.partName,
                                                          substitutes
                                                        )
                                                      }
                                                    >
                                                      <ArrowLeftRight className="mr-1 size-3" />
                                                      Swap
                                                    </Button>
                                                  )}
                                                </>
                                              )}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Additional Components (customer wants to ADD) */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Additional Components (Add to BOM)
                                    </h5>
                                    <div className="flex gap-1.5">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => addAdditionalComponent(li.id, 'ims_part')}
                                      >
                                        <Package className="mr-1 size-3" />
                                        From IMS
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => addAdditionalComponent(li.id, 'description')}
                                      >
                                        <FileText className="mr-1 size-3" />
                                        Description
                                      </Button>
                                    </div>
                                  </div>

                                  {li.additionalComponents.length > 0 && (
                                    <div className="space-y-2">
                                      {li.additionalComponents.map((ac) => (
                                        <div
                                          key={ac.id}
                                          className="flex items-start gap-2 rounded-lg border bg-background p-2"
                                        >
                                          {/* Type indicator */}
                                          <div className="mt-1 shrink-0">
                                            {ac.type === 'ims_part' ? (
                                              <Package className="size-3.5 text-primary" />
                                            ) : (
                                              <FileText className="size-3.5 text-muted-foreground" />
                                            )}
                                          </div>

                                          {/* Component details */}
                                          <div className="min-w-0 flex-1 space-y-1.5">
                                            {ac.type === 'ims_part' ? (
                                              ac.partId ? (
                                                <button
                                                  type="button"
                                                  onClick={() => openPartPicker(li.id, 'additional', ac.id)}
                                                  className="flex h-8 w-full items-center gap-2 rounded-md border bg-background px-2 text-left text-xs transition-colors hover:bg-muted/50"
                                                >
                                                  <Package className="size-3 shrink-0 text-primary" />
                                                  <span className="flex-1 truncate font-medium">{ac.partName}</span>
                                                  <span className="shrink-0 text-muted-foreground">{ac.partSku}</span>
                                                  <Search className="size-3 shrink-0 text-muted-foreground" />
                                                </button>
                                              ) : (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-8 w-full justify-start gap-1.5 text-xs font-normal text-muted-foreground"
                                                  onClick={() => openPartPicker(li.id, 'additional', ac.id)}
                                                >
                                                  <Search className="size-3" />
                                                  Search component...
                                                </Button>
                                              )
                                            ) : (
                                              <Input
                                                className="h-8 text-xs"
                                                placeholder="Component name (e.g. Extra SSD, GPU Card, Custom Cable)"
                                                value={ac.partName}
                                                onChange={(e) =>
                                                  updateAdditionalComponent(li.id, ac.id, {
                                                    partName: e.target.value,
                                                  })
                                                }
                                              />
                                            )}
                                            <Input
                                              className="h-8 text-xs"
                                              placeholder={ac.type === 'ims_part' ? 'Notes...' : 'Description / specs...'}
                                              value={ac.description}
                                              onChange={(e) =>
                                                updateAdditionalComponent(li.id, ac.id, {
                                                  description: e.target.value,
                                                })
                                              }
                                            />
                                          </div>

                                          {/* Qty */}
                                          <div className="w-16 shrink-0">
                                            <Label className="text-[10px] text-muted-foreground">Qty</Label>
                                            <Input
                                              type="number"
                                              min={1}
                                              className="h-8 text-center text-xs"
                                              value={ac.quantity}
                                              onChange={(e) =>
                                                updateAdditionalComponent(li.id, ac.id, {
                                                  quantity: Number(e.target.value) || 1,
                                                })
                                              }
                                            />
                                          </div>

                                          {/* Rate */}
                                          <div className="w-24 shrink-0">
                                            <Label className="text-[10px] text-muted-foreground">Rate</Label>
                                            <Input
                                              type="number"
                                              min={0}
                                              className="h-8 text-right text-xs"
                                              value={ac.rate}
                                              onChange={(e) =>
                                                updateAdditionalComponent(li.id, ac.id, {
                                                  rate: Number(e.target.value) || 0,
                                                })
                                              }
                                            />
                                          </div>

                                          {/* Remove */}
                                          <button
                                            type="button"
                                            className="mt-5 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => removeAdditionalComponent(li.id, ac.id)}
                                          >
                                            <Trash2 className="size-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {li.additionalComponents.length === 0 && (
                                    <p className="py-2 text-center text-xs text-muted-foreground">
                                      No additional components. Use &quot;From IMS&quot; to pick from
                                      inventory, or &quot;Description&quot; for items not in the system.
                                    </p>
                                  )}
                                </div>

                                {/* Config notes */}
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-muted-foreground">
                                    Configuration Notes
                                  </Label>
                                  <Input
                                    placeholder="e.g., Customer requested 256GB RAM total, add GPU for ML workload"
                                    value={li.configNotes ?? ''}
                                    onChange={(e) =>
                                      updateLineItem(li.id, { configNotes: e.target.value })
                                    }
                                    className="text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Fragment>
                )
              })}
            </div>

            <Button variant="outline" size="sm" className="mt-4" onClick={addLineItem}>
              <Plus className="mr-1.5 size-4" />
              Add Line Item
            </Button>
          </div>

          {/* Totals */}
          <TotalsSection subtotal={subtotal} discount={discount} onDiscountChange={setDiscount} />

          {/* Terms & Notes */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-ui">Terms &amp; Conditions</Label>
              <Textarea
                placeholder="Enter terms and conditions..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-ui">Notes</Label>
              <Textarea
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/crm/quotes')}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={!accountId}>
            Save Draft
          </Button>
          <Button onClick={handleSendQuote} disabled={!accountId}>
            Send Quote
          </Button>
        </CardFooter>
      </Card>

      {/* ── Dialogs ── */}
      <PartPickerDialog
        open={partPickerOpen}
        onOpenChange={setPartPickerOpen}
        onSelect={handlePartPickerSelect}
        title={partPickerTarget?.mode === 'additional' ? 'Add Component' : 'Select Part'}
      />

      {swapTarget && (
        <SwapComponentDialog
          open={swapDialogOpen}
          onOpenChange={setSwapDialogOpen}
          onSwap={handleSwapSelect}
          currentPartId={swapTarget.currentPartId}
          currentPartName={swapTarget.currentPartName}
          suggestedSubstituteIds={swapTarget.substituteIds}
        />
      )}
    </div>
  )
}

export { QuoteBuilderPage }
export default QuoteBuilderPage
