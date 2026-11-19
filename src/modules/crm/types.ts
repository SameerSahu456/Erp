export type Priority = 'High' | 'Medium' | 'Low'
export type CustomerType = 'End Customer' | 'Channel Partner' | 'Cloud / Data Center' | 'End User'
export type CrmTag = 'New' | 'Refurb' | 'Rental'
export const CRM_TAG_LIST: CrmTag[] = ['New', 'Refurb', 'Rental']

export interface Lead {
  id: string
  /** Human-readable lead number (e.g. LD-2026-…), server-generated. */
  leadCode?: string
  name: string
  company: string
  // Mention → view-only access (backend `access_level`): "view" = visible only
  // because the viewer was @mentioned — render read-only. `isMentioned` is the
  // detail-page flag (true for edit users too). Optional so legacy/mock Lead
  // literals stay valid; the live mapper always sets both.
  accessLevel?: "edit" | "view"
  isMentioned?: boolean
  // `name` / `company` fall back to a "-" display placeholder when blank, so
  // the stage gate reads these instead.
  // Optional so legacy/mock Lead literals stay valid; the live mapper sets them.
  hasContactName?: boolean
  hasCompanyName?: boolean
  email: string
  phone: string
  stage: 'New' | 'Contacted' | 'Qualified' | 'Procurement' | 'Cold' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost' | 'Rejected'
  value: number
  // grand_total of the lead's latest quote (chain head, is_latest_quote=true);
  // 0 when the lead has no quote yet. Mapped from CrmLeadListItem.latest_quote_value.
  // Optional so legacy/mock Lead literals (data/leads.ts) stay valid; the live
  // mapper always sets it. Table reads it as `?? 0`.
  latestQuoteValue?: number
  source: string
  closureDate?: string
  owner: string
  bde: string
  accountOwner?: string
  assignedTo?: string
  assignedToId?: string
  presalesManager?: string
  priority: Priority
  companySize?: string
  employees?: number
  location?: string
  website?: string
  customerType?: CustomerType
  tags?: CrmTag[]
  lastContact: string
  createdAt: string
  notes?: string
  description: string
  categories: string[]
  oems?: string[]
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
  rejectionNotes?: string
  // Free-text reason captured when the lead is moved to "Closed Lost"
  // (reason — notes, folded). Cleared by the backend on reopen.
  closedLostReason?: string
  addresses?: AccountAddress[]
}

export interface Deal {
  id: string
  /** Human-readable deal number, server-generated. */
  dealNumber?: string
  name: string
  accountId: string
  accountName: string
  stage: 'New' | 'Procurement' | 'Cold' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost'
  value: number
  /** Whether this deal is a SALE or a RENTAL, derived server-side from its
   *  live quotes and orders — never typed by a user. Rentals are quoted and
   *  ordered separately from sales, so a deal is one or the other.
   *
   *  Optional so existing Deal literals stay valid; the live mapper sets it. */
  sellableIntent?: 'sale' | 'rental'
  /** Money actually INVOICED against this deal, as opposed to `value`,
   *  which is what it was expected to be worth. They diverge on rentals by
   *  design: a rental's worth accrues invoice by invoice and a contract or
   *  a line can be terminated at any point, so the booked figure is only
   *  ever a forecast until the invoices exist. */
  realisedValue?: number
  probability: number
  closeDate: string
  source?: string
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
  tags?: CrmTag[]
  createdAt: string
  description: string
  categories: string[]
  oems?: string[]
  leadId?: string
  addresses?: AccountAddress[]
}

export type AccountTag = 'Hunting' | 'Farming' | 'Cold'

export interface AccountAddress {
  id: string
  type: 'Billing' | 'Shipping' | 'Both'
  label: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  /** GSTIN registered at this location; blank = the account's. */
  gstin?: string
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
  status: 'Active' | 'Inactive'
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
  // Canonical FK — introduced in Phase 2 of the Variant migration.
  // The Part-level fields below are kept for backwards-compat until Phase 3 refactors the pickers.
  variantId: string
  condition: import('@modules/wms').VariantCondition
  variantSku: string
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
  swapVariantId?: string
  swapPartId?: string      // if SWAP, what it replaces
  swapPartName?: string
}

export interface SalesOrderVersionSnapshot {
  version: number
  amendedAt: string
  amendedBy: string
  reason?: string
  total: number
  status: SalesOrder['status']
  approvalStatus: SalesOrder['approvalStatus']
  lineItems: SalesOrderLineItem[]
  dispatchNotes?: string
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
  // PM approval (separate from the sales-side approvalStatus above)
  pmApprovalStatus?: 'Pending' | 'Approved' | 'Rejected'
  pmApprovedBy?: string
  pmApprovalDate?: string
  pmNotes?: string
  purchaseRequestId?: string
  // Enhanced: line items with BOM linkage
  lineItems: SalesOrderLineItem[]
  // Work order linkage
  workOrderId?: string
  workOrderNumber?: string
  // Linked PO (e.g. when SO is generated from a Demo and a back-to-back PO is created)
  purchaseOrderId?: string
  purchaseOrderNumber?: string
  // Originating Demo Request, when SO was created from a "With Customer" demo
  demoRequestId?: string
  demoRequestNumber?: string
  // Dispatch visibility
  dispatchNotes?: string
  hasPartConfig: boolean  // true if any line has ADD/REMOVE/SWAP
  // Amendment tracking — id/orderNumber stay stable across amendments; version bumps on each amend.
  version: number
  versionHistory?: SalesOrderVersionSnapshot[]
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

export interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'stage_change' | 'rejection' | 'reinstatement' | 'closed_lost' | 'account_created' | 'deal_created' | 'so_created' | 'owner_change'
  title: string
  description?: string
  user: string
  timestamp: string
  // Widened past the four CRM entities: the audit timeline now renders
  // for a sales order and a rental device too, and they carry the same
  // Activity shape rather than a parallel one.
  entityType: 'lead' | 'deal' | 'account' | 'contact' | 'rental_device' | 'sales_order'
  entityId: string
  metadata?: Record<string, string>
  /**
   * Raw pre-event snapshot from the backend audit log (redacted server-side).
   * Populated by the audit-trail mapper so the timeline can render a
   * "Show changes" expandable diff. Optional — local/mock activities don't
   * carry this.
   */
  before?: Record<string, unknown> | null
  /** Raw post-event snapshot — see `before`. */
  after?: Record<string, unknown> | null
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
  | 'Partially Dispatched'
  | 'Dispatched'
  | 'With Customer'
  | 'Return Overdue'
  | 'Returned'
  | 'Closed'
  | 'Account Approval Pending'
  | 'Account Rejected'

export interface DemoRequestItem {
  id: string
  variantId: string
  condition: import('@modules/wms').VariantCondition
  variantSku: string
  partId: string
  partName: string
  partSku: string
  category: string
  brand: string
  qty: number
  // PM-approved pricing — sell rate per unit if the demo converts to an SO.
  // Auto-seeded from mockPricing; PM can override during approval.
  unitPrice: number
  /** GST % off the part's HSN code; display only. Absent when no HSN linked. */
  taxRate?: number | null
  amount: number  // qty * unitPrice
  serialNumbers?: string[]  // assigned after dispatch
  pmStatus?: 'Pending' | 'Approved' | 'Rejected'
  pmRejectionReason?: string | null
  // Viewer-scoped action gate from the backend (`can_approve`): true iff the
  // current caller may approve/reject this line right now. Drives the per-line
  // Approve/Reject buttons in the approval card.
  canApprove?: boolean
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
  // Conversion: SO created from this demo (when customer decides to keep)
  salesOrderId?: string
  salesOrderNumber?: string
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

// The early-funnel stages. A lead can only be moved to "Closed Won" once it has
// progressed PAST these stages (i.e. Closed Won is blocked from New /
// Contacted). Enforced in useLeadForm, the detail stage selector, the kanban
// drag handler, and the close-won gate.
export const LEAD_TYPE_OPTIONAL_STAGES: readonly Lead['stage'][] = ['New', 'Contacted']

// Qualified and every stage ahead of it. At intake nothing is mandatory; on
// these stages Name, Company, email-or-phone, Type, Categories and
// Description (the requirement) become mandatory. 'Closed Lost' is deliberately NOT in
// this set — a lead can be closed out without its details filled in.
export const LEAD_DETAILS_REQUIRED_STAGES: readonly Lead['stage'][] = [
  'Qualified',
  'Procurement',
  'Cold',
  'Proposal',
  'Negotiation',
  'Closed Won',
]

// Stages that require a lead owner (Assigned To): every stage — a lead must
// always have someone owning it, from intake (New) through Closed Lost.
// Enforced in the lead form, the detail stage selector, the kanban drag
// handler, and the close-won gate (see lib/lead-close-won-gate.ts).
export const LEAD_OWNER_REQUIRED_STAGES: readonly Lead['stage'][] = [...LEAD_STAGES]

export const DEAL_STAGES =['New', 'Procurement', 'Cold', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] as const

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
  // PM action on this specific response
  pmStatus?: 'Pending' | 'Approved' | 'Rejected'
  pmNotes?: string
  pmActionedBy?: string
  pmActionedAt?: string
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
  // PM approval
  pmApprovalStatus?: 'Pending' | 'Approved' | 'Rejected'
  pmApprovedBy?: string
  pmApprovalDate?: string
  pmNotes?: string
  // Response-level approval — which procurement responses the PM picked
  approvedResponseIds?: string[]
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
