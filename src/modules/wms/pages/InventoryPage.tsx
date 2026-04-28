import { useMemo, useState } from 'react'
import { Package, Award, ShieldCheck, Truck } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { StatsRow } from '@/components/common/StatsRow'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { ListPageShell } from '@/components/page'
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  type DeviceStatus,
} from '../types'
import { mockDevices } from '../data/devices'
import { mockWarehouses } from '../data/warehouses'

const STATUS_FILTER_OPTIONS: DeviceStatus[] = [
  'IN_STOCK',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'SCRAPPED',
]

// Map location strings to warehouse IDs
function getWarehouseIdFromLocation(location: string): string | undefined {
  if (location.startsWith('Mumbai')) return 'wh-001'
  if (location.startsWith('Bangalore')) return 'wh-002'
  if (location.startsWith('Delhi')) return 'wh-003'
  return undefined
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function InventoryPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const brands = useMemo(
    () => Array.from(new Set(mockDevices.map((d) => d.brand))).sort(),
    []
  )
  const categories = useMemo(
    () => Array.from(new Set(mockDevices.map((d) => d.category))).sort(),
    []
  )

  const filtered = useMemo(() => {
    return mockDevices.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (brandFilter !== 'all' && d.brand !== brandFilter) return false
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false
      if (warehouseFilter !== 'all') {
        const whId = d.warehouseId ?? getWarehouseIdFromLocation(d.location)
        if (whId !== warehouseFilter) return false
      }
      if (search) {
        const q = search.toLowerCase()
        if (
          !d.barcode.toLowerCase().includes(q) &&
          !d.model.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [statusFilter, brandFilter, categoryFilter, warehouseFilter, search])

  const inStockDevices = filtered.filter((d) => d.status === 'IN_STOCK')
  const gradeACount = filtered.filter((d) => d.grade === 'A').length
  const gradeBCount = filtered.filter((d) => d.grade === 'B').length
  const readyForDispatch = filtered.filter(
    (d) => d.status === 'READY_FOR_DISPATCH'
  ).length

  const stats = [
    { label: 'Total In Stock', value: inStockDevices.length, icon: Package, accent: 'primary' as const },
    { label: 'Grade A', value: gradeACount, icon: Award, accent: 'success' as const },
    { label: 'Grade B', value: gradeBCount, icon: ShieldCheck, accent: 'info' as const },
    { label: 'Ready for Dispatch', value: readyForDispatch, icon: Truck, accent: 'violet' as const },
  ]

  const inStockTab: TabConfig = {
    id: 'in-stock',
    label: 'In Stock',
    columns: [
      { key: 'barcode', label: 'Barcode', sortable: true },
      { key: 'model', label: 'Model', sortable: true },
      { key: 'brand', label: 'Brand', sortable: true },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'warehouse', label: 'Warehouse', sortable: true },
      { key: 'location', label: 'Location', sortable: true },
      { key: 'stockedSince', label: 'Stocked Since', sortable: true },
    ],
    data: inStockDevices.map((d) => {
      const whId = d.warehouseId ?? getWarehouseIdFromLocation(d.location)
      const wh = mockWarehouses.find((w) => w.id === whId)
      return {
        barcode: d.barcode,
        model: d.model,
        brand: d.brand,
        grade: d.grade ?? '-',
        warehouse: wh?.name ?? '-',
        location: d.location,
        stockedSince: d.qcPassedAt ? formatDate(d.qcPassedAt) : '-',
      }
    }),
  }

  const allTab: TabConfig = {
    id: 'all',
    label: 'All Devices',
    columns: [
      { key: 'barcode', label: 'Barcode', sortable: true },
      { key: 'model', label: 'Model', sortable: true },
      { key: 'brand', label: 'Brand', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'warehouse', label: 'Warehouse', sortable: true },
      { key: 'location', label: 'Location', sortable: true },
    ],
    data: filtered.map((d) => {
      const whId = d.warehouseId ?? getWarehouseIdFromLocation(d.location)
      const wh = mockWarehouses.find((w) => w.id === whId)
      return {
        barcode: d.barcode,
        model: d.model,
        brand: d.brand,
        status: d.status,
        grade: d.grade ?? '-',
        warehouse: wh?.name ?? '-',
        location: d.location,
      }
    }),
  }

  const cellFormatter: CellFormatter = (value, key, _row) => {
    if (key === 'status' && typeof value === 'string' && value in DEVICE_STATUS_LABELS) {
      const status = value as DeviceStatus
      const variant = status === 'SCRAPPED' ? 'red-cell' : DEVICE_STATUS_VARIANT[status]
      return {
        className: status === 'SCRAPPED' ? 'bg-destructive/10' : undefined,
        display: (
          <StatusBadge variant={variant}>
            {DEVICE_STATUS_LABELS[status]}
          </StatusBadge>
        ),
      }
    }
    return null
  }

  const filterBar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={warehouseFilter} onValueChange={(v) => setWarehouseFilter(v ?? 'all')}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Warehouse" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Warehouses</SelectItem>
          {mockWarehouses.map((wh) => (
            <SelectItem key={wh.id} value={wh.id}>
              {wh.city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {STATUS_FILTER_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {DEVICE_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v ?? 'all')}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Brand" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Brands</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Search barcode / model..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-56"
      />
    </div>
  )

  return (
    <ListPageShell
      title="Inventory"
      subtitle="All devices in stock across warehouses, with filters by status, brand, and category."
      breadcrumbs={[{ label: 'WMS' }, { label: 'Inventory' }]}
      stats={<StatsRow stats={stats} />}
      toolbar={filterBar}
    >
      <BusinessMetricsTable
        tabs={[inStockTab, allTab]}
        cellFormatter={cellFormatter}
        persistKey="wms-inventory"
        emptyState={{
          title: 'No devices match your filters',
          description: 'Try clearing a filter or widening your search to see more devices.',
        }}
      />
    </ListPageShell>
  )
}
