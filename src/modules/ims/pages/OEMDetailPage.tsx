import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { DetailTabs } from '@/modules/crm/components/DetailTabs'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockOEMs } from '../data/oems'
import { mockParts } from '../data/parts'
import { mockPMAssignments } from '../data/pm-assignments'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function OEMDetailPage() {
  const { id } = useParams<{ id: string }>()
  const oem = mockOEMs.find((o) => o.id === id)

  const models = useMemo(() => {
    if (!oem) return []
    return mockParts.filter((p) => p.brand === oem.name)
  }, [oem])

  const pmAssignments = useMemo(() => {
    if (!oem) return []
    return mockPMAssignments.filter((pma) => pma.oemId === oem.id)
  }, [oem])

  if (!oem) {
    return <EmptyState title="OEM not found" description="The requested OEM does not exist." />
  }

  // ── Overview tab ──
  const overviewTab = {
    id: 'overview',
    label: 'Overview',
    content: (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="text-sm font-medium">{oem.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Code</p>
            <p className="text-sm font-medium">{oem.code}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge variant={oem.status === 'active' ? 'success' : 'neutral'}>
              {oem.status === 'active' ? 'Active' : 'Inactive'}
            </StatusBadge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Models Count</p>
            <p className="text-sm font-medium">{oem.modelsCount}</p>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {oem.categoryNames.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Notes */}
        {oem.notes && (
          <div>
            <h3 className="mb-1 text-sm font-medium">Notes</h3>
            <p className="text-sm text-muted-foreground">{oem.notes}</p>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-medium">{formatDate(oem.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Updated</p>
            <p className="text-sm font-medium">{formatDate(oem.updatedAt)}</p>
          </div>
        </div>
      </div>
    ),
  }

  // ── Models tab ──
  const modelsTabConfig: TabConfig = {
    id: 'models-table',
    label: `Models (${models.length})`,
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'sku', label: 'SKU', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
    ],
    data: models.map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.categoryName,
      status: p.isActive ? 'Active' : 'Inactive',
      _id: p.id,
    })),
  }

  const modelsCellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'name' && typeof value === 'string') {
      const partId = (row as Record<string, unknown>)._id as string
      return {
        display: (
          <Link to={`/ims/parts/${partId}`} className="font-medium text-primary hover:underline">
            {value}
          </Link>
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

  const modelsTab = {
    id: 'models',
    label: 'Models',
    count: models.length,
    content: (
      <div className="space-y-4">
        {models.length > 0 ? (
          <BusinessMetricsTable
            tabs={[modelsTabConfig]}
            cellFormatter={modelsCellFormatter}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No models found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No parts are associated with this OEM yet.
            </p>
          </div>
        )}
      </div>
    ),
  }

  // ── PM Assignments tab ──
  const pmTabConfig: TabConfig = {
    id: 'pm-table',
    label: `PM Assignments (${pmAssignments.length})`,
    columns: [
      { key: 'category', label: 'Category', sortable: true },
      { key: 'variant', label: 'Variant', sortable: true },
      { key: 'pmName', label: 'PM Name', sortable: true },
    ],
    data: pmAssignments.map((pma) => ({
      category: pma.categoryName,
      variant: pma.variant ?? 'All',
      pmName: pma.pmName,
      _id: pma.id,
    })),
  }

  const pmCellFormatter: CellFormatter = () => null

  const pmAssignmentsTab = {
    id: 'pm-assignments',
    label: 'PM Assignments',
    count: pmAssignments.length,
    content: (
      <div className="space-y-4">
        {pmAssignments.length > 0 ? (
          <>
            <BusinessMetricsTable
              tabs={[pmTabConfig]}
              cellFormatter={pmCellFormatter}
            />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" render={<Link to="/ims/pm-assignments" />}>
                View All PM Assignments
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No PM assignments</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No product manager assignments exist for this OEM.
            </p>
          </div>
        )}
      </div>
    ),
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={oem.name}
        subtitle={`Code: ${oem.code}`}
        status={{ label: oem.status === 'active' ? 'Active' : 'Inactive', variant: oem.status === 'active' ? 'success' : 'neutral' }}
        backHref="/ims/oems"
        actions={
          <Button variant="outline" render={<Link to={`/ims/oems/${oem.id}/edit`} />}>
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Tabs */}
        <DetailTabs tabs={[overviewTab, modelsTab, pmAssignmentsTab]} />

        {/* Right: Sidebar */}
        <div className="space-y-4">
          {/* Stats card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">OEM Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Models</span>
                <span className="font-medium">{oem.modelsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categories</span>
                <span className="font-medium">{oem.categoryNames.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge variant={oem.status === 'active' ? 'success' : 'neutral'}>
                  {oem.status === 'active' ? 'Active' : 'Inactive'}
                </StatusBadge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
