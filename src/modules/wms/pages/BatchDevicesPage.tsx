import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Package, Tag, Layers, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { EmptyState } from '@/components/common/EmptyState'
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  type DeviceStatus,
  type BatchOwnershipType,
  type Device,
} from '../types'
import { mockBatches } from '../data/batches'
import { mockDevices } from '../data/devices'

const OWNERSHIP_TYPE_LABELS: Record<BatchOwnershipType, string> = {
  REFURB_PURCHASE: 'Refurb Purchase',
  RENTAL_RETURN: 'Rental Return',
  ADVANCE_RETURN: 'Advance Return',
}

const OWNERSHIP_TYPE_VARIANT: Record<BatchOwnershipType, 'success' | 'warning' | 'info'> = {
  REFURB_PURCHASE: 'info',
  RENTAL_RETURN: 'warning',
  ADVANCE_RETURN: 'success',
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

  const batch = mockBatches.find((b) => b.id === id)
  const initialDevices = useMemo(
    () => mockDevices.filter((d) => d.batchId === id),
    [id]
  )

  const [devices, setDevices] = useState<Device[]>(initialDevices)

  if (!batch) {
    return (
      <EmptyState
        title="Batch not found"
        description="The batch you are looking for does not exist."
        action={{ label: 'Back to Inward', onClick: () => window.history.back() }}
      />
    )
  }

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

  const hasReceivedDevices = devices.some((d) => d.status === 'RECEIVED')

  const deviceColumns = [
    { key: 'barcode', label: 'Barcode', sortable: true },
    { key: 'model', label: 'Model', sortable: true },
    { key: 'serialNumber', label: 'Serial Number' },
    { key: 'status', label: 'Status' },
    { key: 'grade', label: 'Grade', align: 'center' as const },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'actions', label: 'Actions' },
  ]

  const deviceRows = devices.map((d) => ({
    id: d.id,
    barcode: d.barcode,
    model: d.model,
    serialNumber: d.serialNumber,
    status: d.status,
    grade: d.grade ?? '-',
    assignedTo: d.assignedTo ?? '-',
    _status: d.status,
  }))

  const tabs: TabConfig[] = [
    {
      id: 'devices',
      label: `Devices (${devices.length})`,
      columns: deviceColumns,
      data: deviceRows,
    },
  ]

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'status') {
      const status = value as DeviceStatus
      return {
        display: (
          <StatusBadge variant={DEVICE_STATUS_VARIANT[status]}>
            {DEVICE_STATUS_LABELS[status]}
          </StatusBadge>
        ),
      }
    }
    if (key === 'assignedTo') {
      const deviceId = row.id as string
      const currentValue = value as string
      return {
        display: (
          <Select
            value={currentValue === '-' ? '' : currentValue}
            onValueChange={(val) => { if (val) handleAssignEngineer(deviceId, val) }}
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
        ),
      }
    }
    if (key === 'actions') {
      const status = row._status as DeviceStatus
      const deviceId = row.id as string
      if (status === 'RECEIVED') {
        return {
          display: (
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleMoveToInspection(deviceId)}
            >
              Move to Inspection
            </Button>
          ),
        }
      }
      return { display: <span className="text-muted-foreground text-xs">--</span> }
    }
    return null
  }

  const infoItems = [
    { icon: Layers, label: 'Category', value: batch.category },
    { icon: Tag, label: 'Brand', value: batch.brand },
    {
      icon: CalendarDays,
      label: 'Received Date',
      value: formatDate(batch.receivedDate),
    },
    { icon: Package, label: 'Device Count', value: String(batch.deviceCount) },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link to="/wms/inward" />}>
            <ArrowLeft />
          </Button>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {batch.batchNumber}
              </h1>
              <StatusBadge variant={batch.status === 'Open' ? 'success' : 'neutral'}>
                {batch.status}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              <StatusBadge variant={OWNERSHIP_TYPE_VARIANT[batch.ownershipType]}>
                {OWNERSHIP_TYPE_LABELS[batch.ownershipType]}
              </StatusBadge>
              <span className="ml-2">{batch.brand}</span>
            </p>
          </div>
        </div>
        {hasReceivedDevices && (
          <Button onClick={handleSendAllToInspection}>
            <Send className="size-4" data-icon="inline-start" />
            Send All to Inspection
          </Button>
        )}
      </div>

      {/* Batch Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <item.icon className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Device List */}
      {devices.length > 0 ? (
        <BusinessMetricsTable tabs={tabs} cellFormatter={cellFormatter} />
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
