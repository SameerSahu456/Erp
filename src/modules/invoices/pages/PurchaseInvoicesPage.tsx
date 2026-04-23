import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'

import { mockPurchaseInvoices } from '@/modules/invoices/data/purchase-invoices'
import type { PurchaseInvoiceStatus } from '@/modules/invoices/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

function getStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Received': return 'info'
    case 'Verified': return 'info'
    case 'Approved': return 'warning'
    case 'Partially Paid': return 'warning'
    case 'Paid': return 'success'
    case 'Disputed': return 'error'
    case 'Void': return 'neutral'
    default: return 'neutral'
  }
}

const columns = [
  { key: 'invoiceNumber', label: 'Our Ref#', sortable: true },
  { key: 'vendorInvoiceNumber', label: 'Vendor Ref#', sortable: true },
  { key: 'vendorName', label: 'Vendor', sortable: true },
  { key: 'grandTotal', label: 'Amount', sortable: true, align: 'right' as const },
  { key: 'balanceDue', label: 'Balance', sortable: true, align: 'right' as const },
  { key: 'status', label: 'Status', filterable: true },
  { key: 'dueDate', label: 'Due Date', sortable: true },
]

function buildData(filter?: PurchaseInvoiceStatus | PurchaseInvoiceStatus[]) {
  let invoices = mockPurchaseInvoices
  if (filter) {
    const filters = Array.isArray(filter) ? filter : [filter]
    invoices = invoices.filter((inv) => filters.includes(inv.status))
  }
  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    vendorInvoiceNumber: inv.vendorInvoiceNumber,
    vendorName: inv.vendorName,
    grandTotal: inv.grandTotal,
    balanceDue: inv.balanceDue,
    status: inv.status,
    dueDate: inv.dueDate,
  }))
}

const tabs: TabConfig[] = [
  { id: 'all', label: 'All', columns, data: buildData() },
  { id: 'pending', label: 'Pending', columns, data: buildData(['Received', 'Verified']) },
  { id: 'approved', label: 'Approved', columns, data: buildData('Approved') },
  { id: 'paid', label: 'Paid', columns, data: buildData('Paid') },
  { id: 'disputed', label: 'Disputed', columns, data: buildData('Disputed') },
]

const cellFormatter: CellFormatter = (value, key, _row) => {
  if (key === 'invoiceNumber' && typeof value === 'string') {
    return {
      display: (
        <span className="text-primary font-medium">{value}</span>
      ),
    }
  }
  if ((key === 'grandTotal' || key === 'balanceDue') && typeof value === 'number') {
    return { display: formatCurrency(value) }
  }
  if (key === 'status' && typeof value === 'string') {
    return {
      display: <StatusBadge variant={getStatusVariant(value)}>{value}</StatusBadge>,
    }
  }
  return null
}

function PurchaseInvoicesPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-semibold">Purchase Invoices</h2>

      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="invoices-purchase"
      />
    </div>
  )
}

export default PurchaseInvoicesPage
