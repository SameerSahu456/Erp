// ── Sales Invoice (AR) ──
export type SalesInvoiceStatus = 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Void' | 'Credit Note Issued'

export interface SalesInvoiceItem {
  id: string
  partId?: string
  description: string
  qty: number
  unitPrice: number
  discount: number
  taxRate: number
  amount: number
}

export interface SalesInvoice {
  id: string
  invoiceNumber: string  // INV-2026-001
  salesOrderId?: string
  salesOrderNumber?: string
  customerId: string
  customerName: string
  customerGst?: string
  billingAddress: string
  shippingAddress?: string
  items: SalesInvoiceItem[]
  subtotal: number
  discountTotal: number
  cgst: number
  sgst: number
  igst: number
  grandTotal: number
  paidAmount: number
  balanceDue: number
  paymentTerms: string
  dueDate: string
  issueDate: string
  paidDate?: string
  status: SalesInvoiceStatus
  payments: PaymentRecord[]
  createdBy: string
  createdAt: string
}

// ── Purchase Invoice (AP) ──
export type PurchaseInvoiceStatus = 'Received' | 'Verified' | 'Approved' | 'Partially Paid' | 'Paid' | 'Disputed' | 'Void'

export interface PurchaseInvoice {
  id: string
  invoiceNumber: string  // PINV-2026-001
  vendorInvoiceNumber: string
  poId?: string
  poNumber?: string
  vendorId: string
  vendorName: string
  vendorGst?: string
  items: SalesInvoiceItem[]  // reuse same shape
  subtotal: number
  cgst: number
  sgst: number
  igst: number
  grandTotal: number
  paidAmount: number
  balanceDue: number
  paymentTerms: string
  dueDate: string
  receiveDate: string
  status: PurchaseInvoiceStatus
  payments: PaymentRecord[]
  createdAt: string
}

// ── Payment ──
export type PaymentMethod = 'Bank Transfer' | 'Cheque' | 'UPI' | 'Cash' | 'Credit Note'

export interface PaymentRecord {
  id: string
  amount: number
  method: PaymentMethod
  reference: string  // transaction ID, cheque number
  date: string
  notes?: string
}

// ── Credit Note ──
export interface CreditNote {
  id: string
  creditNoteNumber: string  // CN-2026-001
  invoiceId: string
  invoiceNumber: string
  customerName: string
  amount: number
  reason: string
  status: 'Draft' | 'Issued' | 'Applied'
  issueDate: string
}
