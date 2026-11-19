import { MapPin, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

import { SCRAP_PLACEMENT_QUEUE_STRINGS as S } from './scrap-placement-queue.strings'

export type AssignSubject = { id: string; warehouseId: string; serial: string; mfrSerial: string }
/** Un-scrap inputs: `available` needs a location, a pipeline target needs a warehouse. */
export type UnscrapSubject = {
  id: string
  serial: string
  priorStatus: string
  hasLocation: boolean
  hasWarehouse: boolean
}

/** Per-row actions: place, or un-scrap. `allowed` comes from the caller. */
export function ScrapQueueRowActions({
  row,
  allowed,
  onAssign,
  onUnscrap,
}: {
  row: Record<string, unknown>
  allowed: boolean
  onAssign: (subject: AssignSubject) => void
  onUnscrap: (subject: UnscrapSubject) => void
}) {
  // §0.9: a role-gated action is HIDDEN, not labelled "No access" — an
  // em-dash, row stays clickable to open the device.
  if (!allowed) {
    return (
      <Typography variant="helper" tone="muted" asChild>
        <span>{S.rowActions.noAccess}</span>
      </Typography>
    )
  }
  const id = String(row.id)
  const serial = String(row.serial)
  const warehouseId = String(row.warehouseId ?? '')
  return (
    <div className="inline-flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        className="shrink-0"
        onClick={() => onAssign({ id, warehouseId, serial, mfrSerial: String(row._mfrSerial ?? '') })}
      >
        <MapPin className="size-3.5" data-icon="inline-start" />
        {S.rowActions.assignLocation}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={() =>
          onUnscrap({
            id,
            serial,
            priorStatus: String(row.priorStatus ?? ''),
            // Queue rows are unplaced by definition, so `available` is never legal here.
            hasLocation: false,
            hasWarehouse: !!warehouseId,
          })
        }
      >
        <RotateCcw className="size-3.5" data-icon="inline-start" />
        {S.rowActions.unscrap}
      </Button>
    </div>
  )
}
