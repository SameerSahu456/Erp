import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Package, CheckCircle2, Clock, ShoppingCart } from 'lucide-react'

import { mockDevices } from '../data/devices'
import {
  mockSpareRequests,
  type SpareRequest,
  type SpareRequestStatus,
} from '../data/spare-requests'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { PageHeader } from '@/components/page'
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
  const navigate = useNavigate()
  const [requests, setRequests] = useState<SpareRequest[]>(mockSpareRequests)
  const [inventory] = useState<SpareInventory[]>(mockSpareInventory)
  const [addStockDialog, setAddStockDialog] = useState(false)
  const [selectedSpare, setSelectedSpare] = useState('')
  const [addQty, setAddQty] = useState(0)
  const [fulfillRequestId, setFulfillRequestId] = useState<string | null>(null)
  const [fulfillNotes, setFulfillNotes] = useState('')

  const summaryStats = useMemo(() => ({
    totalRequested: requests.filter((r) => r.status === 'Requested').length,
    inStock: requests.filter((r) => r.status === 'In Stock').length,
    ordered: requests.filter((r) => r.status === 'Ordered').length,
    fulfilled: requests.filter((r) => r.status === 'Fulfilled').length,
  }), [requests])

  const openFulfillDialog = (id: string) => {
    setFulfillRequestId(id)
    setFulfillNotes('')
  }

  const closeFulfillDialog = () => {
    setFulfillRequestId(null)
    setFulfillNotes('')
  }

  const submitFulfill = () => {
    if (!fulfillRequestId) return
    const req = requests.find((r) => r.id === fulfillRequestId)
    if (!req) return
    setRequests((prev) =>
      prev.map((r) =>
        r.id === fulfillRequestId
          ? { ...r, status: 'Fulfilled' as const, fulfilledAt: new Date().toISOString() }
          : r,
      ),
    )
    // Mirror into device so the repair/device view reflects "Issued"
    const device = mockDevices.find((d) => d.id === req.deviceId)
    if (device) device.sparesIssued = true
    toast.success(`Spare "${req.spareName}" issued for ${req.deviceBarcode}`)
    closeFulfillDialog()
  }

  const fulfillTarget = useMemo(
    () => requests.find((r) => r.id === fulfillRequestId) ?? null,
    [fulfillRequestId, requests],
  )

  // Spare Requests tabs
  const requestRows = useMemo(
    () =>
      requests.map((r) => {
        const device = mockDevices.find((d) => d.id === r.deviceId)
        return {
          id: r.id,
          _deviceId: r.deviceId,
          barcode: r.deviceBarcode,
          partSerial: `${r.model}\n${device?.serialNumber ?? '-'}`,
          biosNo: device?.biosNo ?? '-',
          category: device?.category ?? '-',
          spare: r.spareName,
          qty: r.qty,
          status: r.status,
          requestedBy: r.requestedBy,
          date: formatDate(r.requestedAt),
          _status: r.status,
        }
      }),
    [requests],
  )

  const requestTabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'pending',
        label: `Pending (${requests.filter((r) => r.status !== 'Fulfilled').length})`,
        columns: [
          { key: 'barcode', label: 'Device', sortable: true },
          { key: 'partSerial', label: 'Part No / Serial No', sortable: true },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'category', label: 'Category', sortable: true },
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
          { key: 'partSerial', label: 'Part No / Serial No' },
          { key: 'biosNo', label: 'BIOS No', sortable: true },
          { key: 'category', label: 'Category', sortable: true },
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
      if (key === 'barcode') {
        return { display: <span className="font-medium">{String(value)}</span> }
      }
      if (key === 'partSerial') {
        const [part, serial] = String(value).split('\n')
        return {
          display: (
            <div className="flex flex-col leading-tight">
              <span className="font-medium">{part}</span>
              <span className="text-xs text-muted-foreground">S/N: {serial}</span>
            </div>
          ),
        }
      }
      if (key === 'status') {
        const status = value as SpareRequestStatus
        return {
          display: <StatusBadge variant={STATUS_VARIANT[status]}>{status}</StatusBadge>,
        }
      }
      if (key === 'actions') {
        const status = row._status as SpareRequestStatus
        const id = row.id as string
        if (status === 'Fulfilled') {
          return { display: <span className="text-xs text-muted-foreground">—</span> }
        }
        return {
          display: (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => openFulfillDialog(id)}
                className="text-sm font-medium wms-link"
              >
                Fulfill
              </button>
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
          { key: 'sku', label: 'Part no' },
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
      <PageHeader
        title="Spares"
        subtitle="Spare part requests from inspections and spare-shop inventory."
        breadcrumbs={[{ label: 'WMS' }, { label: 'Spares' }]}
      />

      <StatsRow
        stats={[
          { label: 'Requested', value: summaryStats.totalRequested, icon: Clock },
          { label: 'In Stock', value: summaryStats.inStock, icon: Package },
          { label: 'Ordered', value: summaryStats.ordered, icon: ShoppingCart },
          { label: 'Fulfilled', value: summaryStats.fulfilled, icon: CheckCircle2 },
        ]}
      />

      {/* Spare Requests */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Spare Requests</h2>
        <BusinessMetricsTable
          tabs={requestTabs}
          cellFormatter={requestCellFormatter}
          persistKey="wms-spares-req"
          onRowClick={(row) => navigate(`/wms/devices/${row._deviceId}?from=spares`)}
          emptyState={{
            title: 'No open spare requests',
            description: 'Spare requests raised during inspection or repair will appear here.',
          }}
        />
      </section>

      {/* Spare Shop / Inventory */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Spare Shop (Inventory)</h2>
          <Button variant="outline" onClick={() => setAddStockDialog(true)}>
            Add Stock
          </Button>
        </div>
        <BusinessMetricsTable
          tabs={inventoryTabs}
          cellFormatter={inventoryCellFormatter}
          persistKey="wms-spares-inv"
          emptyState={{
            title: 'No spares in stock',
            description: 'Add stock to populate the spare-shop inventory.',
            action: { label: 'Add Stock', onClick: () => setAddStockDialog(true) },
          }}
        />
      </section>

      {/* Fulfill Dialog */}
      <Dialog open={fulfillRequestId !== null} onOpenChange={(open) => { if (!open) closeFulfillDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fulfill Spare Request</DialogTitle>
          </DialogHeader>
          {fulfillTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Device</p>
                  <p className="font-medium">{fulfillTarget.deviceBarcode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-medium">{fulfillTarget.model}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Spare</p>
                  <p className="font-medium">{fulfillTarget.spareName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Qty</p>
                  <p className="font-medium">{fulfillTarget.qty}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fulfill-notes">Notes</Label>
                <Textarea
                  id="fulfill-notes"
                  value={fulfillNotes}
                  onChange={(e) => setFulfillNotes(e.target.value)}
                  placeholder="Add any notes about this fulfillment…"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeFulfillDialog}>Cancel</Button>
            <Button onClick={submitFulfill}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
