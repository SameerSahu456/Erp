import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BusinessMetricsTable } from '@/components/common/tables/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/tables/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { ListPageShell } from '@/components/page-shells'

import { mockSalesInvoices } from '@/modules/invoices/data/sales-invoices'
import type { SalesInvoiceStatus } from '@/modules/invoices/types'
import { formatINR as formatCurrency } from '@/lib/currency'
import { SALES_INVOICE_STRINGS } from '../../components/sales/sales-invoice.strings'

const S = SALES_INVOICE_STRINGS.list

function getStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'Draft': return 'neutral'
    case 'Sent': return 'info'
    case 'Partially Paid': return 'warning'
    case 'Paid': return 'success'
    case 'Overdue': return 'error'
    case 'Void': return 'neutral'
    case 'Credit Note Issued': return 'warning'
    default: return 'neutral'
  }
}

const columns = [
  { key: 'invoiceNumber', label: 'Invoice#', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'grandTotal', label: 'Amount', sortable: true, align: 'right' as const },
  { key: 'paidAmount', label: 'Paid', sortable: true, align: 'right' as const },
  { key: 'balanceDue', label: 'Balance', sortable: true, align: 'right' as const },
  { key: 'status', label: 'Status', filterable: true },
  { key: 'dueDate', label: 'Due Date', sortable: true },
]

function buildData(filter?: SalesInvoiceStatus) {
  let invoices = mockSalesInvoices
  if (filter) {
    invoices = invoices.filter((inv) => inv.status === filter)
  }
  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    grandTotal: inv.grandTotal,
    paidAmount: inv.paidAmount,
    balanceDue: inv.balanceDue,
    status: inv.status,
    dueDate: inv.dueDate,
  }))
}

const tabs: TabConfig[] = [
  { id: 'all', label: 'All', columns, data: buildData() },
  { id: 'draft', label: 'Draft', columns, data: buildData('Draft') },
  { id: 'sent', label: 'Sent', columns, data: buildData('Sent') },
  { id: 'overdue', label: 'Overdue', columns, data: buildData('Overdue') },
  { id: 'paid', label: 'Paid', columns, data: buildData('Paid') },
]

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'invoiceNumber' && typeof value === 'string') {
    return {
      display: (
        <Link to={`/invoices/sales/${row['id']}`} className="text-primary hover:underline font-medium">
          {value}
        </Link>
      ),
    }
  }
  if ((key === 'grandTotal' || key === 'paidAmount' || key === 'balanceDue') && typeof value === 'number') {
    return { display: formatCurrency(value) }
  }
  if (key === 'status' && typeof value === 'string') {
    return {
      display: <StatusBadge variant={getStatusVariant(value)}>{value}</StatusBadge>,
      className: value === 'Overdue' ? 'bg-destructive/10' : undefined,
    }
  }
  if (key === 'dueDate' && typeof value === 'string' && row['status'] === 'Overdue') {
    return {
      display: value,
      className: 'bg-destructive/10 text-destructive font-medium',
    }
  }
  return null
}

function SalesInvoicesPage() {
  const navigate = useNavigate()

  return (
    <ListPageShell
      title={S.title}
      subtitle={S.subtitle}
      breadcrumbs={[{ label: 'Invoices' }, { label: 'Sales' }]}
      actions={
        <Button onClick={() => navigate('/invoices/sales/new')}>
          <Plus className="mr-1 size-4" />
          {S.newInvoice}
        </Button>
      }
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="invoices-sales"
        onRowClick={(row) => navigate(`/invoices/sales/${row.id}`)}
        emptyState={{
          title: S.empty.title,
          description: S.empty.description,
          action: {
            label: S.empty.action,
            onClick: () => navigate('/invoices/sales/new'),
          },
        }}
      />
    </ListPageShell>
  )
}

export default SalesInvoicesPage
