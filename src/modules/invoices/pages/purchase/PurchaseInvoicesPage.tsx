import { BusinessMetricsTable } from '@/components/common/tables/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/tables/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { ListPageShell } from '@/components/page-shells'

import { mockPurchaseInvoices } from '@/modules/invoices/data/purchase-invoices'
import type { PurchaseInvoiceStatus } from '@/modules/invoices/types'
import { formatINR as formatCurrency } from '@/lib/currency'

import { PURCHASE_INVOICES_STRINGS as S } from './purchase-invoices.strings'

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
  { key: 'invoiceNumber', label: S.columns.invoiceNumber, sortable: true },
  { key: 'vendorInvoiceNumber', label: S.columns.vendorInvoiceNumber, sortable: true },
  { key: 'vendorName', label: S.columns.vendorName, sortable: true },
  { key: 'grandTotal', label: S.columns.grandTotal, sortable: true, align: 'right' as const },
  { key: 'balanceDue', label: S.columns.balanceDue, sortable: true, align: 'right' as const },
  { key: 'status', label: S.columns.status, filterable: true },
  { key: 'dueDate', label: S.columns.dueDate, sortable: true },
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
  { id: 'all', label: S.list.tabs.all, columns, data: buildData() },
  { id: 'pending', label: S.list.tabs.pending, columns, data: buildData(['Received', 'Verified']) },
  { id: 'approved', label: S.list.tabs.approved, columns, data: buildData('Approved') },
  { id: 'paid', label: S.list.tabs.paid, columns, data: buildData('Paid') },
  { id: 'disputed', label: S.list.tabs.disputed, columns, data: buildData('Disputed') },
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
    <ListPageShell
      title={S.list.title}
      subtitle={S.list.subtitle}
      breadcrumbs={[{ label: S.list.breadcrumbs.invoices }, { label: S.list.breadcrumbs.purchase }]}
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="invoices-purchase"
        emptyState={{
          title: S.list.empty.title,
          description: S.list.empty.description,
        }}
      />
    </ListPageShell>
  )
}

export default PurchaseInvoicesPage
