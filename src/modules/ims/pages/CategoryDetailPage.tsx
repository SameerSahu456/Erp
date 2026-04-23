import { useMemo } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { FolderOpen, Folder, Pencil, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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

function collectDescendantIds(cat: IMSCategory): string[] {
  const out: string[] = [cat.id]
  cat.subcategories?.forEach((sub) => {
    out.push(...collectDescendantIds(sub))
  })
  return out
}

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const category = id ? findCategory(mockCategories, id) : undefined
  const chain = id ? findParentChain(mockCategories, id) : null

  const partsInCategory = useMemo(() => {
    if (!category) return []
    const ids = new Set(collectDescendantIds(category))
    return mockParts.filter(
      (p) => ids.has(p.categoryId) || (p.subcategoryId && ids.has(p.subcategoryId)),
    )
  }, [category])

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

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Category ID</div>
                <div className="font-mono text-xs">{category.id}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Product Manager</div>
                <div>{category.productManager ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Parts</div>
                <div className="tabular-nums">{category.partCount.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Subcategories</div>
                <div className="tabular-nums">{subCount}</div>
              </div>
            </div>
            {category.description && (
              <div>
                <div className="text-xs text-muted-foreground">Description</div>
                <p className="mt-1 text-sm">{category.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hierarchy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {chain && chain.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {chain.map((c, i) => (
                  <span key={c.id} className="flex items-center gap-1">
                    {i > 0 && <span>›</span>}
                    {c.id === category.id ? (
                      <span className="font-medium text-foreground">{c.name}</span>
                    ) : (
                      <Link to={`/ims/categories/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Top-level</p>
            )}
          </CardContent>
        </Card>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Parts ({partsInCategory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {partsInCategory.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Part</th>
                    <th className="px-3 py-2 text-left font-medium">SKU</th>
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
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No parts in this category.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
