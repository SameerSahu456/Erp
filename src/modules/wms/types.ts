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
  'AWAITING_OUTWARD_QC',
  'UNDER_OUTWARD_QC',
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
  AWAITING_OUTWARD_QC: 'Awaiting Outward QC',
  UNDER_OUTWARD_QC: 'Under Outward QC',
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
  AWAITING_OUTWARD_QC: 'info',
  UNDER_OUTWARD_QC: 'info',
  READY_FOR_DISPATCH: 'success',
  DISPATCHED: 'success',
  SCRAPPED: 'error',
}

// ── Workflow Stages (simplified for stepper) ──
export const WMS_WORKFLOW_STAGES = [
  { id: 'inward', label: 'Inward / GRN' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'repair', label: 'Repair / Paint' },
  { id: 'qc', label: 'Quality Control' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'outward-qc', label: 'Outward QC' },
  { id: 'dispatch', label: 'Dispatch' },
] as const

// ── Batch Types ──
export type BatchOwnershipType = 'REFURB_PURCHASE' | 'RENTAL_RETURN' | 'ADVANCE_RETURN'

export interface InwardBatch {
  id: string
  batchNumber: string // BATCH-2026-0001
  ownershipType: BatchOwnershipType
  deviceCount: number
  receivedDate: string
  receivedBy: string
  category: string
  brand: string
  notes?: string
  status: 'Open' | 'Closed'
  createdAt: string
}

// ── Device ──
export interface Device {
  id: string
  barcode: string // L-DEL-4521 format
  batchId: string
  batchNumber: string
  category: string
  brand: string
  model: string
  serialNumber: string
  status: DeviceStatus
  grade?: 'A' | 'B'
  assignedTo?: string
  // Workflow flags
  requiresRepair: boolean
  requiresPaint: boolean
  requiresSpares: boolean
  repairCompleted: boolean
  paintCompleted: boolean
  sparesIssued: boolean
  // QC tracking
  qcFailCount: number
  outwardQcFailCount: number
  // Timestamps
  receivedAt: string
  inspectedAt?: string
  repairedAt?: string
  qcPassedAt?: string
  dispatchedAt?: string
  // Location
  location: string
  warehouseId?: string
  warehouseName?: string
  rackLocation?: string  // 'Row1-RackA-Bin3'
  aliases?: string[]
  inwardType?: InwardType
  poNumber?: string
}

// ── Inspection ──
export const INSPECTION_CHECKLIST_ITEMS = [
  { id: 'panel_a', label: 'Panel A (Top Cover)', group: 'Panels' },
  { id: 'panel_b', label: 'Panel B (Screen Bezel)', group: 'Panels' },
  { id: 'panel_c', label: 'Panel C (Keyboard Area)', group: 'Panels' },
  { id: 'panel_d', label: 'Panel D (Bottom Cover)', group: 'Panels' },
  { id: 'display_white', label: 'Display (White Spots)', group: 'Display' },
  { id: 'display_black', label: 'Display (Black Spots)', group: 'Display' },
  { id: 'display_scratch', label: 'Display (Scratches)', group: 'Display' },
  { id: 'keyboard', label: 'Keyboard', group: 'Input' },
  { id: 'touchpad', label: 'Touchpad', group: 'Input' },
  { id: 'mic', label: 'Microphone', group: 'Audio' },
  { id: 'speaker', label: 'Speaker', group: 'Audio' },
  { id: 'battery', label: 'Battery Health', group: 'Power' },
  { id: 'ram', label: 'RAM', group: 'Hardware' },
  { id: 'ssd', label: 'SSD', group: 'Hardware' },
  { id: 'hdd', label: 'HDD', group: 'Hardware' },
  { id: 'fan', label: 'Fan / Cleanliness', group: 'Hardware' },
  { id: 'usb', label: 'USB Ports', group: 'Ports' },
  { id: 'hdmi', label: 'HDMI Port', group: 'Ports' },
  { id: 'lan', label: 'LAN Port', group: 'Ports' },
  { id: 'headphone', label: 'Headphone Jack', group: 'Ports' },
] as const

export type InspectionResult = 'PASS' | 'FAIL' | 'NOT_APPLICABLE'

export interface InspectionCheckItem {
  itemId: string
  result: InspectionResult
  notes?: string
}

export interface InspectionRecord {
  id: string
  deviceId: string
  deviceBarcode: string
  inspectedBy: string
  inspectedAt: string
  checklist: InspectionCheckItem[]
  requiresRepair: boolean
  requiresPaint: boolean
  requiresSpares: boolean
  repairType?: ('L2' | 'L3' | 'DISPLAY' | 'BATTERY')[]
  paintPanels?: ('TOP_COVER' | 'BOTTOM_COVER')[]
  spareParts?: string[]
  overallNotes?: string
}

// ── Repair ──
export type RepairType = 'L2' | 'L3' | 'DISPLAY' | 'BATTERY'

export interface RepairJob {
  id: string
  deviceId: string
  deviceBarcode: string
  repairType: RepairType
  assignedTo: string
  status: 'Assigned' | 'In Progress' | 'Completed' | 'Failed'
  isRework: boolean
  reworkCount: number
  startedAt?: string
  completedAt?: string
  notes?: string
  issues?: string[]
}

// ── Paint ──
export type PaintPanelType = 'TOP_COVER' | 'BOTTOM_COVER'
export type PaintStatus = 'AWAITING_PAINT' | 'IN_PAINT' | 'READY_FOR_COLLECTION' | 'COLLECTED'

export interface PaintJob {
  id: string
  deviceId: string
  deviceBarcode: string
  panelType: PaintPanelType
  status: PaintStatus
  assignedTo?: string
  startedAt?: string
  completedAt?: string
}

// ── QC ──
export interface QCRecord {
  id: string
  deviceId: string
  deviceBarcode: string
  qcType: 'INWARD' | 'OUTWARD'
  result: 'PASSED' | 'FAILED'
  grade?: 'A' | 'B' // Only for inward QC
  failureReasons?: string[]
  inspectedBy: string
  inspectedAt: string
  notes?: string
}

// ── Outward ──
export type OutwardType = 'SALES' | 'RENTAL' | 'DEMO' | 'INTERNAL_TRANSFER' | 'RETURN_REPLACEMENT'

export interface OutwardRecord {
  id: string
  outwardNumber: string  // OUT-2026-001
  type: OutwardType
  // Source reference
  salesOrderId?: string
  salesOrderNumber?: string
  rentalContractId?: string
  demoRequestId?: string
  // Customer/destination
  customerName: string
  contactPerson: string
  contactPhone: string
  shippingAddress: string
  // Devices
  devices: OutwardDevice[]
  // Logistics
  logistics: OutwardLogistics
  // QC
  qcStatus: 'Pending' | 'In Progress' | 'Passed' | 'Failed' | 'Partial'
  qcCompletedDevices: number
  qcFailedDevices: number
  // Status workflow
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Picking' | 'Packed' | 'Pending QC' | 'QC Passed' | 'Ready for Dispatch' | 'Dispatched' | 'Delivered' | 'Partially Returned'
  // People
  preparedBy: string
  approvedBy?: string
  dispatchedBy?: string
  storeManager: string
  // Dates
  requestedDate: string
  expectedDispatchDate: string
  actualDispatchDate?: string
  deliveredDate?: string
  createdAt: string
  notes?: string
}

export interface OutwardDevice {
  deviceId: string
  barcode: string
  model: string
  brand: string
  serialNumber: string
  grade?: 'A' | 'B'
  qcResult?: 'Passed' | 'Failed' | 'Pending'
  qcNotes?: string
  packingStatus: 'Not Packed' | 'Packed' | 'Verified'
}

export interface OutwardLogistics {
  vehicleNumber?: string
  driverName?: string
  driverPhone?: string
  transporterName?: string
  trackingNumber?: string
  challanNumber?: string
  estimatedDelivery?: string
  packagingType?: string  // 'Box', 'Pallet', 'Crate'
  totalWeight?: number  // kg
  specialInstructions?: string
}

// Dispatch workflow stages for stepper
export const DISPATCH_WORKFLOW_STAGES = [
  { id: 'request', label: 'Request' },
  { id: 'approval', label: 'Approval' },
  { id: 'picking', label: 'Picking' },
  { id: 'packing', label: 'Packing' },
  { id: 'qc', label: 'Outward QC' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'delivery', label: 'Delivery' },
] as const

// Return flow for QC-failed devices
export interface ReturnRecord {
  id: string
  returnNumber: string  // RET-2026-001
  outwardId: string
  outwardNumber: string
  reason: 'QC_FAILED' | 'CUSTOMER_RETURN' | 'DAMAGE_IN_TRANSIT' | 'WRONG_ITEM'
  devices: ReturnDevice[]
  status: 'Initiated' | 'Received' | 'Inspected' | 'Resolved'
  returnedBy: string
  receivedBy?: string
  createdAt: string
  notes?: string
}

export interface ReturnDevice {
  deviceId: string
  barcode: string
  model: string
  reason: string
  action: 'Repair' | 'Restock' | 'Scrap' | 'Pending'
}

// ── Stock Movement (Audit) ──
export interface StockMovement {
  id: string
  deviceId: string
  deviceBarcode: string
  fromStatus: DeviceStatus
  toStatus: DeviceStatus
  changedBy: string
  changedAt: string
  notes?: string
}

// ── IMS Types ──
export interface IMSCategory {
  id: string
  name: string
  parentId?: string
  subcategories?: IMSCategory[]
  partCount: number
}

export interface StockItem {
  id: string
  name: string
  categoryId: string
  categoryName: string
  subcategory?: string
  sku: string
  brand: string
  variants: StockVariant[]
  reorderLevel: number
  location: string
  aliases?: string[]
}

export interface StockVariant {
  type: 'New' | 'Refurbished' | 'New Pool'
  quantity: number
  unitPrice: number
  lastUpdated: string
  skus: StockSku[]
}

export interface StockSku {
  sku: string
  serialNumber: string
  barcode: string
  status: 'In Stock' | 'Reserved' | 'Dispatched' | 'In Repair'
  grade?: 'A' | 'B'
  location: string
  poNumber?: string
  batchNumber?: string
  receivedDate: string
  lastMovement: string
}

// ── SKU History / Traceability ──
export interface SkuHistoryEntry {
  id: string
  sku: string
  event: 'PO_CREATED' | 'PO_RECEIVED' | 'GRN_INWARD' | 'INSPECTION' | 'REPAIR' | 'QC_PASSED' | 'QC_FAILED' | 'STOCKED' | 'DISPATCHED' | 'PRICE_CHANGED' | 'LOCATION_CHANGED'
  description: string
  fromValue?: string
  toValue?: string
  user: string
  timestamp: string
  reference?: string
}

// ── Checklist Templates ──
export type ChecklistType = 'INWARD' | 'OUTWARD' | 'INSPECTION' | 'QC'

export interface ChecklistTemplateItem {
  id: string
  label: string
  group: string
  description?: string
  required: boolean
}

export interface ChecklistTemplate {
  id: string
  name: string
  type: ChecklistType
  assignedTo: {
    level: 'category' | 'subcategory' | 'part'
    id: string
    name: string
  }
  items: ChecklistTemplateItem[]
  createdBy: string
  createdAt: string
  isActive: boolean
}

// ── Warehouse Locations ──
export interface Warehouse {
  id: string
  name: string
  code: string  // e.g., 'MUM-WH1'
  address: string
  city: string
  manager: string
  storeTeam: string[]
  rows: WarehouseRow[]
}

export interface WarehouseRow {
  id: string
  name: string  // 'Row 1', 'Row 2'
  racks: WarehouseRack[]
}

export interface WarehouseRack {
  id: string
  name: string  // 'Rack A', 'Rack B'
  bins: WarehouseBin[]
  dimensions?: { width: number; height: number; depth: number }  // cm
  capacityUsed: number  // percentage 0-100
}

export interface WarehouseBin {
  id: string
  name: string  // 'Bin 1', 'Bin 2'
  itemCount: number
  maxItems: number
  status: 'Empty' | 'Partial' | 'Full'
}

// ── Enhanced Inward ──
export type InwardType = 'PURCHASE_ORDER' | 'RENTAL_RETURN' | 'DEMO_RETURN' | 'INTERNAL_TRANSFER' | 'ADVANCE_RETURN' | 'REFURB_PURCHASE'

export interface InwardBatchEnhanced {
  id: string
  batchNumber: string
  inwardType: InwardType
  // PO linkage
  poNumber?: string
  poId?: string
  vendorName?: string
  // Source details
  sourceType: string  // 'Vendor', 'Customer', 'Internal', 'Demo'
  sourceName: string
  sourceRef?: string  // customer name, internal dept, demo ID
  // Stock variant this maps to
  stockVariant: 'New' | 'Refurbished' | 'New Pool'
  // Device details
  category: string
  subcategory?: string
  brand: string
  deviceCount: number
  // Location assignment
  warehouseId: string
  warehouseName: string
  assignedLocation?: string  // 'Row1-RackA-Bin3'
  // People
  receivedBy: string
  inspectionAssignedTo?: string
  // Status
  status: 'Open' | 'In Inspection' | 'Closed'
  notes?: string
  createdAt: string
}

// ── Part Aliases ──
export interface PartAlias {
  partId: string
  aliases: string[]  // alternate names for search
}
