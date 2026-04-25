import { useMemo, useCallback } from 'react'
import { toast } from 'sonner'

import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { BusinessMetricsTable, type TabConfig, type CellFormatter } from '@/components/common/BusinessMetricsTable'
import { ListPageShell } from '@/components/page'
import { Button } from '@/components/ui/button'
import type { DataCardProps } from '@/components/common/DataCard'
import { mockRentalContracts } from '../data/contracts'

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`

function RentalBillingPage() {
  const allBilling = useMemo(() => {
    const entries: Array<{
      id: string; period: string; customer: string; contractNumber: string;
      amount: number; status: string; dueDate: string; invoiceNumber: string;
      paidDate: string; _status: string;
    }> = []
    for (const c of mockRentalContracts) {
      for (const b of c.billingHistory) {
        entries.push({
          id: b.id, period: b.period, customer: c.customerName,
          contractNumber: c.contractNumber, amount: b.amount,
          status: b.status, dueDate: b.dueDate,
          invoiceNumber: b.invoiceNumber ?? '-',
          paidDate: b.paidDate ?? '-', _status: b.status,
        })
      }
    }
    return entries
  }, [])

  const stats = useMemo(() => ({
    totalBilled: allBilling.reduce((s, b) => s + b.amount, 0),
    paid: allBilling.filter((b) => b._status === 'Paid').reduce((s, b) => s + b.amount, 0),
    pending: allBilling.filter((b) => b._status === 'Pending' || b._status === 'Invoiced').reduce((s, b) => s + b.amount, 0),
    overdue: allBilling.filter((b) => b._status === 'Overdue').reduce((s, b) => s + b.amount, 0),
  }), [allBilling])

  const kpiStats: DataCardProps[] = [
    { label: 'Total Billed', value: fmtINR(stats.totalBilled) },
    { label: 'Collected', value: fmtINR(stats.paid), sub: `${Math.round((stats.paid / (stats.totalBilled || 1)) * 100)}% collected` },
    { label: 'Pending', value: fmtINR(stats.pending) },
    { label: 'Overdue', value: fmtINR(stats.overdue) },
  ]

  const columns = [
    { key: 'period', label: 'Period', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'contractNumber', label: 'Contract #' },
    { key: 'amount', label: 'Amount', sortable: true, align: 'right' as const },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'dueDate', label: 'Due Date', sortable: true },
    { key: 'paidDate', label: 'Paid Date' },
  ]

  const tabs: TabConfig[] = useMemo(() => [
    { id: 'all', label: `All (${allBilling.length})`, columns, data: allBilling },
    { id: 'overdue', label: `Overdue (${allBilling.filter((b) => b._status === 'Overdue').length})`, columns, data: allBilling.filter((b) => b._status === 'Overdue') },
    { id: 'pending', label: `Pending (${allBilling.filter((b) => b._status === 'Pending' || b._status === 'Invoiced').length})`, columns, data: allBilling.filter((b) => b._status === 'Pending' || b._status === 'Invoiced') },
    { id: 'paid', label: `Paid (${allBilling.filter((b) => b._status === 'Paid').length})`, columns, data: allBilling.filter((b) => b._status === 'Paid') },
  ], [allBilling])

  const cellFormatter: CellFormatter = useCallback((value, key) => {
    if (key === 'amount') return { display: <span className="cpt-num" style={{ fontWeight: 600 }}>{fmtINR(value as number)}</span> }
    if (key === 'status') {
      const v: StatusBadgeVariant = value === 'Paid' ? 'success' : value === 'Overdue' ? 'error' : value === 'Invoiced' ? 'info' : 'warning'
      return { display: <StatusBadge variant={v}>{String(value)}</StatusBadge> }
    }
    if (key === 'contractNumber') return { display: <span className="cpt-mono">{String(value)}</span> }
    return null
  }, [])

  return (
    <ListPageShell
      title="Billing & Receivables"
      subtitle="Billing runs, Tally integration, payment tracking, and aging analysis."
      breadcrumbs={[{ label: 'Rentals' }, { label: 'Billing' }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => toast.success('Billing run started')}>
            Run Billing
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.success('Pushed to Tally')}>
            Push to Tally
          </Button>
          <Button size="sm" onClick={() => toast.success('Invoice generated')}>
            Generate Invoice
          </Button>
        </>
      }
      stats={<StatsRow stats={kpiStats} />}
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="rentals-billing"
        emptyState={{
          title: 'No billing entries yet',
          description: 'Run billing on active contracts to generate invoices and track receivables.',
        }}
      />
    </ListPageShell>
  )
}

export default RentalBillingPage
