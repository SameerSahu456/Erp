import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
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
import { Label } from '@/components/ui/label'

import { mockDevices } from '../data/devices'
import { mockWarehouses } from '../data/warehouses'
import type { Device } from '../types'

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function handlePrintBarcode(barcode: string, model: string, serial: string) {
  const printWindow = window.open('', '_blank', 'width=400,height=300')
  if (!printWindow) {
    toast.error('Please allow popups to print barcodes.')
    return
  }
  printWindow.document.write(`
    <html>
      <head><title>Print Barcode</title></head>
      <body style="font-family: monospace; text-align: center; padding: 40px;">
        <div style="border: 2px solid #000; padding: 20px; display: inline-block;">
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${barcode}</div>
          <div style="font-size: 12px; margin-top: 8px; color: #555;">${model}</div>
          <div style="font-size: 11px; margin-top: 4px; color: #777;">S/N: ${serial}</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

function AssignToRackPage() {
  // QC-passed devices that need rack assignment (READY_FOR_STOCK status)
  const qcPassedDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'READY_FOR_STOCK' || (d.status === 'IN_STOCK' && !d.rackLocation)),
    [],
  )

  const assignedDevices = useMemo(
    () => mockDevices.filter((d) => d.status === 'IN_STOCK' && d.rackLocation),
    [],
  )

  const [rackAssignments, setRackAssignments] = useState<Record<string, { warehouse: string; row: string; rack: string; bin: string }>>({})
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedDeviceForAssign, setSelectedDeviceForAssign] = useState<Device | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [selectedRow, setSelectedRow] = useState('')
  const [selectedRack, setSelectedRack] = useState('')
  const [selectedBin, setSelectedBin] = useState('')

  const warehouse = useMemo(
    () => mockWarehouses.find((w) => w.id === selectedWarehouse),
    [selectedWarehouse],
  )

  const warehouseRow = useMemo(
    () => warehouse?.rows.find((r) => r.id === selectedRow),
    [warehouse, selectedRow],
  )

  const rack = useMemo(
    () => warehouseRow?.racks.find((r) => r.id === selectedRack),
    [warehouseRow, selectedRack],
  )

  const openAssignDialog = (device: Device) => {
    setSelectedDeviceForAssign(device)
    setSelectedWarehouse('')
    setSelectedRow('')
    setSelectedRack('')
    setSelectedBin('')
    setAssignDialogOpen(true)
  }

  const handleAssignRack = () => {
    if (!selectedDeviceForAssign || !selectedWarehouse || !selectedRow || !selectedRack || !selectedBin) {
      toast.error('Please select warehouse, row, rack, and bin.')
      return
    }
    const wh = mockWarehouses.find((w) => w.id === selectedWarehouse)
    const row = wh?.rows.find((r) => r.id === selectedRow)
    const rk = row?.racks.find((r) => r.id === selectedRack)
    const bn = rk?.bins.find((b) => b.id === selectedBin)

    const location = `${row?.name}-${rk?.name}-${bn?.name}`
    setRackAssignments((prev) => ({
      ...prev,
      [selectedDeviceForAssign.id]: {
        warehouse: wh?.name ?? '',
        row: row?.name ?? '',
        rack: rk?.name ?? '',
        bin: bn?.name ?? '',
      },
    }))
    toast.success(`${selectedDeviceForAssign.barcode} assigned to ${location} at ${wh?.name}`)
    setAssignDialogOpen(false)
  }

  const pendingRows = useMemo(
    () =>
      qcPassedDevices.map((d) => {
        const assignment = rackAssignments[d.id]
        return {
          id: d.id,
          barcode: d.barcode,
          model: d.model,
          brand: d.brand,
          serial: d.serialNumber,
          grade: d.grade ?? '-',
          qcDate: formatDate(d.qcPassedAt),
          rackAssigned: assignment
            ? `${assignment.warehouse} / ${assignment.row}-${assignment.rack}-${assignment.bin}`
            : '-',
          _hasAssignment: !!assignment,
        }
      }),
    [qcPassedDevices, rackAssignments],
  )

  const assignedRows = useMemo(
    () =>
      assignedDevices.map((d) => ({
        id: d.id,
        barcode: d.barcode,
        model: d.model,
        brand: d.brand,
        serial: d.serialNumber,
        grade: d.grade ?? '-',
        rack: d.rackLocation ?? '-',
        warehouse: d.warehouseName ?? '-',
      })),
    [assignedDevices],
  )

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'pending',
        label: `QC Passed - Unassigned (${pendingRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'model', label: 'Model', sortable: true },
          { key: 'brand', label: 'Brand', sortable: true },
          { key: 'grade', label: 'Grade', align: 'center' as const },
          { key: 'qcDate', label: 'QC Passed', sortable: true },
          { key: 'rackAssigned', label: 'Rack Assignment' },
          { key: 'actions', label: 'Actions' },
        ],
        data: pendingRows,
      },
      {
        id: 'assigned',
        label: `Already Assigned (${assignedRows.length})`,
        columns: [
          { key: 'barcode', label: 'Barcode', sortable: true },
          { key: 'model', label: 'Model', sortable: true },
          { key: 'brand', label: 'Brand' },
          { key: 'grade', label: 'Grade', align: 'center' as const },
          { key: 'warehouse', label: 'Warehouse' },
          { key: 'rack', label: 'Rack Location' },
        ],
        data: assignedRows,
      },
    ],
    [pendingRows, assignedRows],
  )

  const cellFormatter: CellFormatter = useCallback(
    (value, key, row) => {
      if (key === 'barcode') {
        return {
          display: (
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{String(value)}</span>
              <Button
                size="xs"
                variant="ghost"
                className="size-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const device = mockDevices.find((d) => d.id === row.id)
                  if (device) handlePrintBarcode(device.barcode, device.model, device.serialNumber)
                }}
                title="Print barcode"
              >
                <Printer className="size-3.5" />
              </Button>
            </div>
          ),
        }
      }
      if (key === 'rackAssigned') {
        const hasAssignment = row._hasAssignment as boolean
        if (hasAssignment) {
          return {
            display: <StatusBadge variant="success">{String(value)}</StatusBadge>,
          }
        }
        return {
          display: <span className="text-muted-foreground">Not assigned</span>,
        }
      }
      if (key === 'actions') {
        const hasAssignment = row._hasAssignment as boolean
        const deviceId = row.id as string
        return {
          display: (
            <Button
              size="xs"
              variant={hasAssignment ? 'outline' : 'default'}
              onClick={() => {
                const device = mockDevices.find((d) => d.id === deviceId)
                if (device) openAssignDialog(device)
              }}
            >
              {hasAssignment ? 'Reassign' : 'Assign Rack'}
            </Button>
          ),
        }
      }
      return null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cpt-page-title">Assign to Rack</h1>
        <p className="text-sm text-muted-foreground">
          Assign QC-passed devices to warehouse rack locations.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Awaiting Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#f6c000]">{qcPassedDevices.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Assigned This Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {Object.keys(rackAssignments).length}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Already in Rack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assignedDevices.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Device Table */}
      <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} persistKey="wms-assign-rack" />

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign Rack: {selectedDeviceForAssign?.barcode}
            </DialogTitle>
            {selectedDeviceForAssign && (
              <p className="text-sm text-muted-foreground">
                {selectedDeviceForAssign.brand} {selectedDeviceForAssign.model} — Grade {selectedDeviceForAssign.grade ?? 'N/A'}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select
                value={selectedWarehouse}
                onValueChange={(val) => {
                  setSelectedWarehouse(val)
                  setSelectedRow('')
                  setSelectedRack('')
                  setSelectedBin('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {mockWarehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {warehouse && (
              <div className="space-y-2">
                <Label>Row</Label>
                <Select
                  value={selectedRow}
                  onValueChange={(val) => {
                    setSelectedRow(val)
                    setSelectedRack('')
                    setSelectedBin('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select row..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouse.rows.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {warehouseRow && (
              <div className="space-y-2">
                <Label>Rack</Label>
                <Select
                  value={selectedRack}
                  onValueChange={(val) => {
                    setSelectedRack(val)
                    setSelectedBin('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rack..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseRow.racks.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.capacityUsed}% used)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {rack && (
              <div className="space-y-2">
                <Label>Bin</Label>
                <Select value={selectedBin} onValueChange={setSelectedBin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rack.bins
                      .filter((b) => b.status !== 'Full')
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.itemCount}/{b.maxItems} items)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignRack}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AssignToRackPage
