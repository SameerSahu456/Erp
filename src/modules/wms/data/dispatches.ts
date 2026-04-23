import { useSyncExternalStore } from 'react'
import type { Dispatch, DispatchLineItem } from '../types'
import { getDefaultVariantForPart } from '@/modules/ims/data/variants'
import { mockOutwardRecords } from './outward'

// Raw line omits the variant-derived fields; they get filled in at module load
// from `partId` / `replacedPartId` via the default-variant lookup.
type RawDispatchLine = Omit<
  DispatchLineItem,
  'variantId' | 'condition' | 'variantSku' | 'replacedVariantId'
> & {
  replacedPartId?: string
}
type RawDispatch = Omit<Dispatch, 'lineItems'> & { lineItems: RawDispatchLine[] }

function enrichDispatchLine(line: RawDispatchLine): DispatchLineItem {
  const variant = getDefaultVariantForPart(line.partId)
  const replacedVariant = line.replacedPartId
    ? getDefaultVariantForPart(line.replacedPartId)
    : undefined
  return {
    ...line,
    variantId: variant?.id ?? 'VAR-UNKNOWN',
    condition: variant?.condition ?? 'New',
    variantSku: variant?.variantSku ?? line.partSku,
    replacedVariantId: replacedVariant?.id,
  }
}

const rawDispatches: RawDispatch[] = [
  // ── DISP-001 ── Closed, full history with variance ────────────────────────
  {
    id: 'DISP-001',
    dispatchNumber: 'DISP-2026-001',
    salesOrderId: 'SO-001',
    salesOrderNumber: 'SO-2026-001',
    outwardId: 'out-001',
    outwardNumber: 'OUT-2026-001',
    accountId: 'ACC-001',
    accountName: 'Tata Consultancy Services',
    shippingAddress: 'TCS Siruseri, Chennai 603103',
    status: 'Closed',
    externalTicketNumber: 'FD-TKT-78421',
    externalSystem: 'Freshdesk',
    storeManager: 'Suresh Kumar',
    billingPerson: 'Priya Deshmukh',
    createdBy: 'Amit Patel',
    assemblyStartedAt: '2026-02-10T09:00:00Z',
    assemblyCompletedAt: '2026-02-13T17:00:00Z',
    billingCompletedAt: '2026-02-14T11:30:00Z',
    dispatchedAt: '2026-02-14T18:00:00Z',
    deliveredAt: '2026-02-16T14:00:00Z',
    createdAt: '2026-02-09T10:00:00Z',
    updatedAt: '2026-02-17T09:00:00Z',
    notes: 'Clean delivery to TCS Siruseri DC. Customer accepted SAS→Micron SSD swap (COMP-006 pulled from stock due to Samsung out-of-stock on dispatch day). Added iDRAC Enterprise license per customer request on SO-001.',
    invoiceAmount: 1274000,
    lineItems: [
      {
        id: 'DL-001-01',
        soLineItemId: 'SOL-001-01',
        partId: 'PART-007',
        partName: 'Dell PowerEdge R750xs',
        partSku: 'DL-PE-R750XS',
        category: 'Servers',
        brand: 'Dell',
        action: 'FITTED_AS_PLANNED',
        plannedQty: 2,
        fittedQty: 2,
        serialNumbers: ['DL-R750XS-SN-50021', 'DL-R750XS-SN-50022'],
        rate: 570000,
        amount: 1140000,
      },
      {
        id: 'DL-001-02',
        soLineItemId: 'SOL-001-02',
        partId: 'COMP-003',
        partName: 'Samsung 32GB DDR4-3200 RDIMM ECC',
        partSku: 'RAM-SAM-32G-ECC',
        category: 'Servers',
        brand: 'Samsung',
        action: 'FITTED_AS_PLANNED',
        plannedQty: 4,
        fittedQty: 4,
        serialNumbers: [
          'RAM-SAM-32G-SN-40101',
          'RAM-SAM-32G-SN-40102',
          'RAM-SAM-32G-SN-40103',
          'RAM-SAM-32G-SN-40104',
        ],
        rate: 12000,
        amount: 48000,
      },
      {
        id: 'DL-001-03',
        soLineItemId: 'SOL-001-03',
        partId: 'COMP-011',
        partName: 'Dell iDRAC9 Enterprise License',
        partSku: 'LIC-IDRAC9-ENT',
        category: 'Software Licenses',
        brand: 'Dell',
        action: 'FITTED_AS_PLANNED',
        plannedQty: 2,
        fittedQty: 2,
        rate: 15000,
        amount: 30000,
      },
      {
        id: 'DL-001-04',
        // No soLineItemId — standalone SWAP captured at fitting time
        partId: 'COMP-006',
        partName: 'Micron 960GB SAS SSD 2.5"',
        partSku: 'SSD-MC-960G-SAS',
        category: 'Storage',
        brand: 'Micron',
        action: 'REPLACED',
        plannedQty: 0,
        fittedQty: 4,
        serialNumbers: [
          'SSD-MC-960-SN-60001',
          'SSD-MC-960-SN-60002',
          'SSD-MC-960-SN-60003',
          'SSD-MC-960-SN-60004',
        ],
        replacedPartId: 'COMP-005',
        replacedDisplayName: 'Samsung 960GB SAS SSD · New',
        reason: 'Out of Stock',
        notes: 'Samsung SSD stock depleted — customer approved Micron alternative via call with Rahul on 2026-02-13.',
        rate: 22000,
        amount: 88000,
      },
      {
        id: 'DL-001-05',
        soLineItemId: 'SOL-001-04',
        partId: 'PART-016',
        partName: 'APC Smart-UPS 1500VA',
        partSku: 'APC-UPS-1500',
        category: 'UPS & Power',
        brand: 'APC',
        action: 'FITTED_AS_PLANNED',
        plannedQty: 2,
        fittedQty: 2,
        serialNumbers: ['APC-1500-SN-70021', 'APC-1500-SN-70022'],
        rate: 28000,
        amount: 56000,
      },
      {
        id: 'DL-001-06',
        soLineItemId: 'SOL-001-05',
        partId: 'PART-012',
        partName: 'Cisco Catalyst 9200L-48P',
        partSku: 'CSC-C9200L-48P',
        category: 'Networking',
        brand: 'Cisco',
        action: 'FITTED_AS_PLANNED',
        plannedQty: 1,
        fittedQty: 1,
        serialNumbers: ['CSC-9200L-SN-80011'],
        rate: 185000,
        amount: 185000,
      },
    ],
    documents: [
      {
        id: 'DDOC-001-01',
        type: 'Invoice',
        documentNumber: 'TAL-INV-2026-00421',
        fileName: 'TAL-INV-2026-00421.pdf',
        issuedDate: '2026-02-14',
        uploadedBy: 'Priya Deshmukh',
        uploadedAt: '2026-02-14T11:45:00Z',
        notes: 'Tally-generated tax invoice, 18% GST applied.',
      },
      {
        id: 'DDOC-001-02',
        type: 'E-way Bill',
        documentNumber: 'EWB-291-4518-9203',
        fileName: 'eway-291-4518-9203.pdf',
        issuedDate: '2026-02-14',
        uploadedBy: 'Priya Deshmukh',
        uploadedAt: '2026-02-14T12:00:00Z',
      },
      {
        id: 'DDOC-001-03',
        type: 'Delivery Challan',
        documentNumber: 'DC-2026-00421',
        fileName: 'DC-2026-00421.pdf',
        issuedDate: '2026-02-14',
        uploadedBy: 'Suresh Kumar',
        uploadedAt: '2026-02-14T12:10:00Z',
      },
      {
        id: 'DDOC-001-04',
        type: 'Warranty Card',
        documentNumber: 'DELL-WARR-R750-50021',
        fileName: 'warranty-tcs-r750x2.pdf',
        issuedDate: '2026-02-14',
        uploadedBy: 'Suresh Kumar',
        uploadedAt: '2026-02-14T12:15:00Z',
        notes: '3-year ProSupport Plus included for both R750xs units.',
      },
    ],
  },

  // ── DISP-002 ── Dispatched, happy path (all planned, no variance) ─────────
  {
    id: 'DISP-002',
    dispatchNumber: 'DISP-2026-002',
    salesOrderId: 'SO-002',
    salesOrderNumber: 'SO-2026-002',
    outwardId: 'out-002',
    outwardNumber: 'OUT-2026-002',
    accountId: 'ACC-004',
    accountName: 'Wipro Technologies',
    shippingAddress: 'Wipro Tech Park, Sarjapur Road, Bangalore 560035',
    status: 'Dispatched',
    externalTicketNumber: 'FD-TKT-79112',
    externalSystem: 'Freshdesk',
    storeManager: 'Amit Patel',
    billingPerson: 'Priya Deshmukh',
    createdBy: 'Sneha Desai',
    assemblyStartedAt: '2026-03-18T09:00:00Z',
    assemblyCompletedAt: '2026-03-19T16:00:00Z',
    billingCompletedAt: '2026-03-20T10:00:00Z',
    dispatchedAt: '2026-03-20T15:30:00Z',
    createdAt: '2026-03-17T14:00:00Z',
    updatedAt: '2026-03-20T15:30:00Z',
    invoiceAmount: 1200000,
    notes: 'Standard workstation bundle dispatch — 20 Latitudes + 20 monitors + 20 keyboard/mouse kits. No variance.',
    lineItems: [
      {
        id: 'DL-002-01',
        soLineItemId: 'SOL-002-01',
        partId: 'PART-001',
        partName: 'Dell Latitude 5540',
        partSku: 'DL-LAT-5540',
        category: 'Laptops',
        brand: 'Dell',
        action: 'FITTED_AS_PLANNED',
        plannedQty: 20,
        fittedQty: 20,
        rate: 45000,
        amount: 900000,
      },
      {
        id: 'DL-002-02',
        soLineItemId: 'SOL-002-02',
        partId: 'PART-014',
        partName: 'Dell P2422H 24" Monitor',
        partSku: 'DL-MON-P2422H',
        category: 'Monitors',
        brand: 'Dell',
        action: 'FITTED_AS_PLANNED',
        plannedQty: 20,
        fittedQty: 20,
        rate: 12000,
        amount: 240000,
      },
      {
        id: 'DL-002-03',
        soLineItemId: 'SOL-002-03',
        partId: 'COMP-023',
        partName: 'Logitech MK270 Wireless Combo',
        partSku: 'LOG-MK270',
        category: 'Cables & Accessories',
        brand: 'Logitech',
        action: 'FITTED_AS_PLANNED',
        plannedQty: 20,
        fittedQty: 20,
        rate: 3000,
        amount: 60000,
      },
    ],
    documents: [
      {
        id: 'DDOC-002-01',
        type: 'Invoice',
        documentNumber: 'TAL-INV-2026-00518',
        issuedDate: '2026-03-20',
        uploadedBy: 'Priya Deshmukh',
        uploadedAt: '2026-03-20T10:15:00Z',
      },
      {
        id: 'DDOC-002-02',
        type: 'E-way Bill',
        documentNumber: 'EWB-301-2290-7741',
        issuedDate: '2026-03-20',
        uploadedBy: 'Priya Deshmukh',
        uploadedAt: '2026-03-20T10:30:00Z',
      },
    ],
  },

  // ── DISP-003 ── In-flight, assembly pending (early stage) ─────────────────
  {
    id: 'DISP-003',
    dispatchNumber: 'DISP-2026-003',
    salesOrderId: 'SO-004',
    salesOrderNumber: 'SO-2026-004',
    outwardId: 'out-003',
    outwardNumber: 'OUT-2026-003',
    accountId: 'ACC-005',
    accountName: 'Bharti Airtel',
    shippingAddress: 'Airtel Center, Plot No. 16, Udyog Vihar Phase IV, Gurugram 122015',
    status: 'Assembly Pending',
    externalTicketNumber: 'FD-TKT-80044',
    externalSystem: 'Freshdesk',
    storeManager: 'Amit Patel',
    createdBy: 'Sneha Desai',
    assemblyStartedAt: '2026-04-14T10:00:00Z',
    createdAt: '2026-04-13T16:00:00Z',
    updatedAt: '2026-04-14T10:00:00Z',
    notes: 'SAS SSD swap from SATA (per SO-004 config). External assembly team started today — awaiting fitted serials + Tally invoice.',
    lineItems: [
      {
        id: 'DL-003-01',
        soLineItemId: 'SOL-004-01',
        partId: 'PART-008',
        partName: 'Dell PowerEdge R650xs',
        partSku: 'DL-PE-R650XS',
        category: 'Servers',
        brand: 'Dell',
        action: 'PLANNED',
        plannedQty: 2,
        fittedQty: 0,
        rate: 195000,
        amount: 0,
      },
      {
        id: 'DL-003-02',
        soLineItemId: 'SOL-004-02',
        partId: 'COMP-005',
        partName: 'Samsung 960GB SAS SSD 2.5"',
        partSku: 'SSD-SAM-960G-SAS',
        category: 'Storage',
        brand: 'Samsung',
        action: 'PLANNED',
        plannedQty: 2,
        fittedQty: 0,
        replacedPartId: 'COMP-014',
        replacedDisplayName: 'Intel 480GB SATA SSD · New',
        reason: 'Customer Requested Change',
        notes: 'SO-004 marked this as a SWAP at quote time — SAS chosen over SATA. Assembly team to confirm fitted part.',
        rate: 25000,
        amount: 0,
      },
    ],
    documents: [],
  },
]

const seedDispatches: Dispatch[] = rawDispatches.map((d) => ({
  ...d,
  lineItems: d.lineItems.map(enrichDispatchLine),
}))

// ── Mutable in-memory store ─────────────────────────────────────────────────
// Demo-only state: upserts stay for the session. useSyncExternalStore gives
// reactive reads to components.

let currentDispatches: Dispatch[] = seedDispatches
const subscribers = new Set<() => void>()

function emit(): void {
  currentDispatches = [...currentDispatches]  // new ref so React re-renders
  subscribers.forEach((cb) => cb())
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}

function getSnapshot(): Dispatch[] {
  return currentDispatches
}

/** Backwards-compat export — array reference is swapped on every mutation. */
export const mockDispatches = currentDispatches

export function getAllDispatches(): Dispatch[] {
  return currentDispatches
}

export function useDispatches(): Dispatch[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function upsertDispatch(dispatch: Dispatch): void {
  const idx = currentDispatches.findIndex((d) => d.id === dispatch.id)
  if (idx >= 0) {
    currentDispatches[idx] = dispatch
  } else {
    currentDispatches.push(dispatch)
  }
  emit()
}

export function deleteDispatch(id: string): void {
  const idx = currentDispatches.findIndex((d) => d.id === id)
  if (idx >= 0) {
    currentDispatches.splice(idx, 1)
    emit()
  }
}

/** Next sequential dispatch number — looks at existing IDs to pick a free slot. */
export function nextDispatchNumber(): { id: string; dispatchNumber: string } {
  const used = new Set(currentDispatches.map((d) => d.id))
  let seq = currentDispatches.length + 1
  let id = `DISP-${String(seq).padStart(3, '0')}`
  while (used.has(id)) {
    seq += 1
    id = `DISP-${String(seq).padStart(3, '0')}`
  }
  return { id, dispatchNumber: `DISP-2026-${String(seq).padStart(3, '0')}` }
}

// Lookup helpers
export function getDispatchById(id: string): Dispatch | undefined {
  return currentDispatches.find((d) => d.id === id)
}

export function getDispatchesForSalesOrder(salesOrderId: string): Dispatch[] {
  return currentDispatches.filter((d) => d.salesOrderId === salesOrderId)
}

/** Find the dispatch request attached to a specific outward (1:1). */
export function getDispatchForOutward(outwardId: string): Dispatch | undefined {
  return currentDispatches.find((d) => d.outwardId === outwardId)
}

/** Allocate the next OUT-YYYY-### number based on existing outward records. */
export function nextOutwardNumber(): { id: string; outwardNumber: string } {
  const year = new Date().getFullYear()
  const maxNum = mockOutwardRecords.reduce((max, r) => {
    const num = parseInt(r.outwardNumber.split('-').pop() ?? '0', 10)
    return Number.isFinite(num) && num > max ? num : max
  }, 0)
  const seq = maxNum + 1
  return {
    id: `out-${String(seq).padStart(3, '0')}`,
    outwardNumber: `OUT-${year}-${String(seq).padStart(3, '0')}`,
  }
}
