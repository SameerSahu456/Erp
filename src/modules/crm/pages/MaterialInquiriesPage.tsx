import { Plus } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'

import { materialInquiries } from '@/modules/crm/data/material-inquiries'

const statusVariant: Record<string, StatusBadgeVariant> = {
  Draft: 'neutral',
  Submitted: 'info',
  'Partially Responded': 'warning',
  'Fully Responded': 'success',
  Closed: 'neutral',
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const miTab: TabConfig = {
  id: 'material-inquiries',
  label: 'All Material Inquiries',
  columns: [
    { key: 'inquiryNumber', label: 'MI #', sortable: true },
    { key: 'linkedTo', label: 'Lead / Deal', sortable: true },
    { key: 'categories', label: 'Categories', sortable: true },
    { key: 'itemsCount', label: 'Items', sortable: true, align: 'right' },
    { key: 'status', label: 'Status', sortable: true, filterable: true },
    { key: 'requestedBy', label: 'Requested By', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
  ],
  data: materialInquiries.map((mi) => ({
    id: mi.id,
    inquiryNumber: mi.inquiryNumber,
    linkedTo: mi.leadName ?? mi.dealName ?? '-',
    categories: mi.categories.join(', '),
    itemsCount: mi.items.length,
    status: mi.status,
    requestedBy: mi.requestedBy,
    createdAt: formatDate(mi.createdAt),
  })),
}

const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'inquiryNumber' && typeof value === 'string') {
    return {
      display: (
        <Link
          to={`/crm/material-inquiries/${row['id']}`}
          className="text-primary hover:underline font-medium"
        >
          {value}
        </Link>
      ),
    }
  }
  if (key === 'status' && typeof value === 'string') {
    const variant = statusVariant[value] ?? 'neutral'
    return {
      display: <StatusBadge variant={variant}>{value}</StatusBadge>,
    }
  }
  return null
}

function MaterialInquiriesPage() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">Material Inquiries</h2>
        <Button onClick={() => navigate('/crm/material-inquiries/new')}>
          <Plus className="mr-1 size-4" />
          Create Inquiry
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={[miTab]}
        cellFormatter={cellFormatter}
        pageSize={10}
        onRowClick={(row) => navigate(`/crm/material-inquiries/${row.id}`)}
      />
    </div>
  )
}

export { MaterialInquiriesPage }

export default MaterialInquiriesPage
