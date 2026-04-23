import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'

import { mockLedgerEntries } from '@/modules/accounting/data/ledger'
import type { LedgerAccountType } from '@/modules/accounting/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

const accountTypeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  Asset: 'info',
  Liability: 'warning',
  Equity: 'neutral',
  Revenue: 'success',
  Expense: 'error',
}

// Aggregate by account
const accountTotals = new Map<string, { type: LedgerAccountType; debit: number; credit: number }>()
mockLedgerEntries.forEach((e) => {
  const existing = accountTotals.get(e.accountName)
  if (existing) {
    existing.debit += e.debit
    existing.credit += e.credit
  } else {
    accountTotals.set(e.accountName, { type: e.accountType, debit: e.debit, credit: e.credit })
  }
})

// P&L Statement
const plColumns = [
  { key: 'section', label: 'Section' },
  { key: 'account', label: 'Account', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true, align: 'right' as const },
]

const revenueAccounts = Array.from(accountTotals.entries())
  .filter(([, v]) => v.type === 'Revenue')
  .map(([name, v]) => ({ section: 'Revenue', account: name, amount: v.credit }))

const expenseAccounts = Array.from(accountTotals.entries())
  .filter(([, v]) => v.type === 'Expense')
  .map(([name, v]) => ({ section: 'Expense', account: name, amount: v.debit }))

const totalRevenue = revenueAccounts.reduce((s, r) => s + r.amount, 0)
const totalExpense = expenseAccounts.reduce((s, r) => s + r.amount, 0)

const plData = [
  ...revenueAccounts,
  { section: 'Total Revenue', account: 'Total Revenue', amount: totalRevenue },
  ...expenseAccounts,
  { section: 'Total Expenses', account: 'Total Expenses', amount: totalExpense },
  { section: 'Net Profit', account: 'Net Profit', amount: totalRevenue - totalExpense },
]

// Balance Sheet
const bsColumns = [
  { key: 'section', label: 'Section' },
  { key: 'account', label: 'Account', sortable: true },
  { key: 'balance', label: 'Balance', sortable: true, align: 'right' as const },
]

const assetAccounts = Array.from(accountTotals.entries())
  .filter(([, v]) => v.type === 'Asset')
  .map(([name, v]) => ({ section: 'Assets', account: name, balance: v.debit - v.credit }))

const liabilityAccounts = Array.from(accountTotals.entries())
  .filter(([, v]) => v.type === 'Liability')
  .map(([name, v]) => ({ section: 'Liabilities', account: name, balance: v.credit - v.debit }))

const totalAssets = assetAccounts.reduce((s, r) => s + r.balance, 0)
const totalLiabilities = liabilityAccounts.reduce((s, r) => s + r.balance, 0)

const bsData = [
  ...assetAccounts,
  { section: 'Total Assets', account: 'Total Assets', balance: totalAssets },
  ...liabilityAccounts,
  { section: 'Total Liabilities', account: 'Total Liabilities', balance: totalLiabilities },
  { section: 'Equity', account: 'Retained Earnings', balance: totalAssets - totalLiabilities },
]

// Cash Flow
const cfColumns = [
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description' },
  { key: 'inflow', label: 'Inflow', sortable: true, align: 'right' as const },
  { key: 'outflow', label: 'Outflow', sortable: true, align: 'right' as const },
]

const bankEntries = mockLedgerEntries.filter((e) => e.accountName.includes('Bank'))
const cfData = bankEntries.map((e) => ({
  category: e.debit > 0 ? 'Operating Inflow' : 'Operating Outflow',
  description: e.description,
  inflow: e.debit,
  outflow: e.credit,
}))

// Trial Balance
const tbColumns = [
  { key: 'account', label: 'Account', sortable: true },
  { key: 'type', label: 'Type' },
  { key: 'debit', label: 'Debit', sortable: true, align: 'right' as const },
  { key: 'credit', label: 'Credit', sortable: true, align: 'right' as const },
]

const tbData = Array.from(accountTotals.entries()).map(([name, vals]) => ({
  account: name,
  type: vals.type,
  debit: vals.debit,
  credit: vals.credit,
}))

// Tax Summary
const taxColumns = [
  { key: 'taxType', label: 'Tax Type' },
  { key: 'collected', label: 'Collected (Output)', sortable: true, align: 'right' as const },
  { key: 'paid', label: 'Paid (Input)', sortable: true, align: 'right' as const },
  { key: 'net', label: 'Net Payable', sortable: true, align: 'right' as const },
]

const gstEntries = mockLedgerEntries.filter((e) => e.accountName.includes('GST'))
const gstCollected = gstEntries.reduce((s, e) => s + e.credit, 0)
const gstPaid = gstEntries.reduce((s, e) => s + e.debit, 0)

const taxData = [
  { taxType: 'CGST', collected: Math.round(gstCollected / 2), paid: Math.round(gstPaid / 2), net: Math.round((gstCollected - gstPaid) / 2) },
  { taxType: 'SGST', collected: Math.round(gstCollected / 2), paid: Math.round(gstPaid / 2), net: Math.round((gstCollected - gstPaid) / 2) },
  { taxType: 'Total GST', collected: gstCollected, paid: gstPaid, net: gstCollected - gstPaid },
]

const tabs: TabConfig[] = [
  { id: 'pl', label: 'P&L Statement', columns: plColumns, data: plData },
  { id: 'bs', label: 'Balance Sheet', columns: bsColumns, data: bsData },
  { id: 'cf', label: 'Cash Flow', columns: cfColumns, data: cfData },
  { id: 'tb', label: 'Trial Balance', columns: tbColumns, data: tbData },
  { id: 'tax', label: 'Tax Summary', columns: taxColumns, data: taxData },
]

const cellFormatter: CellFormatter = (value, key, row) => {
  if (
    (key === 'amount' || key === 'balance' || key === 'debit' || key === 'credit' ||
     key === 'inflow' || key === 'outflow' || key === 'collected' || key === 'paid' || key === 'net') &&
    typeof value === 'number'
  ) {
    if (value === 0) return { display: '-', className: 'text-muted-foreground' }
    return { display: formatCurrency(value) }
  }
  if (key === 'type' && typeof value === 'string') {
    return {
      display: <StatusBadge variant={accountTypeVariant[value] ?? 'neutral'}>{value}</StatusBadge>,
    }
  }
  if (key === 'section' && typeof value === 'string') {
    if (value.startsWith('Total') || value === 'Net Profit' || value === 'Equity') {
      return { className: 'font-semibold bg-muted/30' }
    }
    return {
      display: <StatusBadge variant={accountTypeVariant[value] ?? 'neutral'}>{value}</StatusBadge>,
    }
  }
  if (key === 'account' && typeof value === 'string') {
    const section = row['section']
    if (section === 'Total Revenue' || section === 'Total Expenses' || section === 'Net Profit' || section === 'Total Assets' || section === 'Total Liabilities' || section === 'Equity') {
      return { className: 'font-semibold bg-muted/30' }
    }
  }
  return null
}

function AccountingReportsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-semibold">Financial Reports</h2>

      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={25}
        persistKey="accounting-reports"
      />
    </div>
  )
}

export default AccountingReportsPage
