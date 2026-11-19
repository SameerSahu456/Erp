// ── Enhanced Inward ──
// ADVANCE_RETURN is now labelled "Return" in the UI; originType captures whether
// the return originated from a Sale or a prior Return-for-replacement flow.
// Refurbished purchases are no longer a separate inward type — pick PURCHASE_ORDER
// and set purchaseOrigin='Refurbished' instead. Rental returns flow through
// ADVANCE_RETURN (originType='Return') as well.
export type InwardType = 'PURCHASE_ORDER' | 'DEMO_RETURN' | 'INTERNAL_TRANSFER' | 'ADVANCE_RETURN' | 'REPLACEMENT'
export type ReturnOriginType = 'Sale' | 'Return'
export type PurchaseOriginType = 'New' | 'Refurbished'

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
  // Purchase-flow: was the stock new or refurbished?
  purchaseOrigin?: PurchaseOriginType
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

