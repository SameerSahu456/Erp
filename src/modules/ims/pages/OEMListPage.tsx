import { Link, useNavigate } from 'react-router-dom'
import { Plus, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockOEMs } from '../data/oems'

export default function OEMListPage() {
  const navigate = useNavigate()

  const tab: TabConfig = {
    id: 'oems',
    label: `OEMs (${mockOEMs.length})`,
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'code', label: 'Code', sortable: true },
      { key: 'categories', label: 'Categories' },
      { key: 'models', label: 'Models', sortable: true, align: 'right' },
      { key: 'status', label: 'Status', sortable: true, filterable: true },
      { key: 'actions', label: '' },
    ],
    data: mockOEMs.map((oem) => ({
      name: oem.name,
      code: oem.code,
      categories: oem.categoryNames,
      models: oem.modelsCount,
      status: oem.status === 'active' ? 'Active' : 'Inactive',
      actions: oem.id,
      _id: oem.id,
    })),
  }

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'name' && typeof value === 'string') {
      const id = (row as Record<string, unknown>)._id as string
      return {
        display: (
          <Link to={`/ims/oems/${id}`} className="font-medium text-primary hover:underline">
            {value}
          </Link>
        ),
      }
    }
    if (key === 'categories' && Array.isArray(value)) {
      return {
        display: (
          <span className="text-sm">{(value as string[]).join(', ')}</span>
        ),
      }
    }
    if (key === 'status' && typeof value === 'string') {
      return {
        display: (
          <StatusBadge variant={value === 'Active' ? 'success' : 'neutral'}>
            {value}
          </StatusBadge>
        ),
      }
    }
    if (key === 'actions' && typeof value === 'string') {
      return {
        display: (
          <span onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" render={<Link to={`/ims/oems/${value}/edit`} />}>
              <Pencil className="mr-1.5 size-3.5" />
              Edit
            </Button>
          </span>
        ),
      }
    }
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="cpt-page-title">
          OEMs
        </h1>
        <Button render={<Link to="/ims/oems/new" />}>
          <Plus className="mr-1.5 size-4" />
          Add OEM
        </Button>
      </div>

      <BusinessMetricsTable
        tabs={[tab]}
        cellFormatter={cellFormatter}
        persistKey="ims-oems"
        onRowClick={(row) => navigate(`/ims/oems/${row._id}`)}
      />
    </div>
  )
}
