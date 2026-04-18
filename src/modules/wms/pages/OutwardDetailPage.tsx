import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { DetailTabs } from '@/modules/crm/components/DetailTabs'
import { WorkflowStepper, type StepConfig } from '@/components/common/WorkflowStepper'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  type OutwardType,
  type OutwardRecord,
  type OutwardDevice,
  DISPATCH_WORKFLOW_STAGES,
} from '../types'
import { mockOutwardRecords } from '../data/outward'
import { mockReturnRecords } from '../data/returns'
import { mockCourierPartners } from '../data/courier-partners'

const TYPE_VARIANT: Record<OutwardType, 'info' | 'warning' | 'neutral' | 'success' | 'error'> = {
  SALES: 'info',
  RENTAL: 'warning',
  DEMO: 'neutral',
  INTERNAL_TRANSFER: 'neutral',
  RETURN_REPLACEMENT: 'error',
}

const TYPE_LABELS: Record<OutwardType, string> = {
  SALES: 'Sales',
  RENTAL: 'Rental',
  DEMO: 'Demo',
  INTERNAL_TRANSFER: 'Internal Transfer',
  RETURN_REPLACEMENT: 'Return / Replacement',
}

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

function getStatusVariant(status: OutwardRecord['status']): StatusVariant {
  switch (status) {
    case 'Dispatched':
    case 'Delivered':
      return 'success'
    case 'QC Passed':
    case 'Ready for Dispatch':
      return 'info'
    case 'Pending QC':
    case 'Packed':
    case 'Picking':
    case 'Approved':
    case 'Pending Approval':
      return 'warning'
    case 'Partially Returned':
      return 'error'
    case 'Draft':
    default:
      return 'neutral'
  }
}

function getStageFromStatus(status: OutwardRecord['status']): string {
  switch (status) {
    case 'Draft':
    case 'Pending Approval':
      return 'request'
    case 'Approved':
      return 'approval'
    case 'Picking':
      return 'picking'
    case 'Packed':
      return 'packing'
    case 'Pending QC':
    case 'QC Passed':
      return 'qc'
    case 'Ready for Dispatch':
    case 'Dispatched':
      return 'dispatch'
    case 'Delivered':
    case 'Partially Returned':
      return 'delivery'
    default:
      return 'request'
  }
}

function buildStepperSteps(status: OutwardRecord['status']): StepConfig[] {
  const currentStage = getStageFromStatus(status)
  const stageIds = DISPATCH_WORKFLOW_STAGES.map((s) => s.id) as string[]
  const currentIdx = stageIds.indexOf(currentStage)

  return DISPATCH_WORKFLOW_STAGES.map((stage, idx) => {
    let stepStatus: StepConfig['status'] = 'pending'
    if (idx < currentIdx) stepStatus = 'completed'
    else if (idx === currentIdx) {
      if (status === 'Delivered' || status === 'Dispatched') stepStatus = 'completed'
      else stepStatus = 'active'
    }
    return {
      id: stage.id,
      label: stage.label,
      status: stepStatus,
    }
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function OutwardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const record = mockOutwardRecords.find((r) => r.id === id)

  const [status, setStatus] = useState<OutwardRecord['status']>(record?.status ?? 'Draft')
  const [devices, setDevices] = useState<OutwardDevice[]>(record?.devices ?? [])
  const [qcDialogDevice, setQcDialogDevice] = useState<OutwardDevice | null>(null)
  const [qcDialogResult, setQcDialogResult] = useState<'Passed' | 'Failed'>('Passed')

  // Delivery challan
  const [deliveryChallan, setDeliveryChallan] = useState<File | null>(null)

  // Logistics editing
  const [editLogistics, setEditLogistics] = useState(false)
  const [logVehicle, setLogVehicle] = useState(record?.logistics.vehicleNumber ?? '')
  const [logDriver, setLogDriver] = useState(record?.logistics.driverName ?? '')
  const [logDriverPhone, setLogDriverPhone] = useState(record?.logistics.driverPhone ?? '')
  const [logTransporter, setLogTransporter] = useState(record?.logistics.transporterName ?? '')
  const [logTracking, setLogTracking] = useState(record?.logistics.trackingNumber ?? '')

  const returnRecords = useMemo(
    () => mockReturnRecords.filter((r) => r.outwardId === id),
    [id]
  )

  if (!record) {
    return (
      <EmptyState
        title="Outward record not found"
        description="The outward record you are looking for does not exist."
      />
    )
  }

  const steps = buildStepperSteps(status)

  const qcPassedCount = devices.filter((d) => d.qcResult === 'Passed').length
  const qcFailedCount = devices.filter((d) => d.qcResult === 'Failed').length
  const qcPendingCount = devices.filter((d) => d.qcResult === 'Pending').length
  const packedCount = devices.filter((d) => d.packingStatus === 'Packed' || d.packingStatus === 'Verified').length

  const handleStatusTransition = (newStatus: OutwardRecord['status'], message: string) => {
    setStatus(newStatus)
    toast.success(message)
  }

  const handleQcSubmit = () => {
    if (!qcDialogDevice) return
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === qcDialogDevice.deviceId
          ? { ...d, qcResult: qcDialogResult }
          : d
      )
    )
    toast.success(
      qcDialogResult === 'Passed'
        ? `QC passed for ${qcDialogDevice.barcode}`
        : `QC failed for ${qcDialogDevice.barcode}`
    )
    setQcDialogDevice(null)
  }

  const handleTogglePacked = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === deviceId
          ? { ...d, packingStatus: d.packingStatus === 'Packed' || d.packingStatus === 'Verified' ? 'Not Packed' : 'Packed' }
          : d
      )
    )
  }

  const handleSaveLogistics = () => {
    setEditLogistics(false)
    toast.success('Logistics information updated.')
  }

  // Action buttons based on status
  const actionButtons = (() => {
    switch (status) {
      case 'Draft':
        return (
          <Button onClick={() => handleStatusTransition('Pending Approval', `${record.outwardNumber} submitted for approval.`)}>
            Submit for Approval
          </Button>
        )
      case 'Pending Approval':
        return (
          <>
            <Button onClick={() => handleStatusTransition('Approved', `${record.outwardNumber} approved.`)}>
              Approve
            </Button>
            <Button variant="outline" onClick={() => handleStatusTransition('Draft', `${record.outwardNumber} rejected, sent back to draft.`)}>
              Reject
            </Button>
          </>
        )
      case 'Approved':
        return (
          <Button onClick={() => handleStatusTransition('Picking', `Picking started for ${record.outwardNumber}.`)}>
            Start Picking
          </Button>
        )
      case 'Picking':
        return (
          <Button onClick={() => handleStatusTransition('Packed', `${record.outwardNumber} marked as packed.`)}>
            Mark Packed
          </Button>
        )
      case 'Packed':
        return (
          <Button onClick={() => handleStatusTransition('Pending QC', `${record.outwardNumber} sent to QC.`)}>
            Send to QC
          </Button>
        )
      case 'Pending QC':
        if (qcPendingCount === 0 && qcFailedCount === 0) {
          return (
            <Button onClick={() => handleStatusTransition('QC Passed', `All QC passed for ${record.outwardNumber}.`)}>
              Mark QC Passed
            </Button>
          )
        }
        return null
      case 'QC Passed':
        return (
          <Button onClick={() => {
            if (!logVehicle && !record.logistics.vehicleNumber) {
              toast.error('Please fill logistics details before dispatching.')
              return
            }
            handleStatusTransition('Dispatched', `${record.outwardNumber} dispatched!`)
          }}>
            Dispatch
          </Button>
        )
      case 'Ready for Dispatch':
        return (
          <Button onClick={() => {
            if (!logVehicle && !record.logistics.vehicleNumber) {
              toast.error('Please fill logistics details before dispatching.')
              return
            }
            handleStatusTransition('Dispatched', `${record.outwardNumber} dispatched!`)
          }}>
            Dispatch
          </Button>
        )
      case 'Dispatched':
        return (
          <Button onClick={() => handleStatusTransition('Delivered', `${record.outwardNumber} marked as delivered.`)}>
            Mark Delivered
          </Button>
        )
      default:
        return null
    }
  })()

  // Tabs
  const overviewTab = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Dispatch Info */}
        <Card>
          <CardHeader>
            <CardTitle>Dispatch Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-muted-foreground">Type</dt>
                <dd className="mt-1">
                  <StatusBadge variant={TYPE_VARIANT[record.type]}>
                    {TYPE_LABELS[record.type]}
                  </StatusBadge>
                </dd>
              </div>
              {record.salesOrderNumber && (
                <div>
                  <dt className="text-sm text-muted-foreground">Sales Order</dt>
                  <dd className="mt-1 text-sm font-medium">{record.salesOrderNumber}</dd>
                </div>
              )}
              {record.rentalContractId && (
                <div>
                  <dt className="text-sm text-muted-foreground">Rental Contract</dt>
                  <dd className="mt-1 text-sm font-medium">{record.rentalContractId}</dd>
                </div>
              )}
              {record.demoRequestId && (
                <div>
                  <dt className="text-sm text-muted-foreground">Demo Request</dt>
                  <dd className="mt-1 text-sm font-medium">{record.demoRequestId}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-muted-foreground">Expected Dispatch</dt>
                <dd className="mt-1 text-sm">{formatDate(record.expectedDispatchDate)}</dd>
              </div>
              {record.actualDispatchDate && (
                <div>
                  <dt className="text-sm text-muted-foreground">Actual Dispatch</dt>
                  <dd className="mt-1 text-sm">{formatDate(record.actualDispatchDate)}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <StatusBadge variant={getStatusVariant(status)}>{status}</StatusBadge>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Store Manager</dt>
                <dd className="mt-1 text-sm font-medium">{record.storeManager}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Prepared By</dt>
                <dd className="mt-1 text-sm">{record.preparedBy}</dd>
              </div>
              {record.approvedBy && (
                <div>
                  <dt className="text-sm text-muted-foreground">Approved By</dt>
                  <dd className="mt-1 text-sm">{record.approvedBy}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Delivery Details */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-muted-foreground">Customer</dt>
                <dd className="mt-1 text-sm font-medium">{record.customerName}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Contact Person</dt>
                <dd className="mt-1 text-sm">{record.contactPerson}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Phone</dt>
                <dd className="mt-1">
                  <a href={`tel:${record.contactPhone}`} className="text-sm text-primary hover:underline">
                    {record.contactPhone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Shipping Address</dt>
                <dd className="mt-1 text-sm whitespace-pre-line">
                  {record.shippingAddress.split(',').map((part) => part.trim()).join('\n')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Expected Delivery</dt>
                <dd className="mt-1 text-sm">{formatDate(record.expectedDispatchDate)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Dispatch Type</dt>
                <dd className="mt-1">
                  <StatusBadge variant={TYPE_VARIANT[record.type]}>
                    {TYPE_LABELS[record.type]}
                  </StatusBadge>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Delivery Challan</dt>
                <dd className="mt-1">
                  {deliveryChallan ? (
                    <div className="flex items-center gap-2">
                      <StatusBadge variant="success">Uploaded</StatusBadge>
                      <span className="text-sm text-muted-foreground">{deliveryChallan.name}</span>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setDeliveryChallan(file)
                            toast.success(`Delivery challan "${file.name}" uploaded.`)
                          }
                        }}
                      />
                      Upload Challan
                    </label>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* QC Summary */}
      <Card>
        <CardHeader>
          <CardTitle>QC Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{qcPassedCount}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </div>
            <div className={`text-center ${qcFailedCount > 0 ? 'bg-destructive/10 rounded-lg px-3 py-1' : ''}`}>
              <p className={`text-2xl font-bold ${qcFailedCount > 0 ? 'text-destructive' : ''}`}>{qcFailedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{qcPendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">{devices.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {record.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{record.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const devicesTab = (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Packed: <span className="font-medium text-foreground">{packedCount}/{devices.length}</span></span>
        <span>QC Passed: <span className="font-medium text-foreground">{qcPassedCount}/{devices.length}</span></span>
      </div>

      {/* Inline QC panel */}
      {qcDialogDevice && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">QC: {qcDialogDevice.barcode}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {qcDialogDevice.model} - {qcDialogDevice.brand} ({qcDialogDevice.serialNumber})
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={qcDialogResult === 'Passed' ? 'default' : 'outline'}
                className={qcDialogResult === 'Passed' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                onClick={() => setQcDialogResult('Passed')}
              >
                Pass
              </Button>
              <Button
                size="sm"
                variant={qcDialogResult === 'Failed' ? 'default' : 'outline'}
                className={qcDialogResult === 'Failed' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
                onClick={() => setQcDialogResult('Failed')}
              >
                Fail
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleQcSubmit}>Submit QC</Button>
              <Button size="sm" variant="outline" onClick={() => setQcDialogDevice(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Barcode</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Serial #</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>QC Result</TableHead>
              <TableHead>Packing</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <TableRow key={d.deviceId}>
                <TableCell className="font-medium">{d.barcode}</TableCell>
                <TableCell>{d.model}</TableCell>
                <TableCell>{d.brand}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.serialNumber}</TableCell>
                <TableCell>{d.grade ?? '-'}</TableCell>
                <TableCell>
                  <StatusBadge
                    variant={
                      d.qcResult === 'Passed' ? 'success'
                        : d.qcResult === 'Failed' ? 'error'
                          : 'neutral'
                    }
                  >
                    {d.qcResult ?? 'Pending'}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    variant={
                      d.packingStatus === 'Verified' ? 'success'
                        : d.packingStatus === 'Packed' ? 'info'
                          : 'neutral'
                    }
                  >
                    {d.packingStatus}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {d.qcResult === 'Pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setQcDialogDevice(d)
                          setQcDialogResult('Passed')
                        }}
                      >
                        Run QC
                      </Button>
                    )}
                    {d.qcResult === 'Failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => toast.info(`Return initiated for ${d.barcode}`)}
                      >
                        Initiate Return
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTogglePacked(d.deviceId)}
                    >
                      {d.packingStatus === 'Packed' || d.packingStatus === 'Verified' ? 'Unpack' : 'Mark Packed'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  // Find matching courier partner by transporter name
  const matchedCourierPartner = record.logistics.transporterName
    ? mockCourierPartners.find(
        (cp) => cp.name.toLowerCase() === record.logistics.transporterName?.toLowerCase()
          || record.logistics.transporterName?.toLowerCase().includes(cp.name.toLowerCase())
      )
    : undefined

  const trackingUrl = matchedCourierPartner?.trackingUrlPattern && record.logistics.trackingNumber
    ? matchedCourierPartner.trackingUrlPattern.replace('{tracking}', record.logistics.trackingNumber)
    : undefined

  const logisticsTab = (
    <div className="space-y-6">
      {/* Transport Details */}
      <Card>
        <CardHeader>
          <CardTitle>Transport Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Courier / Transport</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm font-medium">
                {record.logistics.transporterName ?? '-'}
                {matchedCourierPartner && (
                  <StatusBadge variant="info">{matchedCourierPartner.type}</StatusBadge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Vehicle Number</dt>
              <dd className="mt-1 text-sm font-medium">{record.logistics.vehicleNumber ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Driver</dt>
              <dd className="mt-1 text-sm font-medium">
                {record.logistics.driverName ?? '-'}
                {record.logistics.driverPhone && (
                  <span className="ml-2 text-muted-foreground">
                    - <a href={`tel:${record.logistics.driverPhone}`} className="text-primary hover:underline">{record.logistics.driverPhone}</a>
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">AWB / Tracking #</dt>
              <dd className="mt-1 text-sm font-medium">
                {record.logistics.trackingNumber ? (
                  trackingUrl ? (
                    <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {record.logistics.trackingNumber}
                    </a>
                  ) : (
                    record.logistics.trackingNumber
                  )
                ) : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Challan / LR #</dt>
              <dd className="mt-1 text-sm">{record.logistics.challanNumber ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Packaging</dt>
              <dd className="mt-1 text-sm">{record.logistics.packagingType ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Total Weight</dt>
              <dd className="mt-1 text-sm">{record.logistics.totalWeight ? `${record.logistics.totalWeight} kg` : '-'}</dd>
            </div>
            {record.logistics.estimatedDelivery && (
              <div>
                <dt className="text-sm text-muted-foreground">Estimated Delivery</dt>
                <dd className="mt-1 text-sm">{formatDate(record.logistics.estimatedDelivery)}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Edit Logistics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Update Logistics</CardTitle>
          {!editLogistics && (
            <Button size="sm" variant="outline" onClick={() => setEditLogistics(true)}>
              Edit
            </Button>
          )}
        </CardHeader>
        {editLogistics && (
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vehicle Number</Label>
                  <Input value={logVehicle} onChange={(e) => setLogVehicle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Driver Name</Label>
                  <Input value={logDriver} onChange={(e) => setLogDriver(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Driver Phone</Label>
                  <Input value={logDriverPhone} onChange={(e) => setLogDriverPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Transporter</Label>
                  <Input value={logTransporter} onChange={(e) => setLogTransporter(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tracking Number</Label>
                  <Input value={logTracking} onChange={(e) => setLogTracking(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveLogistics}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditLogistics(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {record.logistics.specialInstructions && (
        <Card>
          <CardHeader>
            <CardTitle>Special Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{record.logistics.specialInstructions}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const returnsTab = (
    <div className="space-y-4">
      {returnRecords.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No returns for this outward record.</p>
      ) : (
        returnRecords.map((ret) => (
          <Card key={ret.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{ret.returnNumber}</CardTitle>
                <StatusBadge
                  variant={
                    ret.status === 'Resolved' ? 'success'
                      : ret.status === 'Inspected' ? 'info'
                        : ret.status === 'Received' ? 'warning'
                          : 'neutral'
                  }
                >
                  {ret.status}
                </StatusBadge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Reason:</span>{' '}
                <StatusBadge variant="error">
                  {ret.reason === 'QC_FAILED' ? 'QC Failed'
                    : ret.reason === 'CUSTOMER_RETURN' ? 'Customer Return'
                      : ret.reason === 'DAMAGE_IN_TRANSIT' ? 'Damage in Transit'
                        : 'Wrong Item'}
                </StatusBadge>
              </p>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ret.devices.map((d) => (
                      <TableRow key={d.deviceId}>
                        <TableCell className="font-medium">{d.barcode}</TableCell>
                        <TableCell>{d.model}</TableCell>
                        <TableCell className="text-sm">{d.reason}</TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={
                              d.action === 'Scrap' ? 'error'
                                : d.action === 'Repair' ? 'warning'
                                  : d.action === 'Restock' ? 'success'
                                    : 'neutral'
                            }
                          >
                            {d.action}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {ret.notes && (
                <p className="text-sm text-muted-foreground">{ret.notes}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )

  const tabsConfig = [
    { id: 'overview', label: 'Overview', content: overviewTab },
    { id: 'devices', label: 'Devices', count: devices.length, content: devicesTab },
    { id: 'logistics', label: 'Logistics', content: logisticsTab },
    ...(returnRecords.length > 0
      ? [{ id: 'returns', label: 'Returns', count: returnRecords.length, content: returnsTab }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={record.outwardNumber}
        subtitle={`${TYPE_LABELS[record.type]} dispatch to ${record.customerName}`}
        status={{ label: status, variant: getStatusVariant(status) }}
        backHref="/wms/outward"
        actions={actionButtons}
      />

      <Card>
        <CardContent className="py-6">
          <WorkflowStepper steps={steps} />
        </CardContent>
      </Card>

      <DetailTabs tabs={tabsConfig} />
    </div>
  )
}
