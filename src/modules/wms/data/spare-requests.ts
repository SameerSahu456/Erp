export type SpareRequestStatus = 'Requested' | 'In Stock' | 'Ordered' | 'Fulfilled'

export interface SpareRequest {
  id: string
  deviceId: string
  deviceBarcode: string
  model: string
  spareName: string
  qty: number
  status: SpareRequestStatus
  requestedBy: string
  requestedAt: string
  fulfilledAt?: string
  // Component-scoped spare (set when the request targets one slot of an ASSEMBLY device)
  componentSlotId?: string
  componentPosition?: string   // denormalized from DeviceComponent.position, e.g. 'CPU Socket 1'
  replacementPartId?: string   // target part chosen by inspector (may differ from the failed SKU)
  replacementPartSku?: string
}

export const mockSpareRequests: SpareRequest[] = [
  {
    id: 'sr-001',
    deviceId: 'dev-009',
    deviceBarcode: 'L-HP-2003',
    model: 'EliteBook 840 G8',
    spareName: 'SSD 512GB',
    qty: 1,
    status: 'Requested',
    requestedBy: 'Ravi Kumar',
    requestedAt: '2026-04-15T10:00:00Z',
  },
  {
    id: 'sr-002',
    deviceId: 'dev-010',
    deviceBarcode: 'L-DEL-1005',
    model: 'Latitude 5540',
    spareName: 'Keyboard',
    qty: 1,
    status: 'Requested',
    requestedBy: 'Priya Nair',
    requestedAt: '2026-04-14T14:00:00Z',
  },
  {
    id: 'sr-003',
    deviceId: 'dev-011',
    deviceBarcode: 'L-LEN-3003',
    model: 'ThinkPad T14 Gen 4',
    spareName: 'Touchpad',
    qty: 1,
    status: 'In Stock',
    requestedBy: 'Sanjay Gupta',
    requestedAt: '2026-04-12T09:00:00Z',
  },
  {
    id: 'sr-004',
    deviceId: 'dev-014',
    deviceBarcode: 'L-HP-2004',
    model: 'EliteBook 840 G8',
    spareName: 'Battery',
    qty: 1,
    status: 'Fulfilled',
    requestedBy: 'Ravi Kumar',
    requestedAt: '2026-04-10T11:00:00Z',
    fulfilledAt: '2026-04-13T16:00:00Z',
  },
  {
    id: 'sr-005',
    deviceId: 'dev-012',
    deviceBarcode: 'L-APP-4001',
    model: 'MacBook Pro 14"',
    spareName: 'Motherboard',
    qty: 1,
    status: 'Ordered',
    requestedBy: 'Deepak Joshi',
    requestedAt: '2026-04-08T10:00:00Z',
  },
  {
    id: 'sr-006',
    deviceId: 'dev-013',
    deviceBarcode: 'L-DEL-1006',
    model: 'Latitude 7440',
    spareName: 'LCD Panel 14" FHD',
    qty: 1,
    status: 'Requested',
    requestedBy: 'Suresh Nair',
    requestedAt: '2026-04-16T08:30:00Z',
  },
  // Component-scoped server spare — replacement DIMM for a failed RAM slot on
  // dev-srv-003 (Dell PowerEdge R750xs). Uses the assembly-aware fields so the
  // Spares page can show the slot and intended replacement SKU.
  {
    id: 'sr-007',
    deviceId: 'dev-srv-003',
    deviceBarcode: 'S-DEL-7003',
    model: 'PowerEdge R750xs',
    spareName: 'Samsung 32GB DDR4-3200 RDIMM ECC',
    qty: 1,
    status: 'Ordered',
    requestedBy: 'Ravi Kumar',
    requestedAt: '2026-04-09T10:15:00Z',
    componentSlotId: 'dev-srv-003:BOM-001-I02:3',
    componentPosition: 'DIMM Slot A3',
    replacementPartId: 'COMP-003',
    replacementPartSku: 'RAM-SAM-32G-ECC',
  },
]
