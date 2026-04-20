import type { SupportTicket, AdvanceReplacement, DamageCharge, RentalPartner } from '../types'

export const mockSupportTickets: SupportTicket[] = [
  {
    id: 'tkt-001', ticketNumber: 'TKT-2026-0001', assetUID: 'RENTR-LP-2026-00001', assetModel: 'Dell Latitude 5540',
    contractId: 'rc-001', contractNumber: 'RC-2026-001', customerName: 'Tata Consultancy Services',
    category: 'Hardware failure', priority: 'High', status: 'In Progress',
    description: 'Keyboard intermittent failure — some keys not responding after 2 months of use',
    slaHours: 8, slaBreached: false, slaDueAt: '2026-04-19T18:00:00Z',
    assignedTo: 'Karthik Menon', isAdvanceReplacement: false,
    createdAt: '2026-04-19T10:00:00Z', createdBy: 'TCS IT Support',
  },
  {
    id: 'tkt-002', ticketNumber: 'TKT-2026-0002', assetUID: 'RENTR-DT-2026-00001', assetModel: 'Dell OptiPlex 7090',
    contractId: 'rc-002', contractNumber: 'RC-2026-002', customerName: 'Wipro Technologies',
    category: 'Performance degradation', priority: 'Medium', status: 'Open',
    description: 'Desktop running slow — boot time exceeds 3 minutes, frequent freezes',
    slaHours: 24, slaBreached: false, slaDueAt: '2026-04-20T14:00:00Z',
    createdAt: '2026-04-19T14:00:00Z', createdBy: 'Wipro Helpdesk',
  },
  {
    id: 'tkt-003', ticketNumber: 'TKT-2026-0003', assetUID: 'RENTR-LP-2026-00010', assetModel: 'HP EliteBook 840 G8',
    contractId: 'rc-008', contractNumber: 'RC-2026-008', customerName: 'Bharti Airtel',
    category: 'Hardware failure', priority: 'Critical', status: 'Resolved',
    description: 'Laptop screen cracked — user unable to work. Advance replacement requested.',
    slaHours: 4, slaBreached: false, slaDueAt: '2026-03-15T14:00:00Z',
    assignedTo: 'Suresh Nair', isAdvanceReplacement: true, advanceReplacementId: 'ar-001',
    resolution: 'Advance replacement shipped (RENTR-LP-2026-00015). Faulty device collected and sent to repair.',
    resolvedAt: '2026-03-15T16:30:00Z',
    createdAt: '2026-03-15T10:00:00Z', createdBy: 'Airtel IT',
  },
  {
    id: 'tkt-004', ticketNumber: 'TKT-2026-0004', assetUID: 'RENTR-SVR-2026-00001', assetModel: 'HPE ProLiant DL380 Gen10',
    contractId: 'rc-005', contractNumber: 'RC-2026-005', customerName: 'Mahindra & Mahindra',
    category: 'Preventive maintenance', priority: 'Low', status: 'Closed',
    description: 'Quarterly PM check — firmware update + dust cleaning',
    slaHours: 48, slaBreached: false, slaDueAt: '2026-02-20T10:00:00Z',
    assignedTo: 'Deepak Joshi', isAdvanceReplacement: false,
    resolution: 'Firmware updated to v2.60. Dust cleaned. All components within spec.',
    resolvedAt: '2026-02-18T15:00:00Z',
    createdAt: '2026-02-18T10:00:00Z', createdBy: 'Rentr Ops',
  },
  {
    id: 'tkt-005', ticketNumber: 'TKT-2026-0005', assetUID: 'RENTR-LP-2026-00002', assetModel: 'Dell Latitude 5540',
    contractId: 'rc-001', contractNumber: 'RC-2026-001', customerName: 'Tata Consultancy Services',
    category: 'Software issue', priority: 'Medium', status: 'Open',
    description: 'Windows update causing BSOD — needs driver rollback',
    slaHours: 24, slaBreached: false, slaDueAt: '2026-04-21T09:00:00Z',
    createdAt: '2026-04-20T09:00:00Z', createdBy: 'TCS IT Support',
  },
]

export const mockAdvanceReplacements: AdvanceReplacement[] = [
  {
    id: 'ar-001', ticketId: 'tkt-003', ticketNumber: 'TKT-2026-0003',
    contractId: 'rc-008', contractNumber: 'RC-2026-008',
    originalUID: 'RENTR-LP-2026-00010', replacementUID: 'RENTR-LP-2026-00015',
    status: 'Completed', annexureId: 'anx-ar-001',
    swapDate: '2026-03-15', faultyReturnDate: '2026-03-22',
    createdAt: '2026-03-15T12:00:00Z', createdBy: 'Suresh Nair',
    notes: 'Screen cracked. Replacement dispatched same day. Faulty collected after 7 days.',
  },
]

export const mockDamageCharges: DamageCharge[] = [
  {
    id: 'dc-001', assetUID: 'RENTR-LP-2026-00010', returnId: undefined,
    conditionGrade: 'C', chargeDescription: 'Cracked LCD panel replacement',
    amount: 8500, justification: 'Screen cracked due to drop impact. Not covered under warranty.',
    enteredBy: 'Service Manager — Ravi Kumar', createdAt: '2026-03-22T10:00:00Z', pushedToTally: true,
  },
  {
    id: 'dc-002', assetUID: 'RENTR-LP-2026-00005', returnId: 'rr-002',
    conditionGrade: 'D', photos: [],
    chargeDescription: 'Missing charger + cosmetic damage to palmrest',
    amount: 4500, justification: 'Charger not returned (₹2,500). Palmrest deep scratch (₹2,000).',
    enteredBy: 'Service Manager — Ravi Kumar', createdAt: '2026-04-10T14:00:00Z', pushedToTally: false,
  },
]

export const mockRentalPartners: RentalPartner[] = [
  {
    id: 'rp-001', name: 'TechServe Solutions Pvt Ltd', gstin: '27AABCT1234A1Z5', pan: 'AABCT1234A',
    creditLimit: 5000000, tier: 'Gold', kycComplete: true,
    contactPerson: 'Manish Kapoor', contactEmail: 'manish@techserve.in', contactPhone: '+91 98765 43210',
    city: 'Mumbai', activeContracts: 4, deployedAssets: 32, outstandingAmount: 182000,
    status: 'Active', createdAt: '2024-06-15',
  },
  {
    id: 'rp-002', name: 'InfoBridge IT Services', gstin: '29AADCI5678B2Z3', pan: 'AADCI5678B',
    creditLimit: 3000000, tier: 'Silver', kycComplete: true,
    contactPerson: 'Sneha Rao', contactEmail: 'sneha@infobridge.co.in', contactPhone: '+91 98765 11111',
    city: 'Bengaluru', activeContracts: 2, deployedAssets: 14, outstandingAmount: 56000,
    status: 'Active', createdAt: '2025-01-20',
  },
  {
    id: 'rp-003', name: 'Digital Infra Partners LLP', gstin: '06AAFPD9012C3Z1', pan: 'AAFPD9012C',
    creditLimit: 10000000, tier: 'Platinum', kycComplete: true,
    contactPerson: 'Rajiv Mehta', contactEmail: 'rajiv@digitalinfra.com', contactPhone: '+91 98765 22222',
    city: 'Gurgaon', activeContracts: 6, deployedAssets: 85, outstandingAmount: 420000,
    status: 'Active', createdAt: '2023-11-10',
  },
  {
    id: 'rp-004', name: 'CloudFirst IT Solutions', gstin: '33AABCC3456D4Z2', pan: 'AABCC3456D',
    creditLimit: 2000000, tier: 'Silver', kycComplete: false,
    contactPerson: 'Priya Sharma', contactEmail: 'priya@cloudfirst.in', contactPhone: '+91 98765 33333',
    city: 'Chennai', activeContracts: 0, deployedAssets: 0, outstandingAmount: 0,
    status: 'Onboarding', createdAt: '2026-04-01',
  },
]
