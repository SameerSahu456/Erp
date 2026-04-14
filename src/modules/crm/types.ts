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

export interface SalesOrder {
  id: string
  orderNumber: string
  accountId: string
  accountName: string
  total: number
  status: 'Draft' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled'
  date: string
  items: number
  createdAt: string
  quoteId?: string
  quoteName?: string
  approvalStatus: 'Pending' | 'Approved' | 'Rejected'
  approvedBy?: string
  purchaseRequestId?: string
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

export interface PurchaseRequest {
  id: string
  prNumber: string
  salesOrderId?: string
  salesOrderNumber?: string
  leadId?: string
  leadName?: string
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Pricing Confirmed' | 'Approved' | 'Rejected'
  items: PurchaseRequestItem[]
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
