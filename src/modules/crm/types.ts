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

export const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const
export const DEAL_STAGES = ['Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] as const
