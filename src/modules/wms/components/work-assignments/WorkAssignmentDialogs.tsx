/**
 * The confirmation a lot can raise.
 *
 * Withdraw pulls a device out of a document people are working from, so it
 * raises this reason dialog first. Driven by the line(s) being withdrawn —
 * per-row on the server-paginated detail table, so usually exactly one.
 */
import type { UseMutationResult } from '@tanstack/react-query'

import type {
  WorkAssignment,
  WorkAssignmentWithdrawRequest,
} from '../../api/work-assignments'

import { AssignmentReasonDialog } from './AssignmentReasonDialog'
import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

interface WorkAssignmentDialogsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The line(s) to withdraw once a reason is given. */
  lineIds: string[]
  withdraw: UseMutationResult<WorkAssignment, unknown, WorkAssignmentWithdrawRequest>
  onWithdrawn: () => void
}

export function WorkAssignmentDialogs({
  open,
  onOpenChange,
  lineIds,
  withdraw,
  onWithdrawn,
}: WorkAssignmentDialogsProps) {
  return (
    <AssignmentReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={S.detail.withdrawTitle}
      description={S.detail.withdrawDescription(lineIds.length)}
      confirmLabel={S.detail.withdraw}
      reasonRequired
      isPending={withdraw.isPending}
      onConfirm={(reason) =>
        withdraw.mutate(
          { line_ids: lineIds, reason },
          {
            onSuccess: () => {
              onWithdrawn()
              onOpenChange(false)
            },
          },
        )
      }
    />
  )
}
