import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Pencil,
  Boxes,
  CheckCircle2,
  Layers,
  Plus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { DetailTabs } from '@/modules/crm/components/DetailTabs'
import { mockOEMs } from '../data/oems'
import { mockParts } from '../data/parts'

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function OEMDetailPage() {
  const { id } = useParams<{ id: string }>()
  const oem = mockOEMs.find((o) => o.id === id)

  const models = useMemo(() => {
    if (!oem) return []
    return mockParts.filter((p) => p.brand === oem.name)
  }, [oem])

  if (!oem) {
    return <EmptyState title="OEM not found" description="The requested OEM does not exist." />
  }

  const activeModelsCount = models.filter((m) => m.isActive).length

  // ── Quick stats bar ──
  const quickStatsBar = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Boxes className="size-3.5" />
          Total Models
        </div>
        <p className="mt-1 text-xl font-semibold tabular-nums">{models.length}</p>
      </div>
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          Active Models
        </div>
        <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">
          {activeModelsCount}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Layers className="size-3.5 text-sky-600" />
          Categories
        </div>
        <p className="mt-1 text-xl font-semibold tabular-nums text-sky-700">
          {oem.categoryNames.length}
        </p>
      </div>
    </div>
  )

  // ── Overview tab ──
  const overviewTab = {
    id: 'overview',
    label: 'Overview',
    content: (
      <div className="space-y-6">
        {/* About */}
        <div>
          <h3 className="mb-2 text-sm font-medium">About</h3>
          {oem.notes ? (
            <p className="text-sm text-muted-foreground">{oem.notes}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">No description provided.</p>
          )}
        </div>

        {/* Categories */}
        <div>
          <h3 className="mb-2 text-sm font-medium">
            Categories
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({oem.categoryNames.length})
            </span>
          </h3>
          {oem.categoryNames.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {oem.categoryNames.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium"
                >
                  <Layers className="size-3 text-muted-foreground" />
                  {cat}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No categories assigned.</p>
          )}
        </div>

        {/* Identity grid */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Identity</h3>
          <div className="rounded-md border">
            <dl className="divide-y text-xs">
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="font-medium text-muted-foreground">OEM ID</dt>
                <dd className="font-mono text-xs">{oem.id}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="font-medium text-muted-foreground">Code</dt>
                <dd className="font-mono text-xs font-medium">{oem.code}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="font-medium text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge variant={oem.status === 'active' ? 'success' : 'neutral'}>
                    {oem.status === 'active' ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="font-medium text-muted-foreground">Created</dt>
                <dd>{formatDate(oem.createdAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="font-medium text-muted-foreground">Last updated</dt>
                <dd>{formatDate(oem.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    ),
  }

  // ── Models tab ──
  const modelsTab = {
    id: 'models',
    label: 'Models',
    count: models.length,
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            Parts catalogued under {oem.name}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({models.length})
            </span>
          </h3>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link to={`/ims/parts/new?brand=${encodeURIComponent(oem.name)}`} />}
          >
            <Plus className="mr-1 size-3.5" />
            Add Model
          </Button>
        </div>

        {models.length > 0 ? (
          <div className="max-h-[480px] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/50 shadow-[0_1px_0_0_var(--border)]">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">Model</th>
                  <th className="px-3 py-2 text-left font-medium">Part no</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {models.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link
                        to={`/ims/parts/${p.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.model && (
                        <p className="text-xs text-muted-foreground">{p.model}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                    <td className="px-3 py-2 text-xs">
                      {p.categoryName}
                      {p.subcategoryName && (
                        <span className="text-muted-foreground"> · {p.subcategoryName}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.sellPrice != null ? currencyFmt.format(p.sellPrice) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge variant={p.isActive ? 'success' : 'neutral'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No models found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No parts are catalogued under this OEM yet.
            </p>
          </div>
        )}
      </div>
    ),
  }

  // ── Activity tab ──
  const historyEvents = (() => {
    const events: { title: string; date: string; subtitle?: string; dot: string }[] = [
      { title: 'OEM created', date: oem.createdAt, dot: 'bg-primary' },
    ]
    if (oem.updatedAt && oem.updatedAt !== oem.createdAt) {
      events.push({ title: 'OEM updated', date: oem.updatedAt, dot: 'bg-emerald-500' })
    }
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })()

  const activityTab = {
    id: 'activity',
    label: 'Activity',
    content: (
      <div className="rounded-md border p-4">
        <div className="space-y-4">
          {historyEvents.map((e, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`size-2.5 rounded-full ${e.dot}`} />
                {i < historyEvents.length - 1 && <div className="w-px flex-1 bg-border" />}
              </div>
              <div className={i < historyEvents.length - 1 ? 'pb-4' : undefined}>
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {e.subtitle ?? formatDate(e.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={oem.name}
        subtitle={`Code: ${oem.code}`}
        status={{
          label: oem.status === 'active' ? 'Active' : 'Inactive',
          variant: oem.status === 'active' ? 'success' : 'neutral',
        }}
        backHref="/ims/oems"
        actions={
          <Button variant="outline" nativeButton={false} render={<Link to={`/ims/oems/${oem.id}/edit`} />}>
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
        }
      />

      {quickStatsBar}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Tabs */}
        <DetailTabs
          cardContent
          tabs={[overviewTab, modelsTab, activityTab]}
        />

        {/* Right: Sidebar — top offset aligns with the left content card (below the tabs row) */}
        <div className="space-y-4 lg:mt-14">
          {/* OEM Info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">OEM Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-3 pb-2">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                  {getInitials(oem.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{oem.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{oem.code}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge variant={oem.status === 'active' ? 'success' : 'neutral'}>
                  {oem.status === 'active' ? 'Active' : 'Inactive'}
                </StatusBadge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Models</span>
                <span className="font-medium tabular-nums">{models.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Models</span>
                <span className="font-medium tabular-nums">{activeModelsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categories</span>
                <span className="font-medium tabular-nums">{oem.categoryNames.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
