import { IndianRupee, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/common/StatsRow'
import { DataCard } from '@/components/common/DataCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { PageHeader } from '@/components/page'

import { mockSalesInvoices } from '@/modules/invoices/data/sales-invoices'
import { mockPurchaseInvoices } from '@/modules/invoices/data/purchase-invoices'
import { formatINRCompact as formatCurrency } from '@/lib/currency'

// Stats
const outstandingReceivables = mockSalesInvoices
  .filter((inv) => inv.balanceDue > 0)
  .reduce((sum, inv) => sum + inv.balanceDue, 0)

const overdueInvoices = mockSalesInvoices.filter((inv) => inv.status === 'Overdue')
const overdueCount = overdueInvoices.length

const collectedThisMonth = mockSalesInvoices
  .filter((inv) => inv.paidDate && inv.paidDate.startsWith('2026-04'))
  .reduce((sum, inv) => sum + inv.paidAmount, 0)

const payablesDue = mockPurchaseInvoices
  .filter((inv) => inv.balanceDue > 0)
  .reduce((sum, inv) => sum + inv.balanceDue, 0)

// AR Aging
function getAgingDays(dueDate: string): number {
  const now = new Date('2026-04-15')
  const due = new Date(dueDate)
  const diff = now.getTime() - due.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const agingBuckets = [
  { label: '0-30 days', min: 0, max: 30 },
  { label: '31-60 days', min: 31, max: 60 },
  { label: '61-90 days', min: 61, max: 90 },
  { label: '90+ days', min: 91, max: Infinity },
]

const agingData = agingBuckets.map((bucket) => {
  const invoices = mockSalesInvoices.filter((inv) => {
    if (inv.balanceDue <= 0) return false
    const days = getAgingDays(inv.dueDate)
    return days >= bucket.min && days <= bucket.max
  })
  return {
    bucket: bucket.label,
    count: invoices.length,
    amount: invoices.reduce((sum, inv) => sum + inv.balanceDue, 0),
  }
})

function getStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Sent': return 'info'
    case 'Partially Paid': return 'warning'
    case 'Paid': return 'success'
    case 'Overdue': return 'error'
    case 'Void': return 'neutral'
    default: return 'neutral'
  }
}

const recentInvoices = [...mockSalesInvoices]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 4)

function InvoiceDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Dashboard"
        subtitle="Receivables, payables, aging, and collection activity at a glance."
        breadcrumbs={[{ label: 'Invoices' }, { label: 'Dashboard' }]}
      />

      <StatsRow
        stats={[
          {
            label: 'Outstanding Receivables',
            value: formatCurrency(outstandingReceivables),
            icon: IndianRupee,
          },
          {
            label: 'Overdue Count',
            value: overdueCount,
            icon: AlertTriangle,
            className: 'border-destructive/30',
          },
          {
            label: 'Collected This Month',
            value: formatCurrency(collectedThisMonth),
            icon: CheckCircle,
            trend: { value: 18, isPositive: true },
          },
          {
            label: 'Payables Due',
            value: formatCurrency(payablesDue),
            icon: Clock,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* AR Aging */}
        <Card>
          <CardHeader>
            <CardTitle>AR Aging Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Aging Bucket</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Invoices</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {agingData.map((row) => (
                    <tr key={row.bucket} className="border-b last:border-b-0">
                      <td className="px-4 py-2 font-medium">{row.bucket}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{row.count}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recentInvoices.map((inv) => (
                <DataCard
                  key={inv.id}
                  label={`${inv.invoiceNumber} - ${inv.customerName}`}
                  value={formatCurrency(inv.grandTotal)}
                  className={inv.status === 'Overdue' ? 'border-destructive/30' : undefined}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentInvoices.map((inv) => (
                <StatusBadge key={inv.id} variant={getStatusVariant(inv.status)}>
                  {inv.invoiceNumber}: {inv.status}
                </StatusBadge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default InvoiceDashboard
