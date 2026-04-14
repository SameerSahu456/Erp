import { useParams } from 'react-router-dom'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
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
  type OutwardType,
  type DeviceStatus,
} from '../types'
import { mockOutwardRecords } from '../data/outward'
import { mockDevices } from '../data/devices'

const TYPE_VARIANT: Record<OutwardType, 'info' | 'warning' | 'neutral'> = {
  SALES: 'info',
  RENTAL: 'warning',
  RETURN_REPLACEMENT: 'neutral',
}

const TYPE_LABELS: Record<OutwardType, string> = {
  SALES: 'Sales',
  RENTAL: 'Rental',
  RETURN_REPLACEMENT: 'Return / Replacement',
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

  if (!record) {
    return (
      <EmptyState
        title="Outward record not found"
        description="The outward record you are looking for does not exist."
      />
    )
  }

  const devices = record.devices
    .map((devId) => mockDevices.find((d) => d.id === devId))
    .filter(Boolean) as typeof mockDevices

  const statusVariant =
    record.status === 'Dispatched'
      ? 'success'
      : record.status === 'QC Passed'
        ? 'info'
        : 'warning'

  return (
    <div className="space-y-6">
      <EntityHeader
        title={record.outwardNumber}
        subtitle={TYPE_LABELS[record.type]}
        status={{ label: record.status, variant: statusVariant }}
        backHref="/wms/outward"
        actions={
          <>
            {record.status === 'Pending QC' && (
              <Button>Start QC</Button>
            )}
            {record.status === 'QC Passed' && (
              <Button>Mark Dispatched</Button>
            )}
          </>
        }
      />

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Type</dt>
              <dd className="mt-1">
                <StatusBadge variant={TYPE_VARIANT[record.type]}>
                  {TYPE_LABELS[record.type]}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Customer</dt>
              <dd className="mt-1 text-sm font-medium">{record.customerName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Shipping Address</dt>
              <dd className="mt-1 text-sm">{record.shippingAddress}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Created By</dt>
              <dd className="mt-1 text-sm font-medium">{record.createdBy}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Date</dt>
              <dd className="mt-1 text-sm">{formatDate(record.createdAt)}</dd>
            </div>
            {record.dispatchedAt && (
              <div>
                <dt className="text-sm text-muted-foreground">Dispatched At</dt>
                <dd className="mt-1 text-sm">{formatDate(record.dispatchedAt)}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Device List */}
      <Card>
        <CardHeader>
          <CardTitle>Devices ({devices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.barcode}</TableCell>
                    <TableCell>{d.model}</TableCell>
                    <TableCell>{d.brand}</TableCell>
                    <TableCell>
                      <StatusBadge variant={DEVICE_STATUS_VARIANT[d.status as DeviceStatus]}>
                        {DEVICE_STATUS_LABELS[d.status as DeviceStatus]}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
