import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  CalendarDays,
  Package,
  Layers,
  Send,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Tag,
  MapPin,
  User,
  UserCheck,
  Building2,
  FileText,
  Hash,
  Box,
  ShoppingCart,
  RotateCcw,
  Phone,
  IdCard,
} from 'lucide-react'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { BarcodeText } from '@/components/common/BarcodeText'
import { PageHeader } from '@/components/page'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/common/EmptyState'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  type DeviceStatus,
  type InwardType,
  type Device,
} from '../types'
import { mockBatches } from '../data/batches'
import { mockDevices } from '../data/devices'

const INWARD_TYPE_LABELS: Record<InwardType, string> = {
  PURCHASE_ORDER: 'Purchase Order',
  DEMO_RETURN: 'Demo Return',
  INTERNAL_TRANSFER: 'Internal Transfer',
  ADVANCE_RETURN: 'Return',
  REPLACEMENT: 'Replacement',
}

const INWARD_TYPE_VARIANT: Record<InwardType, 'success' | 'warning' | 'info' | 'neutral'> = {
  PURCHASE_ORDER: 'info',
  DEMO_RETURN: 'neutral',
  INTERNAL_TRANSFER: 'success',
  ADVANCE_RETURN: 'success',
  REPLACEMENT: 'warning',
}

const MOCK_ENGINEERS = ['Ravi Kumar', 'Priya Nair', 'Sanjay Gupta', 'Meera Joshi', 'Arjun Patel']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function BatchDevicesPage() {
  const { id } = useParams<{ id: string }>()
  const goBack = useNavigateBack('/wms/inward')

  const batch = mockBatches.find((b) => b.id === id)
  const initialDevices = useMemo(
    () => mockDevices.filter((d) => d.batchId === id),
    [id]
  )

  const [devices, setDevices] = useState<Device[]>(initialDevices)
  const [collapsedModels, setCollapsedModels] = useState<Record<string, boolean>>({})
  const [deviceSearch, setDeviceSearch] = useState('')

  if (!batch) {
    return (
      <EmptyState
        title="Batch not found"
        description="The batch you are looking for does not exist."
        action={{ label: 'Back to Inward', onClick: goBack }}
      />
    )
  }

  const filteredDevices = useMemo(() => {
    const q = deviceSearch.trim().toLowerCase()
    if (!q) return devices
    return devices.filter((d) =>
      [d.barcode, d.serialNumber, d.model, d.brand, d.assignedTo]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(q)),
    )
  }, [devices, deviceSearch])

  // Group devices by model
  const devicesByModel = useMemo(() => {
    const groups: Record<string, Device[]> = {}
    for (const d of filteredDevices) {
      const key = `${d.brand} ${d.model}`
      if (!groups[key]) groups[key] = []
      groups[key].push(d)
    }
    return groups
  }, [filteredDevices])

  const handleMoveToInspection = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== deviceId) return d
        toast.success(`${d.barcode} moved to Pending Inspection`)
        return { ...d, status: 'PENDING_INSPECTION' as DeviceStatus }
      })
    )
  }

  const handleSendAllToInspection = () => {
    const receivedCount = devices.filter((d) => d.status === 'RECEIVED').length
    if (receivedCount === 0) {
      toast.info('No RECEIVED devices to move.')
      return
    }
    setDevices((prev) =>
      prev.map((d) =>
        d.status === 'RECEIVED'
          ? { ...d, status: 'PENDING_INSPECTION' as DeviceStatus }
          : d
      )
    )
    toast.success(`${receivedCount} device(s) moved to Pending Inspection`)
  }

  const handleAssignEngineer = (deviceId: string, engineer: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== deviceId) return d
        toast.success(`${d.barcode} assigned to ${engineer}`)
        return { ...d, assignedTo: engineer }
      })
    )
  }

  const toggleModel = (model: string) => {
    setCollapsedModels((prev) => ({ ...prev, [model]: !prev[model] }))
  }

  const hasReceivedDevices = devices.some((d) => d.status === 'RECEIVED')

  const categoryValue = batch.subcategory
    ? `${batch.category} · ${batch.subcategory}`
    : batch.category

  const warehouseValue = batch.assignedLocation
    ? `${batch.warehouseName} · ${batch.assignedLocation}`
    : batch.warehouseName

  // Core batch attributes — always present
  const infoItems: { icon: typeof Layers; label: string; value: string }[] = [
    { icon: Tag, label: 'Inward Type', value: INWARD_TYPE_LABELS[batch.inwardType] },
    { icon: Box, label: 'Stock Variant', value: batch.stockVariant },
    { icon: Layers, label: 'Category', value: categoryValue },
    { icon: Tag, label: 'Brand', value: batch.brand },
    { icon: Package, label: 'Device Count', value: String(batch.deviceCount) },
    { icon: MapPin, label: 'Warehouse', value: warehouseValue },
    { icon: User, label: 'Received By', value: batch.receivedBy },
    { icon: CalendarDays, label: 'Received Date', value: formatDate(batch.createdAt) },
  ]

  if (batch.inspectionAssignedTo) {
    infoItems.push({
      icon: UserCheck,
      label: 'Inspection Assigned To',
      value: batch.inspectionAssignedTo,
    })
  }

  // Source-specific attributes — whichever fields were captured for this inward type
  type SourceItem =
    | { kind: 'text'; icon: typeof Layers; label: string; value: string }
    | { kind: 'link'; icon: typeof Layers; label: string; value: string; to: string }
  const sourceItems: SourceItem[] = []
  if (batch.poNumber) {
    sourceItems.push({
      kind: 'link',
      icon: Hash,
      label: 'Purchase Order',
      value: batch.poNumber,
      to: batch.poId ? `/procurement/po/${batch.poId}` : '/procurement/po',
    })
  }
  if (batch.salesOrderNumber) {
    sourceItems.push({
      kind: 'link',
      icon: ShoppingCart,
      label: 'Sales Order',
      value: batch.salesOrderNumber,
      to: batch.salesOrderId ? `/crm/sales-orders/${batch.salesOrderId}` : '/crm/sales-orders',
    })
  }
  if (batch.originType) {
    sourceItems.push({
      kind: 'text',
      icon: RotateCcw,
      label: 'Origin Type',
      value: batch.originType,
    })
  }
  if (batch.vendorName) {
    sourceItems.push({ kind: 'text', icon: Building2, label: 'Vendor', value: batch.vendorName })
  }
  if (batch.sourceType) {
    sourceItems.push({ kind: 'text', icon: Tag, label: 'Source Type', value: batch.sourceType })
  }
  if (batch.sourceName && batch.sourceName !== batch.vendorName) {
    const label =
      batch.inwardType === 'ADVANCE_RETURN' ||
      batch.inwardType === 'DEMO_RETURN'
        ? 'Customer'
        : batch.inwardType === 'INTERNAL_TRANSFER'
          ? 'Source Warehouse'
          : 'Source'
    sourceItems.push({ kind: 'text', icon: Building2, label, value: batch.sourceName })
  }
  if (batch.sourceRef) {
    const refLabel =
      batch.inwardType === 'DEMO_RETURN'
        ? 'Demo Request #'
        : batch.inwardType === 'INTERNAL_TRANSFER'
          ? 'Source Department'
          : 'Reference #'
    sourceItems.push({ kind: 'text', icon: Hash, label: refLabel, value: batch.sourceRef })
  }
  if (batch.customerContact) {
    sourceItems.push({
      kind: 'text',
      icon: Phone,
      label: 'Customer Contact',
      value: batch.customerContact,
    })
  }
  if (batch.employeeName) {
    sourceItems.push({
      kind: 'text',
      icon: User,
      label: 'Employee',
      value: batch.employeeName,
    })
  }
  if (batch.employeeId) {
    sourceItems.push({
      kind: 'text',
      icon: IdCard,
      label: 'Employee ID',
      value: batch.employeeId,
    })
  }
  if (batch.employeeDept) {
    sourceItems.push({
      kind: 'text',
      icon: Building2,
      label: 'Employee Dept',
      value: batch.employeeDept,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.batchNumber}
        status={{
          label: batch.status,
          variant: batch.status === 'Open' ? 'success' : 'neutral',
        }}
        badges={
          <StatusBadge variant={INWARD_TYPE_VARIANT[batch.inwardType]}>
            {INWARD_TYPE_LABELS[batch.inwardType]}
          </StatusBadge>
        }
        breadcrumbs={[
          { label: 'WMS' },
          { label: 'Inward', href: '/wms/inward' },
          { label: batch.batchNumber },
        ]}
        backHref="/wms/inward"
        actions={
          hasReceivedDevices ? (
            <Button onClick={handleSendAllToInspection}>
              <Send className="size-4" data-icon="inline-start" />
              Send All to Inspection
            </Button>
          ) : null
        }
      />

      {/* Batch Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <item.icon className="mt-0.5 size-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium break-words">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {sourceItems.length > 0 && (
            <div className="border-t pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Source
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {sourceItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-2">
                    <item.icon className="mt-0.5 size-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      {item.kind === 'link' ? (
                        <Link
                          to={item.to}
                          className="wms-link text-sm font-medium break-words"
                        >
                          {item.value}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium break-words">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {batch.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-muted-foreground" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{batch.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Device List grouped by Model */}
      {devices.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="size-4 text-muted-foreground" />
                Devices by Model
              </CardTitle>
              <div className="bmt-search-lg w-full sm:max-w-md">
                <div className="cpt-search-field">
                  <Search className="size-[14px] opacity-60" />
                  <input
                    placeholder="Search by barcode, serial, model, or engineer…"
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(devicesByModel).length === 0 ? (
              <div className="rounded-md border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                No devices match &ldquo;{deviceSearch}&rdquo;.
              </div>
            ) : null}
            {Object.entries(devicesByModel).map(([modelKey, modelDevices]) => {
            const isCollapsed = collapsedModels[modelKey] ?? false
            return (
              <Collapsible key={modelKey} open={!isCollapsed}>
                <CollapsibleTrigger
                  className="flex w-full items-center justify-between rounded-md border bg-muted/40 px-4 py-3 text-left hover:bg-muted/60 transition-colors"
                  onClick={() => toggleModel(modelKey)}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-semibold">{modelKey}</span>
                    <StatusBadge variant="neutral">{modelDevices.length} devices</StatusBadge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="overflow-x-auto rounded-b-md border border-t-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Barcode</TableHead>
                          <TableHead>Part Number</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modelDevices.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell>
                              <BarcodeText model={d.model} serial={d.serialNumber}>
                                {d.barcode}
                              </BarcodeText>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{d.model}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{d.serialNumber}</TableCell>
                            <TableCell>
                              <StatusBadge variant={DEVICE_STATUS_VARIANT[d.status]}>
                                {DEVICE_STATUS_LABELS[d.status]}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>{d.grade ?? '-'}</TableCell>
                            <TableCell>
                              <Select
                                value={d.assignedTo === undefined ? '' : d.assignedTo}
                                onValueChange={(val) => { if (val) handleAssignEngineer(d.id, val) }}
                              >
                                <SelectTrigger className="h-8 w-36 text-xs">
                                  <SelectValue placeholder="Assign..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {MOCK_ENGINEERS.map((eng) => (
                                    <SelectItem key={eng} value={eng}>
                                      {eng}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {d.status === 'RECEIVED' ? (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleMoveToInspection(d.id)}
                                >
                                  Move to Inspection
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">--</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No devices yet"
          description="This batch has no devices associated with it."
        />
      )}
    </div>
  )
}

export { BatchDevicesPage }
export default BatchDevicesPage
