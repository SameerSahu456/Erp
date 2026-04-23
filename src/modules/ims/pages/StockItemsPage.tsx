import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pencil, GitBranch, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockStockItems } from '../data/stock-items'
import { mockParts } from '../data/parts'
import type { Part, StockItem, VariantCondition } from '@/modules/wms/types'

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function conditionVariant(c: VariantCondition | string | undefined): 'success' | 'info' | 'warning' | 'neutral' {
  if (c === 'New') return 'success'
  if (c === 'Refurbished') return 'info'
  if (c === 'New Pull') return 'warning'
  return 'neutral'
}

function findMatchingPart(
  item: StockItem,
  condition?: VariantCondition,
): Part | undefined {
  const skuTail = item.sku.split('-').pop() ?? ''
  const candidates = mockParts.filter(
    (p) =>
      p.name === item.name ||
      (skuTail && p.sku.includes(skuTail)) ||
      item.sku.includes(p.sku.split('-').pop() ?? ''),
  )
  if (candidates.length === 0) return undefined
  if (condition) {
    const exact = candidates.find((p) => p.condition === condition)
    if (exact) return exact
  }
  const parent = candidates.find((p) => (p.productType ?? 'parent') === 'parent')
  return parent ?? candidates[0]
}

type EditingCell = { itemId: string; variantType: string } | null

// Demo scope: surface the newest HPE DL360 Gen11 + other Servers on page 1.
// Non-Servers keep their original order relative to each other.
const sortedStockItems: StockItem[] = [...mockStockItems].sort((a, b) => {
  const aFeatured = a.id === 'item-016' ? 0 : 1
  const bFeatured = b.id === 'item-016' ? 0 : 1
  if (aFeatured !== bFeatured) return aFeatured - bFeatured
  const aServer = a.categoryName === 'Servers' ? 0 : 1
  const bServer = b.categoryName === 'Servers' ? 0 : 1
  return aServer - bServer
})

export default function StockItemsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<StockItem[]>(sortedStockItems)
  const [editing, setEditing] = useState<EditingCell>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEditing = useCallback((itemId: string, variantType: string, currentPrice: number) => {
    setEditing({ itemId, variantType })
    setEditValue(String(currentPrice))
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const savePrice = useCallback(() => {
    if (!editing) return
    const newPrice = parseFloat(editValue)
    if (isNaN(newPrice) || newPrice <= 0) {
      setEditing(null)
      return
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== editing.itemId) return item
        return {
          ...item,
          variants: item.variants.map((v) =>
            v.type === editing.variantType
              ? { ...v, unitPrice: newPrice, lastUpdated: new Date().toISOString() }
              : v
          ),
        }
      })
    )
    toast.success('Price updated')
    setEditing(null)
  }, [editing, editValue])

  const cancelEditing = useCallback(() => {
    setEditing(null)
  }, [])

  const tab: TabConfig = useMemo(() => {
    return {
      id: 'items',
      label: `Stock Items (${items.length})`,
      columns: [
        { key: 'name', label: 'Part No', sortable: true },
        { key: 'condition', label: 'Condition', sortable: true, filterable: true },
        { key: 'sku', label: 'SKU', sortable: true },
        { key: 'aliases', label: 'Alias' },
        { key: 'category', label: 'Category', sortable: true, filterable: true },
        { key: 'brand', label: 'Brand', sortable: true, filterable: true },
        { key: 'type', label: 'Type', sortable: true, filterable: true },
        { key: 'assembly', label: 'Assembly', sortable: true, filterable: true },
        { key: 'qty', label: 'Qty', sortable: true, align: 'right' },
        { key: 'price', label: 'Price', sortable: true, align: 'right' },
        { key: 'status', label: 'Status', sortable: true, filterable: true },
      ],
      data: items.flatMap((item) => {
        const newV = item.variants.find((v) => v.type === 'New')
        const parentPart = findMatchingPart(item)
        const parentRow = {
          id: item.id,
          name: item.name,
          sku: item.sku,
          aliases: item.aliases ?? [],
          category: item.categoryName,
          brand: item.brand,
          type: 'Parent',
          condition: '-',
          assembly: parentPart?.assemblyType ?? '-',
          qty: newV?.quantity ?? null,
          price: newV?.unitPrice ?? null,
          status: parentPart?.isActive === false ? 'Inactive' : 'Active',
          _id: item.id,
          _productType: 'parent',
          _variantType: newV?.type ?? 'New',
        }
        const variantRows = item.variants.map((v) => {
          const variantPart = findMatchingPart(item, v.type)
          return {
            id: `${item.id}__${v.type}`,
            name: item.name,
            sku: item.sku,
            aliases: [] as string[],
            category: item.categoryName,
            brand: item.brand,
            type: 'Variant',
            condition: v.type,
            assembly: variantPart?.assemblyType ?? parentPart?.assemblyType ?? '-',
            qty: v.quantity,
            price: v.unitPrice,
            status:
              (variantPart ?? parentPart)?.isActive === false ? 'Inactive' : 'Active',
            _id: item.id,
            _productType: 'variant',
            _variantType: v.type,
          }
        })
        return [parentRow, ...variantRows]
      }),
    }
  }, [items])

  const cellFormatter: CellFormatter = (value, key, row) => {
    const itemId = (row as Record<string, unknown>)._id as string
    const productType = (row as Record<string, unknown>)._productType as string
    const variantType = ((row as Record<string, unknown>)._variantType as string) ?? 'New'

    if (key === 'name' && typeof value === 'string') {
      return {
        display: (
          <div className="flex items-center gap-2">
            {productType === 'variant' && (
              <span
                title="Variant"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
              >
                <GitBranch className="size-3" />
              </span>
            )}
            <Link
              to={`/ims/stock-items/${itemId}`}
              className="font-medium text-primary hover:underline"
            >
              {value}
            </Link>
          </div>
        ),
      }
    }

    if (key === 'aliases') {
      const list = value as string[]
      if (!list || list.length === 0) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: (
          <div className="flex flex-wrap gap-1">
            {list.slice(0, 3).map((a) => (
              <span key={a} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {a}
              </span>
            ))}
            {list.length > 3 && (
              <span className="text-xs text-muted-foreground">+{list.length - 3}</span>
            )}
          </div>
        ),
      }
    }

    if (key === 'type' && typeof value === 'string') {
      const isVariant = value === 'Variant'
      return {
        display: <StatusBadge variant={isVariant ? 'info' : 'neutral'}>{value}</StatusBadge>,
      }
    }

    if (key === 'condition') {
      if (value === '-' || value == null) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: (
          <StatusBadge variant={conditionVariant(value as VariantCondition)}>
            {String(value)}
          </StatusBadge>
        ),
      }
    }

    if (key === 'assembly') {
      if (value === '-' || value == null) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: (
          <StatusBadge variant={value === 'Assembled' ? 'success' : 'warning'}>
            {String(value)}
          </StatusBadge>
        ),
      }
    }

    if (key === 'status' && typeof value === 'string') {
      return {
        display: (
          <StatusBadge variant={value === 'Active' ? 'success' : 'neutral'}>
            {value}
          </StatusBadge>
        ),
      }
    }

    if (key === 'qty') {
      if (value == null) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return { display: <span className="tabular-nums">{String(value)}</span> }
    }

    if (key === 'price') {
      if (value == null || typeof value !== 'number') {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      const isEditing =
        editing?.itemId === itemId && editing?.variantType === variantType

      if (isEditing) {
        return {
          display: (
            <input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={savePrice}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') savePrice()
                if (e.key === 'Escape') cancelEditing()
              }}
              className="h-7 w-24 rounded border border-input bg-background px-2 text-right text-sm"
            />
          ),
        }
      }

      return {
        display: (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              startEditing(itemId, variantType, value)
            }}
            className="group inline-flex items-center gap-1 text-right"
          >
            <span className="font-medium tabular-nums">{currencyFmt.format(value)}</span>
            <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ),
      }
    }

    return null
  }

  return (
    <div className="space-y-3 bmt-search-lg">
      <div className="flex items-center justify-between">
        <h1 className="cpt-page-title">Stock Items</h1>
        <Button nativeButton={false} render={<Link to="/ims/stock-items/new" />}>
          <Plus className="mr-1.5 size-4" />
          Add Stock Item
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={[tab]}
        cellFormatter={cellFormatter}
        persistKey="ims-stock-items"
        onRowClick={(row) => {
          const itemId = (row as Record<string, unknown>)._id as string
          navigate(`/ims/stock-items/${itemId}`)
        }}
      />
    </div>
  )
}
