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
// `UNIT` covers laptops / single-serial stock. `ASSEMBLY` covers servers and
// similar multi-component builds where the chassis carries a BOM of serialized parts.
export type DeviceKind = 'UNIT' | 'ASSEMBLY'

// A single slot inside an ASSEMBLY device, one row per unit of quantity
// (e.g. a BOM line with quantity 4 produces 4 ComponentSlots).
export type ComponentInspectionResult = 'PENDING' | 'PASS' | 'FAIL' | 'NOT_APPLICABLE'
export type ComponentFailAction = 'REPAIR' | 'REPLACE'

export interface DeviceComponent {
  slotId: string                 // unique per device, e.g. 'dev-srv-001:CPU:1'
  bomItemId: string              // references BillOfMaterials.items[].id
  slotIndex: number              // 1-based position within the BOM line (CPU 1 of 2 → 1)
  partId: string
  partName: string
  partSku: string
  position?: string              // copied from BOMItem.position, e.g. 'CPU Socket 1 & 2'
  serialNumber: string
  barcode?: string
  // Inspection outcome (populated during assembly inspection)
  inspectionResult?: ComponentInspectionResult
  inspectionNotes?: string
  // Fail handling — exactly one set when inspectionResult === 'FAIL'
  failAction?: ComponentFailAction
  spareRequestId?: string        // set when failAction === 'REPLACE'
  repairJobId?: string           // set when failAction === 'REPAIR'
  resolved?: boolean             // true once spare fulfilled or repair completed
}

export interface Device {
  id: string
  barcode: string // L-DEL-4521 format
  batchId: string
  batchNumber: string
  category: string
  brand: string
  model: string
  serialNumber: string
  biosNo?: string
  status: DeviceStatus
  grade?: 'A' | 'B'
  assignedTo?: string
  // Unit vs assembly
  deviceKind?: DeviceKind        // omitted = 'UNIT' (backwards compatible)
  parentPartId?: string          // PART id of the chassis (for assemblies)
  bomId?: string                 // BillOfMaterials.id used at inward time
  bomNumber?: string             // denormalized for display
  components?: DeviceComponent[] // only populated on ASSEMBLY devices
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

// Server inspection checklist — generic line items so the same template covers
// every server config (we don't enumerate per-component part numbers because
// each chassis ships with a different BOM).
export const SERVER_INSPECTION_CHECKLIST_ITEMS = [
  { id: 'chassis_top', label: 'Chassis Top Cover', group: 'Chassis' },
  { id: 'chassis_front', label: 'Front Bezel', group: 'Chassis' },
  { id: 'chassis_rails', label: 'Rack Rails / Mounts', group: 'Chassis' },
  { id: 'psu_primary', label: 'Power Supply 1', group: 'Power' },
  { id: 'psu_redundant', label: 'Power Supply 2 (Redundant)', group: 'Power' },
  { id: 'power_leds', label: 'Power / Status LEDs', group: 'Power' },
  { id: 'cpu_primary', label: 'CPU 1', group: 'Compute' },
  { id: 'cpu_secondary', label: 'CPU 2', group: 'Compute' },
  { id: 'memory_modules', label: 'Memory Modules (DIMMs)', group: 'Memory' },
  { id: 'memory_ecc', label: 'ECC Errors', group: 'Memory' },
  { id: 'storage_drives', label: 'Drive Bays / Drives Detected', group: 'Storage' },
  { id: 'storage_raid', label: 'RAID Controller', group: 'Storage' },
  { id: 'storage_backplane', label: 'Backplane', group: 'Storage' },
  { id: 'fans_front', label: 'Front Fans', group: 'Cooling' },
  { id: 'fans_rear', label: 'Rear Fans', group: 'Cooling' },
  { id: 'heatsinks', label: 'Heatsinks Seated', group: 'Cooling' },
  { id: 'nic_onboard', label: 'Onboard NIC', group: 'Networking' },
  { id: 'nic_addon', label: 'Add-on NIC', group: 'Networking' },
  { id: 'mgmt_iface', label: 'Management Port (iDRAC / iLO / IPMI)', group: 'Networking' },
  { id: 'usb_ports', label: 'USB Ports', group: 'Ports' },
  { id: 'vga_port', label: 'VGA / Display Port', group: 'Ports' },
  { id: 'serial_port', label: 'Serial Port', group: 'Ports' },
] as const

export type InspectionResult = 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'SCRAP'

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
  status: 'Assigned' | 'In Progress' | 'QC Passed' | 'Completed' | 'Failed'
  isRework: boolean
  reworkCount: number
  startedAt?: string
  completedAt?: string
  notes?: string
  issues?: string[]
  // Component-scoped repair (set when the job targets one slot of an ASSEMBLY device)
  componentSlotId?: string
  componentPartName?: string
}

// ── Paint ──
export type PaintPanelType = 'TOP_COVER' | 'BOTTOM_COVER'
export type PaintStatus = 'AWAITING_PAINT' | 'IN_PAINT' | 'READY_FOR_COLLECTION' | 'COLLECTED'

export type PaintHistoryEvent = 'SENT' | 'REPAINT_SENT' | 'COMPLETED'

export interface PaintJobHistoryEntry {
  event: PaintHistoryEvent
  vendor?: string
  notes?: string
  at: string
}

export interface PaintJob {
  id: string
  deviceId: string
  deviceBarcode: string
  panelType: PaintPanelType
  status: PaintStatus
  assignedTo?: string
  startedAt?: string
  completedAt?: string
  history?: PaintJobHistoryEntry[]
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
  description?: string
  productManager?: string
  isActive: boolean
}

// ── Part/Product Management ──
export type PartProductType = 'parent' | 'variant'
export type PartAssemblyType = 'Assembled' | 'Disassembled'

// Hardware classification for server / workstation build composition.
// Used by the Compatible / Assembly / Disassembly pickers to group candidate parts.
export type HardwareType =
  | 'CPU'
  | 'RAM'
  | 'Memory'
  | 'Motherboard'
  | 'Storage'
  | 'HDD'
  | 'SATA SSD'
  | 'SAS SSD'
  | 'NVMe SSD'
  | 'DVD'
  | 'RAID'
  | 'NIC'
  | 'Ethernet Adapter'
  | 'FC HBA'
  | 'Riser'
  | 'Ports'
  | 'Expansion'
  | 'PSU'
  | 'Chassis'
  | 'Cooling'
  | 'Cable Kit'
  | 'BIOS'
  | 'OS'
  | 'Hypervisor'

export interface HardwareTaxonomyType {
  key: HardwareType
  label: string
}

export interface HardwareTaxonomyGroup {
  group: string
  types: HardwareTaxonomyType[]
}

export const HARDWARE_TAXONOMY: HardwareTaxonomyGroup[] = [
  {
    group: 'Core hardware',
    types: [
      { key: 'CPU', label: 'CPU' },
      { key: 'RAM', label: 'RAM' },
      { key: 'Memory', label: 'Memory' },
      { key: 'Motherboard', label: 'Motherboard' },
      { key: 'RAID', label: 'RAID controller' },
    ],
  },
  {
    group: 'Drives & storage',
    types: [
      { key: 'Storage', label: 'Storage' },
      { key: 'HDD', label: 'HDD' },
      { key: 'SATA SSD', label: 'SATA SSD' },
      { key: 'SAS SSD', label: 'SAS SSD' },
      { key: 'NVMe SSD', label: 'NVMe SSD' },
      { key: 'DVD', label: 'DVD' },
    ],
  },
  {
    group: 'Networking & I/O',
    types: [
      { key: 'NIC', label: 'Network interface cards (NICs)' },
      { key: 'Ethernet Adapter', label: 'Ethernet Adapter' },
      { key: 'FC HBA', label: 'FC HBA card' },
      { key: 'Riser', label: 'Riser' },
      { key: 'Ports', label: 'Ports' },
      { key: 'Expansion', label: 'Expansion cards' },
    ],
  },
  {
    group: 'Power & chassis',
    types: [
      { key: 'PSU', label: 'Power supplies' },
      { key: 'Chassis', label: 'Chassis / rack unit' },
      { key: 'Cooling', label: 'Cooling' },
      { key: 'Cable Kit', label: 'Cable kit' },
    ],
  },
  {
    group: 'Firmware / software',
    types: [
      { key: 'BIOS', label: 'BIOS / firmware versions' },
      { key: 'OS', label: 'OS' },
      { key: 'Hypervisor', label: 'Hypervisor' },
    ],
  },
]

export interface Part {
  id: string
  name: string
  aliases: string[]
  sku: string
  categoryId: string
  categoryName: string
  subcategoryId?: string
  subcategoryName?: string
  brand: string
  model?: string
  description?: string
  images: string[]  // URLs or placeholder paths
  videos?: string[]  // URLs or placeholder paths
  specifications?: Record<string, string>  // e.g., { 'RAM': '16GB', 'Storage': '512GB SSD' }
  productManager?: string
  productManagerEmail?: string
  // Checklist assignments
  inwardChecklistId?: string
  outwardChecklistId?: string
  inspectionChecklistId?: string
  // Stock info
  reorderLevel: number
  unitOfMeasure: string  // 'Units', 'Pieces', 'Sets'
  hsnCode?: string  // for GST
  // Product type + variant linkage (productType defaults to 'parent' when omitted)
  productType?: PartProductType
  parentPartId?: string                // set when productType === 'variant'
  condition?: VariantCondition         // variant condition: 'New' | 'Refurbished' | 'New Pull'
  sellPrice?: number                   // canonical sell price shown in list view (variants carry this)
  assemblyType?: PartAssemblyType      // whether this part ships Assembled or Disassembled
  hardwareType?: HardwareType          // server-hardware taxonomy used for grouping in Compatible / BOM pickers
  // Status
  isActive: boolean
  createdAt: string
  updatedAt?: string
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
  type: 'New' | 'Refurbished' | 'New Pull'
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

// ── Variants (canonical SKU unit — the thing every dropdown, line item, and price refers to) ──
export type VariantCondition = 'New' | 'Refurbished' | 'New Pull'

export interface Variant {
  id: string                        // VAR-0001
  partId: string                    // parent template (grouping only)
  condition: VariantCondition
  attributes: Record<string, string> // { RAM: '16GB', Color: 'Gray' } — optional spec axes
  variantSku: string                // unique — e.g. 'DL-LAT-5540-NEW'
  displayName: string               // denormalized for pickers — 'Dell Latitude 5540 · New'
  // pricing lives on the variant directly
  sellPrice: number
  costPrice?: number
  mrp?: number
  currency: 'INR'
  // ops
  reorderLevel: number
  isActive: boolean
  // inventory roll-up — computed in a later phase from StockUnit[]; optional until then
  quantityOnHand?: number
  createdAt: string
  updatedAt?: string
}

// Serialized physical unit (successor to StockSku — points at a Variant, not a bare SKU)
export interface StockUnit {
  id: string
  variantId: string
  serialNumber: string
  barcode?: string
  status: 'In Stock' | 'Reserved' | 'Dispatched' | 'In Repair' | 'Returned-QC'
  grade?: 'A' | 'B'
  location: string
  poNumber?: string
  batchNumber?: string
  receivedDate: string
  lastMovement: string
}

// Procurement-only tag — lives on PO / inward records, NOT on the variant
export type PurchaseType = 'Local' | 'Import'

// ── WMS Outward — SO-level Dispatch Request ──────────────────────────────────
// Captures the external-assembly → billing → dispatch flow. Distinct from the
// internal OutwardRecord flow below (which is the warehouse picking/packing/QC path).

export type DispatchAction =
  | 'PLANNED'            // from SO; no variance
  | 'FITTED_AS_PLANNED'  // SO line fitted with the variant originally planned
  | 'ADDED'              // fitted a variant not on the SO
  | 'REMOVED'            // planned variant not fitted (customer declined / out of stock)
  | 'REPLACED'           // fitted a different variant in place of the planned one

export type DispatchVarianceReason =
  | 'Faulty Part'
  | 'Damaged on Receipt'
  | 'Cheaper Alternative'
  | 'Better Spec Available'
  | 'Customer Requested Change'
  | 'Out of Stock'
  | 'Other'

export const DISPATCH_REQUEST_STATUSES = [
  'Draft',
  'Assembly Pending',
  'Assembled',
  'Billed',
  'Dispatched',
  'Delivered',
  'Closed',
] as const

export type DispatchRequestStatus = (typeof DISPATCH_REQUEST_STATUSES)[number]

export interface DispatchLineItem {
  id: string
  soLineItemId?: string           // link back to SO line (absent for ADDED actions not on SO)
  // Variant (canonical)
  variantId: string
  condition: VariantCondition
  variantSku: string
  // Denormalized display — snapshot at time of dispatch
  partId: string
  partName: string
  partSku: string
  category: string
  brand: string
  // Variance capture
  action: DispatchAction
  plannedQty: number              // planned on the SO (0 if ADDED)
  fittedQty: number               // actually shipped (0 if REMOVED)
  serialNumbers?: string[]        // serials of units actually fitted
  // REPLACED-only: what got replaced
  replacedVariantId?: string
  replacedDisplayName?: string
  replacedSerialNumbers?: string[] // serials pulled back for return/QC
  // Context
  reason?: DispatchVarianceReason
  notes?: string
  // Pricing (for invoice reconciliation)
  rate: number
  amount: number                  // fittedQty × rate
}

export type DispatchDocumentType =
  | 'Invoice'
  | 'E-way Bill'
  | 'Delivery Challan'
  | 'Warranty Card'
  | 'Service Agreement'
  | 'Other'

export interface DispatchDocument {
  id: string
  type: DispatchDocumentType
  documentNumber: string          // e.g. Tally invoice #, state e-way #
  fileName?: string               // demo-only — no real upload
  fileUrl?: string                // placeholder / external link
  issuedDate?: string
  uploadedBy: string
  uploadedAt: string
  notes?: string
}

export interface Dispatch {
  id: string
  dispatchNumber: string          // DISP-2026-001
  // Source
  salesOrderId: string
  salesOrderNumber: string
  // Linked internal Outward record (1:1 — every dispatch request ships against an outward)
  outwardId?: string
  outwardNumber?: string          // OUT-2026-001
  accountId: string
  accountName: string
  shippingAddress?: string
  // Status
  status: DispatchRequestStatus
  // External third-party system reference (free text now, API-integrated later)
  externalTicketNumber?: string
  externalSystem?: string         // 'Freshdesk', 'Zendesk', etc.
  // What happened
  lineItems: DispatchLineItem[]
  documents: DispatchDocument[]
  // People
  storeManager: string
  billingPerson?: string
  createdBy: string
  // Timestamps — fill as the flow progresses
  assemblyStartedAt?: string
  assemblyCompletedAt?: string
  billingCompletedAt?: string
  dispatchedAt?: string
  deliveredAt?: string
  createdAt: string
  updatedAt?: string
  notes?: string
  // Financial reconciliation (from the invoice doc)
  invoiceAmount?: number
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
// ADVANCE_RETURN is now labelled "Return" in the UI; originType captures whether
// the return originated from a Sale or a prior Return-for-replacement flow.
export type InwardType = 'PURCHASE_ORDER' | 'RENTAL_RETURN' | 'DEMO_RETURN' | 'INTERNAL_TRANSFER' | 'ADVANCE_RETURN' | 'REFURB_PURCHASE' | 'REPLACEMENT'
export type ReturnOriginType = 'Sale' | 'Return'

export interface InwardBatchEnhanced {
  id: string
  batchNumber: string
  inwardType: InwardType
  // PO linkage
  poNumber?: string
  poId?: string
  vendorName?: string
  // SO linkage (for Return flows where the stock originated from a Sales Order)
  salesOrderId?: string
  salesOrderNumber?: string
  // Return-flow: was the source Sale or a prior Return?
  originType?: ReturnOriginType
  // Source details
  sourceType: string  // 'Vendor', 'Customer', 'Internal', 'Demo'
  sourceName: string
  sourceRef?: string  // customer name, internal dept, demo ID
  // Internal transfer — employee moving the stock
  employeeName?: string
  employeeId?: string
  employeeDept?: string
  // Demo Return — contact info for the customer who had the demo unit
  customerContact?: string
  // Stock variant this maps to
  stockVariant: 'New' | 'Refurbished' | 'New Pull'
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
  status: 'Open' | 'Closed'
  notes?: string
  createdAt: string
}

// ── Part Aliases ──
export interface PartAlias {
  partId: string
  aliases: string[]  // alternate names for search
}

// ── Courier/Transport Partners ──
export interface CourierPartner {
  id: string
  name: string
  type: 'Own Vehicle' | 'Courier' | 'Transporter' | 'Customer Pickup'
  contactPerson: string
  phone: string
  trackingUrlPattern?: string  // e.g., 'https://track.delhivery.com/{tracking}'
}

export const DISPATCH_STATUSES = [
  'Pending Approval',
  'Approved',
  'Picking',
  'Packed',
  'Pending QC',
  'QC Passed',
  'Vehicle Assigned',
  'Ready for Dispatch',
  'Dispatched',
  'In Transit',
  'Delivered',
] as const

export type DispatchStatus = (typeof DISPATCH_STATUSES)[number]

// ── Related / Replaceable Parts ──
export type PartRelationType = 'REPLACEMENT' | 'ALTERNATIVE' | 'UPGRADE' | 'DOWNGRADE' | 'COMPATIBLE'

export interface RelatedPart {
  id: string
  partId: string         // source part
  relatedPartId: string  // target part
  relationType: PartRelationType
  notes?: string
  priority: number       // lower = preferred replacement
  isActive: boolean
}

// ── Assembly BOM (Bill of Materials) ──
export type BOMType = 'ASSEMBLY' | 'DISASSEMBLY'
export type BOMStatus = 'Draft' | 'Active' | 'Revision' | 'Obsolete'

export interface BOMItem {
  id: string
  // Canonical FK — introduced in Phase 2B of the Variant migration.
  variantId: string
  condition: VariantCondition
  variantSku: string
  // Part-level fields kept for display + backwards-compat (Phase 3/4 cleanup).
  partId: string
  partName: string
  partSku: string
  quantity: number
  unitOfMeasure: string
  isOptional: boolean
  allowSubstitution: boolean  // can use related/replaceable parts
  substituteVariantIds?: string[]
  substitutePartIds?: string[]
  position?: string   // e.g., 'Slot 1', 'Bay 2'
  notes?: string
}

export interface BillOfMaterials {
  id: string
  name: string          // e.g., 'Dell R750xs Standard Build'
  bomNumber: string     // BOM-2026-001
  type: BOMType
  status: BOMStatus
  version: number
  // Parent product
  parentPartId: string
  parentPartName: string
  parentPartSku: string
  // Components
  items: BOMItem[]
  // Metadata
  estimatedAssemblyTime?: number  // minutes
  estimatedCost?: number
  createdBy: string
  approvedBy?: string
  createdAt: string
  updatedAt?: string
  notes?: string
}

// ── Engineering / Work Order ──
export const WORK_ORDER_STATUSES = [
  'Draft',
  'Pending Approval',
  'Approved',
  'Component Picking',
  'Components Picked',
  'In Assembly',
  'Assembly Complete',
  'Packaging',
  'Pending QC',
  'QC Passed',
  'QC Failed',
  'Ready for Dispatch',
  'Sent to Rental Warehouse',
  'Dispatched',
  'Invoiced',
  'Closed',
] as const

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number]

export type WorkOrderType = 'SALES' | 'RENTAL' | 'INTERNAL' | 'DEMO'

export interface WorkOrderComponent {
  id: string
  bomItemId: string
  // Canonical FK — introduced in Phase 2B.
  variantId: string
  condition: VariantCondition
  variantSku: string
  // Part-level fields kept for display + backwards-compat.
  partId: string
  partName: string
  partSku: string
  requiredQty: number
  pickedQty: number
  // Actual device/SKU picked
  pickedSkus: {
    sku: string
    serialNumber: string
    barcode: string
    warehouseId: string
    location: string
  }[]
  isSubstitute: boolean        // was a replacement part used?
  originalVariantId?: string   // if substituted, which variant was originally in BOM
  originalPartId?: string      // legacy — mirrors originalVariantId's part
  status: 'Pending' | 'Partially Picked' | 'Picked' | 'Issued' | 'Returned'
}

export interface WorkOrderQC {
  id: string
  performedBy: string
  performedAt: string
  result: 'PASSED' | 'FAILED'
  checklist: { item: string; result: 'PASS' | 'FAIL'; notes?: string }[]
  failureReasons?: string[]
  notes?: string
}

export interface WorkOrder {
  id: string
  workOrderNumber: string    // WO-2026-001
  type: WorkOrderType
  status: WorkOrderStatus
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  // Source reference
  salesOrderId?: string
  salesOrderNumber?: string
  rentalContractId?: string
  rentalContractNumber?: string
  // BOM
  bomId: string
  bomName: string
  bomNumber: string
  // Output product
  outputPartId: string
  outputPartName: string
  outputQty: number
  // Components
  components: WorkOrderComponent[]
  // Assembly
  assemblyTeam?: string
  assemblyStartedAt?: string
  assemblyCompletedAt?: string
  assemblyNotes?: string
  // QC
  qcRecords: WorkOrderQC[]
  // Destination
  destinationType: 'DISPATCH' | 'RENTAL_WAREHOUSE' | 'STOCK'
  destinationWarehouseId?: string
  destinationWarehouseName?: string
  // Customer/billing
  customerName?: string
  customerId?: string
  invoiceId?: string
  invoiceNumber?: string
  // People
  createdBy: string
  approvedBy?: string
  assignedTo?: string
  // Dates
  requestedDate: string
  dueDate: string
  completedAt?: string
  createdAt: string
  updatedAt?: string
  notes?: string
}

// Work Order workflow stages for stepper
export const WORK_ORDER_WORKFLOW_STAGES = [
  { id: 'create', label: 'Create' },
  { id: 'approve', label: 'Approve' },
  { id: 'picking', label: 'Component Picking' },
  { id: 'assembly', label: 'Assembly' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'qc', label: 'QC' },
  { id: 'dispatch', label: 'Dispatch / Warehouse' },
  { id: 'invoice', label: 'Invoice' },
] as const
