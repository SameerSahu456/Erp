/**
 * Columns + row shaping for the detail page's line-items table.
 *
 * The table is a BusinessMetricsTable driven server-side (search + pagination
 * from `GET /work-assignments/{id}/lines`), so the shaping happens once here and
 * the body stays declarative (Coding-guideline §8.2). The leading select
 * checkbox and the state badge are rendered by the body's `cellFormatter` —
 * they need selection state / the raw enum, which a pure config file can't hold.
 *
 * The Sr No column is our own (BMT's built-in `showIndex` is off) so the
 * checkbox can sit BEFORE it; the body fills each row's `srno` from the page
 * offset.
 */
import type { ColumnDef } from '@/components/common/tables/BusinessMetricsTable'
import { formatIST_date } from '@shared/lib/date'

import type { WorkAssignmentLine, WorkAssignmentLineState } from '../../api/work-assignments'
import { WORK_ASSIGNMENT_LINE_STATE_LABEL } from '../../constants/work-assignment-status'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

/** Derived line states, in display order — the status filter's options. */
export const WORK_ASSIGNMENT_LINE_STATE_OPTIONS: WorkAssignmentLineState[] = [
  'outstanding',
  'completed',
  'withdrawn',
]

export const WORK_ASSIGNMENT_LINE_COLUMNS: ColumnDef[] = [
  // Leading row-select checkbox (rendered by the body); empty header — select-all
  // lives beside the section title so it can scope to the current page.
  { key: 'select', label: '', align: 'center', width: '44px' },
  // Our own Sr No (BMT's showIndex is off) so the checkbox comes first.
  // Left-aligned so the number sits right beside the checkbox, no floating gap.
  { key: 'srno', label: S.detail.srNo, width: '56px' },
  { key: 'serial', label: S.detail.serial, sortable: true, width: '190px' },
  { key: 'part', label: S.issue.part, sortable: true, width: '280px' },
  { key: 'assignee', label: S.detail.currentlyWith, width: '180px' },
  { key: 'state', label: S.columns.status, filterable: true, width: '150px' },
  // When THIS device joined the lot — not the header's issued_at, which is when
  // the lot OPENED. A lot lasts as long as its work does, so on a week-old one
  // the header date says nothing about when any particular machine was handed
  // over (spec §3.1). Dates right-align like amounts (§9).
  { key: 'added_at', label: S.detail.added, sortable: true, align: 'right', width: '130px' },
]

/** Table column key → backend sort field (the BE line `_LINE_SORTABLE`). */
export const WORK_ASSIGNMENT_LINE_SORT_FIELD_MAP: Record<string, string> = {
  serial: 'internal_serial',
  part: 'part_number',
  added_at: 'added_at',
}

/** One table row. Keeps the raw enum + device id on `_`-prefixed keys so the
 *  body's cellFormatter can colour the state and target the per-row actions. */
export function toLineRow(line: WorkAssignmentLine): Record<string, unknown> {
  const part = [line.oem_name, line.part_number, line.variant_name]
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .join('/')
  return {
    id: line.id,
    // The checkbox renders from selection state in the body; an empty value
    // keeps the default renderer quiet until the formatter takes over.
    select: '',
    serial: line.internal_serial,
    part: part || '—',
    assignee: line.current_assignee_name ?? '—',
    state:
      WORK_ASSIGNMENT_LINE_STATE_LABEL[line.state as WorkAssignmentLineState] ?? line.state,
    _stateRaw: line.state,
    _stockItemId: line.stock_item_id,
    // Surfaced on the "Withdrawn" state badge (why the line left the lot, and
    // since unification who moved it — reassignment withdraws routinely now).
    _withdrawnReason: line.withdrawn_reason ?? null,
    _withdrawnBy: line.withdrawn_by_name ?? null,
    // Where the device went — U5 gives the target engineer their own lot, so
    // the story has to be followable from this end too.
    _movedToId: line.moved_to_assignment_id ?? null,
    _movedToNumber: line.moved_to_wa_number ?? null,
    added_at: line.added_at ? formatIST_date(line.added_at) : '—',
  }
}
