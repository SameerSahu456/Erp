import { Briefcase } from 'lucide-react'

import type { ReportCategory, ReportColumn } from '../../types'

// Column shorthands. Every director report is a small summary table, so the
// definitions read better as one line per column than as expanded literals.
const text = (key: string, label: string, filterable = false): ReportColumn => ({
  key,
  label,
  sortable: true,
  filterable,
})
const money = (key: string, label: string): ReportColumn => ({
  key,
  label,
  format: 'currency',
  sortable: true,
  align: 'right',
})
const count = (key: string, label: string): ReportColumn => ({
  key,
  label,
  format: 'number',
  sortable: true,
  align: 'right',
})
const pct = (key: string, label: string): ReportColumn => ({
  key,
  label,
  format: 'percent',
  sortable: true,
  align: 'right',
})
const days = (key: string, label: string): ReportColumn => ({
  key,
  label,
  format: 'days',
  sortable: true,
  align: 'right',
})
const date = (key: string, label: string): ReportColumn => ({
  key,
  label,
  format: 'date',
  sortable: true,
})
const status = (key: string, label: string): ReportColumn => ({
  key,
  label,
  format: 'status',
  filterable: true,
})

/** Board-level reports: growth, profit, cash and risk. These summarise across
 *  the operational areas below rather than listing individual documents. */
export const DIRECTOR_CATEGORY: ReportCategory = {
  id: 'director',
  label: "Director's View",
  description: 'Growth, profitability, cash and risk for the whole business.',
  icon: Briefcase,
  reports: [
    // ── Priority 1: running the business ────────────────────────────────
    {
      id: 'director-summary',
      label: "Director's Business Summary",
      description:
        'The whole business on one page: each headline number against last period and against budget.',
      columns: [
        text('metric', 'Measure'),
        money('thisPeriod', 'This Period'),
        money('lastPeriod', 'Last Period'),
        pct('change', 'Change'),
        money('budget', 'Budget'),
        pct('vsBudget', 'vs Budget'),
        status('status', 'Status'),
      ],
      kpis: [
        { label: 'Headline Measures', agg: 'count', accent: 'primary' },
        { label: 'Strongest Change', column: 'change', agg: 'max', format: 'percent', accent: 'success' },
        { label: 'Weakest Change', column: 'change', agg: 'min', format: 'percent', accent: 'warning' },
      ],
      chart: { type: 'bar', xKey: 'metric', yKey: 'change', yFormat: 'percent', accent: 'indigo' },
    },
    {
      id: 'revenue-margin-trend',
      label: 'Revenue & Margin Trend',
      description:
        'Revenue and gross margin month by month, set against the same month last year, to show whether the business is growing.',
      columns: [
        text('month', 'Month'),
        money('revenue', 'Revenue'),
        money('lastYear', 'Same Month Last Year'),
        pct('growth', 'Growth'),
        money('grossMargin', 'Gross Margin'),
        pct('marginPct', 'Margin %'),
      ],
      kpis: [
        { label: 'Revenue', column: 'revenue', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Last Year', column: 'lastYear', agg: 'sum', format: 'currency', accent: 'primary' },
        { label: 'Avg Growth', column: 'growth', agg: 'avg', format: 'percent', accent: 'info' },
        { label: 'Avg Margin', column: 'marginPct', agg: 'avg', format: 'percent', accent: 'violet' },
      ],
      chart: { type: 'line', xKey: 'month', yKey: 'revenue', yFormat: 'currency', accent: 'emerald' },
    },
    {
      id: 'revenue-by-business-line',
      label: 'Revenue by Business Line',
      description:
        'How much revenue and margin comes from new hardware, refurbished sales, rentals and services.',
      columns: [
        text('line', 'Business Line'),
        money('revenue', 'Revenue'),
        pct('share', 'Share of Revenue'),
        money('grossMargin', 'Gross Margin'),
        pct('marginPct', 'Margin %'),
        pct('growth', 'Growth vs Last Period'),
      ],
      kpis: [
        { label: 'Revenue', column: 'revenue', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Gross Margin', column: 'grossMargin', agg: 'sum', format: 'currency', accent: 'info' },
        { label: 'Best Margin', column: 'marginPct', agg: 'max', format: 'percent', accent: 'violet' },
      ],
      chart: { type: 'bar', xKey: 'line', yKey: 'revenue', yFormat: 'currency', accent: 'emerald' },
    },
    {
      id: 'sales-forecast-vs-target',
      label: 'Sales Forecast vs Target',
      description:
        'Orders already won plus the weighted pipeline for each coming month, against the target, to show the likely gap.',
      columns: [
        text('month', 'Closing Month'),
        money('target', 'Target'),
        money('won', 'Already Won'),
        money('weighted', 'Weighted Pipeline'),
        money('forecast', 'Forecast'),
        money('gap', 'Gap to Target'),
        pct('coverage', 'Forecast vs Target'),
        status('status', 'Status'),
      ],
      kpis: [
        { label: 'Target', column: 'target', agg: 'sum', format: 'currency', accent: 'primary' },
        { label: 'Forecast', column: 'forecast', agg: 'sum', format: 'currency', accent: 'info' },
        { label: 'Gap to Target', column: 'gap', agg: 'sum', format: 'currency', accent: 'warning' },
      ],
      chart: { type: 'bar', xKey: 'month', yKey: 'forecast', yFormat: 'currency', accent: 'sky' },
    },
    {
      id: 'cash-forecast-13-week',
      label: 'Cash Position & 13-Week Forecast',
      description:
        'Expected money in and out for each of the next 13 weeks and the bank balance it leaves, so a shortfall is seen early.',
      columns: [
        text('week', 'Week Starting'),
        money('opening', 'Opening Balance'),
        money('inflow', 'Money In'),
        money('outflow', 'Money Out'),
        money('closing', 'Closing Balance'),
        status('status', 'Status'),
      ],
      kpis: [
        { label: 'Money In', column: 'inflow', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Money Out', column: 'outflow', agg: 'sum', format: 'currency', accent: 'danger' },
        { label: 'Lowest Balance', column: 'closing', agg: 'min', format: 'currency', accent: 'warning' },
      ],
      chart: { type: 'line', xKey: 'week', yKey: 'closing', yFormat: 'currency', accent: 'sky' },
    },
    {
      id: 'working-capital-cycle',
      label: 'Working Capital & Cash Cycle',
      description:
        'How many days money stays locked in stock and unpaid invoices, after the credit vendors give, month by month.',
      columns: [
        text('month', 'Month'),
        days('dso', 'Days to Collect'),
        days('dio', 'Days of Stock'),
        days('dpo', 'Days to Pay Vendors'),
        days('cycle', 'Cash Cycle'),
        money('workingCapital', 'Working Capital'),
      ],
      kpis: [
        { label: 'Avg Cash Cycle', column: 'cycle', agg: 'avg', format: 'days', accent: 'warning' },
        { label: 'Avg Days to Collect', column: 'dso', agg: 'avg', format: 'days', accent: 'info' },
        { label: 'Avg Days of Stock', column: 'dio', agg: 'avg', format: 'days', accent: 'violet' },
        { label: 'Peak Working Capital', column: 'workingCapital', agg: 'max', format: 'currency', accent: 'primary' },
      ],
      chart: { type: 'line', xKey: 'month', yKey: 'cycle', yFormat: 'days', accent: 'amber' },
    },
    {
      id: 'customer-profitability',
      label: 'Customer Profitability',
      description:
        'What each customer really earns you after product cost, refurbishment cost and credit notes, not just what they bill.',
      columns: [
        text('customer', 'Customer'),
        money('revenue', 'Revenue'),
        money('productCost', 'Product Cost'),
        money('refurbCost', 'Refurb Cost'),
        money('creditNotes', 'Credit Notes'),
        money('netMargin', 'Net Margin'),
        pct('marginPct', 'Margin %'),
        status('status', 'Standing'),
      ],
      kpis: [
        { label: 'Revenue', column: 'revenue', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Net Margin', column: 'netMargin', agg: 'sum', format: 'currency', accent: 'info' },
        { label: 'Lowest Margin', column: 'marginPct', agg: 'min', format: 'percent', accent: 'danger' },
      ],
      chart: { type: 'bar', xKey: 'customer', yKey: 'netMargin', yFormat: 'currency', accent: 'emerald' },
    },
    {
      id: 'order-book',
      label: 'Order Book (Booked vs Billed vs Collected)',
      description:
        'Confirmed orders by customer, how much has been invoiced and collected, and what is still to come.',
      columns: [
        text('customer', 'Customer'),
        count('openOrders', 'Open Orders'),
        money('booked', 'Booked'),
        money('billed', 'Billed'),
        money('toBill', 'Still to Bill'),
        money('collected', 'Collected'),
        money('toCollect', 'Still to Collect'),
      ],
      kpis: [
        { label: 'Booked', column: 'booked', agg: 'sum', format: 'currency', accent: 'primary' },
        { label: 'Still to Bill', column: 'toBill', agg: 'sum', format: 'currency', accent: 'info' },
        { label: 'Still to Collect', column: 'toCollect', agg: 'sum', format: 'currency', accent: 'warning' },
      ],
      chart: { type: 'bar', xKey: 'customer', yKey: 'toBill', yFormat: 'currency', accent: 'indigo' },
    },

    // ── Priority 2: risk and profit protection ──────────────────────────
    {
      id: 'deal-margin-register',
      label: 'Deal Margin Register',
      description:
        'Margin on each sales order against the minimum allowed, showing which were sold below it and who approved them.',
      columns: [
        text('order', 'Sales Order'),
        text('customer', 'Customer', true),
        text('salesperson', 'Salesperson', true),
        money('value', 'Order Value'),
        money('margin', 'Margin'),
        pct('marginPct', 'Margin %'),
        pct('floor', 'Minimum Allowed'),
        text('approvedBy', 'Approved By'),
        status('status', 'Status'),
      ],
      kpis: [
        { label: 'Orders', agg: 'count', accent: 'primary' },
        { label: 'Order Value', column: 'value', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Avg Margin', column: 'marginPct', agg: 'avg', format: 'percent', accent: 'info' },
        { label: 'Lowest Margin', column: 'marginPct', agg: 'min', format: 'percent', accent: 'danger' },
      ],
      chart: { type: 'bar', xKey: 'order', yKey: 'marginPct', yFormat: 'percent', accent: 'teal' },
    },
    {
      id: 'discount-analysis',
      label: 'Discount & Price Override Analysis',
      description:
        'How much is given away below list price by each salesperson, and how often prices were overridden.',
      columns: [
        text('salesperson', 'Salesperson'),
        count('quotes', 'Quotes'),
        money('listValue', 'Value at List Price'),
        money('soldValue', 'Value Sold'),
        money('discount', 'Discount Given'),
        pct('discountPct', 'Discount %'),
        count('overrides', 'Price Overrides'),
      ],
      kpis: [
        { label: 'Discount Given', column: 'discount', agg: 'sum', format: 'currency', accent: 'warning' },
        { label: 'Highest Discount', column: 'discountPct', agg: 'max', format: 'percent', accent: 'danger' },
        { label: 'Price Overrides', column: 'overrides', agg: 'sum', format: 'number', accent: 'primary' },
      ],
      chart: { type: 'bar', xKey: 'salesperson', yKey: 'discountPct', yFormat: 'percent', accent: 'orange' },
    },
    {
      id: 'margin-by-salesperson',
      label: 'Margin by Salesperson',
      description:
        'Gross margin each salesperson brings in, not only revenue, with how many of their deals fell below the minimum.',
      columns: [
        text('salesperson', 'Salesperson'),
        money('revenue', 'Revenue'),
        money('grossMargin', 'Gross Margin'),
        pct('marginPct', 'Margin %'),
        pct('avgDiscount', 'Avg Discount'),
        count('belowFloor', 'Deals Below Minimum'),
      ],
      kpis: [
        { label: 'Gross Margin', column: 'grossMargin', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Avg Margin', column: 'marginPct', agg: 'avg', format: 'percent', accent: 'info' },
        { label: 'Deals Below Minimum', column: 'belowFloor', agg: 'sum', format: 'number', accent: 'danger' },
      ],
      chart: { type: 'bar', xKey: 'salesperson', yKey: 'grossMargin', yFormat: 'currency', accent: 'emerald' },
    },
    {
      id: 'customer-retention',
      label: 'Customer Retention & Churn',
      description:
        'Customers who bought again, new customers and customers who stopped buying each month, with the repeat rate.',
      columns: [
        text('month', 'Month'),
        count('active', 'Active Customers'),
        count('repeat', 'Bought Again'),
        count('newCustomers', 'New'),
        count('lost', 'Stopped Buying'),
        pct('repeatRate', 'Repeat Rate'),
        money('revenueLost', 'Revenue Lost'),
      ],
      kpis: [
        { label: 'Avg Repeat Rate', column: 'repeatRate', agg: 'avg', format: 'percent', accent: 'success' },
        { label: 'Customers Lost', column: 'lost', agg: 'sum', format: 'number', accent: 'danger' },
        { label: 'Revenue Lost', column: 'revenueLost', agg: 'sum', format: 'currency', accent: 'warning' },
      ],
      chart: { type: 'line', xKey: 'month', yKey: 'repeatRate', yFormat: 'percent', accent: 'teal' },
    },
    {
      id: 'credit-limit-exposure',
      label: 'Credit Limit Exposure',
      description:
        'What each customer owes plus their open orders, against their credit limit, flagging anyone over it or still ordering while overdue.',
      columns: [
        text('customer', 'Customer'),
        money('limit', 'Credit Limit'),
        money('outstanding', 'Outstanding'),
        money('openOrders', 'Open Orders'),
        money('exposure', 'Total Exposure'),
        pct('used', 'Limit Used'),
        money('overdue', 'Overdue'),
        status('status', 'Status'),
      ],
      kpis: [
        { label: 'Total Exposure', column: 'exposure', agg: 'sum', format: 'currency', accent: 'primary' },
        { label: 'Overdue', column: 'overdue', agg: 'sum', format: 'currency', accent: 'danger' },
        { label: 'Highest Limit Used', column: 'used', agg: 'max', format: 'percent', accent: 'warning' },
      ],
      chart: { type: 'bar', xKey: 'customer', yKey: 'used', yFormat: 'percent', accent: 'rose' },
    },
    {
      id: 'doubtful-debts',
      label: 'Doubtful Debts & Write-offs',
      description:
        'Receivables unlikely to be collected: what is over 90 days, what has been provided for and what has been written off.',
      columns: [
        text('customer', 'Customer'),
        money('over90', 'Over 90 Days'),
        money('provision', 'Provided For'),
        money('writtenOff', 'Written Off'),
        date('lastPayment', 'Last Payment'),
        text('action', 'Next Step'),
        status('status', 'Status'),
      ],
      kpis: [
        { label: 'Over 90 Days', column: 'over90', agg: 'sum', format: 'currency', accent: 'danger' },
        { label: 'Provided For', column: 'provision', agg: 'sum', format: 'currency', accent: 'warning' },
        { label: 'Written Off', column: 'writtenOff', agg: 'sum', format: 'currency', accent: 'primary' },
      ],
      chart: { type: 'bar', xKey: 'customer', yKey: 'over90', yFormat: 'currency', accent: 'danger' },
    },
    {
      id: 'revenue-by-industry',
      label: 'Revenue by Industry',
      description:
        'Which customer industries the business depends on, with the margin each one earns and how fast it is growing.',
      columns: [
        text('industry', 'Industry'),
        count('customers', 'Customers'),
        money('revenue', 'Revenue'),
        pct('share', 'Share of Revenue'),
        pct('marginPct', 'Margin %'),
        pct('growth', 'Growth vs Last Period'),
      ],
      kpis: [
        { label: 'Revenue', column: 'revenue', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Largest Share', column: 'share', agg: 'max', format: 'percent', accent: 'warning' },
        { label: 'Customers', column: 'customers', agg: 'sum', format: 'number', accent: 'primary' },
      ],
      chart: { type: 'bar', xKey: 'industry', yKey: 'revenue', yFormat: 'currency', accent: 'violet' },
    },
    {
      id: 'revenue-by-region',
      label: 'Revenue by Region',
      description:
        'Revenue, customers and growth by state, so you can see where the business is concentrated and where it is thin.',
      columns: [
        text('state', 'State'),
        count('customers', 'Customers'),
        count('orders', 'Orders'),
        money('revenue', 'Revenue'),
        pct('share', 'Share of Revenue'),
        pct('growth', 'Growth vs Last Period'),
      ],
      kpis: [
        { label: 'Revenue', column: 'revenue', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Largest Share', column: 'share', agg: 'max', format: 'percent', accent: 'warning' },
        { label: 'States Served', agg: 'count', accent: 'primary' },
      ],
      chart: { type: 'bar', xKey: 'state', yKey: 'revenue', yFormat: 'currency', accent: 'cyan' },
    },
    {
      id: 'inventory-turnover',
      label: 'Inventory Turnover & Days of Stock',
      description:
        'How many times a year each category of stock sells through, and how many days of sales are sitting in the warehouse.',
      columns: [
        text('category', 'Category'),
        money('costOfSales', 'Cost of Goods Sold'),
        money('avgStock', 'Average Stock'),
        count('turns', 'Turns per Year'),
        days('daysOfStock', 'Days of Stock'),
        status('status', 'Speed'),
      ],
      kpis: [
        { label: 'Average Stock', column: 'avgStock', agg: 'sum', format: 'currency', accent: 'primary' },
        { label: 'Avg Days of Stock', column: 'daysOfStock', agg: 'avg', format: 'days', accent: 'info' },
        { label: 'Slowest Category', column: 'daysOfStock', agg: 'max', format: 'days', accent: 'danger' },
      ],
      chart: { type: 'bar', xKey: 'category', yKey: 'daysOfStock', yFormat: 'days', accent: 'amber' },
    },
    {
      id: 'returns-warranty-cost',
      label: 'Sales Returns & Warranty Cost',
      description:
        'What share of units sold came back or needed a warranty repair, what it cost, and the most common reason.',
      columns: [
        text('category', 'Category'),
        count('sold', 'Units Sold'),
        count('returned', 'Units Returned'),
        pct('returnRate', 'Return Rate'),
        count('claims', 'Warranty Claims'),
        money('cost', 'Cost'),
        text('topReason', 'Main Reason'),
      ],
      kpis: [
        { label: 'Units Returned', column: 'returned', agg: 'sum', format: 'number', accent: 'warning' },
        { label: 'Cost', column: 'cost', agg: 'sum', format: 'currency', accent: 'danger' },
        { label: 'Worst Return Rate', column: 'returnRate', agg: 'max', format: 'percent', accent: 'primary' },
      ],
      chart: { type: 'bar', xKey: 'category', yKey: 'returnRate', yFormat: 'percent', accent: 'rose' },
    },
    {
      id: 'rental-asset-roi',
      label: 'Rental Asset Return on Investment',
      description:
        'What the rental fleet cost, what it has earned after upkeep, and how much of the investment has been recovered.',
      columns: [
        text('category', 'Asset Category'),
        count('assets', 'Assets'),
        money('assetCost', 'Purchase Cost'),
        money('rentEarned', 'Rent Earned'),
        money('upkeep', 'Upkeep'),
        money('netEarned', 'Net Earned'),
        pct('recovered', 'Cost Recovered'),
        pct('yearlyReturn', 'Yearly Return'),
        status('status', 'Status'),
      ],
      kpis: [
        { label: 'Purchase Cost', column: 'assetCost', agg: 'sum', format: 'currency', accent: 'primary' },
        { label: 'Net Earned', column: 'netEarned', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Avg Yearly Return', column: 'yearlyReturn', agg: 'avg', format: 'percent', accent: 'info' },
      ],
      chart: { type: 'bar', xKey: 'category', yKey: 'yearlyReturn', yFormat: 'percent', accent: 'teal' },
    },
    {
      id: 'rental-renewals',
      label: 'Rental Renewals & Expiry Pipeline',
      description:
        'Rental contracts ending in the next 90 days, the monthly rent at stake and whether each is renewing or leaving.',
      columns: [
        text('contract', 'Contract'),
        text('customer', 'Customer', true),
        count('assets', 'Assets'),
        date('expiry', 'Ends On'),
        days('daysLeft', 'Days Left'),
        money('monthlyRent', 'Monthly Rent'),
        status('status', 'Renewal'),
      ],
      kpis: [
        { label: 'Contracts Ending', agg: 'count', accent: 'primary' },
        { label: 'Monthly Rent at Stake', column: 'monthlyRent', agg: 'sum', format: 'currency', accent: 'warning' },
        { label: 'Assets Involved', column: 'assets', agg: 'sum', format: 'number', accent: 'info' },
      ],
      chart: { type: 'bar', xKey: 'customer', yKey: 'monthlyRent', yFormat: 'currency', accent: 'sky' },
    },

    // ── Priority 3: governance and completeness ─────────────────────────
    {
      id: 'exceptions-audit',
      label: 'Exceptions & Audit Report',
      description:
        'Unusual actions that deserve a second look: back-dated entries, deleted documents and changes made after approval.',
      columns: [
        text('exception', 'Exception'),
        count('count', 'Occurrences'),
        money('value', 'Value Involved'),
        date('lastSeen', 'Last Occurred'),
        text('mostBy', 'Most Often By'),
        status('status', 'Attention'),
      ],
      kpis: [
        { label: 'Exceptions', column: 'count', agg: 'sum', format: 'number', accent: 'warning' },
        { label: 'Value Involved', column: 'value', agg: 'sum', format: 'currency', accent: 'danger' },
        { label: 'Exception Types', agg: 'count', accent: 'primary' },
      ],
      chart: { type: 'bar', xKey: 'exception', yKey: 'count', yFormat: 'number', accent: 'orange' },
    },
    {
      id: 'compliance-calendar',
      label: 'Statutory Compliance Calendar',
      description:
        'Every tax and statutory filing with its due date, whether it has been filed and the amount paid or payable.',
      columns: [
        text('filing', 'Filing'),
        text('period', 'Period'),
        date('dueDate', 'Due Date'),
        date('filedOn', 'Filed On'),
        money('amount', 'Amount'),
        status('status', 'Status'),
      ],
      kpis: [
        { label: 'Filings Tracked', agg: 'count', accent: 'primary' },
        { label: 'Amount', column: 'amount', agg: 'sum', format: 'currency', accent: 'info' },
        { label: 'Largest Payment', column: 'amount', agg: 'max', format: 'currency', accent: 'warning' },
      ],
      chart: { type: 'bar', xKey: 'filing', yKey: 'amount', yFormat: 'currency', accent: 'indigo' },
    },
    {
      id: 'order-to-cash-cycle',
      label: 'Order-to-Cash Cycle Time',
      description:
        'How many days each step takes from sending a quote to receiving payment, against the target for that step.',
      columns: [
        text('step', 'Step'),
        days('avgDays', 'Average'),
        days('target', 'Target'),
        days('over', 'Over Target'),
        days('slowest', 'Slowest Case'),
        status('status', 'Status'),
      ],
      kpis: [
        { label: 'Quote to Cash', column: 'avgDays', agg: 'sum', format: 'days', accent: 'primary' },
        { label: 'Target', column: 'target', agg: 'sum', format: 'days', accent: 'info' },
        { label: 'Slowest Step', column: 'avgDays', agg: 'max', format: 'days', accent: 'warning' },
      ],
      chart: { type: 'bar', xKey: 'step', yKey: 'avgDays', yFormat: 'days', accent: 'amber' },
    },
    {
      id: 'stock-write-offs',
      label: 'Stock Write-offs & Adjustments',
      description:
        'Stock value lost to damage, scrap, count shortfalls and obsolescence, by reason, with who approved it.',
      columns: [
        text('reason', 'Reason'),
        count('units', 'Units'),
        money('value', 'Value Lost'),
        pct('share', 'Share'),
        text('approvedBy', 'Approved By'),
      ],
      kpis: [
        { label: 'Value Lost', column: 'value', agg: 'sum', format: 'currency', accent: 'danger' },
        { label: 'Units', column: 'units', agg: 'sum', format: 'number', accent: 'primary' },
        { label: 'Largest Reason', column: 'share', agg: 'max', format: 'percent', accent: 'warning' },
      ],
      chart: { type: 'bar', xKey: 'reason', yKey: 'value', yFormat: 'currency', accent: 'danger' },
    },
    {
      id: 'loans-interest-schedule',
      label: 'Loans & Interest Schedule',
      description:
        'Each borrowing with the amount still owed, its interest rate, the monthly payment and when the next one is due.',
      columns: [
        text('facility', 'Loan'),
        text('lender', 'Lender', true),
        money('sanctioned', 'Sanctioned'),
        money('outstanding', 'Still Owed'),
        pct('rate', 'Interest Rate'),
        money('monthly', 'Monthly Payment'),
        date('nextDue', 'Next Due'),
        status('status', 'Status'),
      ],
      kpis: [
        { label: 'Still Owed', column: 'outstanding', agg: 'sum', format: 'currency', accent: 'danger' },
        { label: 'Monthly Payments', column: 'monthly', agg: 'sum', format: 'currency', accent: 'warning' },
        { label: 'Highest Rate', column: 'rate', agg: 'max', format: 'percent', accent: 'primary' },
      ],
      chart: { type: 'bar', xKey: 'facility', yKey: 'outstanding', yFormat: 'currency', accent: 'slate' },
    },
    {
      id: 'fixed-asset-register',
      label: 'Fixed Asset Register & Depreciation',
      description:
        'What the business owns, including the rental fleet, what it cost, and what it is worth after depreciation.',
      columns: [
        text('assetClass', 'Asset Class'),
        count('assets', 'Assets'),
        money('cost', 'Original Cost'),
        money('depreciated', 'Depreciated So Far'),
        money('netValue', 'Value Today'),
        money('thisPeriod', 'Depreciation This Period'),
      ],
      kpis: [
        { label: 'Original Cost', column: 'cost', agg: 'sum', format: 'currency', accent: 'primary' },
        { label: 'Value Today', column: 'netValue', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Depreciation This Period', column: 'thisPeriod', agg: 'sum', format: 'currency', accent: 'warning' },
      ],
      chart: { type: 'bar', xKey: 'assetClass', yKey: 'netValue', yFormat: 'currency', accent: 'slate' },
    },
    {
      id: 'sales-incentive-statement',
      label: 'Sales Incentive Statement',
      description:
        'Commission owed to each salesperson for the period, worked out from revenue against target, with payout status.',
      columns: [
        text('salesperson', 'Salesperson'),
        money('revenue', 'Revenue'),
        money('target', 'Target'),
        pct('achievement', 'Achievement'),
        pct('rate', 'Incentive Rate'),
        money('incentive', 'Incentive'),
        status('status', 'Payout'),
      ],
      kpis: [
        { label: 'Incentive', column: 'incentive', agg: 'sum', format: 'currency', accent: 'success' },
        { label: 'Avg Achievement', column: 'achievement', agg: 'avg', format: 'percent', accent: 'info' },
        { label: 'Salespeople', agg: 'count', accent: 'primary' },
      ],
      chart: { type: 'bar', xKey: 'salesperson', yKey: 'incentive', yFormat: 'currency', accent: 'emerald' },
    },
  ],
}
