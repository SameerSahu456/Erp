import { useMemo } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Mail, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { mockPMAssignments } from '../data/pm-assignments'
import { mockParts } from '../data/parts'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function PMAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const assignment = id ? mockPMAssignments.find((a) => a.id === id) : undefined

  const scopedParts = useMemo(() => {
    if (!assignment) return []
    return mockParts.filter((p) => {
      if (p.categoryId !== assignment.categoryId) return false
      if (assignment.subcategoryId && p.subcategoryId !== assignment.subcategoryId) return false
      if (assignment.oemName && p.brand && p.brand !== assignment.oemName) return false
      if (assignment.variant) {
        const want = assignment.variant === 'new' ? 'New' : 'Refurbished'
        if (p.condition !== want) return false
      }
      return true
    })
  }, [assignment])

  if (!assignment) {
    return <Navigate to="/ims/pm-assignments" replace />
  }

  const scopeLabel = [
    assignment.categoryName,
    assignment.subcategoryName ?? 'All subcategories',
    assignment.oemName ?? 'All OEMs',
    assignment.variant ? `${assignment.variant} only` : 'All variants',
  ].join(' · ')

  return (
    <div className="space-y-6">
      <EntityHeader
        title={`${assignment.pmName} — ${assignment.categoryName}`}
        subtitle={scopeLabel}
        backHref="/ims/pm-assignments"
        actions={
          <Button variant="outline" nativeButton={false} render={<Link to="/ims/pm-assignments" />}>
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Manager</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="font-medium">{assignment.pmName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <a
                href={`mailto:${assignment.pmEmail}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Mail className="size-3.5" />
                {assignment.pmEmail}
              </a>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">PM ID</div>
              <div className="font-mono text-xs">{assignment.pmId}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Category</div>
              <div>
                <Link
                  to={`/ims/categories/${assignment.categoryId}`}
                  className="text-primary hover:underline"
                >
                  {assignment.categoryName}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Subcategory</div>
              <div>
                {assignment.subcategoryName ? (
                  <Link
                    to={`/ims/categories/${assignment.subcategoryId}`}
                    className="text-primary hover:underline"
                  >
                    {assignment.subcategoryName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">All subcategories</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">OEM</div>
              <div>
                {assignment.oemName ? (
                  <Link
                    to={`/ims/oems/${assignment.oemId}`}
                    className="text-primary hover:underline"
                  >
                    {assignment.oemName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">All OEMs</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Variant</div>
              <div>
                {assignment.variant ? (
                  <StatusBadge variant={assignment.variant === 'new' ? 'success' : 'info'}>
                    {assignment.variant === 'new' ? 'New' : 'Refurbished'}
                  </StatusBadge>
                ) : (
                  <span className="text-muted-foreground">All variants</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timestamps</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Created</div>
            <div>{formatDate(assignment.createdAt)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last Updated</div>
            <div>{formatDate(assignment.updatedAt)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parts in Scope ({scopedParts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {scopedParts.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Part</th>
                    <th className="px-3 py-2 text-left font-medium">SKU</th>
                    <th className="px-3 py-2 text-left font-medium">Brand</th>
                    <th className="px-3 py-2 text-left font-medium">Condition</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedParts.slice(0, 25).map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Link
                          to={`/ims/parts/${p.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                      <td className="px-3 py-2 text-xs">{p.brand ?? '—'}</td>
                      <td className="px-3 py-2 text-xs">{p.condition ?? '—'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge variant={p.isActive ? 'success' : 'neutral'}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {scopedParts.length > 25 && (
                <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Showing 25 of {scopedParts.length}
                </div>
              )}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No parts currently match this assignment scope.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
