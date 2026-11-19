import { formatIST_date } from '@shared/lib/date'

import { type DeviceListParams, type DeviceSummary } from '../../api'
import { stageAssignee } from '../../hooks/operations/useStageQueue'
import { INSPECTION_STRINGS } from './inspection.strings'

export const INSPECTION_STAGES = ['pending_inspection', 'under_inspection']

// Status tabs above the table.
//  • Pending   = devices still in the inspection stage (workflow_status).
//  • Completed = devices whose inspection OPERATION is done — read off the
//    operation log, so it still lists them after they moved to the next stage.
export const INSPECTION_TABS = [
  { id: 'pending', label: INSPECTION_STRINGS.list.tabs.pending },
  { id: 'completed', label: INSPECTION_STRINGS.list.tabs.completed },
] as const
export type InspectionTabId = (typeof INSPECTION_TABS)[number]['id']
export const INSPECTION_TAB_IDS = INSPECTION_TABS.map((t) => t.id)

/** Pending filters by the inspection stage; Completed reads the completed
 *  inspection operation (so it still shows devices that moved on). */
export const inspectionParamsFor = (tab: InspectionTabId): DeviceListParams =>
  tab === 'completed'
    ? { operation_type: 'inspection', operation_status: ['completed'] }
    : { workflow_status: [...INSPECTION_STAGES] }

/** One queue row: display columns + formatter context. */
export function toInspectionRow(d: DeviceSummary) {
  const assignee = stageAssignee('inspection', d)
  return {
    id: d.id,
    barcode: d.internal_serial,
    partNo: d.part_number ?? '—',
    partName: d.part_name ?? '—',
    variant: d.part_variant_name ?? '—',
    serialNo: d.manufacturer_serial ?? '—',
    category: d.category_name ?? '—',
    batch: d.grn_number ?? '—',
    received: formatIST_date(d.created_at),
    assignedTo: assignee.id ?? '',
    actions: d.id,
    // formatter context (not rendered as its own column)
    warehouseId: d.warehouse_id ?? '',
    workflow: d.workflow_status ?? '',
    status: d.status ?? '',
    assigneeId: assignee.id,
    assigneeName: assignee.name,
  }
}

// Columns mirror the design reference.
export const columns = [
  { key: 'barcode', label: INSPECTION_STRINGS.list.columns.barcode, width: '12%', sortable: true },
  { key: 'category', label: INSPECTION_STRINGS.list.columns.category, width: '9%', sortable: true, filterable: true },
  { key: 'partNo', label: INSPECTION_STRINGS.list.columns.partNo, width: '11%', sortable: true },
  // Part Name + Variant Name as their own columns (display-only; the
  // /wms/devices sort set has no part_name / variant field).
  { key: 'partName', label: INSPECTION_STRINGS.list.columns.partName, width: '14%' },
  { key: 'variant', label: INSPECTION_STRINGS.list.columns.partVariant, width: '13%' },
  { key: 'serialNo', label: INSPECTION_STRINGS.list.columns.serialNo, width: '13%', sortable: true },
  { key: 'batch', label: INSPECTION_STRINGS.list.columns.batch, width: '11%', sortable: true, filterable: true },
  { key: 'received', label: INSPECTION_STRINGS.list.columns.received, width: '10%', sortable: true },
  { key: 'assignedTo', label: INSPECTION_STRINGS.list.columns.assignedTo, width: '12%', filterable: true },
  { key: 'actions', label: INSPECTION_STRINGS.list.columns.actions, align: 'right' as const, width: '6%' },
]

// Table column → backend `sort` field. Only columns the /wms/devices endpoint
// can order server-side are here; every sort is a fresh API call.
export const SORT_FIELD_MAP: Record<string, string> = {
  barcode: 'internal_serial',
  partNo: 'part_number',
  serialNo: 'manufacturer_serial',
  category: 'category',
  batch: 'batch',
  received: 'created_at',
}
