import { IndianRupee, TrendingUp, TrendingDown, Percent } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/common/StatsRow'
import { DataCard } from '@/components/common/DataCard'

import { mockLedgerEntries } from '@/modules/accounting/data/ledger'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

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
      <h2 className="text-2xl font-display font-semibold">Accounting Dashboard</h2>

      <StatsRow
        stats={[
          {
            label: 'Revenue',
            value: formatCurrency(totalRevenue),
            icon: IndianRupee,
            trend: { value: 22, isPositive: true },
          },
          {
            label: 'Expenses',
            value: formatCurrency(totalExpenses + payableDebits),
            icon: TrendingDown,
          },
          {
            label: 'Net Profit',
            value: formatCurrency(netProfit),
            icon: TrendingUp,
            trend: { value: 15, isPositive: true },
          },
          {
            label: 'Profit Margin',
            value: `${profitMargin}%`,
            icon: Percent,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* P&L Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Profit & Loss Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
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
            <CardTitle>Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DataCard
                label="Cash Inflows"
                value={formatCurrency(cashInflows)}
                icon={TrendingUp}
              />
              <DataCard
                label="Cash Outflows"
                value={formatCurrency(cashOutflows)}
                icon={TrendingDown}
              />
            </div>
            <div className="mt-4 rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">Net Cash Flow</p>
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
