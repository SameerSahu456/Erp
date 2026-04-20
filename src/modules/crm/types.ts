export type Priority = 'High' | 'Medium' | 'Low'
export type CustomerType = 'End Customer' | 'Channel Partner'
export type OrderType = 'New' | 'Refurb' | 'Rental'

export interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  stage: 'New' | 'Contacted' | 'Qualified' | 'Procurement' | 'Cold' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost' | 'Rejected'
  value: number
  source: string
  owner: string
  bde: string
  accountOwner?: string
  assignedTo?: string
  presalesManager?: string
  priority: Priority
  companySize?: string
  employees?: number
  location?: string
  website?: string
  customerType?: CustomerType
  orderType?: OrderType
  lastContact: string
  createdAt: string
  notes?: string
  description: string
  categories: string[]
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
}

export interface Deal {
  id: string
  name: string
  accountId: string
  accountName: string
  stage: 'New' | 'Procurement' | 'Cold' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost'
  value: number
  probability: number
  closeDate: string
  owner: string
  owners?: string[]
  assignedTo?: string
  presalesManager?: string
  priority: Priority
  companySize?: string
  employees?: number
  location?: string
  website?: string
  customerType?: CustomerType
  orderType?: OrderType
  createdAt: string
  description: string
  categories: string[]
  leadId?: string
}

export type AccountTag = 'Hunting' | 'Farming' | 'Cold'

export interface AccountAddress {
  id: string
  type: 'Billing' | 'Shipping'
  label: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  isDefault?: boolean
}

export interface Account {
  id: string
  name: string
  industry: string
  type: 'Enterprise' | 'SMB' | 'Startup' | 'Government'
  revenue: number
  owner: string
  owners?: string[]
  status: 'Active' | 'Inactive' | 'Prospect'
  tag?: AccountTag
  categoriesInterested?: string[]
  categoriesBuyed?: string[]
  city: string
  website?: string
  companySize?: string
  employees?: number
  location?: string
  parentAccountId?: string
  parentAccountName?: string
  addresses?: AccountAddress[]
  createdAt: string
}

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  accountId: string
  accountName: string
  accountIds?: string[]
  accountNames?: string[]
  designation: string
  department?: string
  preferredContact?: boolean
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
  type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'stage_change' | 'rejection' | 'reinstatement' | 'account_created' | 'deal_created' | 'so_created' | 'owner_change'
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

export const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Procurement', 'Cold', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] as const
export const DEAL_STAGES = ['New', 'Procurement', 'Cold', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] as const
export const ORDER_TYPES: OrderType[] = ['New', 'Refurb', 'Rental']

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

// ── Tasks ──

export type TaskStatus = 'To Do' | 'In Progress' | 'Completed' | 'Cancelled'
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignedTo: string
  dueDate: string
  entityType?: 'lead' | 'deal'
  entityId?: string
  entityName?: string
  createdBy: string
  createdAt: string
  completedAt?: string
}

// ── Meetings ──

export type MeetingStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled'
export type MeetingType = 'In Person' | 'Video Call' | 'Phone Call' | 'Site Visit'

export interface Meeting {
  id: string
  title: string
  description: string
  status: MeetingStatus
  type: MeetingType
  date: string
  startTime: string
  endTime: string
  location?: string
  attendees: string[]
  entityType?: 'lead' | 'deal' | 'account'
  entityId?: string
  entityName?: string
  organizer: string
  createdAt: string
  notes?: string
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
