export type VendorOnboardingStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Documents Pending' | 'Approved' | 'Active' | 'Suspended' | 'Blacklisted'

export interface VendorRegistration {
  id: string
  vendorCode: string  // VEN-2026-001
  // Company Info
  companyName: string
  companyType: 'Manufacturer' | 'Distributor' | 'Reseller' | 'Service Provider'
  industry: string
  website?: string
  // Contact
  primaryContact: string
  primaryEmail: string
  primaryPhone: string
  secondaryContact?: string
  secondaryEmail?: string
  secondaryPhone?: string
  // Address
  address: string
  city: string
  state: string
  pincode: string
  country: string
  // Tax & Legal
  gstNumber: string
  panNumber: string
  msmeRegistration?: string
  tradeLicense?: string
  // Bank
  bankAccountName: string
  bankAccountNumber: string
  bankIfscCode: string
  bankName: string
  bankBranch: string
  // Terms
  paymentTerms: 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60' | 'Advance'
  creditLimit?: number
  // Categories they supply
  productCategories: string[]
  // Documents
  documents: VendorDocument[]
  // Status
  status: VendorOnboardingStatus
  approvedBy?: string
  approvedDate?: string
  rejectionReason?: string
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt?: string
}

export interface VendorDocument {
  id: string
  type: 'GST Certificate' | 'PAN Card' | 'MSME Certificate' | 'Trade License' | 'Bank Statement' | 'Cancelled Cheque' | 'Other'
  fileName: string
  uploadedAt: string
  status: 'Uploaded' | 'Verified' | 'Rejected' | 'Expired'
  expiryDate?: string
  notes?: string
}
