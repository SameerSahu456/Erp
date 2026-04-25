import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { ListPageShell } from '@/components/page'

import { mockCreditNotes } from '@/modules/invoices/data/credit-notes'
import { formatINR as formatCurrency } from '@/lib/currency'

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
    <ListPageShell
      title="Credit Notes"
      subtitle="Credits issued to customers or received from vendors."
      breadcrumbs={[{ label: 'Invoices' }, { label: 'Credit Notes' }]}
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="invoices-credit-notes"
        emptyState={{
          title: 'No credit notes yet',
          description: 'Credit notes appear here when customer invoices are adjusted or cancelled.',
        }}
      />
    </ListPageShell>
  )
}

export default CreditNotesPage
