import { useMemo } from 'react'

import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockStockItems } from '../data/stock-items'
import { mockStockMovements } from '@/modules/wms/data/stock-movements'
import { DEVICE_STATUS_LABELS } from '@/modules/wms/types'

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function ImsReportsPage() {
  const { stockSummaryTab, lowStockTab, valuationTab, movementTab } = useMemo(() => {
    // Stock Summary
    const summaryData = mockStockItems.map((item) => {
      const newV = item.variants.find((v) => v.type === 'New')
      const refurbV = item.variants.find((v) => v.type === 'Refurbished')
      const pullV = item.variants.find((v) => v.type === 'New Pull')
      const totalValue = item.variants.reduce(
        (s, v) => s + v.quantity * v.unitPrice,
        0
      )
      return {
        id: item.id,
        name: item.name,
        category: item.categoryName,
        newQty: newV?.quantity ?? 0,
        refurbishedQty: refurbV?.quantity ?? 0,
        newPullQty: pullV?.quantity ?? 0,
        totalValue,
        reorderLevel: item.reorderLevel,
      }
    })

    const summary: TabConfig = {
      id: 'summary',
      label: 'Stock Summary',
      columns: [
        { key: 'name', label: 'Item', sortable: true },
        { key: 'category', label: 'Category', sortable: true },
        { key: 'newQty', label: 'New Qty', sortable: true, align: 'right' },
        { key: 'refurbishedQty', label: 'Refurbished Qty', sortable: true, align: 'right' },
        { key: 'newPullQty', label: 'New Pull Qty', sortable: true, align: 'right' },
        { key: 'totalValue', label: 'Total Value', sortable: true, align: 'right' },
      ],
      data: summaryData,
    }

    // Low Stock
    const lowStockItems: Record<string, unknown>[] = []
    for (const item of mockStockItems) {
      for (const v of item.variants) {
        if (v.quantity < item.reorderLevel) {
          lowStockItems.push({
            name: item.name,
            category: item.categoryName,
            variant: v.type,
            qty: v.quantity,
            reorderLevel: item.reorderLevel,
            status: 'Low Stock',
          })
        }
      }
    }

    const low: TabConfig = {
      id: 'low-stock',
      label: 'Low Stock',
      columns: [
        { key: 'name', label: 'Item', sortable: true },
        { key: 'category', label: 'Category', sortable: true },
        { key: 'variant', label: 'Variant', sortable: true },
        { key: 'qty', label: 'Qty', sortable: true, align: 'right' },
        { key: 'reorderLevel', label: 'Reorder Level', sortable: true, align: 'right' },
        { key: 'status', label: 'Status' },
      ],
      data: lowStockItems,
    }

    // Stock Valuation by category
    const catMap = new Map<
      string,
      { category: string; totalQty: number; totalValue: number; count: number }
    >()
    for (const item of mockStockItems) {
      const existing = catMap.get(item.categoryName) ?? {
        category: item.categoryName,
        totalQty: 0,
        totalValue: 0,
        count: 0,
      }
      for (const v of item.variants) {
        existing.totalQty += v.quantity
        existing.totalValue += v.quantity * v.unitPrice
        existing.count += 1
      }
      catMap.set(item.categoryName, existing)
    }
    const valuationData = Array.from(catMap.values()).map((c) => ({
      category: c.category,
      totalQty: c.totalQty,
      avgPrice: c.count > 0 ? Math.round(c.totalValue / c.totalQty) : 0,
      totalValue: c.totalValue,
    }))

    const valuation: TabConfig = {
      id: 'valuation',
      label: 'Stock Valuation',
      columns: [
        { key: 'category', label: 'Category', sortable: true },
        { key: 'totalQty', label: 'Total Qty', sortable: true, align: 'right' },
        { key: 'avgPrice', label: 'Avg Price', sortable: true, align: 'right' },
        { key: 'totalValue', label: 'Total Value', sortable: true, align: 'right' },
      ],
      data: valuationData,
    }

    // Movement History
    const movementData = mockStockMovements.map((mv) => ({
      device: mv.deviceBarcode,
      fromStatus: mv.fromStatus,
      toStatus: mv.toStatus,
      changedBy: mv.changedBy,
      date: formatDate(mv.changedAt),
    }))

    const movement: TabConfig = {
      id: 'movements',
      label: 'Movement History',
      columns: [
        { key: 'device', label: 'Device', sortable: true },
        { key: 'fromStatus', label: 'From Status', sortable: true },
        { key: 'toStatus', label: 'To Status', sortable: true },
        { key: 'changedBy', label: 'Changed By', sortable: true },
        { key: 'date', label: 'Date', sortable: true },
      ],
      data: movementData,
    }

    return {
      stockSummaryTab: summary,
      lowStockTab: low,
      valuationTab: valuation,
      movementTab: movement,
    }
  }, [])

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'totalValue' && typeof value === 'number') {
      return { display: currencyFmt.format(value) }
    }
    if (key === 'avgPrice' && typeof value === 'number') {
      return { display: currencyFmt.format(value) }
    }
    if (key === 'qty' && typeof value === 'number') {
      const reorder = row.reorderLevel as number
      if (value < reorder) {
        return {
          className: 'bg-destructive/10 text-destructive',
          display: String(value),
        }
      }
    }
    if (key === 'status' && value === 'Low Stock') {
      return {
        display: <StatusBadge variant="error">Low Stock</StatusBadge>,
      }
    }
    if (key === 'fromStatus' && typeof value === 'string' && value in DEVICE_STATUS_LABELS) {
      return {
        display: DEVICE_STATUS_LABELS[value as keyof typeof DEVICE_STATUS_LABELS],
      }
    }
    if (key === 'toStatus' && typeof value === 'string' && value in DEVICE_STATUS_LABELS) {
      return {
        display: DEVICE_STATUS_LABELS[value as keyof typeof DEVICE_STATUS_LABELS],
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <h1 className="cpt-page-title">
        Inventory Reports
      </h1>

      <BusinessMetricsTable
        tabs={[stockSummaryTab, lowStockTab, valuationTab, movementTab]}
        cellFormatter={cellFormatter}
      />
    </div>
  )
}
