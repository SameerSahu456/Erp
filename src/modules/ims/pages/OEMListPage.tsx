import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ListPageShell } from '@/components/page'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockOEMs } from '../data/oems'
import { mockParts } from '../data/parts'

const MAX_CATEGORY_CHIPS = 2

export default function OEMListPage() {
  const navigate = useNavigate()

  // Real model count per OEM, computed from parts so the list and detail page agree.
  const modelsByOemName = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of mockParts) {
      if (!p.brand) continue
      counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1)
    }
    return counts
  }, [])

  const tab: TabConfig = {
    id: 'oems',
    label: `OEMs (${mockOEMs.length})`,
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'code', label: 'Code', sortable: true },
      { key: 'categories', label: 'Categories' },
      { key: 'models', label: 'Models', sortable: true, align: 'right' },
      { key: 'status', label: 'Status', sortable: true, filterable: true },
    ],
    data: mockOEMs.map((oem) => ({
      name: oem.name,
      code: oem.code,
      categories: oem.categoryNames,
      models: modelsByOemName.get(oem.name) ?? 0,
      status: oem.status === 'active' ? 'Active' : 'Inactive',
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
      const cats = value as string[]
      const visible = cats.slice(0, MAX_CATEGORY_CHIPS)
      const overflow = cats.length - visible.length
      return {
        display: (
          <div className="flex flex-wrap gap-1">
            {visible.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
              >
                {cat}
              </span>
            ))}
            {overflow > 0 && (
              <span
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                title={cats.slice(MAX_CATEGORY_CHIPS).join(', ')}
              >
                +{overflow}
              </span>
            )}
          </div>
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
    return null
  }

  return (
    <ListPageShell
      title="OEMs"
      subtitle="Original Equipment Manufacturers — brands and their contact details."
      breadcrumbs={[{ label: 'IMS' }, { label: 'OEMs' }]}
      actions={
        <Button render={<Link to="/ims/oems/new" />}>
          <Plus className="mr-1.5 size-4" />
          Add OEM
        </Button>
      }
    >
      <BusinessMetricsTable
        tabs={[tab]}
        cellFormatter={cellFormatter}
        persistKey="ims-oems"
        onRowClick={(row) => navigate(`/ims/oems/${row._id}`)}
        emptyState={{
          title: 'No OEMs yet',
          description: 'Add OEMs to associate them with parts and track warranty details.',
          action: {
            label: 'Add OEM',
            onClick: () => navigate('/ims/oems/new'),
          },
        }}
      />
    </ListPageShell>
  )
}
