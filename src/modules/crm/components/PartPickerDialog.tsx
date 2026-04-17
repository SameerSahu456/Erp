import { useState, useMemo } from 'react'
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
import { mockStockItems } from '@/modules/ims/data/stock-items'
import { mockParts } from '@/modules/ims/data/parts'
import { IMS_CATEGORIES } from '../types'
import type { StockVariant } from '@/modules/wms/types'

// ── Types ──

export type VariantType = StockVariant['type']

export interface PartPickerResult {
  partId: string
  partName: string
  partSku: string
  category: string
  brand: string
  /** Selected variant type */
  variantType: VariantType
  /** Price from selected variant */
  unitPrice: number
  /** Available qty for the variant */
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

// ── Helpers ──

function fmt(n: number): string {
  return n.toLocaleString('en-IN')
}

const VARIANT_COLORS: Record<VariantType, string> = {
  New: 'bg-[#e8fff3] text-[#0b5c22] dark:bg-[#0b5c22]/20 dark:text-[#50cd89]',
  Refurbished: 'bg-[#fff8dd] text-[#b88800] dark:bg-[#b88800]/20 dark:text-[#f6c000]',
  'New Pool': 'bg-[#eef5ff] text-[#0d4b94] dark:bg-[#0d4b94]/20 dark:text-[#3e96ff]',
}

/** Merge stock items with IMS parts to get a unified searchable list */
function buildSearchableItems() {
  // Stock items have variant pricing
  const stockMap = new Map(mockStockItems.map((si) => [si.name.toLowerCase(), si]))

  return mockParts
    .filter((p) => p.isActive)
    .map((part) => {
      const stock = stockMap.get(part.name.toLowerCase()) ??
        mockStockItems.find((si) => si.sku === part.sku)

      return {
        partId: part.id,
        partName: part.name,
        partSku: part.sku,
        category: part.categoryName,
        brand: part.brand,
        aliases: part.aliases ?? [],
        variants: stock?.variants ?? [],
      }
    })
}

const allItems = buildSearchableItems()

// ── Unique categories from actual items ──
const availableCategories = [...new Set(allItems.map((i) => i.category))].sort()

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
  const [selectedItem, setSelectedItem] = useState<(typeof allItems)[number] | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<VariantType | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allItems.filter((item) => {
      // Category filter
      if (selectedCategory && selectedCategory !== 'all' && item.category !== selectedCategory) return false
      // Search
      if (!q) return true
      return (
        item.partName.toLowerCase().includes(q) ||
        item.partSku.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.aliases.some((a) => a.toLowerCase().includes(q))
      )
    })
  }, [search, selectedCategory])

  function handleSelectItem(item: (typeof allItems)[number]) {
    setSelectedItem(item)
    setSelectedVariant(null)
  }

  function handleConfirm() {
    if (!selectedItem) return

    const variant = selectedItem.variants.find((v) => v.type === selectedVariant)

    onSelect({
      partId: selectedItem.partId,
      partName: selectedItem.partName,
      partSku: selectedItem.partSku,
      category: selectedItem.category,
      brand: selectedItem.brand,
      variantType: selectedVariant ?? 'New',
      unitPrice: variant?.unitPrice ?? 0,
      availableQty: variant?.quantity ?? 0,
    })

    // Reset state
    setSearch('')
    setSelectedItem(null)
    setSelectedVariant(null)
    onOpenChange(false)
  }

  function handleClose() {
    setSearch('')
    setSelectedItem(null)
    setSelectedVariant(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Search by name, SKU, or brand. Then pick a variant.</DialogDescription>
        </DialogHeader>

        {/* Search + Category filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search parts by name, SKU, brand..."
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
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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

        {/* Results list */}
        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No parts found. Try a different search or category.
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => {
                const isSelected = selectedItem?.partId === item.partId
                return (
                  <button
                    key={item.partId}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                      isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''
                    }`}
                  >
                    <Package className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.partName}</span>
                        <span className="text-xs text-muted-foreground">{item.partSku}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.brand}</span>
                        <span>&middot;</span>
                        <span>{item.category}</span>
                      </div>
                    </div>
                    {/* Variant tags */}
                    <div className="flex shrink-0 gap-1">
                      {item.variants.map((v) => (
                        <span
                          key={v.type}
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${VARIANT_COLORS[v.type]}`}
                        >
                          {v.type}
                        </span>
                      ))}
                      {item.variants.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">No stock</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Variant selection panel */}
        {selectedItem && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-primary" />
              <span className="text-sm font-semibold">{selectedItem.partName}</span>
              <Badge variant="outline" className="text-xs">
                {selectedItem.partSku}
              </Badge>
            </div>

            {selectedItem.variants.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {selectedItem.variants.map((v) => {
                  const isVarSelected = selectedVariant === v.type
                  const inStockCount = v.skus?.filter((s) => s.status === 'In Stock').length ?? v.quantity
                  return (
                    <button
                      key={v.type}
                      type="button"
                      onClick={() => setSelectedVariant(v.type)}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${
                        isVarSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-background hover:border-muted-foreground/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${VARIANT_COLORS[v.type]}`}
                        >
                          <Tag className="mr-1 size-3" />
                          {v.type}
                        </span>
                        {isVarSelected && (
                          <span className="text-xs font-medium text-primary">Selected</span>
                        )}
                      </div>
                      <div className="mt-2 text-lg font-bold tabular-nums">
                        &#8377;{fmt(v.unitPrice)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Boxes className="size-3" />
                        {inStockCount} in stock ({v.quantity} total)
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No stock variants available. Price can be entered manually.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)}>
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={selectedItem.variants.length > 0 && !selectedVariant}
              >
                {selectedVariant
                  ? `Select ${selectedVariant} @ \u20B9${fmt(
                      selectedItem.variants.find((v) => v.type === selectedVariant)?.unitPrice ?? 0
                    )}`
                  : selectedItem.variants.length > 0
                    ? 'Pick a variant'
                    : 'Select Part'}
              </Button>
            </div>
          </div>
        )}

        {/* Result count */}
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {allItems.length} parts
          {search && ` matching "${search}"`}
        </p>
      </DialogContent>
    </Dialog>
  )
}

export { PartPickerDialog }
