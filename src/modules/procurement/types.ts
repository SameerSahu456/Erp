import type { VariantCondition, PurchaseType } from '@/modules/wms/types'

// ── Purchase Request ──
export type PRStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Partially Approved' | 'Rejected' | 'Converted to PO'

export interface PurchaseRequestItem {
  id: string
  variantId: string
  condition: VariantCondition
  variantSku: string
  partId: string
  partName: string
  partSku: string
  category: string
  description: string
  qty: number
  estimatedUnitCost: number
  estimatedTotal: number
  urgency: 'Low' | 'Medium' | 'High' | 'Critical'
  purchaseType?: PurchaseType  // Local / Import sourcing tag
  notes?: string
}

export interface PurchaseRequest {
  id: string
  prNumber: string  // PR-2026-001
  title: string
  department: string
  requestedBy: string
  requestedDate: string
  requiredByDate: string
  items: PurchaseRequestItem[]
  justification: string
  totalEstimated: number
  status: PRStatus
  approvalChain: ApprovalStep[]
  linkedMaterialInquiryId?: string
  linkedSalesOrderId?: string
  notes?: string
  createdAt: string
}

export interface ApprovalStep {
  id: string
  approver: string
  role: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Skipped'
  comments?: string
  actionDate?: string
}

// ── Purchase Order ──
export type POStatus = 'Draft' | 'Sent to Vendor' | 'Acknowledged' | 'Partially Received' | 'Fully Received' | 'Closed' | 'Cancelled'

export interface PurchaseOrderItem {
  id: string
  variantId: string
  condition: VariantCondition
  variantSku: string
  partId: string
  partName: string
  partSku: string
  category: string
  description: string
  qtyOrdered: number
  qtyReceived: number
  unitPrice: number
  taxRate: number  // percentage
  amount: number
  deliveryDate?: string
  purchaseType?: PurchaseType  // Local / Import sourcing tag
}

export interface PurchaseOrderVersionSnapshot {
  version: number
  amendedAt: string
  amendedBy: string
  reason?: string
  items: PurchaseOrderItem[]
  subtotal: number
  taxAmount: number
  discount: number
  grandTotal: number
  status: POStatus
  expectedDelivery: string
}

export interface PurchaseOrder {
  id: string
  poNumber: string  // PO-2026-001
  prId?: string
  prNumber?: string
  // Back-link to originating Sales Order (e.g. demo-to-SO conversion creates a back-to-back PO)
  salesOrderId?: string
  salesOrderNumber?: string
  vendorId: string
  vendorName: string
  vendorContact: string
  vendorEmail: string
  vendorAddress: string
  items: PurchaseOrderItem[]
  subtotal: number
  taxAmount: number
  discount: number
  grandTotal: number
  paymentTerms: string  // 'Net 30', 'Net 60'
  deliveryTerms: string  // 'FOB', 'CIF', 'Ex-Works'
  expectedDelivery: string
  status: POStatus
  approvedBy?: string
  // PM approval
  pmApprovalStatus?: 'Pending' | 'Approved' | 'Rejected'
  pmApprovedBy?: string
  pmApprovalDate?: string
  pmNotes?: string
  sentDate?: string
  notes?: string
  createdBy: string
  createdAt: string
  // Amendment tracking — id/poNumber stay stable across amendments; version bumps on each amend.
  version: number
  versionHistory?: PurchaseOrderVersionSnapshot[]
}

// ── Vendor ──
export type VendorStatus = 'Active' | 'Inactive' | 'Pending Approval' | 'Blacklisted' | 'Suspended'

export interface Vendor {
  id: string
  name: string
  code: string  // VEN-001
  contactPerson: string
  email: string
  phone: string
  address: string
  city: string
  gstNumber?: string
  panNumber?: string
  bankDetails?: {
    accountName: string
    accountNumber: string
    ifscCode: string
    bankName: string
  }
  paymentTerms: string
  categories: string[]  // product categories they supply
  rating: number  // 1-5
  status: VendorStatus
  totalOrders: number
  totalSpend: number
  onTimeDeliveryRate: number  // percentage
  qualityScore: number  // percentage
  createdAt: string
}

// ── GRN Matching ──
export interface GRNMatchEntry {
  id: string
  poId: string
  poNumber: string
  poItemId: string
  partName: string
  qtyOrdered: number
  qtyReceived: number
  qtyPending: number
  batchNumber?: string
  receivedDate?: string
  status: 'Matched' | 'Partial' | 'Pending' | 'Over Received' | 'Discrepancy'
  discrepancyNotes?: string
}
