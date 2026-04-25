import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ListPageShell } from '@/components/page'

import { mockSalesInvoices } from '@/modules/invoices/data/sales-invoices'
import { mockPurchaseInvoices } from '@/modules/invoices/data/purchase-invoices'
import { formatINR as formatCurrency } from '@/lib/currency'

type PaymentRow = Record<string, unknown> & {
  date: string
  reference: string
  type: 'Received' | 'Made'
  amount: number
  method: string
  party: string
  invoiceRef: string
}

// Build payment rows from invoices
const receivedPayments: PaymentRow[] = mockSalesInvoices.flatMap((inv) =>
  inv.payments.map((pay) => ({
    date: pay.date,
    reference: pay.reference,
    type: 'Received' as const,
    amount: pay.amount,
    method: pay.method,
    party: inv.customerName,
    invoiceRef: inv.invoiceNumber,
  }))
)

const madePayments: PaymentRow[] = mockPurchaseInvoices.flatMap((inv) =>
  inv.payments.map((pay) => ({
    date: pay.date,
    reference: pay.reference,
    type: 'Made' as const,
    amount: pay.amount,
    method: pay.method,
    party: inv.vendorName,
    invoiceRef: inv.invoiceNumber,
  }))
)

const allPayments = [...receivedPayments, ...madePayments].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
)

const columns = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'reference', label: 'Reference', sortable: true },
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount', sortable: true, align: 'right' as const },
  { key: 'method', label: 'Method' },
  { key: 'party', label: 'Party', sortable: true },
  { key: 'invoiceRef', label: 'Invoice Ref' },
]

const tabs: TabConfig[] = [
  {
    id: 'received',
    label: 'Received',
    columns,
    data: receivedPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  },
  {
    id: 'made',
    label: 'Made',
    columns,
    data: madePayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  },
  { id: 'all', label: 'All', columns, data: allPayments },
]

const cellFormatter: CellFormatter = (value, key, _row) => {
  if (key === 'amount' && typeof value === 'number') {
    return { display: formatCurrency(value) }
  }
  if (key === 'type' && typeof value === 'string') {
    return {
      display: (
        <StatusBadge variant={value === 'Received' ? 'success' : 'warning'}>
          {value}
        </StatusBadge>
      ),
    }
  }
  if (key === 'method' && typeof value === 'string') {
    return {
      display: <StatusBadge variant="info">{value}</StatusBadge>,
    }
  }
  return null
}

function PaymentsPage() {
  return (
    <ListPageShell
      title="Payments"
      subtitle="Customer receipts and vendor payments across invoice types."
      breadcrumbs={[{ label: 'Accounting' }, { label: 'Payments' }]}
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="accounting-payments"
        emptyState={{
          title: 'No payments recorded',
          description: 'Payments appear here as invoices are paid or receipts are issued.',
        }}
      />
    </ListPageShell>
  )
}

export default PaymentsPage
