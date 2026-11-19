import type { VariantCondition } from './inventory'

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
