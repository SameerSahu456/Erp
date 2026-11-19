import { type DateRange } from '@/components/common/pickers/DateRangePicker'

import { type DeviceSummary } from '../../api'
import { DEVICES_STRINGS as DS } from './devices.strings'
import { type DeviceQueueFilters } from '../../hooks/devices/useDeviceQueueControls'

export const columns = [
  { key: 'barcode', label: DS.list.columns.barcode, sortable: true, width: '12%' },
  { key: 'category', label: DS.list.columns.category, width: '10%', sortable: true, filterable: true },
  { key: 'partNo', label: DS.list.columns.partNo, sortable: true, width: '11%' },
  // Part Name + Variant Name as their own columns (display-only; the
  // /wms/devices sort set has no part_name / variant field).
  { key: 'partName', label: DS.list.columns.partName, width: '13%' },
  { key: 'variant', label: DS.list.columns.partVariant, width: '12%' },
  { key: 'serialNo', label: DS.list.columns.serialNo, sortable: true, width: '13%' },
  { key: 'batch', label: DS.list.columns.batch, width: '11%', sortable: true, filterable: true },
  { key: 'status', label: DS.list.columns.status, width: '12%', filterable: true },
  // One column per stage, each naming itself. They used to be "L1 / L2
  // Engineer" + "QC Engineer", where the first silently retargeted between the
  // inspection op and the repair op depending on the device's stage — so the
  // repair engineer existed but nothing on screen ever said so, and the header
  // named neither of the two questions the column answered.
  //
  // "L1 / L2" was vocabulary from the LEVEL-scoped model (L1/L2 inspected, L3
  // repaired and QC'd). c9068a15 retired that: any engineer of any level covers
  // all three stages, so the label named a distinction the system had stopped
  // making.
  { key: 'inspectionEngineer', label: DS.list.columns.inspectionEngineer, width: '11%', filterable: true },
  { key: 'repairEngineer', label: DS.list.columns.repairEngineer, width: '11%' },
  { key: 'qcEngineer', label: DS.list.columns.qcEngineer, width: '11%' },
]

// Stage / Scrap tabs already pin the status, so only the All tab offers the
// Status filter.
export const stageTabColumns = columns.map((c) =>
  c.key === 'status' ? { ...c, filterable: false } : c,
)

// Maps a table column key → the backend `sort` field. The backend `sort` is a
// closed literal set (created_at / internal_serial / part_number, each ±); a
// column not listed here would fall through to its raw key and 422 the whole
// list — which is exactly what "Part No" did before `partNo` was mapped.
export const SORT_FIELD_MAP: Record<string, string> = {
  barcode: 'internal_serial',
  serialNo: 'manufacturer_serial',
  partNo: 'part_number',
  category: 'category',
  batch: 'batch',
}

// Stage tabs: tab id → workflow statuses it lists (`all` = no filter).
// Counts come from device-stats `by_workflow_status`.
export const DEVICE_TAB_STATUSES = {
  all: [],
  inspection: ['pending_inspection', 'under_inspection'],
  repair: ['in_repair', 'waiting_for_spares'],
  qc: ['pending_qc', 'under_qc'],
  // Scrap is NOT a pipeline stage, so it has no workflow_status to filter on —
  // condemning a device clears it (device-scrap D1). The tab filters
  // `stock_items.status` instead; see DEVICE_TAB_DEVICE_STATUSES.
  scrap: [],
} as const satisfies Record<string, readonly string[]>

/** Tabs that filter `stock_items.status` rather than `workflow_status`.
 *
 *  Only Scrap does today. It needs its own axis because a condemned device
 *  leaves the pipeline entirely: it carries no workflow_status, so it can be
 *  expressed in neither a stage tab nor `by_workflow_status` counts — which is
 *  why `/devices/stats` also returns `by_device_status`. */
export const DEVICE_TAB_DEVICE_STATUSES = {
  all: [],
  inspection: [],
  repair: [],
  qc: [],
  scrap: ['scrapped'],
} as const satisfies Record<DeviceTabId, readonly string[]>
export type DeviceTabId = keyof typeof DEVICE_TAB_STATUSES
export const DEVICE_TABS = [
  { id: 'all', label: DS.list.tabs.all, statuses: DEVICE_TAB_STATUSES.all },
  { id: 'inspection', label: DS.list.tabs.inspection, statuses: DEVICE_TAB_STATUSES.inspection },
  { id: 'repair', label: DS.list.tabs.repair, statuses: DEVICE_TAB_STATUSES.repair },
  { id: 'qc', label: DS.list.tabs.qc, statuses: DEVICE_TAB_STATUSES.qc },
  { id: 'scrap', label: DS.list.tabs.scrap, statuses: DEVICE_TAB_STATUSES.scrap },
] as const satisfies readonly { id: DeviceTabId; label: string; statuses: readonly string[] }[]
export const DEVICE_TAB_IDS = DEVICE_TABS.map((t) => t.id)
export type DeviceFilters = DeviceQueueFilters & { dateRange: DateRange | undefined }

export type HubEngineerStage = 'inspection' | 'repair' | 'qc'

/** Engineer column key → the stage it answers for (each column names its own
 *  stage — no retargeting, so header and cell can never disagree). */
export const ENGINEER_COLUMN_STAGE: Record<string, HubEngineerStage> = {
  inspectionEngineer: 'inspection',
  repairEngineer: 'repair',
  qcEngineer: 'qc',
}

/** Placeholder for a stage the device hasn't reached yet. */
export const NOT_READY_TEXT: Record<HubEngineerStage, string> = {
  inspection: DS.list.notReadyInspection,
  repair: DS.list.notReadyRepair,
  qc: DS.list.notReadyQc,
}

const isAt = (wf: string, stage: HubEngineerStage) =>
  (DEVICE_TAB_STATUSES[stage] as readonly string[]).includes(wf)

const hubCatalogColumns = (d: DeviceSummary) => ({
  partNo: d.part_number ?? '—',
  partName: d.part_name ?? '—',
  variant: d.part_variant_name ?? '—',
  // Manufacturer serial ONLY — never the internal serial (own column).
  serialNo: d.manufacturer_serial || '—',
  category: d.category_name ?? '—',
  batch: d.grn_number ?? '—',
})

const hubLocationColumns = (d: DeviceSummary) => ({
  // Stock status — shown once the device leaves the pipeline (no workflow).
  stockStatus: d.status ?? '',
  // At a vendor the badge leads with the real stage, qualified by section.
  vendorPrior: d.vendor_prior_workflow_status ?? '',
  vendorSections: d.vendor_section_names ?? [],
  // A component still waits to be checked — flagged, never blocking (D8).
  componentsUnchecked: d.components_unchecked ?? false,
  warehouseId: d.warehouse_id ?? '',
  warehouse: d.warehouse_name ?? '—',
})

const hubAssigneeColumns = (d: DeviceSummary, wf: string) => ({
  inspectionEngineer: d.inspection_assignee_id ?? '',
  inspectionEngineerName: d.inspection_assignee_name ?? '',
  inspectionActive: isAt(wf, 'inspection'),
  repairEngineer: d.repair_assignee_id ?? '',
  repairEngineerName: d.repair_assignee_name ?? '',
  repairActive: isAt(wf, 'repair'),
  qcEngineer: d.qc_assignee_id ?? '',
  qcEngineerName: d.qc_assignee_name ?? '',
  qcActive: isAt(wf, 'qc'),
})

/** One hub row: display columns + per-stage assignee context (id, name,
 *  whether that stage is live so the picker is assignable). */
export function toDeviceHubRow(d: DeviceSummary) {
  const wf = d.workflow_status ?? ''
  return {
    id: d.id,
    barcode: d.internal_serial,
    ...hubCatalogColumns(d),
    status: wf,
    ...hubLocationColumns(d),
    ...hubAssigneeColumns(d, wf),
  }
}
