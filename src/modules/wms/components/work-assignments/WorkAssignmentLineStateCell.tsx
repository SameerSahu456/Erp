/** Line state badge; a withdrawn line shows why and links to its new lot. */
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/common/display/StatusBadge'
import { TruncatedText } from '@/components/common/display/TruncatedText'

import type { WorkAssignmentLineState } from '../../api/work-assignments'
import { WORK_ASSIGNMENT_LINE_STATE_VARIANT } from '../../constants/work-assignment-status'

interface WorkAssignmentLineStateCellProps {
  value: unknown
  row: Record<string, unknown>
}

export function WorkAssignmentLineStateCell({ value, row }: WorkAssignmentLineStateCellProps) {
  const raw = row._stateRaw as WorkAssignmentLineState
  const badge = (
    <StatusBadge variant={WORK_ASSIGNMENT_LINE_STATE_VARIANT[raw] ?? 'neutral'}>
      {String(value)}
    </StatusBadge>
  )
  const reason = row._withdrawnReason as string | null
  const withdrawnBy = row._withdrawnBy as string | null
  const movedToId = row._movedToId as string | null
  const movedToNumber = row._movedToNumber as string | null
  // A withdrawn line states why, in plain sight under the badge (reassignment withdraws, U4/U5).
  if (raw !== 'withdrawn' || !reason) return badge
  const why = `${withdrawnBy ? `${reason} · ${withdrawnBy}` : reason}${movedToNumber ? ` → ${movedToNumber}` : ''}`
  return (
    <div className="min-w-0 space-y-0.5">
      {/* Linked when we know where the device went, so the reader can follow
          it rather than search every open lot for it. */}
      {movedToId ? (
        <Link
          to={`/wms/work-assignments/${movedToId}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex"
        >
          {badge}
        </Link>
      ) : (
        badge
      )}
      <TruncatedText value={why} className="max-w-56 text-muted-foreground" />
    </div>
  )
}
