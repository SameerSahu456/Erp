import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'

import { mockCreditNotes } from '@/modules/invoices/data/credit-notes'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

function getCNStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Issued': return 'info'
    case 'Applied': return 'success'
    default: return 'neutral'
  }
}

const columns = [
  { key: 'creditNoteNumber', label: 'CN#', sortable: true },
  { key: 'invoiceNumber', label: 'Invoice#', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true, align: 'right' as const },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'issueDate', label: 'Date', sortable: true },
]

const data = mockCreditNotes.map((cn) => ({
  id: cn.id,
  creditNoteNumber: cn.creditNoteNumber,
  invoiceNumber: cn.invoiceNumber,
  customerName: cn.customerName,
  amount: cn.amount,
  reason: cn.reason,
  status: cn.status,
  issueDate: cn.issueDate,
}))

const tabs: TabConfig[] = [
  { id: 'all', label: 'All', columns, data },
]

const cellFormatter: CellFormatter = (value, key, _row) => {
  if (key === 'amount' && typeof value === 'number') {
    return { display: formatCurrency(value) }
  }
  if (key === 'status' && typeof value === 'string') {
    return {
      display: <StatusBadge variant={getCNStatusVariant(value)}>{value}</StatusBadge>,
    }
  }
  if (key === 'reason' && typeof value === 'string') {
    return {
      display: <span className="max-w-[250px] truncate block text-muted-foreground">{value}</span>,
    }
  }
  return null
}

function CreditNotesPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-semibold">Credit Notes</h2>

      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export default CreditNotesPage
