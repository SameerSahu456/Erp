import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Package, AlertTriangle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { OutwardRecord, OutwardType } from '../types'
import { mockOutwardRecords } from '../data/outward'

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

function DispatchCard({
  record,
  actionLabel,
  onAction,
  showWarning,
}: {
  record: OutwardRecord
  actionLabel: string
  onAction: () => void
  showWarning?: boolean
}) {
  const isPastDue = isDatePastOrToday(record.expectedDispatchDate)

  return (
    <Card className={showWarning && isPastDue ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardContent className="flex items-start justify-between gap-4 py-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Link
              to={`/wms/outward/${record.id}`}
              className="font-medium text-primary hover:underline"
            >
              {record.outwardNumber}
            </Link>
            <StatusBadge variant={TYPE_VARIANT[record.type]}>
              {TYPE_LABELS[record.type]}
            </StatusBadge>
          </div>
          <p className="text-sm font-medium">{record.customerName}</p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>{record.devices.length} device(s)</span>
            <span>Expected: {formatDate(record.expectedDispatchDate)}</span>
            {record.logistics.vehicleNumber && (
              <span>Vehicle: {record.logistics.vehicleNumber}</span>
            )}
            {record.logistics.transporterName && (
              <span>Transporter: {record.logistics.transporterName}</span>
            )}
          </div>
          {showWarning && !record.logistics.vehicleNumber && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="size-3" />
              No vehicle assigned
            </div>
          )}
          {showWarning && isPastDue && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="size-3" />
              Expected date is past due
            </div>
          )}
        </div>
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DispatchPage() {
  const [statuses, setStatuses] = useState<Record<string, OutwardRecord['status']>>(() => {
    const map: Record<string, OutwardRecord['status']> = {}
    mockOutwardRecords.forEach((r) => {
      map[r.id] = r.status
    })
    return map
  })

  const getStatus = (id: string) => statuses[id] ?? 'Draft'

  const toPrepare = useMemo(
    () => mockOutwardRecords.filter((r) => {
      const s = getStatus(r.id)
      return s === 'Approved' || s === 'Picking'
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statuses]
  )

  const readyForQC = useMemo(
    () => mockOutwardRecords.filter((r) => getStatus(r.id) === 'Packed'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statuses]
  )

  const readyToShip = useMemo(
    () => mockOutwardRecords.filter((r) => {
      const s = getStatus(r.id)
      return s === 'QC Passed' || s === 'Ready for Dispatch'
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statuses]
  )

  const updateStatus = (id: string, newStatus: OutwardRecord['status'], message: string) => {
    setStatuses((prev) => ({ ...prev, [id]: newStatus }))
    toast.success(message)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dispatch Queue</h1>
        <p className="text-sm text-muted-foreground">
          Store manager operational view -- prepare, QC, and ship outward records.
        </p>
      </div>

      {/* To Prepare */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-amber-600" />
          <h2 className="text-lg font-semibold">To Prepare ({toPrepare.length})</h2>
        </div>
        {toPrepare.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No outward records need preparation.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {toPrepare.map((r) => (
              <DispatchCard
                key={r.id}
                record={r}
                actionLabel={getStatus(r.id) === 'Approved' ? 'Start Picking' : 'Mark Packed'}
                onAction={() => {
                  const s = getStatus(r.id)
                  if (s === 'Approved') {
                    updateStatus(r.id, 'Picking', `Picking started for ${r.outwardNumber}`)
                  } else {
                    updateStatus(r.id, 'Packed', `${r.outwardNumber} marked as packed`)
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Ready for QC */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Ready for QC ({readyForQC.length})</h2>
        </div>
        {readyForQC.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No packed outward records waiting for QC.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {readyForQC.map((r) => (
              <DispatchCard
                key={r.id}
                record={r}
                actionLabel="Send to QC"
                onAction={() => updateStatus(r.id, 'Pending QC', `${r.outwardNumber} sent to QC`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Ready to Ship */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">Ready to Ship ({readyToShip.length})</h2>
        </div>
        {readyToShip.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No outward records ready for shipping.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {readyToShip.map((r) => (
              <DispatchCard
                key={r.id}
                record={r}
                actionLabel="Dispatch"
                showWarning
                onAction={() => {
                  if (!r.logistics.vehicleNumber) {
                    toast.error(`Please assign a vehicle to ${r.outwardNumber} before dispatching.`)
                    return
                  }
                  updateStatus(r.id, 'Dispatched', `${r.outwardNumber} dispatched!`)
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
