export type ReplacementRequestStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Replacement Issued'
  | 'Closed'

export type ReplacementReason =
  | 'DOA'
  | 'Defective'
  | 'Wrong Item'
  | 'Damaged in Transit'
  | 'Customer Request'
  | 'Failed Customer QC'

export type ReplacementPriority = 'Low' | 'Medium' | 'High' | 'Critical'

// "Same Part" → dispatch path (no pricing change).
// "Different Part" → pricing update path (rate may differ; SO line is amended).
export type ReplacementType = 'Same Part' | 'Different Part'

// "Normal" → customer returns the original first, then we ship the replacement.
// "Advance" → we ship the replacement first; customer returns the original later.
export type ReplacementMode = 'Normal' | 'Advance'

export type ReplacementNextStep = 'Dispatch' | 'Pricing Update' | 'Pending Decision'

export interface ReplacementRequest {
  id: string
  requestNumber: string

  // Optional support ticket reference (e.g. customer-raised TKT-2026-0007)
  ticketNumber?: string

  // Sales Order linkage (required — every replacement request originates from a dispatched SO)
  salesOrderId: string
  salesOrderNumber: string
  customer: string

  // Line item being replaced
  lineItemId: string
  originalPartId: string
  originalPartName: string
  originalPartSku: string
  originalRate: number
  qty: number

  // Optional: device-level reference (when the SO line was fulfilled by a serialised device)
  deviceId?: string
  deviceBarcode?: string

  // Replacement decision
  replacementType?: ReplacementType
  replacementMode?: ReplacementMode
  replacementPartId?: string
  replacementPartName?: string
  replacementPartSku?: string
  replacementRate?: number
  priceDelta?: number          // replacementRate - originalRate (per unit)
  nextStep: ReplacementNextStep

  // Workflow
  reason: ReplacementReason
  description: string
  priority: ReplacementPriority
  status: ReplacementRequestStatus
  requestedBy: string
  requestedAt: string
  approvedBy?: string
  approvedAt?: string
  rejectedReason?: string
  replacementDeviceId?: string
  replacementDeviceBarcode?: string
  replacementIssuedAt?: string
  notes?: string
}

export const mockReplacementRequests: ReplacementRequest[] = [
  // Same part → straight to dispatch
  {
    id: 'rpl-001',
    requestNumber: 'RPL-2026-001',
    salesOrderId: 'SO-002',
    salesOrderNumber: 'SO-2026-002',
    customer: 'Wipro Technologies',
    lineItemId: 'SOL-002-01',
    originalPartId: 'PART-001',
    originalPartName: 'Dell Latitude 5540',
    originalPartSku: 'DL-LAT-5540',
    originalRate: 45000,
    qty: 1,
    deviceId: 'dev-046',
    deviceBarcode: 'L-LEN-3014',
    replacementType: 'Same Part',
    replacementPartId: 'PART-001',
    replacementPartName: 'Dell Latitude 5540',
    replacementPartSku: 'DL-LAT-5540',
    replacementRate: 45000,
    priceDelta: 0,
    nextStep: 'Dispatch',
    reason: 'DOA',
    description: 'Device failed to boot on first power-on at customer site. No display output.',
    priority: 'Critical',
    status: 'Pending',
    requestedBy: 'Ajay Kapoor',
    requestedAt: '2026-04-22T09:30:00Z',
  },
  // Different part — pricing update flow (upgraded SKU)
  {
    id: 'rpl-002',
    requestNumber: 'RPL-2026-002',
    salesOrderId: 'SO-002',
    salesOrderNumber: 'SO-2026-002',
    customer: 'Wipro Technologies',
    lineItemId: 'SOL-002-01',
    originalPartId: 'PART-001',
    originalPartName: 'Dell Latitude 5540',
    originalPartSku: 'DL-LAT-5540',
    originalRate: 45000,
    qty: 1,
    deviceId: 'dev-031',
    deviceBarcode: 'L-HP-2015',
    replacementType: 'Different Part',
    replacementPartId: 'PART-002',
    replacementPartName: 'HP EliteBook 840 G8',
    replacementPartSku: 'HP-EB-840G8',
    replacementRate: 52000,
    priceDelta: 7000,
    nextStep: 'Pricing Update',
    reason: 'Defective',
    description: 'Keyboard backlight intermittent, several keys not registering. Customer agreed to switch to EliteBook variant.',
    priority: 'High',
    status: 'Approved',
    requestedBy: 'Priya Nair',
    requestedAt: '2026-04-18T11:15:00Z',
    approvedBy: 'Rajesh Kumar',
    approvedAt: '2026-04-19T14:00:00Z',
    notes: 'Customer authorised price difference of ₹7,000 per unit. SO amendment pending.',
  },
  // Same part — replacement already issued
  {
    id: 'rpl-003',
    requestNumber: 'RPL-2026-003',
    salesOrderId: 'SO-002',
    salesOrderNumber: 'SO-2026-002',
    customer: 'Wipro Technologies',
    lineItemId: 'SOL-002-02',
    originalPartId: 'PART-014',
    originalPartName: 'Dell P2422H 24" Monitor',
    originalPartSku: 'DL-MON-P2422H',
    originalRate: 12000,
    qty: 1,
    deviceId: 'dev-028',
    deviceBarcode: 'L-DEL-1015',
    replacementType: 'Same Part',
    replacementPartId: 'PART-014',
    replacementPartName: 'Dell P2422H 24" Monitor',
    replacementPartSku: 'DL-MON-P2422H',
    replacementRate: 12000,
    priceDelta: 0,
    nextStep: 'Dispatch',
    reason: 'Damaged in Transit',
    description: 'Screen cracked. Visible damage on receipt; transporter handover signed with remarks.',
    priority: 'Medium',
    status: 'Replacement Issued',
    requestedBy: 'Suresh Nair',
    requestedAt: '2026-04-12T08:45:00Z',
    approvedBy: 'Rajesh Kumar',
    approvedAt: '2026-04-12T15:30:00Z',
    replacementDeviceId: 'dev-040',
    replacementDeviceBarcode: 'L-DEL-1020',
    replacementIssuedAt: '2026-04-14T10:00:00Z',
    notes: 'Replacement dispatched via OUT-2026-012. Original unit returned for repair.',
  },
  // Different part — wrong-item replacement upgrade
  {
    id: 'rpl-004',
    requestNumber: 'RPL-2026-004',
    salesOrderId: 'SO-001',
    salesOrderNumber: 'SO-2026-001',
    customer: 'Tata Consultancy Services',
    lineItemId: 'SOL-001-02',
    originalPartId: 'COMP-003',
    originalPartName: 'Samsung 32GB DDR4-3200 RDIMM ECC',
    originalPartSku: 'RAM-SAM-32G-ECC',
    originalRate: 12000,
    qty: 4,
    replacementType: 'Different Part',
    replacementPartId: 'COMP-003B',
    replacementPartName: 'Samsung 64GB DDR4-3200 RDIMM ECC',
    replacementPartSku: 'RAM-SAM-64G-ECC',
    replacementRate: 22000,
    priceDelta: 10000,
    nextStep: 'Pricing Update',
    reason: 'Wrong Item',
    description: 'Customer ordered 64GB DIMMs; received 32GB. Upgrading to correct SKU.',
    priority: 'High',
    status: 'Approved',
    requestedBy: 'Deepak Joshi',
    requestedAt: '2026-04-20T13:00:00Z',
    approvedBy: 'Rajesh Kumar',
    approvedAt: '2026-04-21T09:30:00Z',
    notes: 'SO line amend in progress; differential invoice ₹40,000 (4 × ₹10,000).',
  },
  // Different part — rejected (out of scope)
  {
    id: 'rpl-005',
    requestNumber: 'RPL-2026-005',
    salesOrderId: 'SO-002',
    salesOrderNumber: 'SO-2026-002',
    customer: 'Wipro Technologies',
    lineItemId: 'SOL-002-03',
    originalPartId: 'COMP-023',
    originalPartName: 'Logitech MK270 Wireless Combo',
    originalPartSku: 'LOG-MK270',
    originalRate: 3000,
    qty: 1,
    replacementType: 'Different Part',
    replacementPartId: 'COMP-024',
    replacementPartName: 'Logitech MX Keys + MX Master 3S Combo',
    replacementPartSku: 'LOG-MX-COMBO',
    replacementRate: 18500,
    priceDelta: 15500,
    nextStep: 'Pricing Update',
    reason: 'Customer Request',
    description: 'Customer requested premium peripherals upgrade; willing to bear cost difference.',
    priority: 'Low',
    status: 'Rejected',
    requestedBy: 'Sanjay Gupta',
    requestedAt: '2026-04-15T10:00:00Z',
    approvedBy: 'Rajesh Kumar',
    approvedAt: '2026-04-16T11:00:00Z',
    rejectedReason: 'Outside warranty replacement policy. Routed to sales as upgrade order.',
  },
  // Same part — closed/completed
  {
    id: 'rpl-006',
    requestNumber: 'RPL-2026-006',
    salesOrderId: 'SO-002',
    salesOrderNumber: 'SO-2026-002',
    customer: 'Wipro Technologies',
    lineItemId: 'SOL-002-01',
    originalPartId: 'PART-001',
    originalPartName: 'Dell Latitude 5540',
    originalPartSku: 'DL-LAT-5540',
    originalRate: 45000,
    qty: 1,
    deviceId: 'dev-025',
    deviceBarcode: 'L-HP-2008',
    replacementType: 'Same Part',
    replacementPartId: 'PART-001',
    replacementPartName: 'Dell Latitude 5540',
    replacementPartSku: 'DL-LAT-5540',
    replacementRate: 45000,
    priceDelta: 0,
    nextStep: 'Dispatch',
    reason: 'Failed Customer QC',
    description: 'Battery health reported at 78% on customer-side QC; below 90% acceptance threshold.',
    priority: 'Medium',
    status: 'Closed',
    requestedBy: 'Ajay Kapoor',
    requestedAt: '2026-03-30T14:00:00Z',
    approvedBy: 'Rajesh Kumar',
    approvedAt: '2026-03-31T09:00:00Z',
    replacementDeviceId: 'dev-045',
    replacementDeviceBarcode: 'L-HP-2030',
    replacementIssuedAt: '2026-04-02T11:30:00Z',
    notes: 'Closed after customer acknowledged receipt of replacement on 2026-04-04.',
  },
  // Pending — decision not yet made
  {
    id: 'rpl-007',
    requestNumber: 'RPL-2026-007',
    salesOrderId: 'SO-001',
    salesOrderNumber: 'SO-2026-001',
    customer: 'Tata Consultancy Services',
    lineItemId: 'SOL-001-01',
    originalPartId: 'PART-007',
    originalPartName: 'Dell PowerEdge R750xs',
    originalPartSku: 'DL-PE-R750XS',
    originalRate: 570000,
    qty: 1,
    deviceId: 'dev-050',
    deviceBarcode: 'S-DEL-7005',
    nextStep: 'Pending Decision',
    reason: 'Defective',
    description: 'PSU unit 2 fails self-test on power cycle. Redundancy lost. Awaiting customer decision on same vs. upgraded chassis.',
    priority: 'Critical',
    status: 'Pending',
    requestedBy: 'Ravi Kumar',
    requestedAt: '2026-04-23T07:00:00Z',
  },
]
