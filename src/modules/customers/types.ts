export type CustomerOnboardingStatus = 'Lead' | 'Prospect' | 'Onboarding' | 'KYC Pending' | 'Active' | 'Inactive' | 'Churned'

export interface CustomerRegistration {
  id: string
  customerCode: string  // CUST-2026-001
  // Company/Individual
  type: 'Company' | 'Individual'
  companyName: string
  industry?: string
  website?: string
  // Billing
  billingAddress: string
  billingCity: string
  billingState: string
  billingPincode: string
  gstNumber?: string
  panNumber?: string
  // Shipping (multiple)
  shippingAddresses: ShippingAddress[]
  // Contacts
  contacts: CustomerContact[]
  // Credit
  creditLimit: number
  paymentTerms: 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60' | 'Advance' | 'COD'
  pricingTier: 'Standard' | 'Silver' | 'Gold' | 'Platinum'
  // Documents
  documents: CustomerDocument[]
  // KYC
  kycChecklist: KYCItem[]
  // Account Manager
  accountManager: string
  accountManagerEmail: string
  // Status
  status: CustomerOnboardingStatus
  approvedBy?: string
  approvedDate?: string
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt?: string
  // Financials
  totalOrders: number
  totalRevenue: number
  outstandingBalance: number
  overdueAmount: number
}

export interface ShippingAddress {
  id: string
  label: string  // 'Head Office', 'Branch Mumbai'
  address: string
  city: string
  state: string
  pincode: string
  contactPerson: string
  contactPhone: string
  isDefault: boolean
}

export interface CustomerContact {
  id: string
  name: string
  email: string
  phone: string
  designation: string
  role: 'Billing' | 'Technical' | 'Decision Maker' | 'Procurement' | 'General'
  isPrimary: boolean
}

export interface CustomerDocument {
  id: string
  type: 'PAN Card' | 'GST Certificate' | 'Credit Application' | 'Address Proof' | 'Other'
  fileName: string
  uploadedAt: string
  status: 'Uploaded' | 'Verified' | 'Rejected'
}

export interface KYCItem {
  id: string
  label: string
  status: 'Pass' | 'Fail' | 'Pending'
  verifiedBy?: string
  verifiedAt?: string
  notes?: string
}
