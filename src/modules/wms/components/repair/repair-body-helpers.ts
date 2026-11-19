import { formatIST_date } from '@shared/lib/date'

import { type DeviceListParams, type DeviceSummary } from '../../api'
import { stageAssignee } from '../../hooks/operations/useStageQueue'
import { REPAIR_STRINGS } from './repair.strings'

// Status tabs above the table. Server-filtered by the repair operation status
// (open bucket vs completed vs all).
// Typed lookup: tab id → the repair-op statuses it lists (no `find(...)!`).
export const REPAIR_TAB_STATUSES = {
  in_progress: ['pending', 'in_progress'],
  done: ['completed'],
  all: ['pending', 'in_progress', 'completed'],
} as const satisfies Record<string, readonly string[]>
export type RepairTabId = keyof typeof REPAIR_TAB_STATUSES
export const REPAIR_TABS = [
  { id: 'in_progress', label: REPAIR_STRINGS.repairQueue.tabs.inProgress, statuses: REPAIR_TAB_STATUSES.in_progress },
  { id: 'done', label: REPAIR_STRINGS.repairQueue.tabs.done, statuses: REPAIR_TAB_STATUSES.done },
  { id: 'all', label: REPAIR_STRINGS.repairQueue.tabs.all, statuses: REPAIR_TAB_STATUSES.all },
] as const satisfies readonly { id: RepairTabId; label: string; statuses: readonly string[] }[]
export const REPAIR_TAB_IDS = REPAIR_TABS.map((t) => t.id)

// Filter by open repair op, not workflow_status, so every device with pending repair shows.
export const repairParamsFor = (tab: RepairTabId): DeviceListParams => ({
  operation_type: 'repair',
  operation_status: [...REPAIR_TAB_STATUSES[tab]],
})

/** Repair is live only at these workflow stages — row actions and (re)assign
 *  follow the device's OWN state, not the active tab. */
const REPAIR_ACTIVE_STAGES = new Set(['in_repair', 'waiting_for_spares'])
export const isRepairActive = (workflow: string) => REPAIR_ACTIVE_STAGES.has(workflow)

/** One queue row: display columns + formatter context. */
export function toRepairRow(d: DeviceSummary) {
  const assignee = stageAssignee('repair', d)
  return {
    id: d.id,
    barcode: d.internal_serial,
    partNo: d.part_number ?? '—',
    partName: d.part_name ?? '—',
    variant: d.part_variant_name ?? '—',
    category: d.category_name ?? '—',
    // formatter context (not rendered as their own columns)
    workflow: d.workflow_status ?? '',
    status: d.status ?? '',
    assignedTo: assignee.id ?? '',
    warehouseId: d.warehouse_id ?? '',
    warehouse: d.warehouse_name ?? '—',
    received: formatIST_date(d.created_at),
    assigneeId: assignee.id,
    assigneeName: assignee.name,
  }
}

export const columns = [
  { key: 'barcode', label: REPAIR_STRINGS.repairQueue.columns.barcode, sortable: true, width: '13%' },
  { key: 'category', label: REPAIR_STRINGS.repairQueue.columns.category, width: '11%', sortable: true, filterable: true },
  { key: 'partNo', label: REPAIR_STRINGS.repairQueue.columns.partNo, width: '11%', sortable: true },
  // Part Name + Variant Name as their own columns (display-only; the
  // /wms/devices sort set has no part_name / variant field).
  { key: 'partName', label: REPAIR_STRINGS.repairQueue.columns.partName, width: '13%' },
  { key: 'variant', label: REPAIR_STRINGS.repairQueue.columns.partVariant, width: '12%' },
  { key: 'assignedTo', label: REPAIR_STRINGS.repairQueue.columns.assignedTo, width: '180px', filterable: true },
  { key: 'warehouse', label: REPAIR_STRINGS.repairQueue.columns.warehouse, width: '13%' },
  { key: 'received', label: REPAIR_STRINGS.repairQueue.columns.received, sortable: true, width: '9%' },
  { key: 'actions', label: REPAIR_STRINGS.repairQueue.columns.actions, align: 'right' as const, width: '11%' },
]

export const SORT_FIELD_MAP: Record<string, string> = {
  barcode: 'internal_serial',
  partNo: 'part_number',
  category: 'category',
  received: 'created_at',
}
