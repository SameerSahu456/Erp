import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ListPageShell } from '@/components/page'

import { mockLedgerEntries } from '@/modules/accounting/data/ledger'
import type { LedgerAccountType } from '@/modules/accounting/types'
import { formatINR as formatCurrency } from '@/lib/currency'

const glColumns = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'accountName', label: 'Account', sortable: true },
  { key: 'accountType', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'reference', label: 'Reference' },
  { key: 'debit', label: 'Debit', sortable: true, align: 'right' as const },
  { key: 'credit', label: 'Credit', sortable: true, align: 'right' as const },
  { key: 'balance', label: 'Balance', sortable: true, align: 'right' as const },
]

function buildGLData(filter?: LedgerAccountType | string) {
  let entries = mockLedgerEntries
  if (filter === 'AR') {
    entries = entries.filter((e) => e.accountName === 'Accounts Receivable')
  } else if (filter === 'AP') {
    entries = entries.filter((e) => e.accountName === 'Accounts Payable')
  } else if (filter) {
    entries = entries.filter((e) => e.accountType === filter)
  }
  return entries.map((e) => ({
    id: e.id,
    date: e.date,
    accountName: e.accountName,
    accountType: e.accountType,
    description: e.description,
    reference: e.reference,
    debit: e.debit,
    credit: e.credit,
    balance: e.balance,
  }))
}

// Trial Balance: aggregate by account
const trialBalanceMap = new Map<string, { debit: number; credit: number; type: LedgerAccountType }>()
mockLedgerEntries.forEach((e) => {
  const existing = trialBalanceMap.get(e.accountName)
  if (existing) {
    existing.debit += e.debit
    existing.credit += e.credit
  } else {
    trialBalanceMap.set(e.accountName, { debit: e.debit, credit: e.credit, type: e.accountType })
  }
})

const trialBalanceColumns = [
  { key: 'accountName', label: 'Account', sortable: true },
  { key: 'accountType', label: 'Type' },
  { key: 'totalDebit', label: 'Total Debit', sortable: true, align: 'right' as const },
  { key: 'totalCredit', label: 'Total Credit', sortable: true, align: 'right' as const },
  { key: 'netBalance', label: 'Net Balance', sortable: true, align: 'right' as const },
]

const trialBalanceData = Array.from(trialBalanceMap.entries()).map(([name, vals]) => ({
  accountName: name,
  accountType: vals.type,
  totalDebit: vals.debit,
  totalCredit: vals.credit,
  netBalance: vals.debit - vals.credit,
}))

// P&L: Revenue vs Expense
const plColumns = [
  { key: 'category', label: 'Category' },
  { key: 'accountName', label: 'Account', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true, align: 'right' as const },
]

const plData = mockLedgerEntries
  .filter((e) => e.accountType === 'Revenue' || e.accountType === 'Expense')
  .map((e) => ({
    category: e.accountType,
    accountName: e.accountName,
    amount: e.accountType === 'Revenue' ? e.credit : e.debit,
    reference: e.reference,
  }))

// Balance Sheet: Assets, Liabilities, Equity
const bsColumns = [
  { key: 'category', label: 'Category' },
  { key: 'accountName', label: 'Account', sortable: true },
  { key: 'debit', label: 'Debit', sortable: true, align: 'right' as const },
  { key: 'credit', label: 'Credit', sortable: true, align: 'right' as const },
]

const bsData = mockLedgerEntries
  .filter((e) => e.accountType === 'Asset' || e.accountType === 'Liability' || e.accountType === 'Equity')
  .map((e) => ({
    category: e.accountType,
    accountName: e.accountName,
    debit: e.debit,
    credit: e.credit,
  }))

// Cash Flow: Bank account entries
const cfColumns = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'description', label: 'Description' },
  { key: 'reference', label: 'Reference' },
  { key: 'inflow', label: 'Inflow', sortable: true, align: 'right' as const },
  { key: 'outflow', label: 'Outflow', sortable: true, align: 'right' as const },
]

const cfData = mockLedgerEntries
  .filter((e) => e.accountName.includes('Bank'))
  .map((e) => ({
    date: e.date,
    description: e.description,
    reference: e.reference,
    inflow: e.debit,
    outflow: e.credit,
  }))

const tabs: TabConfig[] = [
  { id: 'gl', label: 'General Ledger', columns: glColumns, data: buildGLData() },
  { id: 'ar', label: 'AR', columns: glColumns, data: buildGLData('AR') },
  { id: 'ap', label: 'AP', columns: glColumns, data: buildGLData('AP') },
  { id: 'trial-balance', label: 'Trial Balance', columns: trialBalanceColumns, data: trialBalanceData },
  { id: 'pl', label: 'P&L', columns: plColumns, data: plData },
  { id: 'bs', label: 'Balance Sheet', columns: bsColumns, data: bsData },
  { id: 'cf', label: 'Cash Flow', columns: cfColumns, data: cfData },
]

const accountTypeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  Asset: 'info',
  Liability: 'warning',
  Equity: 'neutral',
  Revenue: 'success',
  Expense: 'error',
}

const cellFormatter: CellFormatter = (value, key, _row) => {
  if (
    (key === 'debit' || key === 'credit' || key === 'balance' ||
     key === 'totalDebit' || key === 'totalCredit' || key === 'netBalance' ||
     key === 'amount' || key === 'inflow' || key === 'outflow') &&
    typeof value === 'number'
  ) {
    if (value === 0) return { display: '-', className: 'text-muted-foreground' }
    return { display: formatCurrency(value) }
  }
  if (key === 'accountType' && typeof value === 'string') {
    return {
      display: (
        <StatusBadge variant={accountTypeVariant[value] ?? 'neutral'}>
          {value}
        </StatusBadge>
      ),
    }
  }
  if (key === 'category' && typeof value === 'string' && (value === 'Revenue' || value === 'Expense' || value === 'Asset' || value === 'Liability' || value === 'Equity')) {
    return {
      display: (
        <StatusBadge variant={accountTypeVariant[value] ?? 'neutral'}>
          {value}
        </StatusBadge>
      ),
    }
  }
  return null
}

function LedgerPage() {
  return (
    <ListPageShell
      title="Accounting Ledger"
      subtitle="All ledger entries — debits, credits, and account balances."
      breadcrumbs={[{ label: 'Accounting' }, { label: 'Ledger' }]}
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="accounting-ledger"
        emptyState={{
          title: 'No ledger entries yet',
          description: 'Ledger entries appear here as transactions are recorded.',
        }}
      />
    </ListPageShell>
  )
}

export default LedgerPage
