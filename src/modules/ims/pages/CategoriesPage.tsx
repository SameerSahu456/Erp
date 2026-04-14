import { useMemo, useState } from 'react'
import { ChevronRight, FolderTree } from 'lucide-react'

import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { IMSCategory } from '../types'
import { mockCategories } from '../data/categories'
import { mockStockItems } from '../data/stock-items'

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function CategoryNode({
  category,
  selectedId,
  onSelect,
  depth = 0,
}: {
  category: IMSCategory
  selectedId: string | null
  onSelect: (id: string) => void
  depth?: number
}) {
  const [open, setOpen] = useState(false)
  const hasSubs = category.subcategories && category.subcategories.length > 0
  const isSelected = selectedId === category.id

  return (
    <div>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors',
            isSelected && 'bg-muted font-medium',
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onSelect(category.id)}
        >
          {hasSubs ? (
            <CollapsibleTrigger
              className="flex size-5 items-center justify-center rounded hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(!open)
              }}
            >
              <ChevronRight
                className={cn(
                  'size-3.5 transition-transform',
                  open && 'rotate-90',
                )}
              />
            </CollapsibleTrigger>
          ) : (
            <span className="size-5" />
          )}
          <FolderTree className="size-4 text-muted-foreground" />
          <span className="flex-1">{category.name}</span>
          <StatusBadge variant="neutral">{category.partCount}</StatusBadge>
        </div>

        {hasSubs && (
          <CollapsibleContent>
            {category.subcategories!.map((sub) => (
              <CategoryNode
                key={sub.id}
                category={sub}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}

export default function CategoriesPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    if (!selectedCategoryId) return mockStockItems
    // Match on categoryId or subcategory names
    const selectedCat = mockCategories.find((c) => c.id === selectedCategoryId)
    const subCat = mockCategories
      .flatMap((c) => c.subcategories ?? [])
      .find((s) => s.id === selectedCategoryId)

    if (subCat) {
      // Filter by subcategory name
      return mockStockItems.filter(
        (item) => item.subcategory === subCat.name
      )
    }
    if (selectedCat) {
      return mockStockItems.filter(
        (item) => item.categoryId === selectedCat.id
      )
    }
    return mockStockItems
  }, [selectedCategoryId])

  const tab: TabConfig = {
    id: 'items',
    label: `Stock Items (${filteredItems.length})`,
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'sku', label: 'SKU', sortable: true },
      { key: 'brand', label: 'Brand', sortable: true },
      { key: 'totalQty', label: 'Total Qty', sortable: true, align: 'right' },
      { key: 'totalValue', label: 'Total Value', sortable: true, align: 'right' },
    ],
    data: filteredItems.map((item) => {
      const totalQty = item.variants.reduce((s, v) => s + v.quantity, 0)
      const totalValue = item.variants.reduce(
        (s, v) => s + v.quantity * v.unitPrice,
        0
      )
      return {
        name: item.name,
        sku: item.sku,
        brand: item.brand,
        totalQty,
        totalValue,
      }
    }),
  }

  const cellFormatter: CellFormatter = (value, key) => {
    if (key === 'totalValue' && typeof value === 'number') {
      return { display: currencyFmt.format(value) }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Categories
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Category tree */}
        <div className="rounded-lg border p-2">
          <p className="mb-2 px-2 text-xs font-medium uppercase text-muted-foreground">
            Category Tree
          </p>
          {mockCategories.map((cat) => (
            <CategoryNode
              key={cat.id}
              category={cat}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          ))}
        </div>

        {/* Stock items table */}
        <BusinessMetricsTable
          tabs={[tab]}
          cellFormatter={cellFormatter}
        />
      </div>
    </div>
  )
}
