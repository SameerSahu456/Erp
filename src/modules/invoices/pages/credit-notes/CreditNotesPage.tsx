import { BusinessMetricsTable } from '@/components/common/tables/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/tables/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { ListPageShell } from '@/components/page-shells'

import { mockCreditNotes } from '@/modules/invoices/data/credit-notes'
import { formatINR as formatCurrency } from '@/lib/currency'

import { CREDIT_NOTES_STRINGS as S } from './credit-notes.strings'

function getCNStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Issued': return 'info'
    case 'Applied': return 'success'
    default: return 'neutral'
  }
}

const columns = [
  { key: 'creditNoteNumber', label: S.columns.creditNoteNumber, sortable: true },
  { key: 'invoiceNumber', label: S.columns.invoiceNumber, sortable: true },
  { key: 'customerName', label: S.columns.customerName, sortable: true },
  { key: 'amount', label: S.columns.amount, sortable: true, align: 'right' as const },
  { key: 'reason', label: S.columns.reason },
  { key: 'status', label: S.columns.status },
  { key: 'issueDate', label: S.columns.issueDate, sortable: true },
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
      title={S.list.title}
      subtitle={S.list.subtitle}
      breadcrumbs={[{ label: S.list.breadcrumbs.invoices }, { label: S.list.breadcrumbs.creditNotes }]}
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="invoices-credit-notes"
        emptyState={{
          title: S.list.empty.title,
          description: S.list.empty.description,
        }}
      />
    </ListPageShell>
  )
}

export default CreditNotesPage
