import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Landmark, BookOpen, AlertCircle, CheckCircle, Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/page'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

import { mockBankTransactions } from '@/modules/accounting/data/bank-transactions'
import { mockLedgerEntries } from '@/modules/accounting/data/ledger'
import { formatINR as formatCurrency } from '@/lib/currency'

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getMatchStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Matched': return 'success'
    case 'Unmatched': return 'error'
    case 'Partial': return 'warning'
    default: return 'neutral'
  }
}

const bankEntries = mockLedgerEntries.filter((e) => e.accountName.includes('Bank'))

function BankReconciliationPage() {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Reconciliation"
        subtitle="Match bank statements against book entries and resolve differences."
        breadcrumbs={[{ label: 'Reconciliation' }, { label: 'Bank' }]}
        actions={<Button>Reconcile</Button>}
      />

      <StatsRow
        stats={[
          { label: 'Bank Balance', value: formatCurrency(bankBalance), icon: Landmark },
          { label: 'Book Balance', value: formatCurrency(bookBalance), icon: BookOpen },
          {
            label: 'Difference',
            value: formatCurrency(Math.abs(difference)),
            icon: AlertCircle,
            className: difference !== 0 ? 'border-destructive/30' : undefined,
          },
          { label: 'Match %', value: `${matchPercent}%`, icon: CheckCircle },
        ]}
      />

      {/* Two-panel side-by-side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bank Transactions Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <EmptyState
                          icon={Inbox}
                          title="No bank transactions"
                          description="Import a bank statement to begin reconciliation."
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {transactions.map((tx) => (
                    <TableRow
                      key={tx.id}
                      className={cn(
                        'cursor-pointer',
                        selectedBankTx === tx.id && 'bg-primary/10',
                        tx.matchStatus === 'Unmatched' && 'bg-destructive/5'
                      )}
                      onClick={() => setSelectedBankTx(tx.id === selectedBankTx ? null : tx.id)}
                    >
                      <TableCell className="whitespace-nowrap">{formatDate(tx.date)}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">{tx.description}</TableCell>
                      <TableCell>
                        <StatusBadge variant={tx.type === 'Credit' ? 'success' : 'warning'}>
                          {tx.type}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatCurrency(tx.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge variant={getMatchStatusVariant(tx.matchStatus)}>
                          {tx.matchStatus}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Book Entries Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Book Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <EmptyState
                          icon={Inbox}
                          title="No book entries"
                          description="Bank ledger has no postings for this period."
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {bankEntries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={cn(
                        'cursor-pointer',
                        selectedBookEntry === entry.id && 'bg-primary/10'
                      )}
                      onClick={() => setSelectedBookEntry(entry.id === selectedBookEntry ? null : entry.id)}
                    >
                      <TableCell className="whitespace-nowrap">{formatDate(entry.date)}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">{entry.description}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{entry.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={!selectedBankTx || !selectedBookEntry || isSelectedAlreadyMatched}
          onClick={handleMatch}
        >
          Match Selected
        </Button>
        <Button
          variant="destructive"
          disabled={!isSelectedAlreadyMatched}
          onClick={handleUnmatch}
        >
          Unmatch
        </Button>
        <Button
          variant="outline"
          disabled={!selectedBankTx && !selectedBookEntry}
          onClick={() => { setSelectedBankTx(null); setSelectedBookEntry(null) }}
        >
          Clear Selection
        </Button>
        <p className="text-xs text-muted-foreground">
          {!selectedBankTx && !selectedBookEntry && 'Select a bank transaction and a book entry to match.'}
          {selectedBankTx && !selectedBookEntry && !isSelectedAlreadyMatched && 'Now select a book entry to pair with it.'}
          {selectedBankTx && isSelectedAlreadyMatched && 'This transaction is already matched — use Unmatch to release it.'}
          {selectedBankTx && selectedBookEntry && !isSelectedAlreadyMatched && 'Ready to match.'}
        </p>
      </div>
    </div>
  )
}

export default BankReconciliationPage
