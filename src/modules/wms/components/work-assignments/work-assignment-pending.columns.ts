/** Pending-tab columns (one row per GRN) and per-tab lookups for the work-assignment list. */
import type { ColumnDef } from '@/components/common/tables/BusinessMetricsTable'
import { formatIST_date } from '@shared/lib/date'

import type { PendingGrnGroup } from '../../hooks/work-assignments/useWorkAssignmentEligibleSummary'
import type { WaTabId } from '../../hooks/work-assignments/useWorkAssignmentsList'
import { WORK_ASSIGNMENT_STATUS_LABEL } from '../../constants/work-assignment-status'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

/** Pending-tab columns. Not sortable/filterable: eligible-summary returns the
 *  full set oldest-first and takes no sort/filter params. */
export const PENDING_COLUMNS: ColumnDef[] = [
  { key: 'grn_number', label: S.columns.grn, width: '200px' },
  { key: 'received_at', label: S.columns.received, align: 'right', width: '150px' },
  { key: 'warehouse_name', label: S.columns.warehouse, width: '180px' },
  { key: 'parts', label: S.columns.parts, align: 'right', width: '110px' },
  { key: 'pending', label: S.columns.pending, align: 'right', width: '120px' },
]

/** Shape one GRN group into a pending-tab row. A count of 0 never appears here
 *  (the group would not be returned), so numbers render as-is. */
export function toPendingRow(
  group: PendingGrnGroup,
  warehouseName: (id: string) => string,
): Record<string, unknown> {
  return {
    // grn_batch_id doubles as the stable row id AND the issue-wizard deep-link
    // target; fall back to the number only so the row still has a key.
    id: group.grn_batch_id ?? group.grn_number ?? '',
    grn_number: group.grn_number ?? '—',
    received_at: group.received_at ? formatIST_date(group.received_at) : '—',
    warehouse_name: warehouseName(group.warehouse_id),
    parts: group.lines?.length ?? 0,
    pending: group.pending_count,
    // Carried for the row-click deep link into the issue wizard.
    _grnBatchId: group.grn_batch_id ?? null,
    _warehouseId: group.warehouse_id,
  }
}

/** Pending rows, filtered client-side (eligible-summary has no search). `term` is lower-cased. */
export function toPendingRows(
  groups: PendingGrnGroup[],
  warehouseNameById: Map<string, string>,
  term: string,
): Record<string, unknown>[] {
  const nameOf = (id: string) => warehouseNameById.get(id) ?? '—'
  const all = groups.map((group) => toPendingRow(group, nameOf))
  if (!term) return all
  return all.filter(
    (row) =>
      String(row.grn_number).toLowerCase().includes(term) ||
      String(row.warehouse_name).toLowerCase().includes(term),
  )
}

/** Tab pill label per tab id. */
export const WA_TAB_LABEL: Record<WaTabId, string> = {
  all: S.list.tabAll,
  pending: S.list.tabPending,
  open: WORK_ASSIGNMENT_STATUS_LABEL.open,
  closed: WORK_ASSIGNMENT_STATUS_LABEL.closed,
}

/** Empty-state copy for the active tab. Pending reads from eligible-summary, so
 *  it has its own copy; with no warehouse to fan out over it prompts for one. */
export function waEmptyState(args: {
  isPendingTab: boolean
  isError: boolean
  hasPendingWarehouses: boolean
}): { title: string; description: string | undefined } {
  const { isPendingTab, isError, hasPendingWarehouses } = args
  if (!isPendingTab) {
    if (isError) return { title: S.list.error, description: undefined }
    return { title: S.list.empty, description: S.list.emptyHint }
  }
  if (isError) return { title: S.list.pendingError, description: undefined }
  return {
    title: S.list.pendingEmpty,
    description: hasPendingWarehouses ? S.list.pendingEmptyHint : S.list.pendingPickWarehouse,
  }
}
