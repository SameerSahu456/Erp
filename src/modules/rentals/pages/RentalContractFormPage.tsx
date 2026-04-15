import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PermissionGate } from '@/components/common/PermissionGate'
import { mockCustomerRegistrations } from '@/modules/customers/data/customers'
import { mockDevices } from '@/modules/wms/data/devices'
import { mockRentalContracts } from '../data/contracts'

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`
}

const STANDARD_TERMS = `1. Devices remain the property of Comprint Technologies Pvt Ltd.
2. Customer is responsible for accidental damage beyond normal wear and tear.
3. Deposit will be refunded within 15 business days after device return and inspection.
4. Damage charges will be deducted from the deposit amount.
5. Late return attracts a penalty of 1.5x the daily rental rate per device per day.
6. Customer must notify 7 days in advance before returning devices.
7. Insurance coverage is included for manufacturing defects only.`

export default function RentalContractFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = id !== 'new' && id !== undefined
  const existing = isEdit ? mockRentalContracts.find((c) => c.id === id) : null

  // Form state
  const [customerId, setCustomerId] = useState(existing?.customerId ?? '')
  const [contactPerson, setContactPerson] = useState(existing?.contactPerson ?? '')
  const [contactPhone, setContactPhone] = useState(existing?.contactPhone ?? '')
  const [shippingAddressId, setShippingAddressId] = useState('')
  const [startDate, setStartDate] = useState(existing?.startDate ?? '')
  const [endDate, setEndDate] = useState(existing?.endDate ?? '')
  const [billingCycle, setBillingCycle] = useState<string>(existing?.billingCycle ?? 'Monthly')
  const [autoRenewal, setAutoRenewal] = useState(existing?.autoRenewal ?? false)
  const [perUnitRate, setPerUnitRate] = useState(existing?.perUnitRate?.toString() ?? '')
  const [depositAmount, setDepositAmount] = useState(existing?.depositAmount?.toString() ?? '')
  const [terms, setTerms] = useState(existing?.terms ?? STANDARD_TERMS)
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set())
  const [variantFilter, setVariantFilter] = useState<'all' | 'New Pool' | 'Refurbished'>('all')

  // Auto-fill customer info
  const selectedCustomer = mockCustomerRegistrations.find((c) => c.id === customerId)

  function handleCustomerChange(val: unknown) {
    const v = val as string
    setCustomerId(v)
    const cust = mockCustomerRegistrations.find((c) => c.id === v)
    if (cust) {
      const primary = cust.contacts.find((c) => c.isPrimary)
      setContactPerson(primary?.name ?? cust.contacts[0]?.name ?? '')
      setContactPhone(primary?.phone ?? cust.contacts[0]?.phone ?? '')
      const defaultAddr = cust.shippingAddresses.find((a) => a.isDefault)
      setShippingAddressId(defaultAddr?.id ?? cust.shippingAddresses[0]?.id ?? '')
    }
  }

  // Available devices from IMS (IN_STOCK or READY_FOR_DISPATCH)
  const availableDevices = useMemo(() => {
    return mockDevices.filter(
      (d) => d.status === 'IN_STOCK' || d.status === 'READY_FOR_DISPATCH',
    )
  }, [])

  const filteredDevices = useMemo(() => {
    if (variantFilter === 'all') return availableDevices
    // Devices don't have a variant field — we map grade to variant
    // Grade A = New Pool, Grade B = Refurbished
    if (variantFilter === 'New Pool') {
      return availableDevices.filter((d) => d.grade === 'A' || !d.grade)
    }
    return availableDevices.filter((d) => d.grade === 'B')
  }, [availableDevices, variantFilter])

  function toggleDevice(deviceId: string) {
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

  function toggleAll() {
    if (selectedDeviceIds.size === filteredDevices.length) {
      setSelectedDeviceIds(new Set())
    } else {
      setSelectedDeviceIds(new Set(filteredDevices.map((d) => d.id)))
    }
  }

  const rate = Number(perUnitRate) || 0
  const monthlyTotal = selectedDeviceIds.size * rate

  function handleSubmit(asDraft: boolean) {
    if (!customerId) {
      toast.error('Please select a customer')
      return
    }
    if (selectedDeviceIds.size === 0 && !isEdit) {
      toast.error('Please select at least one device')
      return
    }
    toast.success(
      asDraft
        ? 'Contract saved as draft'
        : isEdit
          ? 'Contract updated successfully'
          : 'Contract created successfully',
    )
    navigate('/rentals/contracts')
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit ${existing?.contractNumber ?? 'Contract'}` : 'Create Rental Contract'}
        backHref="/rentals/contracts"
      />

      {/* Section 1: Customer */}
      <Card>
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {mockCustomerRegistrations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shipping Address</Label>
              <Select value={shippingAddressId} onValueChange={(v) => setShippingAddressId(v as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select address" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedCustomer?.shippingAddresses ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label} - {a.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Rental Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Rental Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as string)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-3 pb-1">
              <div className="space-y-2">
                <Label>Auto-Renewal</Label>
                <Switch
                  checked={autoRenewal}
                  onCheckedChange={(val) => setAutoRenewal(val as boolean)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Per Unit Rate (\u20B9)</Label>
              <Input
                type="number"
                value={perUnitRate}
                onChange={(e) => setPerUnitRate(e.target.value)}
                placeholder="3500"
              />
            </div>
            <div className="space-y-2">
              <Label>Deposit Amount (\u20B9)</Label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="50000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Device Selection */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Device Selection</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Button
              variant={variantFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVariantFilter('all')}
            >
              All
            </Button>
            <Button
              variant={variantFilter === 'New Pool' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVariantFilter('New Pool')}
            >
              New Pool
            </Button>
            <PermissionGate role="TECHNICAL_TEAM" fallback={
              <Button variant="outline" size="sm" disabled title="Requires TECHNICAL_TEAM role">
                Refurbished
              </Button>
            }>
              <Button
                variant={variantFilter === 'Refurbished' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVariantFilter('Refurbished')}
              >
                Refurbished
              </Button>
            </PermissionGate>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedDeviceIds.size} device{selectedDeviceIds.size !== 1 ? 's' : ''} selected
              {rate > 0 && (
                <> &middot; Monthly Total: <span className="font-semibold text-foreground">{formatCurrency(monthlyTotal)}</span></>
              )}
            </p>
          </div>
          <div className="overflow-x-auto rounded-md border max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedDeviceIds.size === filteredDevices.length && filteredDevices.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Serial #</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No devices available for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDevices.map((d) => {
                    const variant = d.grade === 'B' ? 'Refurbished' : 'New Pool'
                    return (
                      <TableRow
                        key={d.id}
                        className={selectedDeviceIds.has(d.id) ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedDeviceIds.has(d.id)}
                            onCheckedChange={() => toggleDevice(d.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{d.barcode}</TableCell>
                        <TableCell>{d.model}</TableCell>
                        <TableCell>{d.brand}</TableCell>
                        <TableCell className="font-mono text-xs">{d.serialNumber}</TableCell>
                        <TableCell>{d.grade ?? '-'}</TableCell>
                        <TableCell>
                          <StatusBadge variant={variant === 'Refurbished' ? 'warning' : 'info'}>
                            {variant}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>{d.location}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Terms & Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={8}
          />
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button variant="outline" render={<Link to="/rentals/contracts" />}>
          Cancel
        </Button>
        <Button variant="outline" onClick={() => handleSubmit(true)}>
          Save Draft
        </Button>
        <Button onClick={() => handleSubmit(false)}>
          {isEdit ? 'Update Contract' : 'Create Contract'}
        </Button>
      </div>
    </div>
  )
}
