import type { Warehouse, WarehouseRow, WarehouseRack, WarehouseBin } from '../types'

function makeDeterministicBins(
  count: number,
  prefix: string,
  itemCounts: number[],
): WarehouseBin[] {
  return Array.from({ length: count }, (_, i) => {
    const maxItems = 20
    const itemCount = itemCounts[i] ?? 0
    const status: WarehouseBin['status'] =
      itemCount === 0 ? 'Empty' : itemCount >= maxItems ? 'Full' : 'Partial'
    return {
      id: `${prefix}-bin-${i + 1}`,
      name: `Bin ${i + 1}`,
      itemCount,
      maxItems,
      status,
    }
  })
}

function makeRack(
  id: string,
  name: string,
  bins: WarehouseBin[],
): WarehouseRack {
  const totalCap = bins.reduce((s, b) => s + b.maxItems, 0)
  const usedCap = bins.reduce((s, b) => s + b.itemCount, 0)
  return {
    id,
    name,
    bins,
    capacityUsed: totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0,
  }
}

// ── Mumbai Warehouse ──
const mumRow1: WarehouseRow = {
  id: 'mum-row-1',
  name: 'Row 1',
  racks: [
    makeRack('mum-r1-ra', 'Rack A', makeDeterministicBins(6, 'mum-r1-ra', [20, 15, 8, 0, 12, 20])),
    makeRack('mum-r1-rb', 'Rack B', makeDeterministicBins(6, 'mum-r1-rb', [5, 0, 18, 20, 3, 10])),
    makeRack('mum-r1-rc', 'Rack C', makeDeterministicBins(6, 'mum-r1-rc', [0, 0, 0, 0, 0, 0])),
    makeRack('mum-r1-rd', 'Rack D', makeDeterministicBins(6, 'mum-r1-rd', [20, 20, 20, 20, 20, 20])),
  ],
}

const mumRow2: WarehouseRow = {
  id: 'mum-row-2',
  name: 'Row 2',
  racks: [
    makeRack('mum-r2-ra', 'Rack A', makeDeterministicBins(6, 'mum-r2-ra', [14, 7, 20, 0, 9, 16])),
    makeRack('mum-r2-rb', 'Rack B', makeDeterministicBins(6, 'mum-r2-rb', [0, 0, 3, 6, 0, 0])),
    makeRack('mum-r2-rc', 'Rack C', makeDeterministicBins(6, 'mum-r2-rc', [11, 20, 15, 8, 4, 19])),
    makeRack('mum-r2-rd', 'Rack D', makeDeterministicBins(6, 'mum-r2-rd', [2, 0, 0, 17, 13, 6])),
  ],
}

const mumRow3: WarehouseRow = {
  id: 'mum-row-3',
  name: 'Row 3',
  racks: [
    makeRack('mum-r3-ra', 'Rack A', makeDeterministicBins(6, 'mum-r3-ra', [20, 18, 14, 10, 7, 3])),
    makeRack('mum-r3-rb', 'Rack B', makeDeterministicBins(6, 'mum-r3-rb', [0, 5, 10, 15, 20, 12])),
    makeRack('mum-r3-rc', 'Rack C', makeDeterministicBins(6, 'mum-r3-rc', [8, 0, 0, 20, 20, 0])),
    makeRack('mum-r3-rd', 'Rack D', makeDeterministicBins(6, 'mum-r3-rd', [6, 9, 12, 0, 0, 14])),
  ],
}

// ── Bangalore Warehouse ──
const blrRow1: WarehouseRow = {
  id: 'blr-row-1',
  name: 'Row 1',
  racks: [
    makeRack('blr-r1-ra', 'Rack A', makeDeterministicBins(4, 'blr-r1-ra', [10, 20, 0, 15])),
    makeRack('blr-r1-rb', 'Rack B', makeDeterministicBins(4, 'blr-r1-rb', [0, 8, 12, 20])),
    makeRack('blr-r1-rc', 'Rack C', makeDeterministicBins(4, 'blr-r1-rc', [5, 5, 5, 0])),
  ],
}

const blrRow2: WarehouseRow = {
  id: 'blr-row-2',
  name: 'Row 2',
  racks: [
    makeRack('blr-r2-ra', 'Rack A', makeDeterministicBins(4, 'blr-r2-ra', [20, 20, 18, 14])),
    makeRack('blr-r2-rb', 'Rack B', makeDeterministicBins(4, 'blr-r2-rb', [0, 0, 0, 0])),
    makeRack('blr-r2-rc', 'Rack C', makeDeterministicBins(4, 'blr-r2-rc', [7, 13, 20, 2])),
  ],
}

// ── Delhi Warehouse ──
const delRow1: WarehouseRow = {
  id: 'del-row-1',
  name: 'Row 1',
  racks: [
    makeRack('del-r1-ra', 'Rack A', makeDeterministicBins(4, 'del-r1-ra', [20, 15, 10, 0])),
    makeRack('del-r1-rb', 'Rack B', makeDeterministicBins(4, 'del-r1-rb', [0, 0, 5, 8])),
  ],
}

const delRow2: WarehouseRow = {
  id: 'del-row-2',
  name: 'Row 2',
  racks: [
    makeRack('del-r2-ra', 'Rack A', makeDeterministicBins(4, 'del-r2-ra', [12, 20, 0, 7])),
    makeRack('del-r2-rb', 'Rack B', makeDeterministicBins(4, 'del-r2-rb', [3, 0, 16, 20])),
  ],
}

export const mockWarehouses: Warehouse[] = [
  {
    id: 'wh-001',
    name: 'Mumbai Warehouse',
    code: 'MUM-WH1',
    address: 'Plot 42, MIDC Industrial Area, Andheri East',
    city: 'Mumbai',
    manager: 'Vikram Singh',
    storeTeam: ['Ravi Kumar', 'Priya Nair', 'Sanjay Gupta'],
    rows: [mumRow1, mumRow2, mumRow3],
  },
  {
    id: 'wh-002',
    name: 'Bangalore Warehouse',
    code: 'BLR-WH2',
    address: '18, Electronic City Phase 2, Hosur Road',
    city: 'Bangalore',
    manager: 'Meera Joshi',
    storeTeam: ['Arjun Patel', 'Deepa Iyer'],
    rows: [blrRow1, blrRow2],
  },
  {
    id: 'wh-003',
    name: 'Delhi Warehouse',
    code: 'DEL-WH3',
    address: 'B-12, Okhla Industrial Estate, Phase 3',
    city: 'Delhi',
    manager: 'Amit Sharma',
    storeTeam: ['Kiran Singh'],
    rows: [delRow1, delRow2],
  },
]
