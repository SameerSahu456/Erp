/** Create + navigate-away for the issue-work wizard (composed by `useWorkAssignmentIssue`). */
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'

import type { WorkAssignmentStage } from '../../api/work-assignments'
import { WORK_ASSIGNMENT_STRINGS as S } from '../../components/work-assignments/work-assignments.strings'
import { useCreateWorkAssignment } from './useWorkAssignments'

interface IssueSubmitArgs {
  warehouseId: string | null
  stage: WorkAssignmentStage | ''
  engineerId: string | null
  issuedOperationIds: string[]
  /** §3: dirty once work, engineer or quantity is picked. */
  dirty: boolean
}

export function useWorkAssignmentIssueSubmit(create: ReturnType<typeof useCreateWorkAssignment>, a: IssueSubmitArgs) {
  const navigate = useNavigate()
  const guard = useUnsavedChangesGuard({ isDirty: a.dirty })

  const handleSubmit = async () => {
    const { warehouseId, stage, engineerId, issuedOperationIds } = a
    if (!warehouseId || !stage || !engineerId || issuedOperationIds.length === 0) return
    let assignment
    try {
      assignment = await create.mutateAsync({
        stage,
        warehouse_id: warehouseId,
        issued_to_user_id: engineerId,
        operation_ids: issuedOperationIds,
      })
    } catch {
      // The hook's onError already told the user why; stay on the form so
      // they can adjust and retry.
      return
    }
    // Not auto-printed: the user gesture was spent on the await, so the browser would block the tab (D19).
    toast.success(S.issue.issuedReadyToPrint)
    // A successful submit is not a discard — bypass the guard before leaving.
    guard.bypassOnce()
    await guard.popSentinelIfPresent()
    // §10 — REPLACE the form entry so pressing Back from the new detail returns
    // to the list, never to the stale just-submitted form.
    navigate(`/wms/work-assignments/${assignment.id}`, { replace: true })
  }

  return { guard, handleSubmit }
}
