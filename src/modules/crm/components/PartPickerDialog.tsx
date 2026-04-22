import { useState, useMemo, useEffect } from 'react'
import { Search, Package, Tag, Boxes, X } from 'lucide-react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mockParts } from '@/modules/ims/data/parts'
import { mockVariants } from '@/modules/ims/data/variants'
import type { VariantCondition } from '@/modules/wms/types'

// ── Types ──

/** Kept as an alias — same values as VariantCondition. */
export type VariantType = VariantCondition

/** Canonical return shape: variant-centric, with legacy part-level fields preserved. */
export interface PartPickerResult {
  // Variant-level (canonical)
  variantId: string
  variantSku: string
  condition: VariantCondition
  sellPrice: number
  quantityOnHand: number
  // Part-level (display + backwards-compat)
  partId: string
  partName: string
  partSku: string
  category: string
  brand: string
  // Legacy aliases — same values, here so existing callers keep compiling.
  /** @deprecated use condition */
  variantType: VariantCondition
  /** @deprecated use sellPrice */
  unitPrice: number
  /** @deprecated use quantityOnHand */
  availableQty: number
}

interface PartPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: PartPickerResult) => void
  title?: string
  /** Optionally restrict to certain categories */
  categoryFilter?: string
}

// ── Data shaping ──

interface VariantRow {
  variantId: string
  partId: string
  partName: string
  partSku: string
  variantSku: string
  condition: VariantCondition
  attributes: Record<string, string>
  sellPrice: number
  quantityOnHand: number
  category: string
  brand: string
  aliases: string[]
}

function buildVariantRows(): VariantRow[] {
  const partMap = new Map(mockParts.map((p) => [p.id, p]))
  return mockVariants
    .filter((v) => v.isActive)
    .map((v) => {
      const part = partMap.get(v.partId)
      return {
        variantId: v.id,
        partId: v.partId,
        partName: part?.name ?? v.displayName.replace(/ · [A-Za-z ]+$/, ''),
        partSku: part?.sku ?? v.variantSku,
        variantSku: v.variantSku,
        condition: v.condition,
        attributes: v.attributes,
        sellPrice: v.sellPrice,
        quantityOnHand: v.quantityOnHand ?? 0,
        category: part?.categoryName ?? 'Components',
        brand: part?.brand ?? '',
        aliases: part?.aliases ?? [],
      }
    })
}

const allVariantRows = buildVariantRows()
const availableCategories = [...new Set(allVariantRows.map((r) => r.category))].sort()

// ── Styling ──

const CONDITION_COLORS: Record<VariantCondition, string> = {
  New: 'bg-[#e8fff3] text-[#0b5c22] dark:bg-[#0b5c22]/20 dark:text-[#50cd89]',
  Refurbished: 'bg-[#fff8dd] text-[#b88800] dark:bg-[#b88800]/20 dark:text-[#f6c000]',
  'New Pool': 'bg-[#eef5ff] text-[#0d4b94] dark:bg-[#0d4b94]/20 dark:text-[#3e96ff]',
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN')
}

// ── Component ──

function PartPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Select Part',
  categoryFilter,
}: PartPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFilter ?? 'all')
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)

  // Reset transient state whenever the dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('')
      setSelectedVariantId(null)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allVariantRows.filter((row) => {
      if (selectedCategory !== 'all' && row.category !== selectedCategory) return false
      if (!q) return true
      return (
        row.partName.toLowerCase().includes(q) ||
        row.partSku.toLowerCase().includes(q) ||
        row.variantSku.toLowerCase().includes(q) ||
        row.brand.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.condition.toLowerCase().includes(q) ||
        row.aliases.some((a) => a.toLowerCase().includes(q))
      )
    })
  }, [search, selectedCategory])

  // Group variants under their parent part so the picker lists parts with variants nested
  const grouped = useMemo(() => {
    const map = new Map<string, { partId: string; partName: string; partSku: string; brand: string; category: string; variants: VariantRow[] }>()
    for (const row of filtered) {
      const existing = map.get(row.partId)
      if (existing) {
        existing.variants.push(row)
      } else {
        map.set(row.partId, {
          partId: row.partId,
          partName: row.partName,
          partSku: row.partSku,
          brand: row.brand,
          category: row.category,
          variants: [row],
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.partName.localeCompare(b.partName))
  }, [filtered])

  const selectedVariant = selectedVariantId
    ? allVariantRows.find((r) => r.variantId === selectedVariantId) ?? null
    : null

  function handleConfirm() {
    if (!selectedVariant) return
    onSelect({
      variantId: selectedVariant.variantId,
      variantSku: selectedVariant.variantSku,
      condition: selectedVariant.condition,
      sellPrice: selectedVariant.sellPrice,
      quantityOnHand: selectedVariant.quantityOnHand,
      partId: selectedVariant.partId,
      partName: selectedVariant.partName,
      partSku: selectedVariant.partSku,
      category: selectedVariant.category,
      brand: selectedVariant.brand,
      // Legacy aliases — same underlying values
      variantType: selectedVariant.condition,
      unitPrice: selectedVariant.sellPrice,
      availableQty: selectedVariant.quantityOnHand,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Search by part name, SKU, condition, or brand. Each variant is individually priced.
          </DialogDescription>
        </DialogHeader>

        {/* Search + Category filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search parts, variants, SKU, brand, condition..."
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
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v ?? 'all')}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grouped results */}
        <div className="max-h-96 overflow-y-auto rounded-lg border">
          {grouped.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No variants found. Try a different search or category.
            </p>
          ) : (
            <div className="divide-y">
              {grouped.map((group) => (
                <div key={group.partId} className="p-2">
                  {/* Part header */}
                  <div className="flex items-center gap-2 px-1 py-1">
                    <Package className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium">{group.partName}</span>
                    <span className="text-xs text-muted-foreground">{group.partSku}</span>
                    <span className="text-xs text-muted-foreground">· {group.brand}</span>
                    <span className="text-xs text-muted-foreground">· {group.category}</span>
                  </div>
                  {/* Variants under this part */}
                  <div className="mt-1 space-y-1 pl-6">
                    {group.variants.map((variant) => {
                      const isSelected = selectedVariantId === variant.variantId
                      return (
                        <button
                          key={variant.variantId}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.variantId)}
                          className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${CONDITION_COLORS[variant.condition]}`}
                          >
                            <Tag className="mr-1 size-3" />
                            {variant.condition}
                          </span>
                          <span className="text-xs text-muted-foreground">{variant.variantSku}</span>
                          {Object.entries(variant.attributes).length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </span>
                          )}
                          <div className="flex flex-1 items-center justify-end gap-3 text-xs">
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Boxes className="size-3" />
                              {variant.quantityOnHand} in stock
                            </span>
                            <span className="min-w-[72px] text-right font-semibold tabular-nums text-foreground">
                              &#8377;{fmt(variant.sellPrice)}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selection preview + confirm */}
        {selectedVariant && (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <Package className="size-4 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{selectedVariant.partName}</span>
                <Badge variant="outline" className="text-xs">{selectedVariant.variantSku}</Badge>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${CONDITION_COLORS[selectedVariant.condition]}`}
                >
                  {selectedVariant.condition}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                &#8377;{fmt(selectedVariant.sellPrice)} · {selectedVariant.quantityOnHand} in stock · {selectedVariant.category}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedVariantId(null)}>
                Clear
              </Button>
              <Button size="sm" onClick={handleConfirm}>
                Select variant
              </Button>
            </div>
          </div>
        )}

        {/* Result count */}
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {allVariantRows.length} variants across {grouped.length} parts
          {search && ` matching "${search}"`}
        </p>
      </DialogContent>
    </Dialog>
  )
}

export { PartPickerDialog }
