/**
 * Column + row shaping for the work-assignment list.
 *
 * Kept out of the body component so the table stays declarative
 * (Coding-guideline §8.2 — columns live in config files, not JSX).
 */
import type { ColumnDef } from '@/components/common/tables/BusinessMetricsTable'
import { formatIST_date } from '@shared/lib/date'

import type { WorkAssignment } from '../../api/work-assignments'
import {
  WORK_ASSIGNMENT_STAGE_LABEL,
  WORK_ASSIGNMENT_STATUS_LABEL,
} from '../../constants/work-assignment-status'
import type { WorkAssignmentStage } from '../../api/work-assignments'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

export const WORK_ASSIGNMENT_COLUMNS: ColumnDef[] = [
  { key: 'wa_number', label: S.columns.number, sortable: true, width: '190px' },
  { key: 'stage', label: S.columns.stage, sortable: true, filterable: true, width: '120px' },
  { key: 'issued_to_name', label: S.columns.issuedTo, sortable: true, width: '170px' },
  // Who opened the lot. Worth a column since unification (U12): it is no longer
  // always a manager — an engineer handing off a device they hold legitimately
  // opens the receiving engineer's lot, so "who created this" stopped having one
  // obvious answer.
  { key: 'issued_by_name', label: S.columns.issuedBy, width: '170px' },
  // The rollup split into one count per category, so each number is read
  // directly instead of being unpacked from a run-on phrase.
  // Right-aligned like every numeric column; all four are server-sortable.
  { key: 'outstanding', label: S.columns.outstanding, sortable: true, align: 'right', width: '120px' },
  { key: 'completed', label: S.columns.completed, sortable: true, align: 'right', width: '120px' },
  { key: 'withdrawn', label: S.columns.withdrawn, sortable: true, align: 'right', width: '120px' },
  { key: 'total', label: S.columns.total, sortable: true, align: 'right', width: '90px' },
  // Dates right-align like amounts/quantities (§9 cell alignment).
  { key: 'issued_at', label: S.columns.issuedAt, sortable: true, align: 'right', width: '130px' },
  { key: 'warehouse_name', label: S.columns.warehouse, sortable: true, width: '150px' },
  // Status is the primary split (rendered as tabs, §1), so the column is NOT a
  // filter — it only labels the row on the "All" tab. Rendered as a StatusBadge
  // by the body's cellFormatter.
  { key: 'status', label: S.columns.status, width: '110px' },
]

/** Table column key → backend sort field (the BE list `sort_exprs` map). */
export const SORT_FIELD_MAP: Record<string, string> = {
  wa_number: 'wa_number',
  issued_at: 'issued_at',
  stage: 'stage',
  issued_to_name: 'issued_to',
  warehouse_name: 'warehouse',
  outstanding: 'outstanding',
  completed: 'completed',
  withdrawn: 'withdrawn',
  total: 'total',
}

/** One table row. The table takes `Record<string, unknown>`, so the shaping
 *  happens once here rather than being re-derived inside a cell renderer. */
export function toRow(assignment: WorkAssignment): Record<string, unknown> {
  return {
    id: assignment.id,
    wa_number: assignment.wa_number,
    stage:
      WORK_ASSIGNMENT_STAGE_LABEL[assignment.stage as WorkAssignmentStage] ??
      assignment.stage,
    issued_to_name: assignment.issued_to_name ?? '—',
    issued_by_name: assignment.issued_by_name ?? '—',
    // One column per category so each count reads directly. A count of
    // 0 is a real, meaningful value here, so it shows as "0", never "—".
    outstanding: assignment.progress?.outstanding ?? 0,
    completed: assignment.progress?.completed ?? 0,
    withdrawn: assignment.progress?.withdrawn ?? 0,
    total: assignment.progress?.total ?? 0,
    issued_at: formatIST_date(assignment.issued_at),
    warehouse_name: assignment.warehouse_name ?? '—',
    status: WORK_ASSIGNMENT_STATUS_LABEL[assignment.status] ?? assignment.status,
    // Raw enum kept for the StatusBadge variant in the body's cellFormatter.
    _statusRaw: assignment.status,
  }
}
