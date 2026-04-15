import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Package,
  AlertTriangle,
  MapPin,
  User,
  Phone,
  Truck,
  Clock,
  CheckCircle2,
  ClipboardCheck,
  Tag,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { OutwardRecord, OutwardType } from '../types'
import { mockOutwardRecords } from '../data/outward'
import { mockWarehouses } from '../data/warehouses'
import {
  VehicleAssignmentDialog,
  type VehicleAssignment,
} from '../components/VehicleAssignmentDialog'

// ── Helpers ──

const TYPE_LABELS: Record<OutwardType, string> = {
  SALES: 'Sales',
  RENTAL: 'Rental',
  DEMO: 'Demo',
  INTERNAL_TRANSFER: 'Internal Transfer',
  RETURN_REPLACEMENT: 'Return / Replacement',
}

const TYPE_VARIANT: Record<OutwardType, 'info' | 'warning' | 'neutral' | 'success' | 'error'> = {
  SALES: 'info',
  RENTAL: 'warning',
  DEMO: 'neutral',
  INTERNAL_TRANSFER: 'neutral',
  RETURN_REPLACEMENT: 'error',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isDatePastOrToday(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return target <= today
}

// ── Column definitions ──

interface KanbanColumn {
  id: string
  label: string
  matchStatuses: OutwardRecord['status'][]
  headerColor: string
  badgeColor: string
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'pending-approval',
    label: 'Pending Approval',
    matchStatuses: ['Pending Approval'],
    headerColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  {
    id: 'picking',
    label: 'Picking',
    matchStatuses: ['Approved', 'Picking'],
    headerColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  {
    id: 'packing',
    label: 'Packing',
    matchStatuses: ['Packed'],
    headerColor: 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800',
    badgeColor: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  },
  {
    id: 'outward-qc',
    label: 'Outward QC',
    matchStatuses: ['Pending QC'],
    headerColor: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
    badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  {
    id: 'vehicle-assignment',
    label: 'Vehicle Assignment',
    matchStatuses: ['QC Passed'],
    headerColor: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800',
    badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  },
  {
    id: 'ready-to-ship',
    label: 'Ready to Ship',
    matchStatuses: ['Ready for Dispatch'],
    headerColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  {
    id: 'dispatched-today',
    label: 'Dispatched Today',
    matchStatuses: ['Dispatched'],
    headerColor: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
    badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
]

// ── Dispatch Card ──

function DispatchCard({
  record,
  currentStatus,
  columnId,
  assignments,
  onAction,
  onOpenAssignDialog,
}: {
  record: OutwardRecord
  currentStatus: OutwardRecord['status']
  columnId: string
  assignments: Record<string, VehicleAssignment>
  onAction: (id: string, newStatus: OutwardRecord['status'], message: string) => void
  onOpenAssignDialog: (record: OutwardRecord) => void
}) {
  const isPastDue = isDatePastOrToday(record.expectedDispatchDate)
  const assignment = assignments[record.id]
  const qcPassedCount = record.devices.filter((d) => d.qcResult === 'Passed').length
  const qcFailedCount = record.devices.filter((d) => d.qcResult === 'Failed').length
  const totalDevices = record.devices.length
  const packedCount = record.devices.filter(
    (d) => d.packingStatus === 'Packed' || d.packingStatus === 'Verified'
  ).length

  // Parse address parts
  const addressParts = record.shippingAddress.split(',').map((s) => s.trim())
  const shortAddress = addressParts.length >= 2
    ? `${addressParts[addressParts.length - 2]}, ${addressParts[addressParts.length - 1]}`
    : record.shippingAddress

  // Show max 3 devices, then "+N more"
  const visibleDevices = record.devices.slice(0, 3)
  const remainingDevices = record.devices.length - 3

  // Action button
  const renderAction = () => {
    switch (columnId) {
      case 'pending-approval':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation()
                onAction(record.id, 'Approved', `${record.outwardNumber} approved`)
              }}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onAction(record.id, 'Draft', `${record.outwardNumber} rejected`)
              }}
            >
              Reject
            </Button>
          </div>
        )
      case 'picking':
        return (
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              if (currentStatus === 'Approved') {
                onAction(record.id, 'Picking', `Picking started for ${record.outwardNumber}`)
              } else {
                onAction(record.id, 'Packed', `${record.outwardNumber} marked as packed`)
              }
            }}
          >
            {currentStatus === 'Approved' ? 'Start Picking' : 'Mark All Packed'}
          </Button>
        )
      case 'packing':
        return (
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onAction(record.id, 'Pending QC', `${record.outwardNumber} sent to QC`)
            }}
          >
            Send to QC
          </Button>
        )
      case 'outward-qc':
        return (
          <Link
            to={`/wms/outward/${record.id}`}
            className="block"
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="sm" variant="outline" className="w-full">
              <ClipboardCheck className="mr-1.5 size-3.5" />
              View QC
            </Button>
          </Link>
        )
      case 'vehicle-assignment':
        return (
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onOpenAssignDialog(record)
            }}
          >
            <Truck className="mr-1.5 size-3.5" />
            Assign Vehicle / Courier
          </Button>
        )
      case 'ready-to-ship':
        return (
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onAction(record.id, 'Dispatched', `${record.outwardNumber} dispatched!`)
            }}
          >
            Dispatch Now
          </Button>
        )
      case 'dispatched-today':
        return (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onAction(record.id, 'Delivered', `${record.outwardNumber} marked as delivered`)
            }}
          >
            Mark Delivered
          </Button>
        )
      default:
        return null
    }
  }

  return (
    <Link to={`/wms/outward/${record.id}`} className="block">
      <Card
        className={`cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-primary/20 ${
          isPastDue && columnId !== 'dispatched-today'
            ? 'border-destructive/40 bg-destructive/5'
            : ''
        }`}
      >
        <CardContent className="space-y-3 p-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-primary">{record.outwardNumber}</span>
            <StatusBadge variant={TYPE_VARIANT[record.type]}>
              {TYPE_LABELS[record.type]}
            </StatusBadge>
          </div>

          {/* Source / Origin reference */}
          <div className="flex items-center gap-1.5 text-xs">
            <Tag className="size-3 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Source:</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
              {record.type === 'SALES' && record.salesOrderNumber
                ? `SO: ${record.salesOrderNumber}`
                : record.type === 'RENTAL' && record.rentalContractId
                  ? `Rental: ${record.rentalContractId}`
                  : record.type === 'DEMO' && record.demoRequestId
                    ? `Demo: ${record.demoRequestId}`
                    : record.type === 'INTERNAL_TRANSFER'
                      ? 'Internal Transfer'
                      : record.type === 'RETURN_REPLACEMENT'
                        ? 'Return / Replacement'
                        : TYPE_LABELS[record.type]}
            </span>
          </div>

          {/* Customer + Address */}
          <div className="space-y-1 border-t pt-2">
            <div className="flex items-start gap-1.5">
              <Package className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium">{record.customerName}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{shortAddress}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <User className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {record.contactPerson}
              </span>
              <Phone className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{record.contactPhone}</span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1 border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground">
              Items: {totalDevices} device{totalDevices !== 1 ? 's' : ''}
            </p>
            {visibleDevices.map((d) => (
              <p key={d.deviceId} className="truncate pl-2 text-xs text-muted-foreground">
                &bull; {d.brand} {d.model} ({d.barcode})
              </p>
            ))}
            {remainingDevices > 0 && (
              <p className="pl-2 text-xs text-muted-foreground">
                + {remainingDevices} more
              </p>
            )}
          </div>

          {/* QC / Packing Progress */}
          {(columnId === 'outward-qc' || columnId === 'vehicle-assignment' || columnId === 'ready-to-ship') && (
            <div className="flex items-center gap-3 border-t pt-2 text-xs">
              <span className="flex items-center gap-1">
                {qcPassedCount === totalDevices ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                ) : qcFailedCount > 0 ? (
                  <AlertTriangle className="size-3.5 text-amber-600" />
                ) : (
                  <Clock className="size-3.5 text-muted-foreground" />
                )}
                QC: {qcPassedCount}/{totalDevices} passed
                {qcFailedCount > 0 && (
                  <span className="text-destructive">({qcFailedCount} failed)</span>
                )}
              </span>
            </div>
          )}

          {(columnId === 'picking' || columnId === 'packing') && (
            <div className="flex items-center gap-3 border-t pt-2 text-xs">
              <span>Packed: {packedCount}/{totalDevices}</span>
            </div>
          )}

          {/* Expected date */}
          <div className="flex items-center gap-3 border-t pt-2 text-xs">
            <span className={`flex items-center gap-1 ${isPastDue && columnId !== 'dispatched-today' ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
              <Clock className="size-3.5" />
              Expected: {formatDate(record.expectedDispatchDate)}
              {isPastDue && columnId !== 'dispatched-today' && ' (overdue)'}
            </span>
          </div>

          {/* Logistics / Assignment */}
          <div className="border-t pt-2 text-xs">
            {assignment ? (
              <div className="flex items-center gap-1.5">
                <Truck className="size-3.5 text-emerald-600" />
                <span className="font-medium">{assignment.courierPartnerName}</span>
                {assignment.vehicleNumber && (
                  <span className="text-muted-foreground">| {assignment.vehicleNumber}</span>
                )}
                {assignment.trackingNumber && (
                  <span className="text-muted-foreground">| {assignment.trackingNumber}</span>
                )}
              </div>
            ) : record.logistics.vehicleNumber || record.logistics.transporterName ? (
              <div className="flex items-center gap-1.5">
                <Truck className="size-3.5 text-muted-foreground" />
                <span>{record.logistics.transporterName ?? 'Vehicle'}</span>
                {record.logistics.vehicleNumber && (
                  <span className="text-muted-foreground">| {record.logistics.vehicleNumber}</span>
                )}
                {record.logistics.trackingNumber && (
                  <span className="text-muted-foreground">| {record.logistics.trackingNumber}</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="size-3.5" />
                <span>Not assigned</span>
              </div>
            )}
          </div>

          {/* Dispatched time for dispatched column */}
          {columnId === 'dispatched-today' && record.actualDispatchDate && (
            <div className="text-xs text-muted-foreground">
              Dispatched: {formatDate(record.actualDispatchDate)}
            </div>
          )}

          {/* Action */}
          <div className="border-t pt-2" onClick={(e) => e.preventDefault()}>
            {renderAction()}
          </div>

          {/* Store Manager */}
          <p className="text-xs text-muted-foreground">
            Store Manager: {record.storeManager}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

// ── Main Page ──

export default function DispatchPage() {
  const [statuses, setStatuses] = useState<Record<string, OutwardRecord['status']>>(() => {
    const map: Record<string, OutwardRecord['status']> = {}
    mockOutwardRecords.forEach((r) => {
      map[r.id] = r.status
    })
    return map
  })

  const [assignments, setAssignments] = useState<Record<string, VehicleAssignment>>({})
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignDialogRecord, setAssignDialogRecord] = useState<OutwardRecord | null>(null)
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [originFilter, setOriginFilter] = useState<string>('all')

  const getStatus = (id: string) => statuses[id] ?? 'Draft'

  const updateStatus = (id: string, newStatus: OutwardRecord['status'], message: string) => {
    setStatuses((prev) => ({ ...prev, [id]: newStatus }))
    toast.success(message)
  }

  const handleOpenAssignDialog = (record: OutwardRecord) => {
    setAssignDialogRecord(record)
    setAssignDialogOpen(true)
  }

  const handleAssign = (assignment: VehicleAssignment) => {
    if (!assignDialogRecord) return
    setAssignments((prev) => ({ ...prev, [assignDialogRecord.id]: assignment }))
    updateStatus(
      assignDialogRecord.id,
      'Ready for Dispatch',
      `Vehicle assigned to ${assignDialogRecord.outwardNumber} — moved to Ready to Ship`
    )
    setAssignDialogRecord(null)
  }

  // Origin type mapping for filter
  const ORIGIN_TYPE_MAP: Record<string, OutwardType[]> = {
    'Sales Order': ['SALES'],
    Rental: ['RENTAL'],
    Demo: ['DEMO'],
    Internal: ['INTERNAL_TRANSFER'],
    Return: ['RETURN_REPLACEMENT'],
  }

  // Group records by columns (with filters applied)
  const columnData = useMemo(() => {
    const groups: Record<string, OutwardRecord[]> = {}
    KANBAN_COLUMNS.forEach((col) => {
      groups[col.id] = []
    })

    mockOutwardRecords.forEach((record) => {
      // Apply origin filter
      if (originFilter !== 'all') {
        const allowedTypes = ORIGIN_TYPE_MAP[originFilter]
        if (allowedTypes && !allowedTypes.includes(record.type)) return
      }

      // Apply warehouse filter (based on shipping address city)
      if (warehouseFilter !== 'all') {
        const wh = mockWarehouses.find((w) => w.id === warehouseFilter)
        if (wh && !record.shippingAddress.toLowerCase().includes(wh.city.toLowerCase())) {
          // Also check store manager location as a fallback
          return
        }
      }

      const status = getStatus(record.id)
      for (const col of KANBAN_COLUMNS) {
        if (col.matchStatuses.includes(status)) {
          groups[col.id]?.push(record)
          break
        }
      }
    })

    return groups
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses, warehouseFilter, originFilter])

  const totalActive = Object.values(columnData).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dispatch Board</h1>
        <p className="text-sm text-muted-foreground">
          Track and manage all outward shipments &mdash; {totalActive} active dispatch{totalActive !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={warehouseFilter} onValueChange={(v) => setWarehouseFilter(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {mockWarehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={originFilter} onValueChange={(v) => setOriginFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Origin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Origins</SelectItem>
            <SelectItem value="Sales Order">Sales Order</SelectItem>
            <SelectItem value="Rental">Rental</SelectItem>
            <SelectItem value="Demo">Demo</SelectItem>
            <SelectItem value="Internal">Internal</SelectItem>
            <SelectItem value="Return">Return</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const records = columnData[column.id] ?? []
          return (
            <div
              key={column.id}
              className="flex min-w-[320px] max-w-[350px] flex-shrink-0 flex-col"
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between rounded-t-lg border px-3 py-2 ${column.headerColor}`}
              >
                <h3 className="text-sm font-semibold">{column.label}</h3>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${column.badgeColor}`}
                >
                  {records.length}
                </span>
              </div>

              {/* Column Body */}
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-b-lg border border-t-0 bg-muted/30 p-3"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              >
                {records.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No items
                  </p>
                ) : (
                  records.map((record) => (
                    <DispatchCard
                      key={record.id}
                      record={record}
                      currentStatus={getStatus(record.id)}
                      columnId={column.id}
                      assignments={assignments}
                      onAction={updateStatus}
                      onOpenAssignDialog={handleOpenAssignDialog}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Vehicle Assignment Dialog */}
      <VehicleAssignmentDialog
        outwardNumber={assignDialogRecord?.outwardNumber ?? ''}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssign={handleAssign}
      />
    </div>
  )
}
