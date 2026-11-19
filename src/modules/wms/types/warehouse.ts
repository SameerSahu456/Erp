// ── Warehouse Locations ──
export interface Warehouse {
  id: string
  name: string
  code: string  // e.g., 'MUM-WH1'
  address: string
  city: string
  manager: string
  storeTeam: string[]
  rows: WarehouseRow[]
}

export interface WarehouseRow {
  id: string
  name: string  // 'Row 1', 'Row 2'
  racks: WarehouseRack[]
}

export interface WarehouseRack {
  id: string
  name: string  // 'Rack A', 'Rack B'
  bins: WarehouseBin[]
  dimensions?: { width: number; height: number; depth: number }  // cm
  capacityUsed: number  // percentage 0-100
}

export interface WarehouseBin {
  id: string
  name: string  // 'Bin 1', 'Bin 2'
  itemCount: number
  maxItems: number
  status: 'Empty' | 'Partial' | 'Full'
}

