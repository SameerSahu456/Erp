import { useState, useMemo } from 'react'
import { Search, ArrowLeftRight, Tag, Boxes, X, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { mockBOMs } from '@/modules/wms/data/boms'
import { mockStockItems } from '@/modules/ims/data/stock-items'
import type { StockVariant } from '@/modules/wms/types'

// ── Types ──

export type VariantType = StockVariant['type']

export interface SwapResult {
  partId: string
  partName: string
  partSku: string
  variantType: VariantType
  unitPrice: number
}

interface SwapComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwap: (result: SwapResult) => void
  /** Current component being replaced */
  currentPartId: string
  currentPartName: string
  /** Suggested substitute IDs from BOM */
  suggestedSubstituteIds: string[]
}

// ── Helpers ──

function fmt(n: number): string {
  return n.toLocaleString('en-IN')
}

const VARIANT_COLORS: Record<VariantType, string> = {
  New: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Refurbished: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'New Pool': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}

/** Build component catalog from BOM data + stock items */
function buildComponentCatalog() {
  const components = new Map<
    string,
    { id: string; name: string; sku: string; variants: StockVariant[] }
  >()

  // Collect from all BOMs
  for (const bom of mockBOMs) {
    for (const item of bom.items) {
      if (!components.has(item.partId)) {
        // Try to find stock variant pricing
        const stock = mockStockItems.find(
          (si) => si.sku === item.partSku || si.name.toLowerCase() === item.partName.toLowerCase()
        )
        components.set(item.partId, {
          id: item.partId,
          name: item.partName,
          sku: item.partSku,
          variants: stock?.variants ?? [],
        })
      }
    }
  }

  return components
}

const componentCatalog = buildComponentCatalog()

// ── Component ──

function SwapComponentDialog({
  open,
  onOpenChange,
  onSwap,
  currentPartId,
  currentPartName,
  suggestedSubstituteIds,
}: SwapComponentDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<VariantType | null>(null)

  // Split into suggested and other compatible parts
  const { suggested, others } = useMemo(() => {
    const suggested: { id: string; name: string; sku: string; variants: StockVariant[] }[] = []
    const others: { id: string; name: string; sku: string; variants: StockVariant[] }[] = []

    const q = search.toLowerCase().trim()

    for (const [id, comp] of componentCatalog) {
      if (id === currentPartId) continue // Skip the current part

      const matchesSearch =
        !q ||
        comp.name.toLowerCase().includes(q) ||
        comp.sku.toLowerCase().includes(q)

      if (!matchesSearch) continue

      if (suggestedSubstituteIds.includes(id)) {
        suggested.push(comp)
      } else {
        others.push(comp)
      }
    }

    return { suggested, others }
  }, [search, currentPartId, suggestedSubstituteIds])

  const selectedPart = selectedPartId ? componentCatalog.get(selectedPartId) : null

  function handleConfirm() {
    if (!selectedPart) return

    const variant = selectedPart.variants.find((v) => v.type === selectedVariant)

    onSwap({
      partId: selectedPart.id,
      partName: selectedPart.name,
      partSku: selectedPart.sku,
      variantType: selectedVariant ?? 'New',
      unitPrice: variant?.unitPrice ?? 0,
    })

    setSearch('')
    setSelectedPartId(null)
    setSelectedVariant(null)
    onOpenChange(false)
  }

  function handleClose() {
    setSearch('')
    setSelectedPartId(null)
    setSelectedVariant(null)
    onOpenChange(false)
  }

  function renderPartRow(
    comp: { id: string; name: string; sku: string; variants: StockVariant[] },
    isSuggested: boolean
  ) {
    const isSelected = selectedPartId === comp.id
    return (
      <button
        key={comp.id}
        type="button"
        onClick={() => {
          setSelectedPartId(comp.id)
          setSelectedVariant(null)
        }}
        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
          isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''
        }`}
      >
        <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{comp.name}</span>
            <span className="text-xs text-muted-foreground">{comp.sku}</span>
            {isSuggested && (
              <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 text-[10px]">
                <Check className="mr-0.5 size-2.5" />
                Recommended
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {comp.variants.map((v) => (
            <span
              key={v.type}
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${VARIANT_COLORS[v.type]}`}
            >
              &#8377;{fmt(v.unitPrice)}
            </span>
          ))}
        </div>
      </button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Swap Component</DialogTitle>
          <DialogDescription>
            Replace <strong>{currentPartName}</strong> with an alternative
          </DialogDescription>
        </DialogHeader>

        {/* Current part indicator */}
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
          <span className="text-muted-foreground">Currently:</span>
          <span className="font-medium">{currentPartName}</span>
          <ArrowLeftRight className="ml-auto size-4 text-muted-foreground" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
          {search && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch('')}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-56 overflow-y-auto rounded-lg border">
          {suggested.length === 0 && others.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No compatible components found.
            </p>
          ) : (
            <div className="divide-y">
              {/* Suggested substitutes first */}
              {suggested.length > 0 && (
                <div>
                  <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Recommended Substitutes
                  </div>
                  {suggested.map((comp) => renderPartRow(comp, true))}
                </div>
              )}
              {/* Other parts */}
              {others.length > 0 && (
                <div>
                  <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Other Components
                  </div>
                  {others.map((comp) => renderPartRow(comp, false))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Variant selection for chosen swap target */}
        {selectedPart && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="text-sm font-semibold">{selectedPart.name}</div>

            {selectedPart.variants.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {selectedPart.variants.map((v) => {
                  const isVarSelected = selectedVariant === v.type
                  return (
                    <button
                      key={v.type}
                      type="button"
                      onClick={() => setSelectedVariant(v.type)}
                      className={`rounded-lg border-2 p-2.5 text-left transition-all ${
                        isVarSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-background hover:border-muted-foreground/20'
                      }`}
                    >
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${VARIANT_COLORS[v.type]}`}
                      >
                        <Tag className="mr-1 size-3" />
                        {v.type}
                      </span>
                      <div className="mt-1.5 text-base font-bold tabular-nums">
                        &#8377;{fmt(v.unitPrice)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Boxes className="size-3" />
                        {v.quantity} avail
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No stock variants. Price will be set manually.</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedPartId(null)}>
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={selectedPart.variants.length > 0 && !selectedVariant}
              >
                {selectedVariant
                  ? `Swap to ${selectedPart.name}`
                  : selectedPart.variants.length > 0
                    ? 'Pick a variant'
                    : 'Confirm Swap'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { SwapComponentDialog }
