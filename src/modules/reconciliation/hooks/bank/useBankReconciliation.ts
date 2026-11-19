import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'

import { mockBankTransactions } from '@/modules/accounting/data/bank-transactions'
import { mockLedgerEntries } from '@/modules/accounting/data/ledger'
import { formatIST_date } from "@shared/lib/date"

export const formatDate = (dateStr: string) => formatIST_date(dateStr)

export function getMatchStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Matched': return 'success'
    case 'Unmatched': return 'error'
    case 'Partial': return 'warning'
    default: return 'neutral'
  }
}

export const bankEntries = mockLedgerEntries.filter((e) => e.accountName.includes('Bank'))

export function useBankReconciliation() {
  const [transactions, setTransactions] = useState(mockBankTransactions)
  const [selectedBankTx, setSelectedBankTx] = useState<string | null>(null)
  const [selectedBookEntry, setSelectedBookEntry] = useState<string | null>(null)

  const { bankBalance, bookBalance, difference, matchPercent } = useMemo(() => {
    const credits = transactions.filter((t) => t.type === 'Credit').reduce((s, t) => s + t.amount, 0)
    const debits = transactions.filter((t) => t.type === 'Debit').reduce((s, t) => s + t.amount, 0)
    const bank = credits - debits
    const bookDebit = bankEntries.reduce((s, e) => s + e.debit, 0)
    const bookCredit = bankEntries.reduce((s, e) => s + e.credit, 0)
    const book = bookDebit - bookCredit
    const matched = transactions.filter((t) => t.matchStatus === 'Matched').length
    const pct = transactions.length > 0 ? Math.round((matched / transactions.length) * 100) : 0
    return { bankBalance: bank, bookBalance: book, difference: bank - book, matchPercent: pct }
  }, [transactions])

  const selectedBankRow = transactions.find((t) => t.id === selectedBankTx)
  const isSelectedAlreadyMatched = selectedBankRow?.matchStatus === 'Matched'

  const handleMatch = () => {
    if (!selectedBankTx || !selectedBookEntry) return
    setTransactions((prev) =>
      prev.map((t) => (t.id === selectedBankTx ? { ...t, matchStatus: 'Matched' } : t))
    )
    toast.success('Transaction matched')
    setSelectedBankTx(null)
    setSelectedBookEntry(null)
  }

  const handleUnmatch = () => {
    if (!selectedBankTx) return
    setTransactions((prev) =>
      prev.map((t) => (t.id === selectedBankTx ? { ...t, matchStatus: 'Unmatched' } : t))
    )
    toast.success('Transaction unmatched')
    setSelectedBankTx(null)
    setSelectedBookEntry(null)
  }


  return {
    transactions,
    setTransactions,
    selectedBankTx,
    setSelectedBankTx,
    selectedBookEntry,
    setSelectedBookEntry,
    selectedBankRow,
    isSelectedAlreadyMatched,
    handleMatch,
    handleUnmatch,
    bankBalance,
    bookBalance,
    difference,
    matchPercent,
  }
}

export type BankReconciliationController = ReturnType<typeof useBankReconciliation>
