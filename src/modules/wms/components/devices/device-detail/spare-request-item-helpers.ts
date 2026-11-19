import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { formatIST } from '@shared/lib/date'

import type { SpareRequestListResponse } from '../../../api'
import { hasLooseUnit } from '../../spares/spares-body-helpers'
import { SPARE_STATUS_LABELS, SPARE_STATUS_VARIANT } from './helpers'
import { SPARES_REQUESTED_STAGE_LABELS as STAGE_LABEL } from './spares-requested-card.strings'

type SpareListItem = SpareRequestListResponse['items'][number]

/** The same grants the Spares queue uses, so the card and the queue agree. */
export interface SpareActionAccess {
  canManageSpares: boolean
  canFulfill: boolean
  canReturn: boolean
  /** Device card only: may record a fulfilled spare inside the device. */
  canFit?: boolean
}

interface SpareItemContext {
  stage: string | undefined
  access: SpareActionAccess
  canCancel: boolean
}

/** Drop a trailing "None"/"null" a missing last name leaves on a joined name. */
const cleanName = (n: string | null | undefined) => (n ?? '').replace(/\s+(none|null|undefined)$/i, '').trim()

/** "Stage · Requester · when", skipping the parts that are unknown. */
function spareMetaLine(stage: string | undefined, requesterName: string | null | undefined, at?: string | null) {
  return [
    stage ? (STAGE_LABEL[stage] ?? stage) : null,
    cleanName(requesterName),
    at ? formatIST(at) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Returned wins (status stays 'fulfilled' through a return); a fully
 *  fulfilled request reads success; else the status's own badge. */
function spareBadge(
  status: string,
  anyReturned: boolean,
  done: boolean,
): { label: string; variant: StatusBadgeVariant } {
  if (anyReturned) return { label: SPARE_STATUS_LABELS.returned, variant: SPARE_STATUS_VARIANT.returned }
  return {
    label: SPARE_STATUS_LABELS[status] ?? status,
    variant: done ? 'success' : (SPARE_STATUS_VARIANT[status] ?? 'neutral'),
  }
}

/** A one-unit request's pill already says it all; an older multi-unit one needs the counts. */
const showsCounts = (cancelled: boolean, requested: number) => !cancelled && requested > 1

/** Issued, not yet returned, and not yet fitted into the device. */
const hasLooseUnitLeft = (s: SpareListItem) =>
  (s.quantity_returned ?? 0) < (s.quantity_fulfilled ?? 0) && hasLooseUnit(s.fulfilled_units)

/** Display values for one spare request row. */
export function spareItemView(s: SpareListItem, ctx: SpareItemContext) {
  const { access, canCancel } = ctx
  const requested = s.quantity_requested ?? 0
  const fulfilled = s.quantity_fulfilled ?? 0
  // quantity_fulfilled never drops on a return, so subtract returned units explicitly.
  const returned = s.quantity_returned ?? 0
  const cancelled = s.status === 'cancelled'
  // Mirror SpareRequestActionsCell's render conditions so the footer appears
  // only when a button will actually show.
  const terminal = s.status === 'fulfilled' || cancelled
  // Once a unit is fitted it comes back only from the device's Components
  // section, so neither Fit nor Return applies to it any more.
  const hasUnitToHandle = hasLooseUnitLeft(s)
  const returnable =
    access.canReturn &&
    (s.status === 'fulfilled' || s.status === 'partially_fulfilled') &&
    hasUnitToHandle
  // Fitting is the engineer's call (spares stage authority).
  const fittable = !!access.canFit && !cancelled && !!s.part_variant_id && hasUnitToHandle
  const hasActions =
    returnable || (access.canManageSpares && !terminal && (access.canFulfill || canCancel))
  return {
    fittable,
    requested,
    fulfilled,
    returned,
    showCounts: showsCounts(cancelled, requested),
    hasActions,
    meta: spareMetaLine(ctx.stage, s.requested_by_name, s.requested_at),
    badge: spareBadge(s.status, returned > 0, fulfilled >= requested),
  }
}
