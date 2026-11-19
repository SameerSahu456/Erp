import { Boxes } from 'lucide-react'

import type { ReportCategory } from '../../types'

export const INVENTORY_CATEGORY: ReportCategory = {
  id: 'inventory',
  label: 'Inventory',
  description: 'Stock on hand, ageing, movement, condition mix and item sales.',
  icon: Boxes,
  reports: [
    {
      id: 'stock-summary',
      label: 'Stock Summary',
      description:
        'Units on hand, in repair or checks, reserved for orders and free to sell for every stocked item.',
      columns: [
        { key: 'item', label: 'Item', sortable: true },
        { key: 'category', label: 'Category', filterable: true },
        { key: 'onHand', label: 'On Hand', format: 'number', sortable: true, align: 'right' },
        { key: 'inOperations', label: 'In Repair / Checks', format: 'number', align: 'right' },
        { key: 'reserved', label: 'Reserved', format: 'number', align: 'right' },
        { key: 'available', label: 'Available', format: 'number', sortable: true, align: 'right' },
      ],
      kpis: [
        { label: 'Items', agg: 'count', accent: 'primary' },
        { label: 'Units On Hand', column: 'onHand', agg: 'sum', format: 'number', accent: 'info' },
        {
          label: 'Available to Sell',
          column: 'available',
          agg: 'sum',
          format: 'number',
          accent: 'success',
        },
        { label: 'Reserved', column: 'reserved', agg: 'sum', format: 'number', accent: 'violet' },
      ],
      chart: {
        type: 'bar',
        xKey: 'item',
        yKey: 'onHand',
        yFormat: 'number',
        accent: 'sky',
      },
    },
    {
      id: 'stock-ledger',
      label: 'Stock Ledger',
      description:
        'Every stock movement recorded in the period, with units in, units out and the document behind it.',
      columns: [
        { key: 'date', label: 'Date', format: 'date', sortable: true },
        { key: 'item', label: 'Item', filterable: true },
        { key: 'serial', label: 'Serial No.' },
        { key: 'type', label: 'Movement', filterable: true },
        { key: 'inQty', label: 'In', format: 'number', align: 'right' },
        { key: 'outQty', label: 'Out', format: 'number', align: 'right' },
        { key: 'reference', label: 'Reference' },
        { key: 'warehouse', label: 'Warehouse', filterable: true },
      ],
      kpis: [
        { label: 'Movements', agg: 'count', accent: 'primary' },
        { label: 'Units In', column: 'inQty', agg: 'sum', format: 'number', accent: 'success' },
        { label: 'Units Out', column: 'outQty', agg: 'sum', format: 'number', accent: 'info' },
      ],
      chart: {
        type: 'bar',
        xKey: 'date',
        yKey: 'inQty',
        yFormat: 'number',
        accent: 'sky',
      },
    },
    {
      id: 'stock-valuation',
      label: 'Stock by Category',
      description:
        'How many units are on hand in each category and what share of total stock that is.',
      columns: [
        { key: 'category', label: 'Category' },
        { key: 'items', label: 'Distinct Items', format: 'number', align: 'right' },
        { key: 'qty', label: 'Units', format: 'number', sortable: true, align: 'right' },
        { key: 'sellable', label: 'Ready to Sell', format: 'number', align: 'right' },
        { key: 'share', label: 'Share of Units', format: 'percent', align: 'right' },
      ],
      kpis: [
        { label: 'Units', column: 'qty', agg: 'sum', format: 'number', accent: 'primary' },
        {
          label: 'Ready to Sell',
          column: 'sellable',
          agg: 'sum',
          format: 'number',
          accent: 'success',
        },
        { label: 'Categories', agg: 'count', accent: 'violet' },
      ],
      chart: {
        type: 'bar',
        xKey: 'category',
        yKey: 'qty',
        yFormat: 'number',
        accent: 'violet',
      },
    },
    {
      id: 'low-stock-reorder',
      label: 'Low Stock / Reorder',
      description: 'Items at or below their reorder level, the shortfall, and who to buy from.',
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'onHand', label: 'On Hand', format: 'number', align: 'right' },
        { key: 'reorderLevel', label: 'Reorder Level', format: 'number', align: 'right' },
        { key: 'shortfall', label: 'Shortfall', format: 'number', sortable: true, align: 'right' },
        { key: 'suggestedQty', label: 'Suggested Order', format: 'number', align: 'right' },
        { key: 'vendor', label: 'Preferred Vendor' },
        { key: 'status', label: 'Urgency', format: 'status', filterable: true },
      ],
      kpis: [
        { label: 'Items Below Reorder', agg: 'count', accent: 'warning' },
        {
          label: 'Total Shortfall',
          column: 'shortfall',
          agg: 'sum',
          format: 'number',
          accent: 'danger',
        },
        {
          label: 'Suggested Order Qty',
          column: 'suggestedQty',
          agg: 'sum',
          format: 'number',
          accent: 'info',
        },
      ],
      chart: {
        type: 'bar',
        xKey: 'item',
        yKey: 'shortfall',
        yFormat: 'number',
        accent: 'danger',
      },
    },
    {
      id: 'warehouse-wise-stock',
      label: 'Warehouse-wise Stock',
      description:
        'Units on hand and bin space used at each warehouse so transfers and capacity can be planned.',
      columns: [
        { key: 'warehouse', label: 'Warehouse' },
        { key: 'items', label: 'Distinct Items', format: 'number', align: 'right' },
        { key: 'qty', label: 'Units', format: 'number', sortable: true, align: 'right' },
        { key: 'capacity', label: 'Bin Capacity', format: 'number', align: 'right' },
        {
          key: 'utilisation',
          label: 'Space Used',
          format: 'percent',
          sortable: true,
          align: 'right',
        },
        { key: 'status', label: 'Capacity', format: 'status' },
      ],
      kpis: [
        { label: 'Warehouses', agg: 'count', accent: 'primary' },
        { label: 'Units', column: 'qty', agg: 'sum', format: 'number', accent: 'info' },
        {
          label: 'Avg Space Used',
          column: 'utilisation',
          agg: 'avg',
          format: 'percent',
          accent: 'warning',
        },
      ],
      chart: {
        type: 'bar',
        xKey: 'warehouse',
        yKey: 'qty',
        yFormat: 'number',
        accent: 'indigo',
      },
    },
    {
      id: 'stock-ageing',
      label: 'Stock Ageing',
      description:
        'How long units have been in stock since they were added to the system, in age buckets, so slow movers are spotted before they become dead stock.',
      columns: [
        { key: 'bucket', label: 'Age Bucket' },
        { key: 'items', label: 'Items', format: 'number', align: 'right' },
        { key: 'qty', label: 'Units', format: 'number', sortable: true, align: 'right' },
        { key: 'share', label: 'Share of Units', format: 'percent', align: 'right' },
        { key: 'status', label: 'Health', format: 'status' },
      ],
      kpis: [
        { label: 'Units On Hand', column: 'qty', agg: 'sum', format: 'number', accent: 'primary' },
        { label: 'Largest Bucket', column: 'qty', agg: 'max', format: 'number', accent: 'info' },
      ],
      chart: {
        type: 'bar',
        xKey: 'bucket',
        yKey: 'qty',
        yFormat: 'number',
        accent: 'amber',
      },
    },
    {
      id: 'slow-dead-stock',
      label: 'Slow & Dead Stock',
      description:
        'Items on hand with no receipt or movement for 90 days or more, and how many units are sitting idle.',
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'lastMovement', label: 'Last Movement', format: 'date', sortable: true },
        { key: 'daysIdle', label: 'Days Idle', format: 'days', sortable: true, align: 'right' },
        { key: 'qty', label: 'Units', format: 'number', sortable: true, align: 'right' },
        { key: 'status', label: 'Status', format: 'status', filterable: true },
      ],
      kpis: [
        { label: 'Idle Items', agg: 'count', accent: 'warning' },
        { label: 'Idle Units', column: 'qty', agg: 'sum', format: 'number', accent: 'danger' },
        { label: 'Longest Idle', column: 'daysIdle', agg: 'max', format: 'days', accent: 'info' },
      ],
      chart: {
        type: 'bar',
        xKey: 'item',
        yKey: 'qty',
        yFormat: 'number',
        accent: 'rose',
      },
    },
    {
      id: 'stock-movement',
      label: 'Stock Movement Trend',
      description:
        'Monthly units received versus units issued out, as recorded in the stock ledger, to see whether inventory is building or draining.',
      columns: [
        { key: 'month', label: 'Month' },
        { key: 'inward', label: 'Inward', format: 'number', align: 'right' },
        { key: 'outward', label: 'Outward', format: 'number', align: 'right' },
        { key: 'net', label: 'Net', format: 'number', align: 'right' },
      ],
      kpis: [
        { label: 'Inward', column: 'inward', agg: 'sum', format: 'number', accent: 'success' },
        { label: 'Outward', column: 'outward', agg: 'sum', format: 'number', accent: 'info' },
        { label: 'Net Change', column: 'net', agg: 'sum', format: 'number', accent: 'primary' },
      ],
      chart: {
        type: 'line',
        xKey: 'month',
        yKey: 'net',
        yFormat: 'number',
        accent: 'indigo',
      },
    },
    {
      id: 'condition-mix',
      label: 'Stock by Condition Grade',
      description:
        'Split of units on hand between new and refurbished stock, with refurbished units shown by their quality check grade.',
      columns: [
        { key: 'condition', label: 'Condition' },
        { key: 'qty', label: 'Units', format: 'number', sortable: true, align: 'right' },
        { key: 'sellable', label: 'Ready to Sell', format: 'number', align: 'right' },
        { key: 'share', label: 'Share of Units', format: 'percent', align: 'right' },
      ],
      kpis: [
        { label: 'Units', column: 'qty', agg: 'sum', format: 'number', accent: 'primary' },
        {
          label: 'Ready to Sell',
          column: 'sellable',
          agg: 'sum',
          format: 'number',
          accent: 'success',
        },
      ],
      chart: {
        type: 'bar',
        xKey: 'condition',
        yKey: 'qty',
        yFormat: 'number',
        accent: 'teal',
      },
    },
    {
      id: 'item-profitability',
      label: 'Item Sales',
      description:
        'Units sold and revenue per item from approved sales orders in the period, so you can see which items actually earn.',
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'category', label: 'Category', filterable: true },
        { key: 'units', label: 'Units Sold', format: 'number', sortable: true, align: 'right' },
        { key: 'revenue', label: 'Revenue', format: 'currency', sortable: true, align: 'right' },
        {
          key: 'avgPrice',
          label: 'Avg Selling Price',
          format: 'currency',
          sortable: true,
          align: 'right',
        },
      ],
      kpis: [
        { label: 'Revenue', column: 'revenue', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Units Sold', column: 'units', agg: 'sum', format: 'number', accent: 'info' },
        { label: 'Items Sold', agg: 'count', accent: 'violet' },
      ],
      chart: {
        type: 'bar',
        xKey: 'item',
        yKey: 'revenue',
        yFormat: 'currency',
        accent: 'emerald',
      },
    },
    {
      id: 'spares-consumption',
      label: 'Spares Consumption',
      description:
        'Which spare parts repairs are consuming, how many were put back, and how many devices they went into.',
      columns: [
        { key: 'part', label: 'Spare Part' },
        { key: 'consumed', label: 'Consumed', format: 'number', sortable: true, align: 'right' },
        { key: 'returned', label: 'Put Back', format: 'number', align: 'right' },
        { key: 'repairs', label: 'Devices Repaired', format: 'number', align: 'right' },
      ],
      kpis: [
        {
          label: 'Parts Consumed',
          column: 'consumed',
          agg: 'sum',
          format: 'number',
          accent: 'primary',
        },
        {
          label: 'Parts Put Back',
          column: 'returned',
          agg: 'sum',
          format: 'number',
          accent: 'warning',
        },
      ],
      chart: {
        type: 'bar',
        xKey: 'part',
        yKey: 'consumed',
        yFormat: 'number',
        accent: 'amber',
      },
    },
  ],
}
