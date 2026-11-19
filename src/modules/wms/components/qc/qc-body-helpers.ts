import { formatIST_date } from '@shared/lib/date'

import { type DeviceListParams, type DeviceSummary } from '../../api'
import { stageAssignee } from '../../hooks/operations/useStageQueue'
import { QC_STRINGS } from './qc.strings'

const C = QC_STRINGS.body.columns

// "Completed" reads the operation log, so devices stay listed after they move on.
export const QC_TABS = [
  { id: 'pending_qc', label: QC_STRINGS.body.tabs.pendingQc },
  { id: 'under_qc', label: QC_STRINGS.body.tabs.underQc },
  { id: 'completed', label: QC_STRINGS.body.tabs.completed },
] as const
export type QcTabId = (typeof QC_TABS)[number]['id']
export const QC_TAB_IDS = QC_TABS.map((t) => t.id)

/** Completed reads the QC operation log; the two in-stage tabs filter on the
 *  device's workflow_status. */
export const qcParamsFor = (tabId: QcTabId): DeviceListParams =>
  tabId === 'completed'
    ? { operation_type: 'qc', operation_status: ['completed'] }
    : { workflow_status: [tabId] }

// Widths sum to 100% so the actions column stays visible without scrolling.
export const columns = [
  { key: 'barcode', label: C.barcode, sortable: true, width: '10%' },
  { key: 'category', label: C.category, width: '8%', sortable: true, filterable: true },
  { key: 'partNo', label: C.partNo, width: '10%', sortable: true },
  // Part Name + Variant Name are display-only (no sort field on /wms/devices).
  { key: 'partName', label: C.partName, width: '16%' },
  { key: 'variant', label: C.partVariant, width: '14%' },
  { key: 'serialNo', label: C.serialNo, width: '11%', sortable: true },
  { key: 'rework', label: C.rework, align: 'center' as const, width: '6%' },
  { key: 'received', label: C.received, sortable: true, width: '7%' },
  { key: 'assignedTo', label: C.assignedTo, width: '180px', filterable: true },
  { key: 'actions', label: C.actions, align: 'right' as const, width: '10%' },
]

export const SORT_FIELD_MAP: Record<string, string> = {
  barcode: 'internal_serial',
  partNo: 'part_number',
  serialNo: 'manufacturer_serial',
  category: 'category',
  received: 'created_at',
}

/** One queue row: display columns + formatter context. */
export function toQcRow(d: DeviceSummary) {
  const assignee = stageAssignee('qc', d)
  return {
    id: d.id,
    barcode: d.internal_serial,
    partNo: d.part_number ?? '—',
    partName: d.part_name ?? '—',
    variant: d.part_variant_name ?? '—',
    serialNo: d.manufacturer_serial ?? '—',
    category: d.category_name ?? '—',
    rework: d.qc_rework_count ?? 0,
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
