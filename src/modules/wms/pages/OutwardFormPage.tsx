import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Clock,
  Monitor,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  X,
  type LucideIcon,
} from 'lucide-react'

import { useNavigateBack } from '@/hooks/use-navigate-back'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/page'
import { Checkbox } from '@/components/ui/checkbox'
import { BarcodeText } from '@/components/common/BarcodeText'
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OutwardType, VariantCondition } from '../types'
import { mockDevices } from '../data/devices'
import { mockOutwardRecords } from '../data/outward'
import { mockReplacementRequests } from '../data/replacement-requests'
import { salesOrders } from '@/modules/crm/data/sales-orders'
import { demoRequests } from '@/modules/crm/data/demo-requests'
import { mockCustomerRegistrations } from '@/modules/customers/data/customers'

const TYPE_OPTIONS: {
  value: OutwardType
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    value: 'SALES',
    label: 'Sales',
    description: 'Ship against a Sales Order',
    icon: ShoppingCart,
  },
  {
    value: 'RENTAL',
    label: 'Rental',
    description: 'Ship against a rental order',
    icon: Clock,
  },
  {
    value: 'DEMO',
    label: 'Demo',
    description: 'Send device for demonstration',
    icon: Monitor,
  },
  {
    value: 'INTERNAL_TRANSFER',
    label: 'Internal Transfer',
    description: 'Issue to an employee',
    icon: ArrowLeftRight,
  },
  {
    value: 'RETURN_REPLACEMENT',
    label: 'Replacement',
    description: 'Replace a dispatched device',
    icon: RotateCcw,
  },
]


// One row per source line item (SO line / Demo item). Mirrors the compact
// editor layout used by DispatchFormPage so SALES + DEMO outwards can show
// auto-populated lines instead of a manual device picker.
interface PlannedLine {
  id: string
  partId: string
  partName: string
  partSku: string
  variantId?: string
  variantSku?: string
  condition: VariantCondition
  brand?: string
  qty: number
}

let _planLineCounter = 0
function nextPlanLineId(): string {
  _planLineCounter += 1
  return `PL-${Date.now()}-${_planLineCounter}`
}

function buildLinesFromSO(salesOrderNumber: string): PlannedLine[] {
  const so = salesOrders.find((o) => o.orderNumber === salesOrderNumber)
  if (!so) return []
  return so.lineItems.map((li) => ({
    id: nextPlanLineId(),
    partId: li.partId,
    partName: li.partName,
    partSku: li.partSku,
    variantId: li.variantId,
    variantSku: li.variantSku,
    condition: li.condition,
    brand: li.brand,
    qty: li.qty,
  }))
}

function buildLinesFromDemo(demoRequestId: string): PlannedLine[] {
  const dr = demoRequests.find((d) => d.id === demoRequestId)
  if (!dr) return []
  return dr.items.map((li) => ({
    id: nextPlanLineId(),
    partId: li.partId,
    partName: li.partName,
    partSku: li.partSku,
    variantId: li.variantId,
    variantSku: li.variantSku,
    condition: li.condition,
    brand: li.brand,
    qty: li.qty,
  }))
}

// SOs don't carry contact info directly, so fuzzy-match accountName against
// mockCustomerRegistrations to surface a primary contact + billing address.
function findCustomerByAccount(accountName?: string) {
  if (!accountName) return undefined
  const norm = accountName.toLowerCase().replace(/\s+(ltd|limited|pvt|private)\.?$/i, '').trim()
  return mockCustomerRegistrations.find((c) => {
    const cn = c.companyName.toLowerCase()
    return cn === accountName.toLowerCase() || cn.startsWith(norm) || norm.startsWith(cn)
  })
}

function SectionHeader({
  step,
  title,
  description,
  trailing,
}: {
  step: number
  title: string
  description: string
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {step}
        </span>
        <div className="min-w-0">
          <CardTitle className="text-[15px] leading-tight">{title}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {trailing}
    </div>
  )
}

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode
  required?: boolean
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

export default function OutwardFormPage() {
  const goBack = useNavigateBack('/wms/outward')
  const [type, setType] = useState<OutwardType>('SALES')
  const [salesOrderNumber, setSalesOrderNumber] = useState('')
  const [rentalSalesOrderNumber, setRentalSalesOrderNumber] = useState('')
  const [demoRequestId, setDemoRequestId] = useState('')
  const [expectedDispatchDate, setExpectedDispatchDate] = useState('')

  // Auto-populated source lines for SALES / DEMO. Replaces the device-picker
  // grid for these source-driven types.
  const [lines, setLines] = useState<PlannedLine[]>([])

  // Internal transfer fields
  const [employeeName, setEmployeeName] = useState('')
  const [employeeEmail, setEmployeeEmail] = useState('')

  // Replacement fields
  const [replacementRequestId, setReplacementRequestId] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')

  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set())
  const [deviceSearch, setDeviceSearch] = useState('')

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

  const filteredDevices = useMemo(() => {
    const q = deviceSearch.trim().toLowerCase()
    if (!q) return eligibleDevices
    return eligibleDevices.filter((d) =>
      [d.barcode, d.serialNumber, d.model, d.brand, d.location, d.rackLocation, d.grade]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(q)),
    )
  }, [eligibleDevices, deviceSearch])

  const handleTypeChange = (next: OutwardType) => {
    if (next === type) return
    setType(next)
    // Reset source-driven state so each type picks start clean.
    setSalesOrderNumber('')
    setRentalSalesOrderNumber('')
    setDemoRequestId('')
    setReplacementRequestId('')
    setLines([])
    setSelectedDeviceIds(new Set())
  }

  const handleSOChange = (val: string) => {
    setSalesOrderNumber(val)
    if (!val) {
      setLines([])
      return
    }
    const so = salesOrders.find((o) => o.orderNumber === val)
    setLines(buildLinesFromSO(val))
    if (so) {
      // Auto-fill customer info from the SO unless the user has already typed.
      if (!customerName) setCustomerName(so.accountName)
      const cust = findCustomerByAccount(so.accountName)
      const primary = cust?.contacts?.find((c) => c.isPrimary) ?? cust?.contacts?.[0]
      if (primary && !contactPerson) setContactPerson(primary.name)
      if (primary && !contactPhone) setContactPhone(primary.phone ?? '')
      if (cust && !shippingAddress) {
        const addr = [cust.billingAddress, cust.billingCity, cust.billingState, cust.billingPincode]
          .filter(Boolean)
          .join(', ')
        setShippingAddress(addr)
      }
    }
  }

  const handleDemoChange = (val: string) => {
    setDemoRequestId(val)
    if (!val) {
      setLines([])
      return
    }
    const dr = demoRequests.find((d) => d.id === val)
    setLines(buildLinesFromDemo(val))
    if (dr) {
      if (!customerName) setCustomerName(dr.accountName)
      if (!contactPerson) setContactPerson(dr.contactName)
      if (!contactPhone) setContactPhone(dr.contactPhone)
      if (!shippingAddress) setShippingAddress(dr.shippingAddress)
    }
  }

  const updateLineQty = (id: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty } : l)))
  }
  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

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

  const showSalesOrderField = type === 'SALES'
  const showRentalField = type === 'RENTAL'
  const showDemoField = type === 'DEMO'
  const showInternalTransferFields = type === 'INTERNAL_TRANSFER'
  const showReplacementFields = type === 'RETURN_REPLACEMENT'
  const showCustomerCard = type !== 'INTERNAL_TRANSFER'
  // Source-driven types (SALES, DEMO) use the auto-populated Line Items table.
  // Other ad-hoc types still use the manual device-picker grid.
  const showLineItemsCard = type === 'SALES' || type === 'DEMO'
  const showDeviceSelectionCard = !showReplacementFields && !showLineItemsCard

  const totalLineUnits = lines.reduce((n, l) => n + (l.qty || 0), 0)

  const missingPieces: string[] = []
  if (showCustomerCard && !customerName) missingPieces.push('Customer name')
  if (showInternalTransferFields && !employeeName) missingPieces.push('Employee name')
  if (showSalesOrderField && !salesOrderNumber) missingPieces.push('Sales Order')
  if (showRentalField && !rentalSalesOrderNumber) missingPieces.push('Rental Sales Order')
  if (showDemoField && !demoRequestId) missingPieces.push('Demo Request')
  if (showReplacementFields) {
    if (!replacementRequestId) missingPieces.push('Replacement Request')
  } else if (showLineItemsCard) {
    if (lines.length === 0 || totalLineUnits === 0) missingPieces.push('At least one line item')
  } else if (selectedDeviceIds.size === 0) {
    missingPieces.push('Select at least one device')
  }

  const canSubmit = missingPieces.length === 0

  const handleSaveDraft = () => {
    toast.success(`Dispatch ${nextOutwardNumber} saved as draft.`)
  }

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error(`Missing: ${missingPieces.join(', ')}`)
      return
    }
    toast.success(`Dispatch ${nextOutwardNumber} submitted.`)
  }

  // Compute section step numbers dynamically based on which cards are visible
  let step = 1
  const stepDispatchInfo = step++
  const stepCustomer = showCustomerCard ? step++ : null
  const stepLineItems = showLineItemsCard ? step++ : null
  const stepDeviceSelect = showDeviceSelectionCard ? step++ : null
  const stepNotes = step++

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Create Outward Request"
        subtitle="Fill each section below. Required fields are marked with an asterisk (*)."
        breadcrumbs={[
          { label: 'WMS' },
          { label: 'Outward', href: '/wms/outward' },
          { label: 'New Dispatch' },
        ]}
        backHref="/wms/outward"
        actions={
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Outward #
            </span>
            <span className="font-mono text-sm font-semibold">{nextOutwardNumber}</span>
          </div>
        }
      />

      {/* 1. Outward Info */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={stepDispatchInfo}
            title="Outward Info"
            description="Pick the outward type and its reference."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type — compact tile buttons */}
          <div className="space-y-2">
            <FieldLabel required>Type</FieldLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const selected = type === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTypeChange(opt.value)}
                    className={cn(
                      'relative flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40',
                    )}
                    aria-pressed={selected}
                  >
                    <div className="flex w-full items-center justify-between">
                      <Icon className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')} />
                      {selected && <Check className="size-3.5 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-[13px] font-semibold leading-tight', selected ? 'text-primary' : 'text-foreground')}>
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Type-specific reference */}
          <div className="rounded-lg border border-dashed bg-muted/20 p-3 space-y-3">
            {showSalesOrderField && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <div className="space-y-2 min-w-0">
                  <FieldLabel required>Sales Order</FieldLabel>
                  <Select
                    value={salesOrderNumber}
                    onValueChange={(v) => handleSOChange(v ?? '')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Sales Order…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {salesOrders.map((so) => (
                        <SelectItem key={so.id} value={so.orderNumber}>
                          <span className="flex w-full min-w-0 items-center gap-2">
                            <span className="font-mono text-[12px] shrink-0">{so.orderNumber}</span>
                            <span className="truncate text-muted-foreground">
                              {so.accountName}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel required>Expected Dispatch Date</FieldLabel>
                  <Input
                    type="date"
                    value={expectedDispatchDate}
                    onChange={(e) => setExpectedDispatchDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {showRentalField && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <div className="space-y-2 min-w-0">
                  <FieldLabel required>Sales Order (Rental)</FieldLabel>
                  <Select
                    value={rentalSalesOrderNumber}
                    onValueChange={(v) => setRentalSalesOrderNumber(v ?? '')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Sales Order…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {salesOrders.map((so) => (
                        <SelectItem key={so.id} value={so.orderNumber}>
                          <span className="flex w-full min-w-0 items-center gap-2">
                            <span className="font-mono text-[12px] shrink-0">{so.orderNumber}</span>
                            <span className="truncate text-muted-foreground">
                              {so.accountName}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel required>Expected Dispatch Date</FieldLabel>
                  <Input
                    type="date"
                    value={expectedDispatchDate}
                    onChange={(e) => setExpectedDispatchDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {showDemoField && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <div className="space-y-2 min-w-0">
                  <FieldLabel required>Demo Request</FieldLabel>
                  <Select
                    value={demoRequestId}
                    onValueChange={(v) => handleDemoChange(v ?? '')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Demo Request…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {demoRequests.map((dr) => (
                        <SelectItem key={dr.id} value={dr.id}>
                          <span className="flex w-full min-w-0 items-center gap-2">
                            <span className="font-mono text-[12px] shrink-0">{dr.demoNumber}</span>
                            <span className="truncate text-muted-foreground">
                              {dr.accountName}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel required>Expected Dispatch Date</FieldLabel>
                  <Input
                    type="date"
                    value={expectedDispatchDate}
                    onChange={(e) => setExpectedDispatchDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {showInternalTransferFields && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <FieldLabel required>Employee Name</FieldLabel>
                  <Input
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="e.g. Ravi Kumar"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Employee Email</FieldLabel>
                  <Input
                    type="email"
                    value={employeeEmail}
                    onChange={(e) => setEmployeeEmail(e.target.value)}
                    placeholder="name@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel required>Expected Dispatch Date</FieldLabel>
                  <Input
                    type="date"
                    value={expectedDispatchDate}
                    onChange={(e) => setExpectedDispatchDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {showReplacementFields && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <div className="space-y-2 min-w-0">
                  <FieldLabel required>Replacement Request</FieldLabel>
                  <Select
                    value={replacementRequestId || undefined}
                    onValueChange={(v) => setReplacementRequestId(v ?? '')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Replacement Request…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {mockReplacementRequests.map((rr) => (
                        <SelectItem key={rr.id} value={rr.id}>
                          <span className="flex w-full min-w-0 items-center gap-2">
                            <span className="font-mono text-[12px] shrink-0">{rr.requestNumber}</span>
                            <span className="truncate text-muted-foreground">
                              {rr.customer} · {rr.originalPartName}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel required>Expected Dispatch Date</FieldLabel>
                  <Input
                    type="date"
                    value={expectedDispatchDate}
                    onChange={(e) => setExpectedDispatchDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* 2. Customer / Destination — hidden for Internal Transfer */}
      {showCustomerCard && stepCustomer !== null && (
        <Card>
          <CardHeader>
            <SectionHeader
              step={stepCustomer}
              title="Customer / Destination"
              description="Where this dispatch is being sent."
            />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required>Customer Name</FieldLabel>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Contact Person</FieldLabel>
                <Input
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Enter contact person"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Contact Phone</FieldLabel>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <FieldLabel>Shipping Address</FieldLabel>
                <Textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Full shipping address, including landmarks and pincode"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Items (SALES + DEMO) — auto-populated from the selected source. */}
      {showLineItemsCard && stepLineItems !== null && (
        <Card>
          <CardHeader>
            <SectionHeader
              step={stepLineItems}
              title="Line Items"
              description={
                showSalesOrderField
                  ? 'Auto-populated from the Sales Order. Adjust qty if needed; lines you don’t ship can be removed.'
                  : 'Auto-populated from the Demo Request. Adjust qty if needed; lines you don’t ship can be removed.'
              }
              trailing={
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {lines.length} line{lines.length === 1 ? '' : 's'}
                  {totalLineUnits > 0 ? ` · ${totalLineUnits} unit${totalLineUnits === 1 ? '' : 's'}` : ''}
                </span>
              }
            />
          </CardHeader>
          <CardContent className="p-0 border-t">
            {lines.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {showSalesOrderField
                  ? 'Select a Sales Order above to auto-fill lines.'
                  : 'Select a Demo Request above to auto-fill lines.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Item</th>
                      <th className="w-24 px-3 py-2 text-right font-medium">Qty</th>
                      <th className="w-10 px-1 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium">{line.partName}</div>
                          {(line.variantSku || line.partSku) && (
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-mono">{line.variantSku || line.partSku}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {line.condition}
                              </Badge>
                              {line.brand && (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{line.brand}</span>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Input
                            type="number"
                            min={0}
                            className="h-8 w-20 ml-auto text-right text-xs"
                            value={line.qty}
                            onChange={(e) => updateLineQty(line.id, Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-1 py-2 align-top text-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeLine(line.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Select Devices — hidden for Replacement and for SALES/DEMO (auto-populated). */}
      {showDeviceSelectionCard && stepDeviceSelect !== null && (
        <Card>
          <CardHeader>
            <SectionHeader
              step={stepDeviceSelect}
              title="Select Devices"
              description="Pick which devices to include in this dispatch."
              trailing={
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    selectedDeviceIds.size > 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {selectedDeviceIds.size} selected
                </span>
              }
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="cpt-search-field">
              <Search className="size-[14px] opacity-60" />
              <input
                placeholder="Search by barcode, serial, model, brand, or location…"
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
              />
              {deviceSearch && (
                <button
                  type="button"
                  onClick={() => setDeviceSearch('')}
                  className="opacity-40 transition-opacity hover:opacity-70"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
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
                  {filteredDevices.map((d) => {
                    const isSelected = selectedDeviceIds.has(d.id)
                    return (
                      <TableRow
                        key={d.id}
                        onClick={() => toggleDevice(d.id)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isSelected && 'bg-primary/5 hover:bg-primary/10',
                        )}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleDevice(d.id)}
                          />
                        </TableCell>
                        <TableCell><BarcodeText>{d.barcode}</BarcodeText></TableCell>
                        <TableCell>{d.model}</TableCell>
                        <TableCell>{d.brand}</TableCell>
                        <TableCell>{d.grade ?? '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.serialNumber}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.rackLocation ?? d.location}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredDevices.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        {deviceSearch
                          ? `No devices match "${deviceSearch}".`
                          : 'No devices available for dispatch'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={stepNotes}
            title="Notes"
            description="Optional. Anything else the approver or driver should know."
          />
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes…"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Sticky footer */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 border-t bg-background/95 px-4 sm:px-6 py-3 backdrop-blur-sm">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {canSubmit ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" /> Ready to submit
              </span>
            ) : (
              <span>
                Still needed:{' '}
                <span className="font-medium text-foreground">{missingPieces.join(' · ')}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" render={<Link to="/wms/outward" />}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
