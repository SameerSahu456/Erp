// ── Device Status Lifecycle ──
export const DEVICE_STATUSES = [
  'RECEIVED',
  'PENDING_INSPECTION',
  'UNDER_INSPECTION',
  'INSPECTED',
  'WAITING_FOR_SPARES',
  'READY_FOR_REPAIR',
  'UNDER_REPAIR',
  'IN_L3_REPAIR',
  'IN_DISPLAY_REPAIR',
  'IN_BATTERY_BOOST',
  'IN_PAINT_SHOP',
  'AWAITING_QC',
  'UNDER_QC',
  'READY_FOR_STOCK',
  'IN_STOCK',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'SCRAPPED',
] as const

export type DeviceStatus = (typeof DEVICE_STATUSES)[number]

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  RECEIVED: 'Received',
  PENDING_INSPECTION: 'Pending Inspection',
  UNDER_INSPECTION: 'Under Inspection',
  INSPECTED: 'Inspected',
  WAITING_FOR_SPARES: 'Waiting for Spares',
  READY_FOR_REPAIR: 'Ready for Repair',
  UNDER_REPAIR: 'Under Repair',
  IN_L3_REPAIR: 'In L3 Repair',
  IN_DISPLAY_REPAIR: 'In Display Repair',
  IN_BATTERY_BOOST: 'In Battery Boost',
  IN_PAINT_SHOP: 'In Paint Shop',
  AWAITING_QC: 'Awaiting QC',
  UNDER_QC: 'Under QC',
  READY_FOR_STOCK: 'Ready for Stock',
  IN_STOCK: 'In Stock',
  READY_FOR_DISPATCH: 'Ready for Dispatch',
  DISPATCHED: 'Dispatched',
  SCRAPPED: 'Scrapped',
}

export type DeviceStatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export const DEVICE_STATUS_VARIANT: Record<DeviceStatus, DeviceStatusVariant> = {
  RECEIVED: 'info',
  PENDING_INSPECTION: 'warning',
  UNDER_INSPECTION: 'warning',
  INSPECTED: 'info',
  WAITING_FOR_SPARES: 'warning',
  READY_FOR_REPAIR: 'warning',
  UNDER_REPAIR: 'warning',
  IN_L3_REPAIR: 'warning',
  IN_DISPLAY_REPAIR: 'warning',
  IN_BATTERY_BOOST: 'warning',
  IN_PAINT_SHOP: 'warning',
  AWAITING_QC: 'info',
  UNDER_QC: 'info',
  READY_FOR_STOCK: 'success',
  IN_STOCK: 'success',
  READY_FOR_DISPATCH: 'success',
  DISPATCHED: 'success',
  SCRAPPED: 'error',
}

// ── Workflow Stages (simplified for stepper) ──
export const WMS_WORKFLOW_STAGES = [
  { id: 'inward', label: 'Inward / GRN', accent: 'info' },
  { id: 'inspection', label: 'Inspection', accent: 'warning' },
  { id: 'repair', label: 'Repair / Paint', accent: 'violet' },
  { id: 'qc', label: 'Quality Control', accent: 'teal' },
  { id: 'inventory', label: 'Inventory', accent: 'success' },
  { id: 'dispatch', label: 'Dispatch', accent: 'primary' },
] as const

