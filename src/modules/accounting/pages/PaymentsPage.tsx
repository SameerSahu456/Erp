import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'

import { mockSalesInvoices } from '@/modules/invoices/data/sales-invoices'
import { mockPurchaseInvoices } from '@/modules/invoices/data/purchase-invoices'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

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
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-semibold">Payments</h2>

      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
      />
    </div>
  )
}

export default PaymentsPage
