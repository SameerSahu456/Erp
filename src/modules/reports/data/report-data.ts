import type { ColumnDef } from '@/components/common/BusinessMetricsTable'

export interface ReportCategory {
  id: string
  label: string
  reports: { id: string; label: string }[]
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'financial',
    label: 'Financial Reports',
    reports: [
      { id: 'profit-loss', label: 'Profit & Loss' },
      { id: 'balance-sheet', label: 'Balance Sheet' },
      { id: 'cash-flow', label: 'Cash Flow Statement' },
      { id: 'trial-balance', label: 'Trial Balance' },
      { id: 'ar-aging', label: 'Accounts Receivable Aging' },
      { id: 'ap-aging', label: 'Accounts Payable Aging' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales Reports',
    reports: [
      { id: 'sales-by-customer', label: 'Sales by Customer' },
      { id: 'sales-by-product', label: 'Sales by Product' },
      { id: 'sales-pipeline', label: 'Sales Pipeline' },
      { id: 'invoice-summary', label: 'Invoice Summary' },
      { id: 'top-customers', label: 'Top 10 Customers' },
    ],
  },
  {
    id: 'purchase',
    label: 'Purchase Reports',
    reports: [
      { id: 'purchase-by-vendor', label: 'Purchase by Vendor' },
      { id: 'po-status', label: 'PO Status Summary' },
      { id: 'vendor-performance', label: 'Vendor Performance' },
      { id: 'po-aging', label: 'Purchase Order Aging' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory Reports',
    reports: [
      { id: 'stock-summary', label: 'Stock Summary' },
      { id: 'stock-ledger', label: 'Stock Ledger' },
      { id: 'low-stock', label: 'Low Stock / Reorder' },
      { id: 'stock-valuation', label: 'Stock Valuation' },
      { id: 'warehouse-stock', label: 'Warehouse-wise Stock' },
    ],
  },
  {
    id: 'wms',
    label: 'WMS Reports',
    reports: [
      { id: 'device-lifecycle', label: 'Device Lifecycle' },
      { id: 'qc-pass-fail', label: 'QC Pass/Fail Rate' },
      { id: 'repair-tat', label: 'Repair TAT' },
      { id: 'inward-outward-trend', label: 'Inward vs Outward Trend' },
    ],
  },
]

export type ReportFilterType = 'sales' | 'purchase' | 'inventory' | 'wms' | 'financial'

export function getReportFilterType(reportId: string): ReportFilterType {
  const salesIds = ['sales-by-customer', 'sales-by-product', 'sales-pipeline', 'invoice-summary', 'top-customers']
  const purchaseIds = ['purchase-by-vendor', 'po-status', 'vendor-performance', 'po-aging']
  const inventoryIds = ['stock-summary', 'stock-ledger', 'low-stock', 'stock-valuation', 'warehouse-stock']
  const wmsIds = ['device-lifecycle', 'qc-pass-fail', 'repair-tat', 'inward-outward-trend']

  if (salesIds.includes(reportId)) return 'sales'
  if (purchaseIds.includes(reportId)) return 'purchase'
  if (inventoryIds.includes(reportId)) return 'inventory'
  if (wmsIds.includes(reportId)) return 'wms'
  return 'financial'
}

export function getReportData(reportId: string): { columns: ColumnDef[]; data: Record<string, unknown>[] } {
  switch (reportId) {
    case 'profit-loss':
      return {
        columns: [
          { key: 'account', label: 'Account', sortable: true },
          { key: 'amount', label: 'Amount (INR)', sortable: true, align: 'right' },
          { key: 'percentage', label: '% of Revenue', align: 'right' },
        ],
        data: [
          { account: 'Product Sales', amount: 4500000, percentage: '62.5%' },
          { account: 'Service Revenue', amount: 1200000, percentage: '16.7%' },
          { account: 'Rental Income', amount: 850000, percentage: '11.8%' },
          { account: 'Other Income', amount: 650000, percentage: '9.0%' },
          { account: 'Cost of Goods Sold', amount: -2800000, percentage: '38.9%' },
          { account: 'Operating Expenses', amount: -1500000, percentage: '20.8%' },
          { account: 'Salaries & Wages', amount: -1200000, percentage: '16.7%' },
          { account: 'Depreciation', amount: -350000, percentage: '4.9%' },
          { account: 'Net Profit', amount: 1350000, percentage: '18.8%' },
        ],
      }

    case 'balance-sheet':
      return {
        columns: [
          { key: 'item', label: 'Item', sortable: true },
          { key: 'category', label: 'Category' },
          { key: 'amount', label: 'Amount (INR)', sortable: true, align: 'right' },
        ],
        data: [
          { item: 'Cash & Bank', category: 'Current Assets', amount: 3200000 },
          { item: 'Accounts Receivable', category: 'Current Assets', amount: 4800000 },
          { item: 'Inventory', category: 'Current Assets', amount: 6500000 },
          { item: 'Fixed Assets (Net)', category: 'Non-Current Assets', amount: 8500000 },
          { item: 'Accounts Payable', category: 'Current Liabilities', amount: -3200000 },
          { item: 'Short-term Loans', category: 'Current Liabilities', amount: -2000000 },
          { item: 'Long-term Debt', category: 'Non-Current Liabilities', amount: -5000000 },
          { item: 'Equity Capital', category: 'Equity', amount: -10000000 },
          { item: 'Retained Earnings', category: 'Equity', amount: -2800000 },
        ],
      }

    case 'cash-flow':
      return {
        columns: [
          { key: 'activity', label: 'Activity', sortable: true },
          { key: 'type', label: 'Type' },
          { key: 'amount', label: 'Amount (INR)', sortable: true, align: 'right' },
        ],
        data: [
          { activity: 'Collections from Customers', type: 'Operating', amount: 6200000 },
          { activity: 'Payments to Suppliers', type: 'Operating', amount: -3800000 },
          { activity: 'Salary Payments', type: 'Operating', amount: -1200000 },
          { activity: 'Tax Payments', type: 'Operating', amount: -450000 },
          { activity: 'Equipment Purchase', type: 'Investing', amount: -1500000 },
          { activity: 'Sale of Old Equipment', type: 'Investing', amount: 350000 },
          { activity: 'Loan Repayment', type: 'Financing', amount: -800000 },
          { activity: 'Net Cash Flow', type: 'Total', amount: -1200000 },
        ],
      }

    case 'trial-balance':
      return {
        columns: [
          { key: 'accountCode', label: 'Code', sortable: true },
          { key: 'accountName', label: 'Account Name', sortable: true },
          { key: 'debit', label: 'Debit (INR)', align: 'right', sortable: true },
          { key: 'credit', label: 'Credit (INR)', align: 'right', sortable: true },
        ],
        data: [
          { accountCode: '1001', accountName: 'Cash', debit: 3200000, credit: 0 },
          { accountCode: '1100', accountName: 'Accounts Receivable', debit: 4800000, credit: 0 },
          { accountCode: '1200', accountName: 'Inventory', debit: 6500000, credit: 0 },
          { accountCode: '2001', accountName: 'Accounts Payable', debit: 0, credit: 3200000 },
          { accountCode: '3001', accountName: 'Equity Capital', debit: 0, credit: 10000000 },
          { accountCode: '4001', accountName: 'Sales Revenue', debit: 0, credit: 5700000 },
          { accountCode: '5001', accountName: 'Cost of Goods Sold', debit: 2800000, credit: 0 },
          { accountCode: '5100', accountName: 'Operating Expenses', debit: 1600000, credit: 0 },
        ],
      }

    case 'ar-aging':
      return {
        columns: [
          { key: 'customer', label: 'Customer', sortable: true },
          { key: 'current', label: 'Current', align: 'right' },
          { key: 'days30', label: '1-30 Days', align: 'right' },
          { key: 'days60', label: '31-60 Days', align: 'right' },
          { key: 'days90', label: '61-90 Days', align: 'right' },
          { key: 'over90', label: '90+ Days', align: 'right' },
          { key: 'total', label: 'Total', align: 'right', sortable: true },
        ],
        data: [
          { customer: 'TCS Limited', current: 250000, days30: 150000, days60: 0, days90: 0, over90: 0, total: 400000 },
          { customer: 'Infosys Ltd', current: 180000, days30: 120000, days60: 80000, days90: 0, over90: 0, total: 380000 },
          { customer: 'Wipro Technologies', current: 320000, days30: 0, days60: 0, days90: 50000, over90: 0, total: 370000 },
          { customer: 'HCL Technologies', current: 0, days30: 200000, days60: 100000, days90: 0, over90: 75000, total: 375000 },
          { customer: 'Tech Mahindra', current: 150000, days30: 80000, days60: 0, days90: 0, over90: 0, total: 230000 },
          { customer: 'Mphasis Ltd', current: 100000, days30: 0, days60: 60000, days90: 40000, over90: 0, total: 200000 },
        ],
      }

    case 'ap-aging':
      return {
        columns: [
          { key: 'vendor', label: 'Vendor', sortable: true },
          { key: 'current', label: 'Current', align: 'right' },
          { key: 'days30', label: '1-30 Days', align: 'right' },
          { key: 'days60', label: '31-60 Days', align: 'right' },
          { key: 'days90', label: '61-90 Days', align: 'right' },
          { key: 'total', label: 'Total', align: 'right', sortable: true },
        ],
        data: [
          { vendor: 'Dell Technologies', current: 450000, days30: 200000, days60: 0, days90: 0, total: 650000 },
          { vendor: 'HP Inc', current: 320000, days30: 150000, days60: 80000, days90: 0, total: 550000 },
          { vendor: 'Lenovo India', current: 180000, days30: 120000, days60: 0, days90: 50000, total: 350000 },
          { vendor: 'Cisco Systems', current: 250000, days30: 0, days60: 100000, days90: 0, total: 350000 },
          { vendor: 'Samsung Electronics', current: 150000, days30: 80000, days60: 0, days90: 0, total: 230000 },
        ],
      }

    case 'sales-by-customer':
      return {
        columns: [
          { key: 'customer', label: 'Customer', sortable: true },
          { key: 'orders', label: 'Orders', sortable: true, align: 'right' },
          { key: 'revenue', label: 'Revenue (INR)', sortable: true, align: 'right' },
          { key: 'avgOrderValue', label: 'Avg Order Value', align: 'right' },
          { key: 'lastOrder', label: 'Last Order' },
        ],
        data: [
          { customer: 'TCS Limited', orders: 12, revenue: 4800000, avgOrderValue: 400000, lastOrder: '2026-04-10' },
          { customer: 'Infosys Ltd', orders: 8, revenue: 3200000, avgOrderValue: 400000, lastOrder: '2026-04-08' },
          { customer: 'Wipro Technologies', orders: 10, revenue: 2900000, avgOrderValue: 290000, lastOrder: '2026-04-12' },
          { customer: 'HCL Technologies', orders: 6, revenue: 2100000, avgOrderValue: 350000, lastOrder: '2026-03-28' },
          { customer: 'Tech Mahindra', orders: 5, revenue: 1500000, avgOrderValue: 300000, lastOrder: '2026-04-05' },
          { customer: 'Mphasis Ltd', orders: 4, revenue: 1200000, avgOrderValue: 300000, lastOrder: '2026-03-15' },
          { customer: 'LTIMindtree', orders: 3, revenue: 900000, avgOrderValue: 300000, lastOrder: '2026-04-01' },
        ],
      }

    case 'sales-by-product':
      return {
        columns: [
          { key: 'product', label: 'Product', sortable: true },
          { key: 'category', label: 'Category' },
          { key: 'unitsSold', label: 'Units Sold', sortable: true, align: 'right' },
          { key: 'revenue', label: 'Revenue (INR)', sortable: true, align: 'right' },
          { key: 'margin', label: 'Margin %', align: 'right' },
        ],
        data: [
          { product: 'Dell Latitude 5540', category: 'Laptops', unitsSold: 85, revenue: 5100000, margin: '22%' },
          { product: 'HP ProBook 450 G10', category: 'Laptops', unitsSold: 60, revenue: 3600000, margin: '20%' },
          { product: 'Dell PowerEdge R750', category: 'Servers', unitsSold: 8, revenue: 4800000, margin: '18%' },
          { product: 'Lenovo ThinkPad T14', category: 'Laptops', unitsSold: 45, revenue: 2700000, margin: '21%' },
          { product: 'HP EliteDesk 800 G9', category: 'Desktops', unitsSold: 35, revenue: 1750000, margin: '24%' },
          { product: 'Dell OptiPlex 7010', category: 'Desktops', unitsSold: 30, revenue: 1350000, margin: '23%' },
        ],
      }

    case 'sales-pipeline':
      return {
        columns: [
          { key: 'stage', label: 'Stage', sortable: true },
          { key: 'deals', label: 'Deals', sortable: true, align: 'right' },
          { key: 'value', label: 'Value (INR)', sortable: true, align: 'right' },
          { key: 'avgAge', label: 'Avg Age (Days)', align: 'right' },
          { key: 'conversionRate', label: 'Conversion Rate', align: 'right' },
        ],
        data: [
          { stage: 'Prospecting', deals: 24, value: 12000000, avgAge: 5, conversionRate: '60%' },
          { stage: 'Qualification', deals: 18, value: 9500000, avgAge: 12, conversionRate: '55%' },
          { stage: 'Proposal', deals: 12, value: 7200000, avgAge: 20, conversionRate: '65%' },
          { stage: 'Negotiation', deals: 8, value: 5500000, avgAge: 28, conversionRate: '75%' },
          { stage: 'Closed Won', deals: 6, value: 4200000, avgAge: 35, conversionRate: '100%' },
          { stage: 'Closed Lost', deals: 4, value: 2800000, avgAge: 30, conversionRate: '0%' },
        ],
      }

    case 'invoice-summary':
      return {
        columns: [
          { key: 'invoiceNo', label: 'Invoice #', sortable: true },
          { key: 'customer', label: 'Customer', sortable: true },
          { key: 'date', label: 'Date', sortable: true },
          { key: 'amount', label: 'Amount (INR)', sortable: true, align: 'right' },
          { key: 'status', label: 'Status' },
          { key: 'dueDate', label: 'Due Date' },
        ],
        data: [
          { invoiceNo: 'INV-2026-0145', customer: 'TCS Limited', date: '2026-04-10', amount: 450000, status: 'Paid', dueDate: '2026-05-10' },
          { invoiceNo: 'INV-2026-0144', customer: 'Infosys Ltd', date: '2026-04-08', amount: 380000, status: 'Pending', dueDate: '2026-05-08' },
          { invoiceNo: 'INV-2026-0143', customer: 'Wipro Technologies', date: '2026-04-05', amount: 290000, status: 'Overdue', dueDate: '2026-04-20' },
          { invoiceNo: 'INV-2026-0142', customer: 'HCL Technologies', date: '2026-04-03', amount: 520000, status: 'Paid', dueDate: '2026-05-03' },
          { invoiceNo: 'INV-2026-0141', customer: 'Tech Mahindra', date: '2026-04-01', amount: 175000, status: 'Pending', dueDate: '2026-05-01' },
          { invoiceNo: 'INV-2026-0140', customer: 'Mphasis Ltd', date: '2026-03-28', amount: 340000, status: 'Paid', dueDate: '2026-04-28' },
        ],
      }

    case 'top-customers':
      return {
        columns: [
          { key: 'rank', label: '#', align: 'center' },
          { key: 'customer', label: 'Customer', sortable: true },
          { key: 'totalRevenue', label: 'Total Revenue (INR)', sortable: true, align: 'right' },
          { key: 'totalOrders', label: 'Orders', sortable: true, align: 'right' },
          { key: 'avgOrderValue', label: 'Avg Order', align: 'right' },
          { key: 'retention', label: 'Retention', align: 'right' },
        ],
        data: [
          { rank: 1, customer: 'TCS Limited', totalRevenue: 4800000, totalOrders: 12, avgOrderValue: 400000, retention: '98%' },
          { rank: 2, customer: 'Infosys Ltd', totalRevenue: 3200000, totalOrders: 8, avgOrderValue: 400000, retention: '95%' },
          { rank: 3, customer: 'Wipro Technologies', totalRevenue: 2900000, totalOrders: 10, avgOrderValue: 290000, retention: '92%' },
          { rank: 4, customer: 'HCL Technologies', totalRevenue: 2100000, totalOrders: 6, avgOrderValue: 350000, retention: '88%' },
          { rank: 5, customer: 'Tech Mahindra', totalRevenue: 1500000, totalOrders: 5, avgOrderValue: 300000, retention: '90%' },
          { rank: 6, customer: 'Mphasis Ltd', totalRevenue: 1200000, totalOrders: 4, avgOrderValue: 300000, retention: '85%' },
          { rank: 7, customer: 'LTIMindtree', totalRevenue: 900000, totalOrders: 3, avgOrderValue: 300000, retention: '80%' },
          { rank: 8, customer: 'Cognizant', totalRevenue: 850000, totalOrders: 3, avgOrderValue: 283333, retention: '82%' },
          { rank: 9, customer: 'Hexaware', totalRevenue: 720000, totalOrders: 2, avgOrderValue: 360000, retention: '75%' },
          { rank: 10, customer: 'Persistent Systems', totalRevenue: 650000, totalOrders: 2, avgOrderValue: 325000, retention: '78%' },
        ],
      }

    case 'purchase-by-vendor':
      return {
        columns: [
          { key: 'vendor', label: 'Vendor', sortable: true },
          { key: 'poCount', label: 'PO Count', sortable: true, align: 'right' },
          { key: 'totalValue', label: 'Total Value (INR)', sortable: true, align: 'right' },
          { key: 'avgLeadTime', label: 'Avg Lead Time (Days)', align: 'right' },
          { key: 'onTimeDelivery', label: 'On-time %', align: 'right' },
        ],
        data: [
          { vendor: 'Dell Technologies', poCount: 15, totalValue: 8500000, avgLeadTime: 12, onTimeDelivery: '92%' },
          { vendor: 'HP Inc', poCount: 12, totalValue: 6200000, avgLeadTime: 14, onTimeDelivery: '88%' },
          { vendor: 'Lenovo India', poCount: 8, totalValue: 3800000, avgLeadTime: 10, onTimeDelivery: '95%' },
          { vendor: 'Cisco Systems', poCount: 5, totalValue: 4200000, avgLeadTime: 18, onTimeDelivery: '85%' },
          { vendor: 'Samsung Electronics', poCount: 6, totalValue: 2100000, avgLeadTime: 8, onTimeDelivery: '90%' },
          { vendor: 'Asus India', poCount: 4, totalValue: 1500000, avgLeadTime: 15, onTimeDelivery: '80%' },
        ],
      }

    case 'po-status':
      return {
        columns: [
          { key: 'status', label: 'Status', sortable: true },
          { key: 'count', label: 'Count', sortable: true, align: 'right' },
          { key: 'totalValue', label: 'Total Value (INR)', sortable: true, align: 'right' },
          { key: 'avgAge', label: 'Avg Age (Days)', align: 'right' },
          { key: 'percentage', label: '% of Total', align: 'right' },
        ],
        data: [
          { status: 'Draft', count: 5, totalValue: 2500000, avgAge: 3, percentage: '10%' },
          { status: 'Pending Approval', count: 8, totalValue: 4200000, avgAge: 5, percentage: '16%' },
          { status: 'Approved', count: 12, totalValue: 6800000, avgAge: 8, percentage: '24%' },
          { status: 'Partially Received', count: 6, totalValue: 3500000, avgAge: 18, percentage: '12%' },
          { status: 'Fully Received', count: 15, totalValue: 8500000, avgAge: 25, percentage: '30%' },
          { status: 'Cancelled', count: 4, totalValue: 1800000, avgAge: 12, percentage: '8%' },
        ],
      }

    case 'vendor-performance':
      return {
        columns: [
          { key: 'vendor', label: 'Vendor', sortable: true },
          { key: 'qualityScore', label: 'Quality Score', sortable: true, align: 'right' },
          { key: 'deliveryScore', label: 'Delivery Score', sortable: true, align: 'right' },
          { key: 'priceScore', label: 'Price Score', sortable: true, align: 'right' },
          { key: 'overallRating', label: 'Overall Rating', sortable: true, align: 'right' },
          { key: 'status', label: 'Status' },
        ],
        data: [
          { vendor: 'Dell Technologies', qualityScore: 92, deliveryScore: 90, priceScore: 85, overallRating: 89, status: 'Preferred' },
          { vendor: 'Lenovo India', qualityScore: 90, deliveryScore: 95, priceScore: 88, overallRating: 91, status: 'Preferred' },
          { vendor: 'HP Inc', qualityScore: 88, deliveryScore: 85, priceScore: 82, overallRating: 85, status: 'Approved' },
          { vendor: 'Cisco Systems', qualityScore: 94, deliveryScore: 80, priceScore: 75, overallRating: 83, status: 'Approved' },
          { vendor: 'Samsung Electronics', qualityScore: 86, deliveryScore: 88, priceScore: 90, overallRating: 88, status: 'Approved' },
          { vendor: 'Asus India', qualityScore: 78, deliveryScore: 75, priceScore: 92, overallRating: 82, status: 'Probation' },
        ],
      }

    case 'po-aging':
      return {
        columns: [
          { key: 'poNumber', label: 'PO #', sortable: true },
          { key: 'vendor', label: 'Vendor', sortable: true },
          { key: 'amount', label: 'Amount (INR)', sortable: true, align: 'right' },
          { key: 'orderDate', label: 'Order Date' },
          { key: 'ageDays', label: 'Age (Days)', sortable: true, align: 'right' },
          { key: 'status', label: 'Status' },
        ],
        data: [
          { poNumber: 'PO-2026-0089', vendor: 'Dell Technologies', amount: 850000, orderDate: '2026-01-15', ageDays: 90, status: 'Partially Received' },
          { poNumber: 'PO-2026-0095', vendor: 'HP Inc', amount: 420000, orderDate: '2026-02-01', ageDays: 73, status: 'Approved' },
          { poNumber: 'PO-2026-0102', vendor: 'Cisco Systems', amount: 1200000, orderDate: '2026-02-20', ageDays: 54, status: 'Approved' },
          { poNumber: 'PO-2026-0110', vendor: 'Lenovo India', amount: 380000, orderDate: '2026-03-10', ageDays: 36, status: 'Partially Received' },
          { poNumber: 'PO-2026-0118', vendor: 'Samsung Electronics', amount: 250000, orderDate: '2026-03-25', ageDays: 21, status: 'Pending Approval' },
          { poNumber: 'PO-2026-0125', vendor: 'Dell Technologies', amount: 620000, orderDate: '2026-04-05', ageDays: 10, status: 'Draft' },
        ],
      }

    case 'stock-summary':
      return {
        columns: [
          { key: 'item', label: 'Item', sortable: true },
          { key: 'category', label: 'Category' },
          { key: 'newQty', label: 'New Qty', align: 'right', sortable: true },
          { key: 'refurbQty', label: 'Refurb Qty', align: 'right', sortable: true },
          { key: 'poolQty', label: 'Pool Qty', align: 'right' },
          { key: 'totalValue', label: 'Total Value (INR)', align: 'right', sortable: true },
        ],
        data: [
          { item: 'Dell Latitude 5540', category: 'Laptops', newQty: 25, refurbQty: 12, poolQty: 8, totalValue: 2850000 },
          { item: 'HP ProBook 450 G10', category: 'Laptops', newQty: 18, refurbQty: 8, poolQty: 5, totalValue: 1860000 },
          { item: 'Dell PowerEdge R750', category: 'Servers', newQty: 4, refurbQty: 2, poolQty: 1, totalValue: 4200000 },
          { item: 'Lenovo ThinkPad T14', category: 'Laptops', newQty: 15, refurbQty: 10, poolQty: 6, totalValue: 1860000 },
          { item: 'HP EliteDesk 800 G9', category: 'Desktops', newQty: 20, refurbQty: 15, poolQty: 10, totalValue: 2250000 },
          { item: 'Dell OptiPlex 7010', category: 'Desktops', newQty: 12, refurbQty: 8, poolQty: 5, totalValue: 1125000 },
          { item: 'Cisco Catalyst 9200', category: 'Networking', newQty: 6, refurbQty: 3, poolQty: 2, totalValue: 1650000 },
        ],
      }

    case 'stock-ledger':
      return {
        columns: [
          { key: 'date', label: 'Date', sortable: true },
          { key: 'item', label: 'Item', sortable: true },
          { key: 'type', label: 'Transaction' },
          { key: 'inQty', label: 'In Qty', align: 'right' },
          { key: 'outQty', label: 'Out Qty', align: 'right' },
          { key: 'balance', label: 'Balance', align: 'right' },
          { key: 'reference', label: 'Reference' },
        ],
        data: [
          { date: '2026-04-12', item: 'Dell Latitude 5540', type: 'GRN', inQty: 10, outQty: 0, balance: 45, reference: 'GRN-2026-0089' },
          { date: '2026-04-11', item: 'Dell Latitude 5540', type: 'Outward', inQty: 0, outQty: 5, balance: 35, reference: 'OUT-2026-0156' },
          { date: '2026-04-10', item: 'HP ProBook 450 G10', type: 'GRN', inQty: 8, outQty: 0, balance: 31, reference: 'GRN-2026-0090' },
          { date: '2026-04-09', item: 'HP ProBook 450 G10', type: 'Outward', inQty: 0, outQty: 3, balance: 23, reference: 'OUT-2026-0155' },
          { date: '2026-04-08', item: 'Dell PowerEdge R750', type: 'GRN', inQty: 2, outQty: 0, balance: 7, reference: 'GRN-2026-0088' },
          { date: '2026-04-07', item: 'Lenovo ThinkPad T14', type: 'Outward', inQty: 0, outQty: 4, balance: 31, reference: 'OUT-2026-0154' },
        ],
      }

    case 'low-stock':
      return {
        columns: [
          { key: 'item', label: 'Item', sortable: true },
          { key: 'category', label: 'Category' },
          { key: 'currentStock', label: 'Current Stock', align: 'right', sortable: true },
          { key: 'reorderLevel', label: 'Reorder Level', align: 'right' },
          { key: 'reorderQty', label: 'Reorder Qty', align: 'right' },
          { key: 'status', label: 'Status' },
        ],
        data: [
          { item: 'Dell OptiPlex 7010', category: 'Desktops', currentStock: 3, reorderLevel: 10, reorderQty: 20, status: 'Critical' },
          { item: 'Cisco Catalyst 9200', category: 'Networking', currentStock: 2, reorderLevel: 5, reorderQty: 10, status: 'Critical' },
          { item: 'HP LaserJet Pro', category: 'Printers', currentStock: 4, reorderLevel: 8, reorderQty: 15, status: 'Low' },
          { item: 'Samsung 27" Monitor', category: 'Monitors', currentStock: 6, reorderLevel: 10, reorderQty: 20, status: 'Low' },
          { item: 'Logitech Keyboard', category: 'Peripherals', currentStock: 8, reorderLevel: 15, reorderQty: 30, status: 'Low' },
          { item: 'WD 1TB HDD', category: 'Storage', currentStock: 5, reorderLevel: 10, reorderQty: 25, status: 'Low' },
        ],
      }

    case 'stock-valuation':
      return {
        columns: [
          { key: 'category', label: 'Category', sortable: true },
          { key: 'itemCount', label: 'Items', align: 'right', sortable: true },
          { key: 'totalQty', label: 'Total Qty', align: 'right', sortable: true },
          { key: 'avgUnitCost', label: 'Avg Unit Cost (INR)', align: 'right' },
          { key: 'totalValue', label: 'Total Value (INR)', align: 'right', sortable: true },
          { key: 'percentage', label: '% of Total', align: 'right' },
        ],
        data: [
          { category: 'Laptops', itemCount: 12, totalQty: 145, avgUnitCost: 45000, totalValue: 6525000, percentage: '34%' },
          { category: 'Servers', itemCount: 4, totalQty: 15, avgUnitCost: 350000, totalValue: 5250000, percentage: '28%' },
          { category: 'Desktops', itemCount: 8, totalQty: 95, avgUnitCost: 35000, totalValue: 3325000, percentage: '17%' },
          { category: 'Networking', itemCount: 6, totalQty: 30, avgUnitCost: 75000, totalValue: 2250000, percentage: '12%' },
          { category: 'Monitors', itemCount: 5, totalQty: 60, avgUnitCost: 15000, totalValue: 900000, percentage: '5%' },
          { category: 'Peripherals', itemCount: 15, totalQty: 200, avgUnitCost: 3500, totalValue: 700000, percentage: '4%' },
        ],
      }

    case 'warehouse-stock':
      return {
        columns: [
          { key: 'warehouse', label: 'Warehouse', sortable: true },
          { key: 'location', label: 'Location' },
          { key: 'totalItems', label: 'Total Items', align: 'right', sortable: true },
          { key: 'totalQty', label: 'Total Qty', align: 'right', sortable: true },
          { key: 'totalValue', label: 'Value (INR)', align: 'right', sortable: true },
          { key: 'utilization', label: 'Utilization', align: 'right' },
        ],
        data: [
          { warehouse: 'Main Warehouse', location: 'Pune', totalItems: 45, totalQty: 350, totalValue: 12500000, utilization: '78%' },
          { warehouse: 'Service Center', location: 'Mumbai', totalItems: 25, totalQty: 120, totalValue: 4200000, utilization: '65%' },
          { warehouse: 'Regional Hub', location: 'Bangalore', totalItems: 18, totalQty: 80, totalValue: 2800000, utilization: '52%' },
          { warehouse: 'North Branch', location: 'Delhi', totalItems: 12, totalQty: 55, totalValue: 1800000, utilization: '45%' },
          { warehouse: 'East Branch', location: 'Kolkata', totalItems: 8, totalQty: 30, totalValue: 950000, utilization: '30%' },
        ],
      }

    case 'device-lifecycle':
      return {
        columns: [
          { key: 'serialNo', label: 'Serial #', sortable: true },
          { key: 'model', label: 'Model' },
          { key: 'inwardDate', label: 'Inward Date', sortable: true },
          { key: 'currentStage', label: 'Current Stage' },
          { key: 'daysInProcess', label: 'Days in Process', sortable: true, align: 'right' },
          { key: 'assignedTo', label: 'Assigned To' },
          { key: 'status', label: 'Status' },
        ],
        data: [
          { serialNo: 'SN-2026-00456', model: 'Dell Latitude 5540', inwardDate: '2026-04-05', currentStage: 'QC', daysInProcess: 10, assignedTo: 'Anita Desai', status: 'In Progress' },
          { serialNo: 'SN-2026-00457', model: 'HP ProBook 450 G10', inwardDate: '2026-04-08', currentStage: 'Repair', daysInProcess: 7, assignedTo: 'Vikram Singh', status: 'In Progress' },
          { serialNo: 'SN-2026-00458', model: 'Dell Latitude 5540', inwardDate: '2026-04-10', currentStage: 'Inspection', daysInProcess: 5, assignedTo: 'Anita Desai', status: 'Pending' },
          { serialNo: 'SN-2026-00459', model: 'Lenovo ThinkPad T14', inwardDate: '2026-04-12', currentStage: 'Paint', daysInProcess: 3, assignedTo: 'Vikram Singh', status: 'In Progress' },
          { serialNo: 'SN-2026-00460', model: 'HP EliteDesk 800 G9', inwardDate: '2026-04-01', currentStage: 'Outward', daysInProcess: 14, assignedTo: 'Vikram Singh', status: 'Ready' },
          { serialNo: 'SN-2026-00461', model: 'Dell OptiPlex 7010', inwardDate: '2026-03-25', currentStage: 'Dispatched', daysInProcess: 21, assignedTo: 'Vikram Singh', status: 'Complete' },
        ],
      }

    case 'qc-pass-fail':
      return {
        columns: [
          { key: 'month', label: 'Month', sortable: true },
          { key: 'total', label: 'Total Inspected', sortable: true, align: 'right' },
          { key: 'passed', label: 'Passed', align: 'right', sortable: true },
          { key: 'failed', label: 'Failed', align: 'right', sortable: true },
          { key: 'passRate', label: 'Pass Rate', align: 'right' },
        ],
        data: [
          { month: 'Jan 2026', total: 145, passed: 132, failed: 13, passRate: '91%' },
          { month: 'Feb 2026', total: 168, passed: 155, failed: 13, passRate: '92%' },
          { month: 'Mar 2026', total: 182, passed: 170, failed: 12, passRate: '93%' },
          { month: 'Apr 2026', total: 95, passed: 88, failed: 7, passRate: '93%' },
        ],
      }

    case 'repair-tat':
      return {
        columns: [
          { key: 'category', label: 'Device Category', sortable: true },
          { key: 'totalRepairs', label: 'Total Repairs', sortable: true, align: 'right' },
          { key: 'avgTATDays', label: 'Avg TAT (Days)', sortable: true, align: 'right' },
          { key: 'minTAT', label: 'Min TAT', align: 'right' },
          { key: 'maxTAT', label: 'Max TAT', align: 'right' },
          { key: 'withinSLA', label: 'Within SLA', align: 'right' },
        ],
        data: [
          { category: 'Laptops', totalRepairs: 85, avgTATDays: 4.2, minTAT: 1, maxTAT: 12, withinSLA: '88%' },
          { category: 'Desktops', totalRepairs: 42, avgTATDays: 3.1, minTAT: 1, maxTAT: 8, withinSLA: '92%' },
          { category: 'Servers', totalRepairs: 12, avgTATDays: 6.5, minTAT: 2, maxTAT: 15, withinSLA: '75%' },
          { category: 'Networking', totalRepairs: 18, avgTATDays: 5.0, minTAT: 1, maxTAT: 10, withinSLA: '82%' },
          { category: 'Printers', totalRepairs: 25, avgTATDays: 3.8, minTAT: 1, maxTAT: 9, withinSLA: '85%' },
        ],
      }

    case 'inward-outward-trend':
      return {
        columns: [
          { key: 'month', label: 'Month', sortable: true },
          { key: 'inwardCount', label: 'Inward', sortable: true, align: 'right' },
          { key: 'outwardCount', label: 'Outward', sortable: true, align: 'right' },
          { key: 'netFlow', label: 'Net Flow', align: 'right' },
          { key: 'inwardValue', label: 'Inward Value (INR)', align: 'right' },
          { key: 'outwardValue', label: 'Outward Value (INR)', align: 'right' },
        ],
        data: [
          { month: 'Jan 2026', inwardCount: 120, outwardCount: 95, netFlow: 25, inwardValue: 4500000, outwardValue: 3800000 },
          { month: 'Feb 2026', inwardCount: 135, outwardCount: 110, netFlow: 25, inwardValue: 5200000, outwardValue: 4100000 },
          { month: 'Mar 2026', inwardCount: 150, outwardCount: 140, netFlow: 10, inwardValue: 5800000, outwardValue: 5500000 },
          { month: 'Apr 2026', inwardCount: 80, outwardCount: 70, netFlow: 10, inwardValue: 3200000, outwardValue: 2800000 },
        ],
      }

    default:
      return {
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'description', label: 'Description' },
          { key: 'value', label: 'Value', align: 'right' },
        ],
        data: [
          { id: 1, description: 'Sample Row 1', value: 100000 },
          { id: 2, description: 'Sample Row 2', value: 200000 },
          { id: 3, description: 'Sample Row 3', value: 300000 },
        ],
      }
  }
}
