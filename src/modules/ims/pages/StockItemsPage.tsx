import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Input } from '@/components/ui/input'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockStockItems } from '../data/stock-items'

export default function StockItemsPage() {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return mockStockItems
    const q = search.toLowerCase()
    return mockStockItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q)
    )
  }, [search])

  const tab: TabConfig = useMemo(() => {
    return {
      id: 'items',
      label: 'Stock Items',
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'sku', label: 'SKU', sortable: true },
        { key: 'category', label: 'Category', sortable: true },
        { key: 'brand', label: 'Brand', sortable: true },
        { key: 'location', label: 'Location', sortable: true },
        { key: 'reorderLevel', label: 'Reorder Level', sortable: true, align: 'right' },
        { key: 'newQty', label: 'New', sortable: true, align: 'right' },
        { key: 'refurbishedQty', label: 'Refurbished', sortable: true, align: 'right' },
        { key: 'newPoolQty', label: 'New Pool', sortable: true, align: 'right' },
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
          location: item.location,
          reorderLevel: item.reorderLevel,
          newQty: newV?.quantity ?? '-',
          refurbishedQty: refurbV?.quantity ?? '-',
          newPoolQty: poolV?.quantity ?? '-',
        }
      }),
    }
  }, [filtered])

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'name' && typeof value === 'string') {
      return {
        display: (
          <Link
            to={`/ims/stock-items/${row.id as string}`}
            className="font-medium text-primary hover:underline"
          >
            {value}
          </Link>
        ),
      }
    }
    const reorder = row.reorderLevel as number
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
    return null
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
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
