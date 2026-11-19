import { CheckCircle2, Truck, Warehouse } from 'lucide-react'

import { ExpandableClampText } from '@/components/common/display/ExpandableClampText'
import type { WorkOrder } from '../../types'
import { destinationFieldValue, formatDate } from './work-order-detail-helpers'
import { WORK_ORDERS_STRINGS } from './work-orders.strings'

const SD = WORK_ORDERS_STRINGS.detail

function RentalOrderNote() {
  return (
    <div className="border-t px-6 py-4">
      <div className="flex items-center gap-2 rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">
        <Warehouse className="size-4 shrink-0" />
        <span>
          {SD.rentalOrderNote.split(SD.rentalOrderNoteStrong)[0]}
          <strong>{SD.rentalOrderNoteStrong}</strong>
          {SD.rentalOrderNote.split(SD.rentalOrderNoteStrong)[1]}
        </span>
      </div>
    </div>
  )
}

export function WorkOrderDestinationCard({ wo }: { wo: WorkOrder }) {
  const isRental = wo.destinationType === 'RENTAL_WAREHOUSE'
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold flex items-center gap-2">
          {isRental ? (
            <>
              <Warehouse className="size-4" />
              {SD.rentalWarehouseRoutingTitle}
            </>
          ) : (
            <>
              <Truck className="size-4" />
              {SD.dispatchBillingTitle}
            </>
          )}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 px-6 py-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{SD.destinationFieldLabel}</p>
          <p className="mt-1 font-medium">{destinationFieldValue(wo)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{SD.customerFieldLabel}</p>
          <p className="mt-1 font-medium">{wo.customerName ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{SD.invoiceFieldLabel}</p>
          <p className="mt-1 font-medium">{wo.invoiceNumber ?? SD.notYetInvoiced}</p>
        </div>
      </div>
      {isRental && <RentalOrderNote />}
    </div>
  )
}

function PeopleCard({ wo }: { wo: WorkOrder }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-3 font-semibold">{SD.peopleTitle}</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{SD.createdBy}</dt>
          <dd>{wo.createdBy}</dd>
        </div>
        {wo.approvedBy && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{SD.approvedBy}</dt>
            <dd className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-success" />
              {wo.approvedBy}
            </dd>
          </div>
        )}
        {wo.assignedTo && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{SD.assignedTo}</dt>
            <dd>{wo.assignedTo}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function DatesCard({ wo }: { wo: WorkOrder }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-3 font-semibold">{SD.datesTitle}</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{SD.createdDate}</dt>
          <dd>{formatDate(wo.createdAt)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{SD.requestedDate}</dt>
          <dd>{formatDate(wo.requestedDate)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{SD.dueDate}</dt>
          <dd>{formatDate(wo.dueDate)}</dd>
        </div>
        {wo.completedAt && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{SD.completedDate}</dt>
            <dd className="text-success">{formatDate(wo.completedAt)}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export function WorkOrderMetaCards({ wo }: { wo: WorkOrder }) {
  return (
    <>
      {/* Metadata */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PeopleCard wo={wo} />
        <DatesCard wo={wo} />
      </div>

      {/* Notes */}
      {wo.notes && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-3 font-semibold">{SD.notesTitle}</h3>
          <ExpandableClampText text={wo.notes} lines={3} variant="body" tone="muted" />
        </div>
      )}
    </>
  )
}
