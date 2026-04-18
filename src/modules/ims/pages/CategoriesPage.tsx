import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, FolderTree, Plus, Pencil, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors group',
            isSelected && 'bg-muted font-medium',
            !category.isActive && 'opacity-60',
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
          <span className="flex-1 truncate">{category.name}</span>

          {!category.isActive && (
            <StatusBadge variant="neutral">Inactive</StatusBadge>
          )}

          {category.productManager && (
            <span className="hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
              <User className="size-3" />
              {category.productManager}
            </span>
          )}

          <StatusBadge variant="neutral">{category.partCount}</StatusBadge>

          {/* Edit / Delete actions */}
          <div className="hidden items-center gap-0.5 group-hover:flex">
            <Link
              to={`/ims/categories/${category.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1 hover:bg-muted"
            >
              <Pencil className="size-3.5 text-muted-foreground" />
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toast.success(`Category "${category.name}" deleted`)
              }}
              className="rounded p-1 hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5 text-destructive" />
            </button>
          </div>
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

    // Collect all IDs in a category subtree
    function collectIds(cat: IMSCategory): string[] {
      const ids = [cat.id]
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          ids.push(...collectIds(sub))
        }
      }
      return ids
    }

    // Find category anywhere in the tree
    function findCategory(cats: IMSCategory[], id: string): IMSCategory | undefined {
      for (const cat of cats) {
        if (cat.id === id) return cat
        if (cat.subcategories) {
          const found = findCategory(cat.subcategories, id)
          if (found) return found
        }
      }
      return undefined
    }

    const selected = findCategory(mockCategories, selectedCategoryId)
    if (!selected) return mockStockItems

    const allIds = collectIds(selected)

    // Filter by categoryId match or subcategory name match
    const allNames = (function collectNames(cat: IMSCategory): string[] {
      const names = [cat.name]
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          names.push(...collectNames(sub))
        }
      }
      return names
    })(selected)

    return mockStockItems.filter(
      (item) => allIds.includes(item.categoryId) || allNames.includes(item.subcategory ?? '')
    )
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
      <div className="flex items-center justify-between">
        <h1 className="cpt-page-title">
          Categories
        </h1>
        <Button render={<Link to="/ims/categories/new" />}>
          <Plus className="mr-1.5 size-4" />
          Create Category
        </Button>
      </div>

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
