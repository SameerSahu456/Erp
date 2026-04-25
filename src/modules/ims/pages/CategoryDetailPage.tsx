import { useMemo, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { FolderOpen, Folder, Pencil, Plus, Package, Layers, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { mockCategories } from '../data/categories'
import { mockParts } from '../data/parts'
import type { IMSCategory } from '@/modules/wms/types'

function findCategory(cats: IMSCategory[], id: string): IMSCategory | undefined {
  for (const cat of cats) {
    if (cat.id === id) return cat
    if (cat.subcategories) {
      const found = findCategory(cat.subcategories, id)
      if (found) return found
    }
  }
  return undefined
}

function findParentChain(
  cats: IMSCategory[],
  id: string,
  chain: IMSCategory[] = [],
): IMSCategory[] | null {
  for (const cat of cats) {
    const next = [...chain, cat]
    if (cat.id === id) return next
    if (cat.subcategories) {
      const found = findParentChain(cat.subcategories, id, next)
      if (found) return found
    }
  }
  return null
}

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const category = id ? findCategory(mockCategories, id) : undefined
  const chain = id ? findParentChain(mockCategories, id) : null

  // Only parts directly attached to this category — descendants are surfaced
  // when the user drills into the relevant subcategory.
  const partsInCategory = useMemo(() => {
    if (!category) return []
    return mockParts.filter(
      (p) => p.categoryId === category.id || p.subcategoryId === category.id,
    )
  }, [category])

  const [tracking, setTracking] = useState(true)

  if (!category) {
    return <Navigate to="/ims/categories" replace />
  }

  const breadcrumbLabel =
    chain && chain.length > 1
      ? chain
          .slice(0, -1)
          .map((c) => c.name)
          .join(' › ')
      : 'Top-level category'

  const subCount = category.subcategories?.length ?? 0

  return (
    <div className="space-y-6">
      <EntityHeader
        title={category.name}
        subtitle={breadcrumbLabel}
        status={
          category.isActive
            ? { label: 'Active', variant: 'success' }
            : { label: 'Inactive', variant: 'neutral' }
        }
        backHref="/ims/categories"
        actions={
          <Button variant="outline" nativeButton={false} render={<Link to={`/ims/categories/${category.id}/edit`} />}>
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Package className="size-3.5" />
            Parts
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {category.partCount.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="size-3.5" />
            Subcategories
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums">{subCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="size-3.5" />
            Tracking
          </div>
          <p
            className={`mt-1 text-xl font-semibold ${tracking ? 'text-emerald-700' : 'text-muted-foreground'}`}
          >
            {tracking ? 'On' : 'Off'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Subcategories + Parts */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Subcategories ({subCount})</CardTitle>
              <Button size="sm" variant="outline" nativeButton={false} render={<Link to="/ims/categories/new" />}>
                <Plus className="mr-1 size-3.5" />
                New
              </Button>
            </CardHeader>
            <CardContent>
              {subCount > 0 ? (
                <div className="divide-y rounded-lg border">
                  {category.subcategories!.map((sub) => {
                    const hasSubs = (sub.subcategories?.length ?? 0) > 0
                    return (
                      <Link
                        key={sub.id}
                        to={`/ims/categories/${sub.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                      >
                        {hasSubs ? (
                          <FolderOpen className="size-[18px] shrink-0 text-indigo-500/80" />
                        ) : (
                          <Folder className="size-[18px] shrink-0 text-muted-foreground/60" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{sub.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {sub.partCount} {sub.partCount === 1 ? 'part' : 'parts'}
                            {hasSubs && ` · ${sub.subcategories!.length} subcategories`}
                          </div>
                        </div>
                        {!sub.isActive && <StatusBadge variant="neutral">Inactive</StatusBadge>}
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No subcategories.</p>
              )}
            </CardContent>
          </Card>

          {partsInCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Parts ({partsInCategory.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Part</th>
                        <th className="px-3 py-2 text-left font-medium">Part no</th>
                        <th className="px-3 py-2 text-left font-medium">Condition</th>
                        <th className="px-3 py-2 text-left font-medium">Brand</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partsInCategory.slice(0, 25).map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2">
                            <Link to={`/ims/parts/${p.id}`} className="font-medium text-primary hover:underline">
                              {p.name}
                            </Link>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                          <td className="px-3 py-2 text-xs">{p.condition ?? '—'}</td>
                          <td className="px-3 py-2 text-xs">{p.brand ?? '—'}</td>
                          <td className="px-3 py-2">
                            <StatusBadge variant={p.isActive ? 'success' : 'neutral'}>
                              {p.isActive ? 'Active' : 'Inactive'}
                            </StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {partsInCategory.length > 25 && (
                    <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Showing 25 of {partsInCategory.length}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Compact info sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Category Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Category ID</span>
                <span className="font-mono text-xs font-medium">{category.id}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Product Manager</span>
                <span className="font-medium">{category.productManager ?? '—'}</span>
              </div>
              {chain && chain.length > 1 && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Hierarchy</span>
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    {chain.map((c, i) => (
                      <span key={c.id} className="flex items-center gap-1">
                        {i > 0 && <span className="text-muted-foreground">›</span>}
                        {c.id === category.id ? (
                          <span className="font-medium">{c.name}</span>
                        ) : (
                          <Link to={`/ims/categories/${c.id}`} className="text-primary hover:underline">
                            {c.name}
                          </Link>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <label className="flex cursor-pointer items-center justify-between gap-3 pt-1">
                <span className="text-muted-foreground">Tracking</span>
                <Checkbox
                  checked={tracking}
                  onCheckedChange={(value) => setTracking(value === true)}
                />
              </label>
              {category.description && (
                <div className="flex flex-col gap-1 border-t pt-3">
                  <span className="text-muted-foreground">Description</span>
                  <p className="text-sm">{category.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
