/**
 * Display labels for work-assignment enums (Coding-guideline §16.12).
 *
 * `Record<Enum, string>` so a new backend value is a TYPE error here rather
 * than a blank cell in the UI.
 */
import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'

import type {
  WorkAssignmentLineState,
  WorkAssignmentStage,
} from '../api/work-assignments'

export const WORK_ASSIGNMENT_STAGE_LABEL: Record<WorkAssignmentStage, string> = {
  inspection: 'Inspection',
  repair: 'Repair',
  qc: 'QC',
}

export const WORK_ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

export const WORK_ASSIGNMENT_LINE_STATE_LABEL: Record<WorkAssignmentLineState, string> = {
  outstanding: 'Outstanding',
  reassigned: 'Reassigned',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
}

/**
 * StatusBadge variants — semantic names only, never a hex (§8.5).
 *
 * `reassigned` is a WARNING rather than an error: the work moved to someone
 * else, which is normal on a floor where people go off sick. `withdrawn` is
 * neutral for the same reason — a device pulled from a lot is a decision
 * someone made, not a failure.
 */
export const WORK_ASSIGNMENT_LINE_STATE_VARIANT: Record<
  WorkAssignmentLineState,
  StatusBadgeVariant
> = {
  outstanding: 'info',
  reassigned: 'warning',
  completed: 'success',
  withdrawn: 'neutral',
}

export const WORK_ASSIGNMENT_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  open: 'info',
  closed: 'success',
  cancelled: 'neutral',
}
