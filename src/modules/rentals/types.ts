// ── Existing Types (kept for backward compat) ──

export type RentalContractStatus = 'Draft' | 'Pending Signature' | 'Active' | 'Extended' | 'Overdue' | 'Expiring' | 'Expired' | 'Returned' | 'Closed' | 'Terminated' | 'Disputed'

export interface RentalContract {
  id: string
  contractNumber: string  // RENTR-CON-2026-0001
  customerType: 'Channel Partner' | 'Direct Customer'
  customerId: string
  customerName: string
  contactPerson: string
  contactPhone: string
  shippingAddress: string
  endCustomer?: string
  // Master Agreement
  masterAgreementId?: string
  masterAgreementStatus?: 'Pending Signature' | 'Signed'
  // Annexures
  annexures: ContractAnnexure[]
  // Devices
  devices: RentalDevice[]
  // Terms
  startDate: string
  endDate: string
  duration: number
  billingCycle: 'Weekly' | 'Monthly' | 'Quarterly'
  autoRenewal: boolean
  paymentTerms: 'Net 30' | 'Net 45' | 'Advance'
  // Pricing
  perUnitRate: number
  totalUnits: number
  depositAmount: number
  monthlyRental: number
  // Status
  status: RentalContractStatus
  // Billing
  billingHistory: RentalBillingEntry[]
  nextBillingDate: string
  totalBilled: number
  totalPaid: number
  totalOverdue: number
  // Action Items (audit trail)
  actionItems: ContractActionItem[]
  // Support
  supportIncluded: boolean
  // People
  createdBy: string
  approvedBy?: string
  createdAt: string
  updatedAt?: string
  notes?: string
  terms?: string
}

// ── Annexure Model ──
export type AnnexureType = 'Addition' | 'Return' | 'Advance Replacement'
export type AnnexureSigningStatus = 'Draft' | 'Pending Signature' | 'Signed'

export interface ContractAnnexure {
  id: string
  type: AnnexureType
  contractId: string
  assetUIDs: string[]
  signingStatus: AnnexureSigningStatus
  createdAt: string
  signedAt?: string
  signedPdfUrl?: string
  notes?: string
}

// ── Contract Action Items ──
export type ActionItemType = 'Asset Addition' | 'Return' | 'Advance Replacement' | 'Damage Charge' | 'Data Wipe Request' | 'Contract Extension' | 'Billing Adjustment' | 'Note'

export interface ContractActionItem {
  id: string
  type: ActionItemType
  description: string
  date: string
  references?: string  // UID, ticket ID, annexure ID
  status: 'Open' | 'Completed' | 'Cancelled'
  createdBy: string
}

// ── UID Asset System ──
export type AssetCategory = 'SVR' | 'STR' | 'NW' | 'LP' | 'DT' | 'WS' | 'GPU' | 'AV' | 'CP' | 'MB'

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  SVR: 'Server',
  STR: 'Storage',
  NW: 'Networking',
  LP: 'Laptop',
  DT: 'Desktop',
  WS: 'Workstation',
  GPU: 'GPU Server',
  AV: 'Audio/Visual',
  CP: 'Computing Peripheral',
  MB: 'Mobile Device',
}

export type RentalAssetStatus =
  | 'In Warehouse'
  | 'Staged'
  | 'In Transit (Out)'
  | 'Deployed'
  | 'Return Initiated'
  | 'Return In Transit'
  | 'Received (GRN)'
  | 'In Repair'
  | 'Advance Replaced'
  | 'Retired/Scrapped'

export interface RentalAsset {
  id: string
  uid: string  // RENTR-LP-2026-00342
  category: AssetCategory
  oem: string
  model: string
  oemSerialNumber: string
  specifications: string
  // Acquisition
  source: 'New' | 'NBFC Residual' | 'Refurbished'
  acquisitionCost: number
  acquisitionDate: string
  vendor?: string
  poReference?: string
  // Financial
  bookValue: number
  depreciationRate: number  // 40% WDV
  insuranceExpiry?: string
  lifetimeRevenue: number
  lifetimeCosts: number
  // Location & Status
  status: RentalAssetStatus
  currentLocation: string  // warehouse name or site address
  warehouseId?: string
  contractId?: string
  contractNumber?: string
  customerName?: string
  siteAddress?: string
  // Condition
  conditionGrade?: 'A' | 'B' | 'C' | 'D' | 'E'
  damagePhotos?: string[]
  damageNotes?: string
  // Warranty
  warrantyStatus: 'Active' | 'Expired' | 'Extended' | 'N/A'
  warrantyExpiry?: string
  extendedWarranty?: boolean
  // Data Wipe
  dataWipeCertStatus: 'Not Requested' | 'Requested' | 'In Progress' | 'Issued' | 'Delivered'
  dataWipeCertRef?: string
  // Lifecycle Events
  lifecycleEvents: AssetLifecycleEvent[]
  // Advance Replacement History
  advanceReplacements: { originalUID: string; replacementUID: string; ticketRef: string; date: string }[]
}

export interface AssetLifecycleEvent {
  id: string
  fromStatus: RentalAssetStatus
  toStatus: RentalAssetStatus
  timestamp: string
  user: string
  notes?: string
  reference?: string  // contract ID, GRN number, etc
}

// ── Support Tickets ──
export type TicketCategory = 'Hardware failure' | 'Software issue' | 'Performance degradation' | 'Physical damage' | 'Preventive maintenance' | 'Upgrade request' | 'General inquiry'
export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low'
export type TicketStatus = 'Open' | 'In Progress' | 'Awaiting Parts' | 'Escalated' | 'Resolved' | 'Closed'

export const TICKET_SLA: Record<TicketPriority, number> = {
  Critical: 4,
  High: 8,
  Medium: 24,
  Low: 48,
}

export interface SupportTicket {
  id: string
  ticketNumber: string  // TKT-2026-0001
  assetUID: string
  assetModel: string
  contractId: string
  contractNumber: string
  customerName: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  description: string
  // SLA
  slaHours: number
  slaBreached: boolean
  slaDueAt: string
  // Assignment
  assignedTo?: string
  // Advance replacement
  advanceReplacementId?: string
  isAdvanceReplacement: boolean
  // Resolution
  resolution?: string
  resolvedAt?: string
  // Dates
  createdAt: string
  updatedAt?: string
  createdBy: string
}

// ── Advance Replacement ──
export type AdvanceReplacementStatus = 'Initiated' | 'Replacement Staged' | 'Annexure Pending' | 'Annexure Signed' | 'Replacement Dispatched' | 'Faulty Collected' | 'Faulty In Repair' | 'Completed'

export interface AdvanceReplacement {
  id: string
  ticketId: string
  ticketNumber: string
  contractId: string
  contractNumber: string
  originalUID: string
  replacementUID: string
  status: AdvanceReplacementStatus
  annexureId?: string
  swapDate?: string
  faultyReturnDate?: string
  createdAt: string
  createdBy: string
  notes?: string
}

// ── Damage Charges ──
export interface DamageCharge {
  id: string
  assetUID: string
  returnId?: string
  conditionGrade: string
  photos?: string[]
  chargeDescription: string
  amount: number
  justification: string
  enteredBy: string  // service manager
  createdAt: string
  pushedToTally: boolean
}

// ── Partner / Customer ──
export type PartnerTier = 'Silver' | 'Gold' | 'Platinum'

export interface RentalPartner {
  id: string
  name: string
  gstin: string
  pan: string
  creditLimit: number
  tier: PartnerTier
  kycComplete: boolean
  bankDetails?: string
  contactPerson: string
  contactEmail: string
  contactPhone: string
  city: string
  activeContracts: number
  deployedAssets: number
  outstandingAmount: number
  status: 'Active' | 'Inactive' | 'Onboarding'
  createdAt: string
}

// ── Existing Types (backward compat) ──

export interface RentalDevice {
  deviceId: string
  barcode: string
  model: string
  brand: string
  serialNumber: string
  variant: 'New Pool' | 'Refurbished'
  conditionAtDispatch: 'Good' | 'Fair'
  grade?: 'A' | 'B'
  dispatchedDate: string
  returnDueDate: string
  returnedDate?: string
  returnCondition?: 'Good' | 'Damaged' | 'Missing Parts'
  damageNotes?: string
  depositDeduction?: number
  uid?: string  // RENTR UID if assigned
}

export interface RentalBillingEntry {
  id: string
  period: string
  amount: number
  status: 'Pending' | 'Invoiced' | 'Paid' | 'Overdue'
  invoiceId?: string
  invoiceNumber?: string
  dueDate: string
  paidDate?: string
  billingStoppedAt?: string  // GRN auto-stop timestamp
}

export interface RentalReturn {
  id: string
  returnNumber: string
  contractId: string
  contractNumber: string
  customerName: string
  devices: RentalReturnDevice[]
  status: 'Initiated' | 'Devices Received' | 'Inspection' | 'Damage Assessment' | 'Stock Updated' | 'Closed'
  initiatedBy: string
  receivedBy?: string
  inspectedBy?: string
  grnNumber?: string  // from IMS
  grnDate?: string
  billingAutoStopped: boolean
  dataWipeRequested: boolean
  createdAt: string
  depositRefund?: number
  depositDeduction?: number
  notes?: string
}

export interface RentalReturnDevice {
  deviceId: string
  barcode: string
  model: string
  uid?: string
  conditionAtDispatch: string
  conditionAtReturn: 'Good' | 'Damaged' | 'Missing Parts'
  inspectionResult?: 'Pass' | 'Fail'
  action: 'Restock' | 'Repair' | 'Scrap' | 'Pending'
  damageNotes?: string
  repairCost?: number
}

export const RENTAL_RETURN_WORKFLOW = [
  { id: 'initiated', label: 'Return Initiated' },
  { id: 'received', label: 'Devices Received' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'assessment', label: 'Damage Assessment' },
  { id: 'stock-update', label: 'Stock Updated' },
] as const
