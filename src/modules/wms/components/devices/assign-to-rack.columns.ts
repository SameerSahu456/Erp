import { ASSIGN_TO_RACK_STRINGS } from './assign-to-rack.strings'

// Serial + MFR serial lead the row (right after SR No.), the identifiers a
// rack operator scans first; catalogue columns follow.
export const ASSIGN_TO_RACK_COLUMNS = [
  { key: 'serial', label: ASSIGN_TO_RACK_STRINGS.columns.serial, width: '12%', sortable: true },
  { key: 'category', label: ASSIGN_TO_RACK_STRINGS.columns.category, width: '11%', sortable: true, filterable: true },
  { key: 'mfrSerial', label: ASSIGN_TO_RACK_STRINGS.columns.mfrSerial, width: '12%', sortable: true },
  { key: 'partNo', label: ASSIGN_TO_RACK_STRINGS.columns.partNo, width: '11%', sortable: true },
  // Part Name as its own column (display-only; no /wms/devices sort field).
  { key: 'partName', label: ASSIGN_TO_RACK_STRINGS.columns.partName, width: '13%' },
  { key: 'variantName', label: ASSIGN_TO_RACK_STRINGS.columns.variantName, width: '13%', sortable: true, filterable: true },
  // QC pass grade the engineer gave (badge); server-filtered, not sortable.
  { key: 'grade', label: ASSIGN_TO_RACK_STRINGS.columns.grade, width: '7%', filterable: true },
  { key: 'warehouse', label: ASSIGN_TO_RACK_STRINGS.columns.warehouse, width: '12%' },
  { key: 'received', label: ASSIGN_TO_RACK_STRINGS.columns.received, width: '11%', sortable: true },
  { key: 'actions', label: ASSIGN_TO_RACK_STRINGS.columns.actions, align: 'right' as const, width: '12%' },
]

// Table column → backend `sort` field (server-side; every sort is an API call).
export const ASSIGN_TO_RACK_SORT_FIELD_MAP: Record<string, string> = {
  partNo: 'part_number',
  variantName: 'variant',
  category: 'category',
  serial: 'internal_serial',
  mfrSerial: 'manufacturer_serial',
  received: 'created_at',
}
