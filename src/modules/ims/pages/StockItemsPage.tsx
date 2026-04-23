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
import type { StockItem, StockSku, VariantCondition } from '@/modules/wms/types'

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

function splitLocation(loc: string): { warehouse: string; bin: string } {
  const [warehouse, ...rest] = loc.split('/')
  return { warehouse: warehouse ?? loc, bin: rest.join('/') || '—' }
}

function countAvailable(skus: StockSku[]): number {
  return skus.filter((s) => s.status === 'In Stock').length
}

function countAllocated(skus: StockSku[]): number {
  return skus.filter((s) => s.status === 'Reserved' || s.status === 'Dispatched').length
}

type EditingCell = { itemId: string; variantType: string } | null

// Demo scope: surface the newest HPE DL360 Gen11 + other Servers on page 1.
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
        { key: 'name', label: 'Part', sortable: true },
        { key: 'condition', label: 'Condition', sortable: true, filterable: true },
        { key: 'sku', label: 'SKU', sortable: true },
        { key: 'serial', label: 'Serial No' },
        { key: 'price', label: 'Price', sortable: true, align: 'right' },
        { key: 'onHand', label: 'On Hand', sortable: true, align: 'right' },
        { key: 'available', label: 'Available Qty', sortable: true, align: 'right' },
        { key: 'allocated', label: 'Allocated', sortable: true, align: 'right' },
        { key: 'warehouse', label: 'Warehouse', sortable: true, filterable: true },
        { key: 'location', label: 'Location' },
      ],
      data: items.flatMap((item) => {
        return item.variants.map((v) => {
          const available = countAvailable(v.skus)
          const allocated = countAllocated(v.skus)
          const locSample = v.skus[0]?.location ?? ''
          const { bin } = splitLocation(locSample)
          const distinctLocs = new Set(v.skus.map((s) => s.location))
          return {
            id: `${item.id}__${v.type}`,
            name: item.name,
            condition: v.type,
            sku: item.sku,
            serial: v.skus.length > 0 ? `${v.skus.length} units` : '—',
            price: v.unitPrice,
            onHand: v.quantity,
            available,
            allocated,
            warehouse: item.location,
            location: distinctLocs.size > 1 ? `${bin} +${distinctLocs.size - 1} more` : bin,
            _id: item.id,
            _variantType: v.type,
          }
        })
      }),
    }
  }, [items])

  const cellFormatter: CellFormatter = (value, key, row) => {
    const itemId = (row as Record<string, unknown>)._id as string
    const variantType = ((row as Record<string, unknown>)._variantType as string) ?? 'New'

    if (key === 'name' && typeof value === 'string') {
      return {
        display: (
          <div className="flex items-center gap-2">
            <span
              title="Variant"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <GitBranch className="size-3" />
            </span>
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

    if (key === 'condition') {
      return {
        display: (
          <StatusBadge variant={conditionVariant(value as VariantCondition)}>
            {String(value)}
          </StatusBadge>
        ),
      }
    }

    if (key === 'sku') {
      return { display: <span className="font-mono text-xs">{String(value)}</span> }
    }

    if (key === 'serial') {
      return { display: <span className="text-xs text-muted-foreground">{String(value)}</span> }
    }

    if (key === 'onHand' || key === 'available' || key === 'allocated') {
      if (value == null) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return { display: <span className="tabular-nums">{String(value)}</span> }
    }

    if (key === 'warehouse') {
      return { display: <span className="text-sm">{String(value)}</span> }
    }

    if (key === 'location') {
      return { display: <span className="text-xs text-muted-foreground">{String(value)}</span> }
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
