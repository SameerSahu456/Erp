import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Package, CheckCircle2, Clock, ShoppingCart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

// Spare request status
type SpareRequestStatus = 'Requested' | 'In Stock' | 'Ordered' | 'Fulfilled'

interface SpareRequest {
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
}

// Spare inventory item
interface SpareInventory {
  id: string
  name: string
  category: string
  sku: string
  inStock: number
  reorderLevel: number
  unitPrice: number
  lastRestocked: string
}

const STATUS_VARIANT: Record<SpareRequestStatus, StatusBadgeVariant> = {
  Requested: 'warning',
  'In Stock': 'info',
  Ordered: 'neutral',
  Fulfilled: 'success',
}

// Mock spare requests
const mockSpareRequests: SpareRequest[] = [
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
]

// Mock spare inventory (Spare Shop)
const mockSpareInventory: SpareInventory[] = [
  { id: 'sp-001', name: 'Keyboard (Dell Latitude)', category: 'Input', sku: 'SP-KB-DEL-001', inStock: 15, reorderLevel: 5, unitPrice: 2500, lastRestocked: '2026-04-01' },
  { id: 'sp-002', name: 'Keyboard (HP EliteBook)', category: 'Input', sku: 'SP-KB-HP-001', inStock: 8, reorderLevel: 5, unitPrice: 2800, lastRestocked: '2026-03-28' },
  { id: 'sp-003', name: 'Keyboard (Lenovo ThinkPad)', category: 'Input', sku: 'SP-KB-LEN-001', inStock: 12, reorderLevel: 5, unitPrice: 2600, lastRestocked: '2026-04-05' },
  { id: 'sp-004', name: 'Touchpad Module', category: 'Input', sku: 'SP-TP-GEN-001', inStock: 6, reorderLevel: 3, unitPrice: 1800, lastRestocked: '2026-03-20' },
  { id: 'sp-005', name: 'SSD 256GB NVMe', category: 'Storage', sku: 'SP-SSD-256-001', inStock: 20, reorderLevel: 10, unitPrice: 3500, lastRestocked: '2026-04-10' },
  { id: 'sp-006', name: 'SSD 512GB NVMe', category: 'Storage', sku: 'SP-SSD-512-001', inStock: 14, reorderLevel: 8, unitPrice: 5500, lastRestocked: '2026-04-10' },
  { id: 'sp-007', name: 'RAM 8GB DDR4', category: 'Memory', sku: 'SP-RAM-8-001', inStock: 25, reorderLevel: 10, unitPrice: 2200, lastRestocked: '2026-04-02' },
  { id: 'sp-008', name: 'RAM 16GB DDR4', category: 'Memory', sku: 'SP-RAM-16-001', inStock: 18, reorderLevel: 8, unitPrice: 4000, lastRestocked: '2026-04-02' },
  { id: 'sp-009', name: 'Battery (Dell)', category: 'Power', sku: 'SP-BAT-DEL-001', inStock: 10, reorderLevel: 5, unitPrice: 4500, lastRestocked: '2026-03-25' },
  { id: 'sp-010', name: 'Battery (HP)', category: 'Power', sku: 'SP-BAT-HP-001', inStock: 7, reorderLevel: 5, unitPrice: 4200, lastRestocked: '2026-03-25' },
  { id: 'sp-011', name: 'Fan Assembly', category: 'Hardware', sku: 'SP-FAN-GEN-001', inStock: 12, reorderLevel: 5, unitPrice: 1200, lastRestocked: '2026-04-08' },
  { id: 'sp-012', name: 'LCD Panel 14" FHD', category: 'Display', sku: 'SP-LCD-14-001', inStock: 3, reorderLevel: 5, unitPrice: 8500, lastRestocked: '2026-03-15' },
  { id: 'sp-013', name: 'Hinge Set (Universal)', category: 'Hardware', sku: 'SP-HNG-GEN-001', inStock: 20, reorderLevel: 8, unitPrice: 800, lastRestocked: '2026-04-12' },
  { id: 'sp-014', name: 'Speaker Module', category: 'Audio', sku: 'SP-SPK-GEN-001', inStock: 9, reorderLevel: 5, unitPrice: 1500, lastRestocked: '2026-03-30' },
  { id: 'sp-015', name: 'Motherboard (Dell Latitude)', category: 'Board', sku: 'SP-MB-DEL-001', inStock: 2, reorderLevel: 3, unitPrice: 18000, lastRestocked: '2026-03-10' },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SparesPage() {
  const [requests, setRequests] = useState<SpareRequest[]>(mockSpareRequests)
  const [inventory] = useState<SpareInventory[]>(mockSpareInventory)
  const [addStockDialog, setAddStockDialog] = useState(false)
  const [selectedSpare, setSelectedSpare] = useState('')
  const [addQty, setAddQty] = useState(0)

  const summaryStats = useMemo(() => ({
    totalRequested: requests.filter((r) => r.status === 'Requested').length,
    inStock: requests.filter((r) => r.status === 'In Stock').length,
    ordered: requests.filter((r) => r.status === 'Ordered').length,
    fulfilled: requests.filter((r) => r.status === 'Fulfilled').length,
  }), [requests])

  const handleFulfill = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'Fulfilled' as const, fulfilledAt: new Date().toISOString() }
          : r
      )
    )
    const req = requests.find((r) => r.id === id)
    toast.success(`Spare "${req?.spareName}" fulfilled for ${req?.deviceBarcode}`)
  }

  const handleMarkInStock = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'In Stock' as const } : r
      )
    )
    toast.success('Marked as In Stock')
  }

  // Spare Requests tabs
  const requestRows = useMemo(
    () =>
      requests.map((r) => ({
        id: r.id,
        barcode: r.deviceBarcode,
        model: r.model,
        spare: r.spareName,
        qty: r.qty,
        status: r.status,
        requestedBy: r.requestedBy,
        date: formatDate(r.requestedAt),
        _status: r.status,
      })),
    [requests],
  )

  const requestTabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'pending',
        label: `Pending (${requests.filter((r) => r.status !== 'Fulfilled').length})`,
        columns: [
          { key: 'barcode', label: 'Device', sortable: true },
          { key: 'model', label: 'Model', sortable: true },
          { key: 'spare', label: 'Spare Part', sortable: true },
          { key: 'qty', label: 'Qty', align: 'center' as const },
          { key: 'status', label: 'Status' },
          { key: 'requestedBy', label: 'Requested By' },
          { key: 'date', label: 'Date', sortable: true },
          { key: 'actions', label: 'Actions' },
        ],
        data: requestRows.filter((r) => r._status !== 'Fulfilled'),
      },
      {
        id: 'fulfilled',
        label: `Fulfilled (${requests.filter((r) => r.status === 'Fulfilled').length})`,
        columns: [
          { key: 'barcode', label: 'Device', sortable: true },
          { key: 'model', label: 'Model' },
          { key: 'spare', label: 'Spare Part' },
          { key: 'qty', label: 'Qty', align: 'center' as const },
          { key: 'status', label: 'Status' },
          { key: 'date', label: 'Requested', sortable: true },
        ],
        data: requestRows.filter((r) => r._status === 'Fulfilled'),
      },
    ],
    [requests, requestRows],
  )

  const requestCellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'status') {
        const status = value as SpareRequestStatus
        return {
          display: <StatusBadge variant={STATUS_VARIANT[status]}>{status}</StatusBadge>,
        }
      }
      if (key === 'actions') {
        const status = row._status as SpareRequestStatus
        const id = row.id as string
        return {
          display: (
            <div className="flex gap-1">
              {status === 'Requested' && (
                <Button size="xs" variant="outline" onClick={() => handleMarkInStock(id)}>
                  Mark In Stock
                </Button>
              )}
              {(status === 'In Stock' || status === 'Requested') && (
                <Button size="xs" onClick={() => handleFulfill(id)}>
                  Fulfill
                </Button>
              )}
            </div>
          ),
        }
      }
      return null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Spare Inventory tabs
  const inventoryRows = useMemo(
    () =>
      inventory.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        sku: s.sku,
        inStock: s.inStock,
        reorderLevel: s.reorderLevel,
        unitPrice: `₹${s.unitPrice.toLocaleString('en-IN')}`,
        lastRestocked: formatDate(s.lastRestocked),
        _lowStock: s.inStock <= s.reorderLevel,
      })),
    [inventory],
  )

  const inventoryTabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'all',
        label: `All Spares (${inventory.length})`,
        columns: [
          { key: 'name', label: 'Spare Part', sortable: true },
          { key: 'category', label: 'Category', sortable: true },
          { key: 'sku', label: 'SKU' },
          { key: 'inStock', label: 'In Stock', sortable: true, align: 'center' as const },
          { key: 'reorderLevel', label: 'Reorder Level', align: 'center' as const },
          { key: 'unitPrice', label: 'Unit Price', sortable: true },
          { key: 'lastRestocked', label: 'Last Restocked', sortable: true },
        ],
        data: inventoryRows,
      },
      {
        id: 'low',
        label: `Low Stock (${inventoryRows.filter((r) => r._lowStock).length})`,
        columns: [
          { key: 'name', label: 'Spare Part', sortable: true },
          { key: 'category', label: 'Category' },
          { key: 'inStock', label: 'In Stock', align: 'center' as const },
          { key: 'reorderLevel', label: 'Reorder Level', align: 'center' as const },
          { key: 'unitPrice', label: 'Unit Price' },
        ],
        data: inventoryRows.filter((r) => r._lowStock),
      },
    ],
    [inventory, inventoryRows],
  )

  const inventoryCellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'inStock') {
        const lowStock = row._lowStock as boolean
        return {
          display: (
            <span className={lowStock ? 'text-destructive font-semibold' : 'font-medium'}>
              {String(value)}
            </span>
          ),
          className: lowStock ? 'bg-destructive/10' : undefined,
        }
      }
      return null
    },
    [],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Spares</h1>
        <p className="text-sm text-muted-foreground">
          Manage spare part requests from inspections and spare inventory.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <Clock className="size-3.5" /> Requested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#f6c000]">{summaryStats.totalRequested}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <Package className="size-3.5" /> In Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{summaryStats.inStock}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <ShoppingCart className="size-3.5" /> Ordered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summaryStats.ordered}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" /> Fulfilled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{summaryStats.fulfilled}</p>
          </CardContent>
        </Card>
      </div>

      {/* Spare Requests */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Spare Requests</h2>
        <BusinessMetricsTable tabs={requestTabs} cellFormatter={requestCellFormatter} />
      </div>

      {/* Spare Shop / Inventory */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Spare Shop (Inventory)</h2>
          <Button variant="outline" onClick={() => setAddStockDialog(true)}>
            Add Stock
          </Button>
        </div>
        <BusinessMetricsTable tabs={inventoryTabs} cellFormatter={inventoryCellFormatter} />
      </div>

      {/* Add Stock Dialog */}
      <Dialog open={addStockDialog} onOpenChange={setAddStockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Spare Part</Label>
              <Select value={selectedSpare} onValueChange={setSelectedSpare}>
                <SelectTrigger>
                  <SelectValue placeholder="Select spare..." />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} (Current: {s.inStock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity to Add</Label>
              <Input
                type="number"
                min={1}
                value={addQty || ''}
                onChange={(e) => setAddQty(parseInt(e.target.value) || 0)}
                placeholder="Enter quantity..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStockDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedSpare || addQty <= 0) {
                  toast.error('Please select a spare and enter a valid quantity.')
                  return
                }
                const spare = inventory.find((s) => s.id === selectedSpare)
                toast.success(`Added ${addQty} units of "${spare?.name}" to stock.`)
                setAddStockDialog(false)
                setSelectedSpare('')
                setAddQty(0)
              }}
            >
              Add Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SparesPage
