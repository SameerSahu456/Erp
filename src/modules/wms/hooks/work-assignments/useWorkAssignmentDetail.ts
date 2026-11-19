import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { usePermission } from '@shared/rbac'
import { asUuid } from '@shared/lib/validation'
import { useRecordLabel } from '@shared/routing/record-label'

import { useWithdrawLines, useWorkAssignment } from './useWorkAssignments'
import { useWorkAssignmentLinesView } from './useWorkAssignmentLinesView'
import { usePrintLabels } from './usePrintLabels'
import {
  WORK_ASSIGNMENT_LINE_SORT_FIELD_MAP,
  toLineRow,
} from '../../components/work-assignments/work-assignment-line.columns'
import { wmsCan } from '../../permissions'

/** Record query, line-table view, withdraw + print state for `WorkAssignmentDetailBody`. */
export function useWorkAssignmentDetail() {
  // §11.1 — the route `:id` is untrusted: a malformed id becomes '' so the query
  // stays disabled and the not-found guard renders (no backend 422).
  const { id: rawId = '' } = useParams<{ id: string }>()
  const id = asUuid(rawId) ?? ''
  const label = useRecordLabel()
  const assignment = useWorkAssignment(id)
  const isOpen = assignment.data?.status === 'open'

  // The withdraw reason confirmation.
  const [confirming, setConfirming] = useState(false)
  // Server-side line table view + ticked line ids (persist across pages).
  const lv = useWorkAssignmentLinesView(id, isOpen, WORK_ASSIGNMENT_LINE_SORT_FIELD_MAP)
  const { page, pageSize } = lv

  const withdraw = useWithdrawLines(id)
  const canManage = usePermission().can(wmsCan.workAssignmentManage)
  const print = usePrintLabels()

  const lineRows = useMemo(
    () =>
      lv.lines.map(
        (line, i): Record<string, unknown> => ({
          ...toLineRow(line),
          // Our own Sr No column carries the absolute row number across pages.
          srno: (page - 1) * pageSize + i + 1,
        }),
      ),
    [lv.lines, page, pageSize],
  )

  return {
    id,
    label,
    assignment,
    isOpen,
    confirming,
    setConfirming,
    lv,
    withdraw,
    canManage,
    print,
    lineRows,
  }
}
