import { IndianRupee, TrendingUp, TrendingDown, Percent } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { StatsRow } from '@/components/common/display/StatsRow'
import { DataCard } from '@/components/common/display/DataCard'
import { PageHeader } from '@/components/page-shells'

import { mockLedgerEntries } from '@/modules/accounting/data/ledger'
import { formatINRCompact as formatCurrency } from '@/lib/currency'

import { ACCOUNTING_DASHBOARD_STRINGS as S } from './dashboard.strings'

// Compute financials from ledger
const revenueEntries = mockLedgerEntries.filter((e) => e.accountType === 'Revenue')
const totalRevenue = revenueEntries.reduce((sum, e) => sum + e.credit, 0)

const expenseEntries = mockLedgerEntries.filter((e) => e.accountType === 'Expense')
const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.debit, 0)

// Approximate COGS from payable entries
const payableDebits = mockLedgerEntries
  .filter((e) => e.accountName === 'Accounts Payable')
  .reduce((sum, e) => sum + e.debit, 0)

const netProfit = totalRevenue - totalExpenses - payableDebits
const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'

// P&L Summary rows
const plSummary = [
  { category: 'Sales Revenue', amount: totalRevenue },
  { category: 'Cost of Goods Sold', amount: payableDebits },
  { category: 'Gross Profit', amount: totalRevenue - payableDebits },
  { category: 'Operating Expenses', amount: totalExpenses },
  { category: 'Net Profit', amount: netProfit },
]

// Cash flow from bank entries
const bankEntries = mockLedgerEntries.filter((e) => e.accountName.includes('Bank'))
const cashInflows = bankEntries.reduce((sum, e) => sum + e.debit, 0)
const cashOutflows = bankEntries.reduce((sum, e) => sum + e.credit, 0)
const netCashFlow = cashInflows - cashOutflows

function AccountingDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={S.page.title}
        subtitle={S.page.subtitle}
        breadcrumbs={[{ label: S.breadcrumbs.accounting }, { label: S.breadcrumbs.dashboard }]}
      />

      <StatsRow
        stats={[
          {
            label: S.stats.revenue,
            value: formatCurrency(totalRevenue),
            icon: IndianRupee,
            trend: { value: 22, isPositive: true },
          },
          {
            label: S.stats.expenses,
            value: formatCurrency(totalExpenses + payableDebits),
            icon: TrendingDown,
          },
          {
            label: S.stats.netProfit,
            value: formatCurrency(netProfit),
            icon: TrendingUp,
            trend: { value: 15, isPositive: true },
          },
          {
            label: S.stats.profitMargin,
            value: `${profitMargin}%`,
            icon: Percent,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* P&L Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{S.plCard.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">{S.plCard.categoryHeader}</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">{S.plCard.amountHeader}</th>
                  </tr>
                </thead>
                <tbody>
                  {plSummary.map((row) => (
                    <tr
                      key={row.category}
                      className={`border-b last:border-b-0 ${
                        row.category === 'Gross Profit' || row.category === 'Net Profit'
                          ? 'font-semibold bg-muted/30'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-2">{row.category}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow */}
        <Card>
          <CardHeader>
            <CardTitle>{S.cashFlowCard.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DataCard
                label={S.cashFlowCard.cashInflows}
                value={formatCurrency(cashInflows)}
                icon={TrendingUp}
              />
              <DataCard
                label={S.cashFlowCard.cashOutflows}
                value={formatCurrency(cashOutflows)}
                icon={TrendingDown}
              />
            </div>
            <div className="mt-4 rounded-lg bg-muted/50 p-4 text-center">
              <Typography variant="helper">{S.cashFlowCard.netCashFlow}</Typography>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(netCashFlow)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AccountingDashboard
