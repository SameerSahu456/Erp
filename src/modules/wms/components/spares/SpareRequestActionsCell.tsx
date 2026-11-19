/** Spare-request actions cell (Fulfil / Return / Cancel), gated by status and grants. */
import type { ReactNode } from 'react'
import { PackageCheck, Undo2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

import type { FulfillSubject } from './FulfillSpareDialog'
import type { ReturnSubject } from './ReturnSpareDialog'
import { hasLooseUnit } from './spares-body-helpers'
import { SPARES_STRINGS } from './spares.strings'

interface SpareRequestActionsCellProps {
  row: Record<string, unknown>
  access: { canManageSpares: boolean; canFulfill: boolean; canReturn: boolean }
  // Anyone with spares access on the device's warehouse may cancel — whichever
  // stage they work (inspection / repair / qc) and whoever raised it, so an
  // engineer the device is reassigned to can withdraw a predecessor's request.
  // Mirrors the backend, where the route's spares gate is the only check.
  canCancel: boolean
  onFulfill: (subject: FulfillSubject) => void
  onReturn: (subject: ReturnSubject) => void
  onCancel: (reqId: string) => void
  /** Rendered when the row offers no action. The table wants an em dash so the
   *  column never reads empty; the device card passes `null` to show nothing. */
  emptyFallback?: ReactNode
}

const EM_DASH = (
  <Typography variant="helper" tone="muted" asChild>
    <span>—</span>
  </Typography>
)

export function SpareRequestActionsCell({
  row,
  access,
  canCancel,
  onFulfill,
  onReturn,
  onCancel,
  emptyFallback = EM_DASH,
}: SpareRequestActionsCellProps) {
  const { canManageSpares, canFulfill, canReturn } = access
  const status = row.status as string
  const reqId = row.id as string
  const fulfilledQty = Number(row.fulfilled) || 0
  const returnedQty = Number(row.returned) || 0
  // A return acts on units that WERE issued, so it survives 'fulfilled' —
  // the one action that does. It disappears once everything is back.
  const returnable =
    canReturn &&
    (status === 'fulfilled' || status === 'partially_fulfilled') &&
    returnedQty < fulfilledQty &&
    // A fitted part comes back only from the device's Components section.
    hasLooseUnit(row.issuedUnits as { status?: string | null }[] | undefined)
  const returnBtn = returnable ? (
    <Button
      size="sm"
      variant="outline"
      onClick={() =>
        onReturn({
          id: reqId,
          partVariantId: row.partVariantId as string,
          partLabel: `${row.partNo} · ${row.variant}`,
          fulfilled: fulfilledQty,
          returned: returnedQty,
        })
      }
    >
      <Undo2 className="size-3.5" data-icon="inline-start" />
      {SPARES_STRINGS.requestTable.actionReturn}
    </Button>
  ) : null

  const terminal = status === 'fulfilled' || status === 'cancelled'
  if (!canManageSpares || terminal) {
    if (!returnBtn) {
      return <>{emptyFallback}</>
    }
    // Stop propagation so the row click doesn't open the device page.
    return (
      <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {returnBtn}
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {canFulfill && (
        <Button
          size="sm"
          onClick={() =>
            onFulfill({
              id: reqId,
              partVariantId: (row.partVariantId as string | null) ?? null,
              description: (row.description as string | null) ?? null,
              partLabel: row.partVariantId
                ? `${row.partNo} · ${row.variant}`
                : String(row.description ?? ''),
              requested: Number(row.requested) || 0,
              fulfilled: Number(row.fulfilled) || 0,
            })
          }
        >
          <PackageCheck className="size-3.5" data-icon="inline-start" />
          {SPARES_STRINGS.bodyView.fulfillAction}
        </Button>
      )}
      {returnBtn}
      {canCancel && (
        <Button
          size="sm"
          variant="destructive"
          aria-label={SPARES_STRINGS.bodyView.cancelRequestAria}
          onClick={() => onCancel(reqId)}
        >
          <X className="size-3.5" data-icon="inline-start" />
          {SPARES_STRINGS.requestTable.actionCancel}
        </Button>
      )}
    </div>
  )
}
