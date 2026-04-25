import { useParams, Link, Navigate } from 'react-router-dom'
import { CalendarDays, Eye, Mail, Pencil, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { mockPMAssignments } from '../data/pm-assignments'

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

  if (!assignment) {
    return <Navigate to="/ims/pm-assignments" replace />
  }

  const scopeLabel = [
    assignment.categoryName,
    assignment.subcategoryName ?? 'All subcategories',
    assignment.oemName ?? 'All OEMs',
    assignment.variant
      ? `${
          assignment.variant === 'new'
            ? 'New'
            : assignment.variant === 'refurbished'
            ? 'Refurbished'
            : 'New Pull'
        } only`
      : 'All conditions',
  ].join(' · ')

  return (
    <div className="space-y-6">
      <EntityHeader
        title={`${assignment.pmName} — ${assignment.categoryName}`}
        subtitle={scopeLabel}
        backHref="/ims/pm-assignments"
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to={`/ims/pm-assignments?edit=${assignment.id}`} />}
          >
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Permissions
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge variant={assignment.canView ? 'success' : 'neutral'}>
              View: {assignment.canView ? 'Yes' : 'No'}
            </StatusBadge>
            <StatusBadge variant={assignment.canEdit ? 'success' : 'neutral'}>
              Edit: {assignment.canEdit ? 'Yes' : 'No'}
            </StatusBadge>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            Validity
          </div>
          <p className="mt-1.5 text-sm font-medium">
            {assignment.startDate ? formatDate(assignment.startDate) : '—'}
            <span className="mx-1.5 text-muted-foreground">→</span>
            {assignment.endDate ? formatDate(assignment.endDate) : '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="size-3.5" />
            Condition
          </div>
          <div className="mt-2">
            {assignment.variant ? (
              <StatusBadge
                variant={
                  assignment.variant === 'new'
                    ? 'success'
                    : assignment.variant === 'refurbished'
                    ? 'info'
                    : 'warning'
                }
              >
                {assignment.variant === 'new'
                  ? 'New'
                  : assignment.variant === 'refurbished'
                  ? 'Refurbished'
                  : 'New Pull'}
              </StatusBadge>
            ) : (
              <span className="text-sm text-muted-foreground">All conditions</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              <div className="flex items-start justify-between gap-4 py-2 first:pt-0">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{assignment.pmName}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd>
                  <a
                    href={`mailto:${assignment.pmEmail}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Mail className="size-3.5" />
                    {assignment.pmEmail}
                  </a>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2 last:pb-0">
                <dt className="text-muted-foreground">PM ID</dt>
                <dd className="font-mono text-xs">{assignment.pmId}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              <div className="flex items-start justify-between gap-4 py-2 first:pt-0">
                <dt className="text-muted-foreground">Category</dt>
                <dd>
                  <Link
                    to={`/ims/categories/${assignment.categoryId}`}
                    className="text-primary hover:underline"
                  >
                    {assignment.categoryName}
                  </Link>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Subcategory</dt>
                <dd>
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
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2 last:pb-0">
                <dt className="text-muted-foreground">OEM</dt>
                <dd>
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
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Created {formatDate(assignment.createdAt)} · Last updated{' '}
        {formatDate(assignment.updatedAt)}
      </p>
    </div>
  )
}
