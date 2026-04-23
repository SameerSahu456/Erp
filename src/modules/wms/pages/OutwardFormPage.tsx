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
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'

import { useNavigateBack } from '@/hooks/use-navigate-back'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { cn } from '@/lib/utils'
import type { OutwardType } from '../types'
import { mockDevices } from '../data/devices'
import { mockOutwardRecords } from '../data/outward'
import { salesOrders } from '@/modules/crm/data/sales-orders'

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

type ReplacementOriginType = 'SALE' | 'RETURN'
type ReplacementSubType = 'NORMAL' | 'ADVANCE'

interface ReplacementPair {
  id: string
  againstDeviceId: string
  replacementDeviceId: string
}

function newPairId() {
  return `pair-${Math.random().toString(36).slice(2, 9)}`
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
  const [expectedDispatchDate, setExpectedDispatchDate] = useState('')

  // Internal transfer fields
  const [employeeName, setEmployeeName] = useState('')
  const [employeeEmail, setEmployeeEmail] = useState('')

  // Replacement fields — no default selection, user must pick
  const [replacementOrigin, setReplacementOrigin] = useState<ReplacementOriginType | ''>('')
  const [replacementSubType, setReplacementSubType] = useState<ReplacementSubType | ''>('')
  const [replacementPairs, setReplacementPairs] = useState<ReplacementPair[]>([
    { id: newPairId(), againstDeviceId: '', replacementDeviceId: '' },
  ])

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

  const replacementCandidates = useMemo(
    () => mockDevices.filter((d) => d.status === 'DISPATCHED'),
    [],
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

  const updatePair = (pairId: string, patch: Partial<ReplacementPair>) => {
    setReplacementPairs((prev) =>
      prev.map((p) => (p.id === pairId ? { ...p, ...patch } : p)),
    )
  }
  const addPair = () => {
    setReplacementPairs((prev) => [
      ...prev,
      { id: newPairId(), againstDeviceId: '', replacementDeviceId: '' },
    ])
  }
  const removePair = (pairId: string) => {
    setReplacementPairs((prev) =>
      prev.length > 1 ? prev.filter((p) => p.id !== pairId) : prev,
    )
  }

  const showSalesOrderField = type === 'SALES'
  const showRentalField = type === 'RENTAL'
  const showDemoField = type === 'DEMO'
  const showInternalTransferFields = type === 'INTERNAL_TRANSFER'
  const showReplacementFields = type === 'RETURN_REPLACEMENT'
  const showCustomerCard = type !== 'INTERNAL_TRANSFER'
  const showDeviceSelectionCard = !showReplacementFields

  const validReplacementPairs = replacementPairs.filter(
    (p) => p.againstDeviceId && p.replacementDeviceId,
  )

  const missingPieces: string[] = []
  if (showCustomerCard && !customerName) missingPieces.push('Customer name')
  if (showInternalTransferFields && !employeeName) missingPieces.push('Employee name')
  if (showSalesOrderField && !salesOrderNumber) missingPieces.push('Sales Order')
  if (showRentalField && !rentalSalesOrderNumber) missingPieces.push('Rental Sales Order')
  if (showReplacementFields) {
    if (!replacementOrigin) missingPieces.push('Origin type')
    if (!replacementSubType) missingPieces.push('Replacement type')
    if (validReplacementPairs.length === 0)
      missingPieces.push('At least one replacement pair')
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
  const stepDeviceSelect = showDeviceSelectionCard ? step++ : null
  const stepNotes = step++

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={goBack}>
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="cpt-page-title">Create Dispatch Request</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill each section below. Required fields are marked with an asterisk (<span className="text-destructive">*</span>).
            </p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Outward #
          </span>
          <span className="font-mono text-sm font-semibold">{nextOutwardNumber}</span>
        </div>
      </div>

      {/* 1. Dispatch Info */}
      <Card>
        <CardHeader>
          <SectionHeader
            step={stepDispatchInfo}
            title="Dispatch Info"
            description="Pick the dispatch type and its reference."
          />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type — large tile buttons */}
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
                    onClick={() => setType(opt.value)}
                    className={cn(
                      'relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40',
                    )}
                    aria-pressed={selected}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')} />
                      {selected && (
                        <Check className="size-3.5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className={cn('text-sm font-semibold', selected ? 'text-primary' : 'text-foreground')}>
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
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 space-y-4">
            {showSalesOrderField && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <div className="space-y-2 min-w-0">
                  <FieldLabel required>Sales Order</FieldLabel>
                  <Select
                    value={salesOrderNumber}
                    onValueChange={(v) => setSalesOrderNumber(v ?? '')}
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
                <p className="text-sm text-muted-foreground self-center">
                  No Sales Order reference is needed for demo dispatches. Fill in the customer details below.
                </p>
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
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel required>Origin Type</FieldLabel>
                    <div className="flex gap-2">
                      {(['SALE', 'RETURN'] as ReplacementOriginType[]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setReplacementOrigin(opt)}
                          className={cn(
                            'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                            replacementOrigin === opt
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted/40',
                          )}
                          aria-pressed={replacementOrigin === opt}
                        >
                          {opt === 'SALE' ? 'Sale' : 'Return'}
                        </button>
                      ))}
                    </div>
                    {!replacementOrigin && (
                      <p className="text-[11px] text-destructive">Please choose one</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <FieldLabel required>Replacement Type</FieldLabel>
                    <div className="flex gap-2">
                      {(['NORMAL', 'ADVANCE'] as ReplacementSubType[]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setReplacementSubType(opt)}
                          className={cn(
                            'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                            replacementSubType === opt
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted/40',
                          )}
                          aria-pressed={replacementSubType === opt}
                        >
                          {opt === 'NORMAL' ? 'Normal' : 'Advance'}
                        </button>
                      ))}
                    </div>
                    {!replacementSubType && (
                      <p className="text-[11px] text-destructive">Please choose one</p>
                    )}
                  </div>
                </div>

                {/* Replacement pairs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FieldLabel required hint="One pair per device being replaced">
                      Replacements
                    </FieldLabel>
                    <Button size="xs" variant="outline" onClick={addPair}>
                      <Plus className="size-3.5" />
                      Add Replacement
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {replacementPairs.map((pair, idx) => {
                      const against = replacementCandidates.find((d) => d.id === pair.againstDeviceId)
                      const replacement = eligibleDevices.find((d) => d.id === pair.replacementDeviceId)
                      return (
                        <div
                          key={pair.id}
                          className="rounded-md border bg-background p-3 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Replacement #{idx + 1}
                            </span>
                            <button
                              type="button"
                              className={cn(
                                'text-xs text-destructive hover:text-destructive/80 flex items-center gap-1',
                                replacementPairs.length === 1 &&
                                  'opacity-40 cursor-not-allowed hover:text-destructive',
                              )}
                              onClick={() => removePair(pair.id)}
                              disabled={replacementPairs.length === 1}
                              title={
                                replacementPairs.length === 1
                                  ? 'At least one pair is required'
                                  : 'Remove this pair'
                              }
                            >
                              <Trash2 className="size-3.5" />
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {/* Against (dispatched device being replaced) */}
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Against (dispatched device)
                              </Label>
                              <Select
                                value={pair.againstDeviceId}
                                onValueChange={(v) =>
                                  updatePair(pair.id, { againstDeviceId: v ?? '' })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Pick dispatched device…" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                  {replacementCandidates.length > 0 ? (
                                    replacementCandidates.map((d) => (
                                      <SelectItem key={d.id} value={d.id}>
                                        <span className="flex w-full min-w-0 items-center gap-2">
                                          <span className="font-mono text-[12px] shrink-0">
                                            {d.barcode}
                                          </span>
                                          <span className="truncate text-muted-foreground">
                                            {d.brand} {d.model} · S/N {d.serialNumber}
                                          </span>
                                        </span>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="__none__" disabled>
                                      No dispatched devices
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              {against && (
                                <p className="text-[11px] text-muted-foreground">
                                  {against.brand} {against.model} · S/N {against.serialNumber}
                                </p>
                              )}
                            </div>

                            {/* Arrow separator */}
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Replacement (from stock)
                              </Label>
                              <Select
                                value={pair.replacementDeviceId}
                                onValueChange={(v) =>
                                  updatePair(pair.id, { replacementDeviceId: v ?? '' })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Pick replacement device…" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                  {eligibleDevices.length > 0 ? (
                                    eligibleDevices.map((d) => (
                                      <SelectItem key={d.id} value={d.id}>
                                        <span className="flex w-full min-w-0 items-center gap-2">
                                          <span className="font-mono text-[12px] shrink-0">
                                            {d.barcode}
                                          </span>
                                          <span className="truncate text-muted-foreground">
                                            {d.brand} {d.model} · S/N {d.serialNumber}
                                          </span>
                                        </span>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="__none__" disabled>
                                      No stock available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              {replacement && (
                                <p className="text-[11px] text-muted-foreground">
                                  {replacement.brand} {replacement.model} · S/N{' '}
                                  {replacement.serialNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {validReplacementPairs.length === 0 && (
                    <p className="text-[11px] text-destructive">
                      Add at least one complete pair (against + replacement).
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Expected Dispatch Date for Replacement lives here since pairs live inside sub-panel */}
          {showReplacementFields && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
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

      {/* 3. Select Devices — hidden for Replacement (handled via pairs above) */}
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
        <div className="mx-auto flex max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
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
