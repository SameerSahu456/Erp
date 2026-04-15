// ── Ledger ──
export type LedgerAccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'

export interface LedgerEntry {
  id: string
  date: string
  accountName: string
  accountType: LedgerAccountType
  description: string
  reference: string  // INV-001, PO-001, etc.
  debit: number
  credit: number
  balance: number
}

// ── Reconciliation ──
export interface BankTransaction {
  id: string
  date: string
  description: string
  reference: string
  amount: number
  type: 'Credit' | 'Debit'
  matchStatus: 'Matched' | 'Unmatched' | 'Partial'
  matchedEntryId?: string
}

export interface ReconciliationSummary {
  bankBalance: number
  bookBalance: number
  difference: number
  matchedCount: number
  unmatchedCount: number
  lastReconciled?: string
}
