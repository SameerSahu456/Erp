export type RentalContractStatus = 'Draft' | 'Active' | 'Extended' | 'Overdue' | 'Returned' | 'Closed' | 'Terminated'

export interface RentalContract {
  id: string
  contractNumber: string  // RC-2026-001
  // Customer
  customerId: string
  customerName: string
  contactPerson: string
  contactPhone: string
  shippingAddress: string
  // Devices
  devices: RentalDevice[]
  // Terms
  startDate: string
  endDate: string
  duration: number  // days
  billingCycle: 'Weekly' | 'Monthly' | 'Quarterly'
  autoRenewal: boolean
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
  // People
  createdBy: string
  approvedBy?: string
  createdAt: string
  updatedAt?: string
  notes?: string
  terms?: string
}

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
}

export interface RentalBillingEntry {
  id: string
  period: string  // 'Apr 2026', 'May 2026'
  amount: number
  status: 'Pending' | 'Invoiced' | 'Paid' | 'Overdue'
  invoiceId?: string
  invoiceNumber?: string
  dueDate: string
  paidDate?: string
}

export interface RentalReturn {
  id: string
  returnNumber: string  // RR-2026-001
  contractId: string
  contractNumber: string
  customerName: string
  devices: RentalReturnDevice[]
  status: 'Initiated' | 'Devices Received' | 'Inspection' | 'Damage Assessment' | 'Stock Updated' | 'Closed'
  initiatedBy: string
  receivedBy?: string
  inspectedBy?: string
  createdAt: string
  depositRefund?: number
  depositDeduction?: number
  notes?: string
}

export interface RentalReturnDevice {
  deviceId: string
  barcode: string
  model: string
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
