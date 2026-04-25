import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Warehouse, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { mockWarehouses } from '../data/warehouses'
import type { Device } from '../types'

export interface RackAssignment {
  warehouse: string
  row: string
  rack: string
  bin: string
}

export interface RackPickerSubject {
  title: string
  subtitle?: string
  badge?: string
}

interface AssignRackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  device?: Device | null
  // Alternative to `device` — render the dialog with a generic subject (e.g. a BOM component).
  subject?: RackPickerSubject
  // Forces the warehouse/row/rack/bin selections to reset when this key changes.
  resetKey?: string
  onAssigned?: (assignment: RackAssignment) => void
}

export function AssignRackDialog({
  open,
  onOpenChange,
  device,
  subject,
  resetKey,
  onAssigned,
}: AssignRackDialogProps) {
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [selectedRow, setSelectedRow] = useState('')
  const [selectedRack, setSelectedRack] = useState('')
  const [selectedBin, setSelectedBin] = useState('')

  const subjectKey = resetKey ?? device?.id

  useEffect(() => {
    if (open) {
      setSelectedWarehouse('')
      setSelectedRow('')
      setSelectedRack('')
      setSelectedBin('')
    }
  }, [open, subjectKey])

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

  const handleSubmit = () => {
    if (!selectedWarehouse || !selectedRow || !selectedRack || !selectedBin) {
      toast.error('Please select warehouse, row, rack, and bin.')
      return
    }
    const wh = mockWarehouses.find((w) => w.id === selectedWarehouse)
    const row = wh?.rows.find((r) => r.id === selectedRow)
    const rk = row?.racks.find((r) => r.id === selectedRack)
    const bn = rk?.bins.find((b) => b.id === selectedBin)
    const assignment: RackAssignment = {
      warehouse: wh?.name ?? '',
      row: row?.name ?? '',
      rack: rk?.name ?? '',
      bin: bn?.name ?? '',
    }
    const location = `${row?.name}-${rk?.name}-${bn?.name}`
    const subjectLabel = subject?.title ?? device?.barcode ?? 'Item'
    onAssigned?.(assignment)
    toast.success(`${subjectLabel} assigned to ${location} at ${wh?.name}`)
    onOpenChange(false)
  }

  const selectedBinObj = useMemo(
    () => rack?.bins.find((b) => b.id === selectedBin),
    [rack, selectedBin],
  )

  const isComplete = !!(selectedWarehouse && selectedRow && rack && selectedBin)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl overflow-hidden p-0 gap-0">
        <DialogHeader className="border-b px-5 py-3.5 pr-12">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4 text-primary" />
            Assign Rack
          </DialogTitle>
          {(subject || device) && (
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="min-w-0 truncate font-medium">
                {subject?.title ?? device?.barcode}
              </span>
              <span className="min-w-0 truncate text-muted-foreground">
                {subject
                  ? subject.subtitle
                  : `${device?.brand ?? ''} ${device?.model ?? ''}`.trim()}
              </span>
              {(subject?.badge || device?.grade) && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {subject?.badge ?? `Grade ${device?.grade}`}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedWarehouse}
                onValueChange={(val) => {
                  if (!val) return
                  setSelectedWarehouse(val)
                  setSelectedRow('')
                  setSelectedRack('')
                  setSelectedBin('')
                }}
              >
                <SelectTrigger className="h-11 text-[15px]">
                  <SelectValue placeholder="Select warehouse…" />
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

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Row <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedRow}
                onValueChange={(val) => {
                  if (!val) return
                  setSelectedRow(val)
                  setSelectedRack('')
                  setSelectedBin('')
                }}
                disabled={!warehouse}
              >
                <SelectTrigger className="h-11 text-[15px]">
                  <SelectValue placeholder={warehouse ? 'Select row…' : 'Pick warehouse first'} />
                </SelectTrigger>
                <SelectContent>
                  {warehouse?.rows.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Rack <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedRack}
                onValueChange={(val) => {
                  if (!val) return
                  setSelectedRack(val)
                  setSelectedBin('')
                }}
                disabled={!warehouseRow}
              >
                <SelectTrigger className="h-11 text-[15px]">
                  <SelectValue placeholder={warehouseRow ? 'Select rack…' : 'Pick row first'} />
                </SelectTrigger>
                <SelectContent>
                  {warehouseRow?.racks.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · {r.capacityUsed}% used
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Bin <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedBin}
                onValueChange={(val) => { if (val) setSelectedBin(val) }}
                disabled={!rack}
              >
                <SelectTrigger className="h-11 text-[15px]">
                  <SelectValue placeholder={rack ? 'Select bin…' : 'Pick rack first'} />
                </SelectTrigger>
                <SelectContent>
                  {rack?.bins
                    .filter((b) => b.status !== 'Full')
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} · {b.itemCount}/{b.maxItems}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live location preview */}
          <div className="rounded-md border bg-muted/40 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Warehouse className="size-3.5" />
              <span>Selected location</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm font-medium">
              {isComplete ? (
                <>
                  <span className="truncate">{warehouse?.name}</span>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{warehouseRow?.name}</span>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{rack?.name}</span>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-primary">{selectedBinObj?.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Pick warehouse → row → rack → bin</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="m-0 rounded-b-xl border-t bg-muted/40 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isComplete}>
            <MapPin className="size-4" />
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
