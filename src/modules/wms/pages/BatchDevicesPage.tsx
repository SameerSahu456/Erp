import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Package, Tag, Layers, Send, ChevronDown, ChevronRight, Printer } from 'lucide-react'
import { useNavigateBack } from '@/hooks/use-navigate-back'
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
  RENTAL_RETURN: 'Rental Return',
  DEMO_RETURN: 'Demo Return',
  INTERNAL_TRANSFER: 'Internal Transfer',
  ADVANCE_RETURN: 'Advance Return',
  REFURB_PURCHASE: 'Refurb Purchase',
}

const INWARD_TYPE_VARIANT: Record<InwardType, 'success' | 'warning' | 'info' | 'neutral'> = {
  PURCHASE_ORDER: 'info',
  RENTAL_RETURN: 'warning',
  DEMO_RETURN: 'neutral',
  INTERNAL_TRANSFER: 'success',
  ADVANCE_RETURN: 'success',
  REFURB_PURCHASE: 'info',
}

const MOCK_ENGINEERS = ['Ravi Kumar', 'Priya Nair', 'Sanjay Gupta', 'Meera Joshi', 'Arjun Patel']

function formatDate(dateStr: string) {
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

  if (!batch) {
    return (
      <EmptyState
        title="Batch not found"
        description="The batch you are looking for does not exist."
        action={{ label: 'Back to Inward', onClick: goBack }}
      />
    )
  }

  // Group devices by model
  const devicesByModel = useMemo(() => {
    const groups: Record<string, Device[]> = {}
    for (const d of devices) {
      const key = `${d.brand} ${d.model}`
      if (!groups[key]) groups[key] = []
      groups[key].push(d)
    }
    return groups
  }, [devices])

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

  const infoItems = [
    { icon: Layers, label: 'Category', value: batch.category },
    { icon: Tag, label: 'Brand', value: batch.brand },
    {
      icon: CalendarDays,
      label: 'Received Date',
      value: formatDate(batch.createdAt),
    },
    { icon: Package, label: 'Device Count', value: String(batch.deviceCount) },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={goBack}>
            <ArrowLeft />
          </Button>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="cpt-page-title">
                {batch.batchNumber}
              </h1>
              <StatusBadge variant={batch.status === 'Open' ? 'success' : batch.status === 'In Inspection' ? 'warning' : 'neutral'}>
                {batch.status}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              <StatusBadge variant={INWARD_TYPE_VARIANT[batch.inwardType]}>
                {INWARD_TYPE_LABELS[batch.inwardType]}
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

      {/* Device List grouped by Model */}
      {devices.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Devices by Model
          </h2>
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
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{d.barcode}</span>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="size-6 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => handlePrintBarcode(d.barcode, d.model, d.serialNumber)}
                                  title="Print barcode"
                                >
                                  <Printer className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
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
        </div>
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
