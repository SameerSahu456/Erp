import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockStockItems } from '../data/stock-items'
import type { StockItem } from '@/modules/wms/types'

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

type EditingCell = { itemId: string; variantType: string } | null

export default function StockItemsPage() {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<StockItem[]>(mockStockItems)
  const [editing, setEditing] = useState<EditingCell>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        (item.aliases && item.aliases.some((a) => a.toLowerCase().includes(q)))
    )
  }, [search, items])

  const startEditing = useCallback((itemId: string, variantType: string, currentPrice: number) => {
    setEditing({ itemId, variantType })
    setEditValue(String(currentPrice))
    // Focus the input on next render
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
      label: 'Stock Items',
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'sku', label: 'SKU', sortable: true },
        { key: 'category', label: 'Category', sortable: true },
        { key: 'brand', label: 'Brand', sortable: true },
        { key: 'newQty', label: 'New Qty', sortable: true, align: 'right' },
        { key: 'newPrice', label: 'New Price', sortable: true, align: 'right' },
        { key: 'refurbishedQty', label: 'Refurb Qty', sortable: true, align: 'right' },
        { key: 'refurbishedPrice', label: 'Refurb Price', sortable: true, align: 'right' },
        { key: 'newPoolQty', label: 'Pool Qty', sortable: true, align: 'right' },
        { key: 'newPoolPrice', label: 'Pool Price', sortable: true, align: 'right' },
        { key: 'reorderLevel', label: 'Reorder', sortable: true, align: 'right' },
      ],
      data: filtered.map((item) => {
        const newV = item.variants.find((v) => v.type === 'New')
        const refurbV = item.variants.find((v) => v.type === 'Refurbished')
        const poolV = item.variants.find((v) => v.type === 'New Pool')
        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.categoryName,
          brand: item.brand,
          reorderLevel: item.reorderLevel,
          newQty: newV?.quantity ?? '-',
          newPrice: newV?.unitPrice ?? '-',
          refurbishedQty: refurbV?.quantity ?? '-',
          refurbishedPrice: refurbV?.unitPrice ?? '-',
          newPoolQty: poolV?.quantity ?? '-',
          newPoolPrice: poolV?.unitPrice ?? '-',
        }
      }),
    }
  }, [filtered])

  const cellFormatter: CellFormatter = (value, key, row) => {
    const itemId = row.id as string
    const reorder = row.reorderLevel as number

    if (key === 'name' && typeof value === 'string') {
      return {
        display: (
          <Link
            to={`/ims/stock-items/${itemId}`}
            className="font-medium text-primary hover:underline"
          >
            {value}
          </Link>
        ),
      }
    }

    // Quantity columns — red cell if below reorder level
    if (
      (key === 'newQty' || key === 'refurbishedQty' || key === 'newPoolQty') &&
      typeof value === 'number'
    ) {
      if (value < reorder) {
        return {
          className: 'bg-destructive/10 text-destructive',
          display: String(value),
        }
      }
    }

    // Price columns — inline editable
    if (
      (key === 'newPrice' || key === 'refurbishedPrice' || key === 'newPoolPrice') &&
      typeof value === 'number'
    ) {
      const variantType =
        key === 'newPrice' ? 'New' : key === 'refurbishedPrice' ? 'Refurbished' : 'New Pool'
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
            onClick={() => startEditing(itemId, variantType, value)}
            className="group inline-flex items-center gap-1 text-right"
          >
            <span>{currencyFmt.format(value)}</span>
            <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ),
      }
    }

    return null
  }

  return (
    <div className="space-y-6">
      <h1 className="cpt-page-title">
        Stock Items
      </h1>

      <Input
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <BusinessMetricsTable tabs={[tab]} cellFormatter={cellFormatter} />
    </div>
  )
}
