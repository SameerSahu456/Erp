import { useState } from 'react'
import { Landmark, BookOpen, AlertCircle, CheckCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

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

// Summary calculations
const bankCredits = mockBankTransactions
  .filter((t) => t.type === 'Credit')
  .reduce((sum, t) => sum + t.amount, 0)
const bankDebits = mockBankTransactions
  .filter((t) => t.type === 'Debit')
  .reduce((sum, t) => sum + t.amount, 0)
const bankBalance = bankCredits - bankDebits

const bankEntries = mockLedgerEntries.filter((e) => e.accountName.includes('Bank'))
const bookDebits = bankEntries.reduce((sum, e) => sum + e.debit, 0)
const bookCredits = bankEntries.reduce((sum, e) => sum + e.credit, 0)
const bookBalance = bookDebits - bookCredits

const difference = bankBalance - bookBalance
const matchedCount = mockBankTransactions.filter((t) => t.matchStatus === 'Matched').length
const matchPercent = Math.round((matchedCount / mockBankTransactions.length) * 100)

function BankReconciliationPage() {
  const [selectedBankTx, setSelectedBankTx] = useState<string | null>(null)
  const [selectedBookEntry, setSelectedBookEntry] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Bank Reconciliation</h2>
        <Button>Reconcile</Button>
      </div>

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
                  {mockBankTransactions.map((tx) => (
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
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          disabled={!selectedBankTx || !selectedBookEntry}
        >
          Match Selected
        </Button>
        <Button
          variant="outline"
          disabled={!selectedBankTx && !selectedBookEntry}
          onClick={() => { setSelectedBankTx(null); setSelectedBookEntry(null) }}
        >
          Clear Selection
        </Button>
      </div>
    </div>
  )
}

export default BankReconciliationPage
