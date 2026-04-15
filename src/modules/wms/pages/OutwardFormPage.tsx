import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import type { OutwardType } from '../types'
import { mockDevices } from '../data/devices'
import { mockOutwardRecords } from '../data/outward'

const TYPE_OPTIONS: { value: OutwardType; label: string }[] = [
  { value: 'SALES', label: 'Sales' },
  { value: 'RENTAL', label: 'Rental' },
  { value: 'DEMO', label: 'Demo' },
  { value: 'INTERNAL_TRANSFER', label: 'Internal Transfer' },
  { value: 'RETURN_REPLACEMENT', label: 'Return / Replacement' },
]

const STORE_MANAGERS = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel']
const PACKAGING_TYPES = ['Box', 'Pallet', 'Crate']

export default function OutwardFormPage() {
  const [type, setType] = useState<OutwardType>('SALES')
  const [salesOrderNumber, setSalesOrderNumber] = useState('')
  const [rentalContractId, setRentalContractId] = useState('')
  const [demoRequestId, setDemoRequestId] = useState('')
  const [expectedDispatchDate, setExpectedDispatchDate] = useState('')
  const [storeManager, setStoreManager] = useState(STORE_MANAGERS[0]!)

  const [customerName, setCustomerName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')

  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set())
  const [brandFilter, setBrandFilter] = useState<string>('')
  const [gradeFilter, setGradeFilter] = useState<string>('')

  const [vehicleNumber, setVehicleNumber] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [transporterName, setTransporterName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [challanNumber, setChallanNumber] = useState('')
  const [packagingType, setPackagingType] = useState('')
  const [totalWeight, setTotalWeight] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')

  const [notes, setNotes] = useState('')

  const nextOutwardNumber = useMemo(() => {
    const maxNum = mockOutwardRecords.reduce((max, r) => {
      const num = parseInt(r.outwardNumber.split('-').pop() ?? '0', 10)
      return num > max ? num : max
    }, 0)
    return `OUT-2026-${String(maxNum + 1).padStart(3, '0')}`
  }, [])

  const eligibleDevices = useMemo(
    () =>
      mockDevices.filter(
        (d) => d.status === 'READY_FOR_DISPATCH' || d.status === 'IN_STOCK'
      ),
    []
  )

  const brands = useMemo(
    () => [...new Set(eligibleDevices.map((d) => d.brand))],
    [eligibleDevices]
  )

  const filteredDevices = useMemo(() => {
    return eligibleDevices.filter((d) => {
      if (brandFilter && d.brand !== brandFilter) return false
      if (gradeFilter && (d.grade ?? '') !== gradeFilter) return false
      return true
    })
  }, [eligibleDevices, brandFilter, gradeFilter])

  const toggleDevice = (deviceId: string) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev)
      if (next.has(deviceId)) {
        next.delete(deviceId)
      } else {
        next.add(deviceId)
      }
      return next
    })
  }

  const handleSaveDraft = () => {
    toast.success(`Dispatch ${nextOutwardNumber} saved as draft.`)
  }

  const handleSubmit = () => {
    if (!customerName) {
      toast.error('Please enter customer name.')
      return
    }
    if (selectedDeviceIds.size === 0) {
      toast.error('Please select at least one device.')
      return
    }
    toast.success(`Dispatch ${nextOutwardNumber} submitted for approval.`)
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Create Dispatch Request
      </h1>

      {/* Section 1: Dispatch Info */}
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Outward Number</Label>
              <Input value={nextOutwardNumber} readOnly className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => { if (v) setType(v as OutwardType) }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === 'SALES' && (
              <div className="space-y-2">
                <Label>Sales Order #</Label>
                <Input
                  value={salesOrderNumber}
                  onChange={(e) => setSalesOrderNumber(e.target.value)}
                  placeholder="SO-2026-XXX"
                />
              </div>
            )}

            {type === 'RENTAL' && (
              <div className="space-y-2">
                <Label>Rental Contract #</Label>
                <Input
                  value={rentalContractId}
                  onChange={(e) => setRentalContractId(e.target.value)}
                  placeholder="RC-XXX"
                />
              </div>
            )}

            {type === 'DEMO' && (
              <div className="space-y-2">
                <Label>Demo Request ID</Label>
                <Input
                  value={demoRequestId}
                  onChange={(e) => setDemoRequestId(e.target.value)}
                  placeholder="DEMO-XXX"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Expected Dispatch Date</Label>
              <Input
                type="date"
                value={expectedDispatchDate}
                onChange={(e) => setExpectedDispatchDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Store Manager</Label>
              <Select
                value={storeManager}
                onValueChange={(v) => { if (v) setStoreManager(v) }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORE_MANAGERS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Customer / Destination */}
      <Card>
        <CardHeader>
          <CardTitle>Customer / Destination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>

            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Enter contact person"
              />
            </div>

            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Shipping Address</Label>
              <Textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter shipping address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Device Selection */}
      <Card>
        <CardHeader>
          <CardTitle>
            Select Devices ({selectedDeviceIds.size} selected)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Brand</Label>
              <Select
                value={brandFilter}
                onValueChange={(v) => setBrandFilter(!v || v === 'all' ? '' : v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Grade</Label>
              <Select
                value={gradeFilter}
                onValueChange={(v) => setGradeFilter(!v || v === 'all' ? '' : v)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="All grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grades</SelectItem>
                  <SelectItem value="A">Grade A</SelectItem>
                  <SelectItem value="B">Grade B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Barcode</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Serial #</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDeviceIds.has(d.id)}
                        onCheckedChange={() => toggleDevice(d.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{d.barcode}</TableCell>
                    <TableCell>{d.model}</TableCell>
                    <TableCell>{d.brand}</TableCell>
                    <TableCell>{d.grade ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.serialNumber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.location}</TableCell>
                  </TableRow>
                ))}
                {filteredDevices.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No devices available for dispatch
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Logistics / Delivery */}
      <Card>
        <CardHeader>
          <CardTitle>Logistics / Delivery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Vehicle Number</Label>
              <Input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="MH-XX-XX-XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Enter driver name"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Phone</Label>
              <Input
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Transporter Name</Label>
              <Input
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                placeholder="Enter transporter"
              />
            </div>
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>
            <div className="space-y-2">
              <Label>Challan / DC Number</Label>
              <Input
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="DC-2026-XXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Packaging Type</Label>
              <Select
                value={packagingType}
                onValueChange={(v) => setPackagingType(v ?? '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGING_TYPES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total Weight (kg)</Label>
              <Input
                type="number"
                value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Special Instructions</Label>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special handling or delivery instructions..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
          />
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" render={<Link to="/wms/outward" />}>
          Cancel
        </Button>
        <Button variant="outline" onClick={handleSaveDraft}>
          Save Draft
        </Button>
        <Button onClick={handleSubmit} disabled={selectedDeviceIds.size === 0 || !customerName}>
          Submit for Approval
        </Button>
      </div>
    </div>
  )
}
