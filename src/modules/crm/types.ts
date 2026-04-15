export interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  stage: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost'
  value: number
  source: string
  owner: string
  lastContact: string
  createdAt: string
  notes?: string
  description: string
  categories: string[]
}

export interface Deal {
  id: string
  name: string
  accountId: string
  accountName: string
  stage: 'Discovery' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost'
  value: number
  probability: number
  closeDate: string
  owner: string
  createdAt: string
  description: string
  categories: string[]
  leadId?: string
}

export interface Account {
  id: string
  name: string
  industry: string
  type: 'Enterprise' | 'SMB' | 'Startup' | 'Government'
  revenue: number
  owner: string
  status: 'Active' | 'Inactive' | 'Prospect'
  city: string
  website?: string
  createdAt: string
}

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  accountId: string
  accountName: string
  title: string
  lastContact: string
  createdAt: string
}

export interface SalesOrderLineItem {
  id: string
  partId: string
  partName: string
  partSku: string
  category: string
  brand: string
  qty: number
  rate: number
  amount: number
  bomId?: string           // linked BOM for assembly
  bomName?: string
  // Part add/remove config — visible on dispatch
  configAction: 'STANDARD' | 'ADD' | 'REMOVE' | 'SWAP'
  configNotes?: string     // e.g., "Customer requested 32GB instead of 16GB"
  swapPartId?: string      // if SWAP, what it replaces
  swapPartName?: string
}

export interface SalesOrder {
  id: string
  orderNumber: string
  accountId: string
  accountName: string
  total: number
  status: 'Draft' | 'Confirmed' | 'Engineering' | 'In Assembly' | 'QC' | 'Ready for Dispatch' | 'Shipped' | 'Delivered' | 'Cancelled'
  date: string
  items: number
  createdAt: string
  quoteId?: string
  quoteName?: string
  approvalStatus: 'Pending' | 'Approved' | 'Rejected'
  approvedBy?: string
  purchaseRequestId?: string
  // Enhanced: line items with BOM linkage
  lineItems: SalesOrderLineItem[]
  // Work order linkage
  workOrderId?: string
  workOrderNumber?: string
  // Dispatch visibility
  dispatchNotes?: string
  hasPartConfig: boolean  // true if any line has ADD/REMOVE/SWAP
}

export interface QuoteLineItem {
  id: string
  item: string
  description: string
  category: string
  qty: number
  rate: number
  amount: number
}

export interface Quote {
  id: string
  quoteNumber: string
  accountId: string
  accountName: string
  total: number
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired'
  validUntil: string
  createdAt: string
  leadId: string
  leadName: string
  version: number
  parentQuoteId?: string
  lineItems: QuoteLineItem[]
}

export interface Invoice {
  id: string
  invoiceNumber: string
  accountId: string
  accountName: string
  amount: number
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Void'
  issueDate: string
  dueDate: string
  paidDate?: string
  lineItems: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  id: string
  item: string
  description: string
  qty: number
  rate: number
  amount: number
}

export interface CrmNotification {
  id: string
  title: string
  description: string
  timestamp: string
  read: boolean
  type: 'lead' | 'deal' | 'order' | 'system'
  module: string
}

export interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'stage_change'
  title: string
  description?: string
  user: string
  timestamp: string
  entityType: 'lead' | 'deal' | 'account' | 'contact'
  entityId: string
  metadata?: Record<string, string>
}

export interface Note {
  id: string
  content: string
  user: string
  createdAt: string
  updatedAt?: string
  entityType: 'lead' | 'deal' | 'account' | 'contact'
  entityId: string
}

// ── Purchase Request with Multi-PM Approval ──
export type PRApprovalStatus = 'Pending' | 'Approved' | 'Rejected'

export interface PRCategoryApproval {
  id: string
  category: string
  productManager: string
  productManagerEmail: string
  status: PRApprovalStatus
  approvedAt?: string
  rejectedAt?: string
  remarks?: string
}

export interface PurchaseRequest {
  id: string
  prNumber: string
  salesOrderId?: string
  salesOrderNumber?: string
  leadId?: string
  leadName?: string
  status: 'Draft' | 'Submitted' | 'Pending PM Approval' | 'Partially Approved' | 'All PMs Approved' | 'Final Approved' | 'Rejected' | 'Sent to Procurement'
  items: PurchaseRequestItem[]
  // Multi-PM approval — one per category
  categoryApprovals: PRCategoryApproval[]
  finalApprovalBy?: string
  finalApprovalAt?: string
  requestedBy: string
  assignedTo?: string
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface PurchaseRequestItem {
  id: string
  item: string
  description: string
  category: string
  qty: number
  estimatedRate?: number
  confirmedRate?: number
  availableDate?: string
  vendorNotes?: string
}

// ── Demo Request ──
export type DemoRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending PM Approval'
  | 'PM Approved'
  | 'PM Rejected'
  | 'Dispatch Created'
  | 'Dispatched'
  | 'With Customer'
  | 'Return Overdue'
  | 'Returned'
  | 'Closed'

export interface DemoRequestItem {
  id: string
  partId: string
  partName: string
  partSku: string
  category: string
  brand: string
  qty: number
  serialNumbers?: string[]  // assigned after dispatch
}

export interface DemoRequest {
  id: string
  demoNumber: string         // DEMO-2026-001
  // Source
  dealId?: string
  dealName?: string
  leadId?: string
  leadName?: string
  accountId: string
  accountName: string
  contactName: string
  contactPhone: string
  contactEmail: string
  // Items
  items: DemoRequestItem[]
  // Approval
  status: DemoRequestStatus
  productManager: string
  productManagerEmail: string
  pmApprovalDate?: string
  pmRemarks?: string
  // Dispatch
  dispatchRequestId?: string
  dispatchDate?: string
  shippingAddress: string
  // Return tracking
  expectedReturnDate: string
  actualReturnDate?: string
  returnCondition?: 'Good' | 'Damaged' | 'Missing Parts'
  returnNotes?: string
  isOverdue: boolean
  overdueByDays?: number
  // People
  requestedBy: string
  approvedBy?: string
  // Dates
  createdAt: string
  updatedAt?: string
  notes?: string
}

export const IMS_CATEGORIES = [
  'Servers',
  'Storage',
  'Networking',
  'Laptops',
  'Desktops',
  'Monitors',
  'Printers',
  'UPS & Power',
  'Cables & Accessories',
  'Software Licenses',
] as const

export const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const
export const DEAL_STAGES = ['Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] as const

// ── Material Inquiry ──

export type MaterialInquiryStatus =
  | 'Draft'
  | 'Submitted'
  | 'Partially Responded'
  | 'Fully Responded'
  | 'Closed'

export interface MaterialInquiryItem {
  id: string
  item: string
  category: string
  description: string
  qtyRequested: number
  clientBudgetPerUnit?: number
  clientTimeline?: string  // e.g., "2 weeks", "30 days"
}

export interface MaterialInquiryResponse {
  id: string
  inquiryItemId: string  // links to MaterialInquiryItem
  qtyAvailable: number
  pricePerUnit: number
  availableDate: string  // ISO date
  notes?: string
  respondedBy: string
  respondedAt: string
}

export interface MaterialInquiry {
  id: string
  inquiryNumber: string  // MI-2026-001
  leadId?: string
  leadName?: string
  dealId?: string
  dealName?: string
  description: string  // free-form request description — can be used instead of or alongside structured items
  categories: string[]
  status: MaterialInquiryStatus
  items: MaterialInquiryItem[]
  responses: MaterialInquiryResponse[]  // procurement fills this — can be multi-part
  requestedBy: string
  assignedTo?: string  // procurement team member
  productManagerNotified?: string  // PM name if they want to intervene
  clientBudget?: number  // overall budget from client
  clientTimeline?: string
  notes?: string
  messages: MaterialInquiryMessage[]  // conversation thread between sales and procurement
  createdAt: string
  updatedAt?: string
}

export interface MaterialInquiryMessage {
  id: string
  content: string
  user: string
  role: 'sales' | 'procurement' | 'product_manager'
  createdAt: string
  attachmentNote?: string  // e.g., "See updated pricing sheet"
}

// ── Comments/Tagging ──

export interface Comment {
  id: string
  content: string
  user: string
  mentions: string[]  // @mentioned user names
  entityType: 'lead' | 'deal' | 'account' | 'contact' | 'quote' | 'sales_order' | 'material_inquiry'
  entityId: string
  createdAt: string
}

export const MOCK_USERS = [
  'Amit Patel',
  'Sneha Desai',
  'Rahul Verma',
  'Rahul Mehta',
  'Sneha Patel',
  'Amar Daxini',
  'Priya Sharma',
  'Vikram Singh',
  'Deepak Gupta',
  'Anjali Nair',
] as const
