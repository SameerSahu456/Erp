import { Landmark, BookOpen, AlertCircle, CheckCircle, Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { StatsRow } from '@/components/common/display/StatsRow'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { EmptyState } from '@/components/common/feedback/EmptyState'
import { PageHeader } from '@/components/page-shells'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

import { formatINR as formatCurrency } from '@/lib/currency'
import { formatDate, getMatchStatusVariant, bankEntries } from "../../hooks/bank/useBankReconciliation"
import type { BankReconciliationController } from "../../hooks/bank/useBankReconciliation"
import { BANK_RECONCILIATION_STRINGS as S } from "./bank-reconciliation.strings"

export function BankReconciliationBody({ f }: { f: BankReconciliationController }) {
  const {
    transactions,
    selectedBankTx,
    setSelectedBankTx,
    selectedBookEntry,
    setSelectedBookEntry,
    isSelectedAlreadyMatched,
    handleMatch,
    handleUnmatch,
    bankBalance,
    bookBalance,
    difference,
    matchPercent,
  } = f

  return (
    <div className="space-y-6">
      <PageHeader
        title={S.page.title}
        subtitle={S.page.subtitle}
        breadcrumbs={[{ label: S.page.breadcrumbs.reconciliation }, { label: S.page.breadcrumbs.bank }]}
        actions={<Button>{S.page.actions.reconcile}</Button>}
      />

      <StatsRow
        stats={[
          { label: S.stats.bankBalance, value: formatCurrency(bankBalance), icon: Landmark },
          { label: S.stats.bookBalance, value: formatCurrency(bookBalance), icon: BookOpen },
          {
            label: S.stats.difference,
            value: formatCurrency(Math.abs(difference)),
            icon: AlertCircle,
            className: difference !== 0 ? 'border-destructive/30' : undefined,
          },
          { label: S.stats.matchPercent, value: `${matchPercent}%`, icon: CheckCircle },
        ]}
      />

      {/* Two-panel side-by-side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bank Transactions Panel */}
        <Card>
          <CardHeader>
            <CardTitle>{S.bankTransactions.cardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                  <TableRow>
                    <TableHead>{S.bankTransactions.columns.date}</TableHead>
                    <TableHead>{S.bankTransactions.columns.description}</TableHead>
                    <TableHead>{S.bankTransactions.columns.type}</TableHead>
                    <TableHead className="text-right">{S.bankTransactions.columns.amount}</TableHead>
                    <TableHead>{S.bankTransactions.columns.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <EmptyState
                          icon={Inbox}
                          title={S.bankTransactions.empty.title}
                          description={S.bankTransactions.empty.description}
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
            <CardTitle>{S.bookEntries.cardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                  <TableRow>
                    <TableHead>{S.bookEntries.columns.date}</TableHead>
                    <TableHead>{S.bookEntries.columns.description}</TableHead>
                    <TableHead className="text-right">{S.bookEntries.columns.debit}</TableHead>
                    <TableHead className="text-right">{S.bookEntries.columns.credit}</TableHead>
                    <TableHead>{S.bookEntries.columns.ref}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <EmptyState
                          icon={Inbox}
                          title={S.bookEntries.empty.title}
                          description={S.bookEntries.empty.description}
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
          {S.actions.matchSelected}
        </Button>
        <Button
          variant="destructive"
          disabled={!isSelectedAlreadyMatched}
          onClick={handleUnmatch}
        >
          {S.actions.unmatch}
        </Button>
        <Button
          variant="outline"
          disabled={!selectedBankTx && !selectedBookEntry}
          onClick={() => { setSelectedBankTx(null); setSelectedBookEntry(null) }}
        >
          {S.actions.clearSelection}
        </Button>
        <Typography asChild variant="helper"><p>
          {!selectedBankTx && !selectedBookEntry && S.hints.selectBoth}
          {selectedBankTx && !selectedBookEntry && !isSelectedAlreadyMatched && S.hints.selectBookEntry}
          {selectedBankTx && isSelectedAlreadyMatched && S.hints.alreadyMatched}
          {selectedBankTx && selectedBookEntry && !isSelectedAlreadyMatched && S.hints.readyToMatch}
        </p></Typography>
      </div>
    </div>
  )
}
