export interface RentalOrder {
  id: string
  orderNumber: string // RO-2026-0001
  contractId?: string
  contractNumber?: string
  customerName: string
  customerType: 'Channel Partner' | 'Direct Customer'
  // Items
  items: RentalOrderItem[]
  totalUnits: number
  monthlyRental: number
  depositAmount: number
  // Dates
  requestedDate: string
  expectedDeliveryDate: string
  actualDeliveryDate?: string
  // Status
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Staging' | 'Dispatched' | 'Delivered' | 'Cancelled'
  // Logistics
  dispatchMethod: 'Courier' | 'Self Pickup' | 'Company Vehicle' | 'Third Party Logistics'
  trackingNumber?: string
  vehicleNumber?: string
  // Signing
  annexureStatus: 'Not Created' | 'Pending Signature' | 'Signed'
  // People
  createdBy: string
  approvedBy?: string
  createdAt: string
  notes?: string
}

export interface RentalOrderItem {
  id: string
  assetUID?: string
  category: string
  oem: string
  model: string
  specifications: string
  variant: 'New' | 'Refurbished' | 'New Pool'
  monthlyRate: number
  status: 'Pending' | 'Staged' | 'Dispatched' | 'Delivered'
}

export const mockRentalOrders: RentalOrder[] = [
  {
    id: 'ro-001',
    orderNumber: 'RO-2026-0001',
    contractId: 'rc-001',
    contractNumber: 'RC-2026-001',
    customerName: 'Tata Consultancy Services',
    customerType: 'Direct Customer',
    items: [
      { id: 'roi-001', assetUID: 'RENTR-LP-2026-00001', category: 'Laptop', oem: 'Dell', model: 'Latitude 5540', specifications: 'i5-1345U, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3500, status: 'Delivered' },
      { id: 'roi-002', assetUID: 'RENTR-LP-2026-00002', category: 'Laptop', oem: 'Dell', model: 'Latitude 5540', specifications: 'i5-1345U, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3500, status: 'Delivered' },
      { id: 'roi-003', category: 'Laptop', oem: 'Dell', model: 'Latitude 5540', specifications: 'i5-1345U, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3500, status: 'Delivered' },
      { id: 'roi-004', category: 'Laptop', oem: 'Dell', model: 'Latitude 5540', specifications: 'i5-1345U, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3500, status: 'Delivered' },
      { id: 'roi-005', category: 'Laptop', oem: 'Dell', model: 'Latitude 5540', specifications: 'i5-1345U, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3500, status: 'Delivered' },
    ],
    totalUnits: 5,
    monthlyRental: 17500,
    depositAmount: 50000,
    requestedDate: '2026-01-08',
    expectedDeliveryDate: '2026-01-14',
    actualDeliveryDate: '2026-01-14',
    status: 'Delivered',
    dispatchMethod: 'Company Vehicle',
    annexureStatus: 'Signed',
    createdBy: 'Amit Patel',
    approvedBy: 'Sneha Desai',
    createdAt: '2026-01-08T10:00:00Z',
  },
  {
    id: 'ro-002',
    orderNumber: 'RO-2026-0002',
    contractId: 'rc-002',
    contractNumber: 'RC-2026-002',
    customerName: 'Wipro Technologies',
    customerType: 'Channel Partner',
    items: [
      { id: 'roi-010', assetUID: 'RENTR-DT-2026-00001', category: 'Desktop', oem: 'Dell', model: 'OptiPlex 7090', specifications: 'i5-11500, 8GB, 256GB SSD', variant: 'Refurbished', monthlyRate: 2800, status: 'Delivered' },
      { id: 'roi-011', category: 'Desktop', oem: 'Dell', model: 'OptiPlex 7090', specifications: 'i5-11500, 8GB, 256GB SSD', variant: 'Refurbished', monthlyRate: 2800, status: 'Delivered' },
      { id: 'roi-012', category: 'Desktop', oem: 'Dell', model: 'OptiPlex 7090', specifications: 'i5-11500, 8GB, 256GB SSD', variant: 'Refurbished', monthlyRate: 2800, status: 'Delivered' },
    ],
    totalUnits: 3,
    monthlyRental: 8400,
    depositAmount: 25000,
    requestedDate: '2026-01-20',
    expectedDeliveryDate: '2026-01-25',
    actualDeliveryDate: '2026-01-24',
    status: 'Delivered',
    dispatchMethod: 'Courier',
    trackingNumber: 'BD-9876543210',
    annexureStatus: 'Signed',
    createdBy: 'Rahul Verma',
    approvedBy: 'Amit Patel',
    createdAt: '2026-01-20T09:00:00Z',
  },
  {
    id: 'ro-003',
    orderNumber: 'RO-2026-0003',
    customerName: 'Infosys BPM',
    customerType: 'Direct Customer',
    items: [
      { id: 'roi-020', category: 'Laptop', oem: 'Lenovo', model: 'ThinkPad T14 Gen 4', specifications: 'Ryzen 5, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3200, status: 'Staged' },
      { id: 'roi-021', category: 'Laptop', oem: 'Lenovo', model: 'ThinkPad T14 Gen 4', specifications: 'Ryzen 5, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3200, status: 'Staged' },
      { id: 'roi-022', category: 'Laptop', oem: 'Lenovo', model: 'ThinkPad T14 Gen 4', specifications: 'Ryzen 5, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3200, status: 'Pending' },
      { id: 'roi-023', category: 'Laptop', oem: 'Lenovo', model: 'ThinkPad T14 Gen 4', specifications: 'Ryzen 5, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3200, status: 'Pending' },
      { id: 'roi-024', category: 'Laptop', oem: 'Lenovo', model: 'ThinkPad T14 Gen 4', specifications: 'Ryzen 5, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3200, status: 'Pending' },
      { id: 'roi-025', category: 'Laptop', oem: 'Lenovo', model: 'ThinkPad T14 Gen 4', specifications: 'Ryzen 5, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3200, status: 'Pending' },
      { id: 'roi-026', category: 'Laptop', oem: 'Lenovo', model: 'ThinkPad T14 Gen 4', specifications: 'Ryzen 5, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3200, status: 'Pending' },
      { id: 'roi-027', category: 'Laptop', oem: 'Lenovo', model: 'ThinkPad T14 Gen 4', specifications: 'Ryzen 5, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3200, status: 'Pending' },
    ],
    totalUnits: 8,
    monthlyRental: 25600,
    depositAmount: 80000,
    requestedDate: '2026-04-15',
    expectedDeliveryDate: '2026-04-22',
    status: 'Staging',
    dispatchMethod: 'Company Vehicle',
    annexureStatus: 'Pending Signature',
    createdBy: 'Sneha Desai',
    createdAt: '2026-04-15T11:00:00Z',
    notes: 'Deployment at Infosys Bengaluru campus. Need loading dock access.',
  },
  {
    id: 'ro-004',
    orderNumber: 'RO-2026-0004',
    customerName: 'HCL Technologies',
    customerType: 'Channel Partner',
    items: [
      { id: 'roi-030', category: 'Server', oem: 'HPE', model: 'ProLiant DL380 Gen10', specifications: 'Xeon Silver 4314, 64GB, 2x 1.2TB', variant: 'New', monthlyRate: 12000, status: 'Pending' },
      { id: 'roi-031', category: 'Server', oem: 'HPE', model: 'ProLiant DL380 Gen10', specifications: 'Xeon Silver 4314, 64GB, 2x 1.2TB', variant: 'New', monthlyRate: 12000, status: 'Pending' },
    ],
    totalUnits: 2,
    monthlyRental: 24000,
    depositAmount: 100000,
    requestedDate: '2026-04-18',
    expectedDeliveryDate: '2026-04-28',
    status: 'Pending Approval',
    dispatchMethod: 'Third Party Logistics',
    annexureStatus: 'Not Created',
    createdBy: 'Rahul Verma',
    createdAt: '2026-04-18T14:00:00Z',
    notes: 'Requires rack mount at HCL Noida DC. Check power availability.',
  },
  {
    id: 'ro-005',
    orderNumber: 'RO-2026-0005',
    customerName: 'Bajaj Finance',
    customerType: 'Direct Customer',
    items: [
      { id: 'roi-040', category: 'Laptop', oem: 'Dell', model: 'Latitude 7440', specifications: 'i7-1365U, 16GB, 512GB SSD', variant: 'New Pool', monthlyRate: 4000, status: 'Pending' },
      { id: 'roi-041', category: 'Laptop', oem: 'Dell', model: 'Latitude 7440', specifications: 'i7-1365U, 16GB, 512GB SSD', variant: 'New Pool', monthlyRate: 4000, status: 'Pending' },
      { id: 'roi-042', category: 'Laptop', oem: 'Dell', model: 'Latitude 7440', specifications: 'i7-1365U, 16GB, 512GB SSD', variant: 'New Pool', monthlyRate: 4000, status: 'Pending' },
    ],
    totalUnits: 3,
    monthlyRental: 12000,
    depositAmount: 36000,
    requestedDate: '2026-04-19',
    expectedDeliveryDate: '2026-04-26',
    status: 'Draft',
    dispatchMethod: 'Courier',
    annexureStatus: 'Not Created',
    createdBy: 'Amit Patel',
    createdAt: '2026-04-19T09:30:00Z',
  },
  {
    id: 'ro-006',
    orderNumber: 'RO-2026-0006',
    contractId: 'rc-008',
    contractNumber: 'RC-2026-008',
    customerName: 'Bharti Airtel',
    customerType: 'Direct Customer',
    items: [
      { id: 'roi-050', assetUID: 'RENTR-LP-2026-00015', category: 'Laptop', oem: 'HP', model: 'EliteBook 840 G8', specifications: 'i7-1185G7, 16GB, 512GB SSD', variant: 'New', monthlyRate: 3800, status: 'Dispatched' },
    ],
    totalUnits: 1,
    monthlyRental: 3800,
    depositAmount: 10000,
    requestedDate: '2026-03-15',
    expectedDeliveryDate: '2026-03-16',
    actualDeliveryDate: '2026-03-16',
    status: 'Dispatched',
    dispatchMethod: 'Company Vehicle',
    annexureStatus: 'Signed',
    createdBy: 'Suresh Nair',
    approvedBy: 'Amit Patel',
    createdAt: '2026-03-15T12:00:00Z',
    notes: 'Advance replacement for TKT-2026-0003. Screen cracked on original device.',
  },
]
