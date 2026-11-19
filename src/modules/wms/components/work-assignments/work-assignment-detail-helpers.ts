import type { WorkAssignment } from '../../api/work-assignments'
import {
  WORK_ASSIGNMENT_STAGE_LABEL,
  WORK_ASSIGNMENT_STATUS_LABEL,
  WORK_ASSIGNMENT_STATUS_VARIANT,
} from '../../constants/work-assignment-status'

/** Detail-header subtitle ("Stage · Warehouse") and status badge for a work assignment. */
export function workAssignmentHeader(data: WorkAssignment) {
  return {
    subtitle: `${WORK_ASSIGNMENT_STAGE_LABEL[data.stage as 'inspection'] ?? data.stage} · ${
      data.warehouse_name ?? ''
    }`,
    status: {
      label: WORK_ASSIGNMENT_STATUS_LABEL[data.status] ?? data.status,
      variant: WORK_ASSIGNMENT_STATUS_VARIANT[data.status] ?? 'neutral',
    },
  }
}
