import { useMemo } from 'react'
import { Package, AlertTriangle, FolderTree, IndianRupee } from 'lucide-react'

import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PageHeader } from '@/components/page'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockStockItems } from '../data/stock-items'
import { mockCategories } from '../data/categories'

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export default function ImsDashboard() {
  const { totalItems, lowStockAlerts, totalCategories, totalValue, stockSummary, lowStockRows } =
    useMemo(() => {
      let totalVal = 0
      const lowItems: {
        item: string
        category: string
        variant: string
        qty: number
        reorderLevel: number
        status: string
      }[] = []

      for (const item of mockStockItems) {
        for (const v of item.variants) {
          totalVal += v.quantity * v.unitPrice
          if (v.quantity < item.reorderLevel) {
            lowItems.push({
              item: item.name,
              category: item.categoryName,
              variant: v.type,
              qty: v.quantity,
              reorderLevel: item.reorderLevel,
              status: 'Low Stock',
            })
          }
        }
      }

      // Stock summary by category
      const catMap = new Map<
        string,
        { category: string; itemsCount: number; totalQty: number; totalValue: number }
      >()
      for (const item of mockStockItems) {
        const existing = catMap.get(item.categoryName) ?? {
          category: item.categoryName,
          itemsCount: 0,
          totalQty: 0,
          totalValue: 0,
        }
        existing.itemsCount += 1
        for (const v of item.variants) {
          existing.totalQty += v.quantity
          existing.totalValue += v.quantity * v.unitPrice
        }
        catMap.set(item.categoryName, existing)
      }

      return {
        totalItems: mockStockItems.length,
        lowStockAlerts: lowItems.length,
        totalCategories: mockCategories.length,
        totalValue: totalVal,
        stockSummary: Array.from(catMap.values()),
        lowStockRows: lowItems,
      }
    }, [])

  const stats = [
    { label: 'Total Items', value: totalItems, icon: Package },
    {
      label: 'Low Stock Alerts',
      value: lowStockAlerts,
      icon: AlertTriangle,
      trend: lowStockAlerts > 0 ? { value: lowStockAlerts, isPositive: false } : undefined,
    },
    { label: 'Total Categories', value: totalCategories, icon: FolderTree },
    { label: 'Total Value', value: currencyFmt.format(totalValue), icon: IndianRupee },
  ]

  const summaryTab: TabConfig = {
    id: 'summary',
    label: 'Stock Summary',
    columns: [
      { key: 'category', label: 'Category', sortable: true },
      { key: 'itemsCount', label: 'Items Count', sortable: true, align: 'right' },
      { key: 'totalQty', label: 'Total Qty', sortable: true, align: 'right' },
      { key: 'totalValue', label: 'Total Value', sortable: true, align: 'right' },
    ],
    data: stockSummary,
  }

  const lowStockTab: TabConfig = {
    id: 'low-stock',
    label: 'Low Stock Alerts',
    columns: [
      { key: 'item', label: 'Item', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'variant', label: 'Variant', sortable: true },
      { key: 'qty', label: 'Qty', sortable: true, align: 'right' },
      { key: 'reorderLevel', label: 'Reorder Level', sortable: true, align: 'right' },
      { key: 'status', label: 'Status' },
    ],
    data: lowStockRows,
  }

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'totalValue' && typeof value === 'number') {
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
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        subtitle="Overview of stock items, low-stock alerts, and inventory value."
        breadcrumbs={[{ label: 'IMS' }, { label: 'Dashboard' }]}
      />

      <StatsRow stats={stats} />

      <BusinessMetricsTable
        tabs={[summaryTab, lowStockTab]}
        cellFormatter={cellFormatter}
        emptyState={{
          title: 'No stock items yet',
          description: 'Add stock items to start tracking inventory levels.',
        }}
      />
    </div>
  )
}
