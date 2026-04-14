import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

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
  { value: 'RETURN_REPLACEMENT', label: 'Return / Replacement' },
]

export default function OutwardFormPage() {
  const [type, setType] = useState<OutwardType>('SALES')
  const [customerName, setCustomerName] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set())

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

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Create Dispatch
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Dispatch Details</CardTitle>
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

            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
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

      {/* Device Selection */}
      <Card>
        <CardHeader>
          <CardTitle>
            Select Devices ({selectedDeviceIds.size} selected)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Barcode</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eligibleDevices.map((d) => (
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
                  </TableRow>
                ))}
                {eligibleDevices.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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

      {/* Footer */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" render={<Link to="/wms/outward" />}>
          Cancel
        </Button>
        <Button disabled={selectedDeviceIds.size === 0 || !customerName}>
          Create Dispatch
        </Button>
      </div>
    </div>
  )
}
