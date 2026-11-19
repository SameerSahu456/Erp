import type { DeviceStatus } from './device-status'
import type { InwardType } from './inward'

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

