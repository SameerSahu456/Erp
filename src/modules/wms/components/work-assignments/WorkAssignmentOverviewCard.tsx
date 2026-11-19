/** Work assignment header facts (§2). "Issued to", not "Assigned to": the header records
 *  past custody and does not change on reassignment. */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { formatIST } from '@shared/lib/date'

import type { WorkAssignment } from '../../api/work-assignments'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

/** A stacked label-on-top field:value (§2 — label small/muted, value below). */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      <Typography variant="body">{value}</Typography>
    </div>
  )
}

export function WorkAssignmentOverviewCard({ assignment }: { assignment: WorkAssignment }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.detail.overview}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={S.detail.issuedTo} value={assignment.issued_to_name ?? '—'} />
        <Field label={S.columns.issuedAt} value={formatIST(assignment.issued_at)} />
        <Field label={S.detail.issuedBy} value={assignment.issued_by_name ?? '—'} />
      </CardContent>
    </Card>
  )
}
