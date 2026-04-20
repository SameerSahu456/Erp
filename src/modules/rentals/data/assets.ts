import type { RentalAsset } from '../types'

export const mockRentalAssets: RentalAsset[] = [
  {
    id: 'ra-001', uid: 'RENTR-LP-2026-00001', category: 'LP', oem: 'Dell', model: 'Latitude 5540', oemSerialNumber: 'DELL-SN-R001',
    specifications: 'i5-1345U, 16GB RAM, 512GB SSD, 14" FHD', source: 'New', acquisitionCost: 72000, acquisitionDate: '2025-11-15',
    vendor: 'Dell India', poReference: 'PO-RENTR-001', bookValue: 43200, depreciationRate: 40, lifetimeRevenue: 28000, lifetimeCosts: 2400,
    status: 'Deployed', currentLocation: 'TCS Airoli Campus', contractId: 'rc-001', contractNumber: 'RC-2026-001', customerName: 'Tata Consultancy Services',
    siteAddress: 'TCS Airoli, Navi Mumbai', warrantyStatus: 'Active', warrantyExpiry: '2027-11-15',
    dataWipeCertStatus: 'Not Requested', lifecycleEvents: [
      { id: 'ev-001', fromStatus: 'In Warehouse', toStatus: 'Staged', timestamp: '2026-01-10T09:00:00Z', user: 'Ops Team', notes: 'Assigned to RC-2026-001' },
      { id: 'ev-002', fromStatus: 'Staged', toStatus: 'In Transit (Out)', timestamp: '2026-01-12T14:00:00Z', user: 'Logistics', notes: 'Dispatched via BlueDart' },
      { id: 'ev-003', fromStatus: 'In Transit (Out)', toStatus: 'Deployed', timestamp: '2026-01-14T10:30:00Z', user: 'Ops Team', notes: 'Delivery confirmed at TCS Airoli' },
    ], advanceReplacements: [],
  },
  {
    id: 'ra-002', uid: 'RENTR-LP-2026-00002', category: 'LP', oem: 'Dell', model: 'Latitude 5540', oemSerialNumber: 'DELL-SN-R002',
    specifications: 'i5-1345U, 16GB RAM, 512GB SSD, 14" FHD', source: 'New', acquisitionCost: 72000, acquisitionDate: '2025-11-15',
    bookValue: 43200, depreciationRate: 40, lifetimeRevenue: 28000, lifetimeCosts: 1200,
    status: 'Deployed', currentLocation: 'TCS Airoli Campus', contractId: 'rc-001', contractNumber: 'RC-2026-001', customerName: 'Tata Consultancy Services',
    warrantyStatus: 'Active', warrantyExpiry: '2027-11-15', dataWipeCertStatus: 'Not Requested',
    lifecycleEvents: [], advanceReplacements: [],
  },
  {
    id: 'ra-003', uid: 'RENTR-SVR-2026-00001', category: 'SVR', oem: 'HPE', model: 'ProLiant DL380 Gen10', oemSerialNumber: 'HPE-SN-R001',
    specifications: 'Xeon Silver 4314, 64GB RAM, 2x 1.2TB SAS', source: 'New', acquisitionCost: 285000, acquisitionDate: '2025-09-20',
    bookValue: 171000, depreciationRate: 40, lifetimeRevenue: 120000, lifetimeCosts: 8500,
    status: 'Received (GRN)', currentLocation: 'Mumbai DC', warehouseId: 'wh-001',
    conditionGrade: 'B', warrantyStatus: 'Active', warrantyExpiry: '2028-09-20',
    dataWipeCertStatus: 'Requested', grnNumber: 'GRN-2026-0088',
    lifecycleEvents: [
      { id: 'ev-010', fromStatus: 'Deployed', toStatus: 'Return Initiated', timestamp: '2026-03-25T09:00:00Z', user: 'M&M Ops' },
      { id: 'ev-011', fromStatus: 'Return Initiated', toStatus: 'Return In Transit', timestamp: '2026-03-28T14:00:00Z', user: 'Logistics' },
      { id: 'ev-012', fromStatus: 'Return In Transit', toStatus: 'Received (GRN)', timestamp: '2026-04-01T11:00:00Z', user: 'Warehouse', reference: 'GRN-2026-0088', notes: 'Billing auto-stopped' },
    ], advanceReplacements: [],
  } as RentalAsset,
  {
    id: 'ra-004', uid: 'RENTR-LP-2026-00010', category: 'LP', oem: 'HP', model: 'EliteBook 840 G8', oemSerialNumber: 'HP-SN-R010',
    specifications: 'i7-1185G7, 16GB RAM, 512GB SSD', source: 'Refurbished', acquisitionCost: 48000, acquisitionDate: '2025-12-10',
    bookValue: 28800, depreciationRate: 40, lifetimeRevenue: 14000, lifetimeCosts: 3200,
    status: 'In Repair', currentLocation: 'Service Center Mumbai', conditionGrade: 'C',
    warrantyStatus: 'Expired', warrantyExpiry: '2025-12-10', dataWipeCertStatus: 'Not Requested',
    lifecycleEvents: [], advanceReplacements: [
      { originalUID: 'RENTR-LP-2026-00010', replacementUID: 'RENTR-LP-2026-00015', ticketRef: 'TKT-2026-0003', date: '2026-03-15' }
    ],
  },
  {
    id: 'ra-005', uid: 'RENTR-LP-2026-00015', category: 'LP', oem: 'HP', model: 'EliteBook 840 G8', oemSerialNumber: 'HP-SN-R015',
    specifications: 'i7-1185G7, 16GB RAM, 512GB SSD', source: 'New', acquisitionCost: 68000, acquisitionDate: '2026-01-05',
    bookValue: 40800, depreciationRate: 40, lifetimeRevenue: 7000, lifetimeCosts: 0,
    status: 'Deployed', currentLocation: 'Airtel Gurgaon Office', contractId: 'rc-008', contractNumber: 'RC-2026-008', customerName: 'Bharti Airtel',
    warrantyStatus: 'Active', warrantyExpiry: '2029-01-05', dataWipeCertStatus: 'Not Requested',
    lifecycleEvents: [], advanceReplacements: [],
  },
  {
    id: 'ra-006', uid: 'RENTR-NW-2026-00001', category: 'NW', oem: 'Cisco', model: 'Catalyst 9300-48P', oemSerialNumber: 'CISCO-SN-R001',
    specifications: '48-port PoE+ managed switch', source: 'New', acquisitionCost: 180000, acquisitionDate: '2025-08-15',
    bookValue: 108000, depreciationRate: 40, lifetimeRevenue: 84000, lifetimeCosts: 0,
    status: 'In Warehouse', currentLocation: 'Mumbai DC', warehouseId: 'wh-001',
    warrantyStatus: 'Active', warrantyExpiry: '2028-08-15', dataWipeCertStatus: 'Not Requested',
    lifecycleEvents: [], advanceReplacements: [],
  },
  {
    id: 'ra-007', uid: 'RENTR-DT-2026-00001', category: 'DT', oem: 'Dell', model: 'OptiPlex 7090', oemSerialNumber: 'DELL-SN-D001',
    specifications: 'i5-11500, 8GB RAM, 256GB SSD', source: 'NBFC Residual', acquisitionCost: 32000, acquisitionDate: '2025-10-01',
    bookValue: 19200, depreciationRate: 40, lifetimeRevenue: 10500, lifetimeCosts: 800,
    status: 'Deployed', currentLocation: 'Wipro Hinjewadi', contractId: 'rc-002', contractNumber: 'RC-2026-002', customerName: 'Wipro Technologies',
    warrantyStatus: 'Expired', warrantyExpiry: '2025-10-01', dataWipeCertStatus: 'Not Requested',
    lifecycleEvents: [], advanceReplacements: [],
  },
  {
    id: 'ra-008', uid: 'RENTR-LP-2026-00020', category: 'LP', oem: 'Lenovo', model: 'ThinkPad T14 Gen 4', oemSerialNumber: 'LEN-SN-R020',
    specifications: 'Ryzen 5 7530U, 16GB RAM, 512GB SSD', source: 'New', acquisitionCost: 65000, acquisitionDate: '2026-02-01',
    bookValue: 39000, depreciationRate: 40, lifetimeRevenue: 0, lifetimeCosts: 0,
    status: 'Staged', currentLocation: 'Mumbai DC', warehouseId: 'wh-001',
    warrantyStatus: 'Active', warrantyExpiry: '2029-02-01', dataWipeCertStatus: 'Not Requested',
    lifecycleEvents: [
      { id: 'ev-020', fromStatus: 'In Warehouse', toStatus: 'Staged', timestamp: '2026-04-18T10:00:00Z', user: 'Ops Team', notes: 'Assigned to new draft contract' },
    ], advanceReplacements: [],
  },
]
