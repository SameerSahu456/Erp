import { useLayoutEffect, useRef, useState } from 'react'
import { Cpu, Microscope, PackageSearch, ScanLine, Wrench } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { TruncatedText } from '@/components/common/display/TruncatedText'
import { cn } from '@/lib/utils'

import type { SpareRequestListResponse } from '../../../api'
import { type FitSubject } from '../../spares/FitSpareDialog'
import { type FulfillSubject } from '../../spares/FulfillSpareDialog'
import { type ReturnSubject } from '../../spares/ReturnSpareDialog'
import { SpareIssuedUnitsCell } from '../../spares/SpareIssuedUnitsCell'
import { SpareRequestActionsCell } from '../../spares/SpareRequestActionsCell'
import { toSpareRequestRow } from '../../spares/spares-body-helpers'
import { SPARES_STRINGS } from '../../spares/spares.strings'
import { SPARES_REQUESTED_CARD_STRINGS as S } from './spares-requested-card.strings'
import { spareItemView, type SpareActionAccess } from './spare-request-item-helpers'

type SpareListItem = SpareRequestListResponse['items'][number]

const STAGE_ICON: Record<string, typeof ScanLine> = {
  inspection: ScanLine,
  repair: Wrench,
  qc: Microscope,
}

export type { SpareActionAccess }

interface SpareRequestItemProps {
  spare: SpareListItem
  /** The stage that raised it (from the device's op-id → stage map). */
  stage: string | undefined
  access: SpareActionAccess
  canCancel: boolean
  onFulfill: (s: FulfillSubject) => void
  onReturn: (s: ReturnSubject) => void
  onCancel: (id: string) => void
  onFit: (s: FitSubject) => void
}

/** One spare request card; actions mirror the Spares queue cell. */
export function SpareRequestItem({
  spare: s,
  stage,
  access,
  canCancel,
  onFulfill,
  onReturn,
  onCancel,
  onFit,
}: SpareRequestItemProps) {
  const StageIcon = (stage && STAGE_ICON[stage]) || PackageSearch
  const { fulfilled, requested, returned, showCounts, hasActions, fittable, meta, badge } = spareItemView(s, {
    stage,
    access,
    canCancel,
  })

  return (
    <li className="py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <StageIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-0.5">
            <Typography variant="body-strong" asChild>
              {/* A description-only request has no part yet — show the
                  engineer's own words, not the generic fallback. Long part
                  numbers get cut, so the full name shows on hover. */}
              <TruncatedText
                value={s.part_variant_name || s.description || S.partFallback}
                className="max-w-full"
              />
            </Typography>
            <Typography variant="helper" tone="muted" asChild>
              <p className="truncate tabular-nums">{meta}</p>
            </Typography>
            {showCounts && (
              <Typography variant="helper" tone="muted" asChild>
                <span className="tabular-nums">
                  {S.fulfilledLine(fulfilled, requested)}
                  {returned > 0 ? ` ${S.returnedLine(returned, fulfilled - returned)}` : ''}
                </span>
              </Typography>
            )}
            {/* Which unit was issued, so the engineer needn't dig through
                history or the Spares list for it. */}
            {(s.fulfilled_units?.length ?? 0) > 0 && (
              <div className="flex min-w-0 items-baseline gap-1.5">
                <Typography variant="helper" tone="muted" asChild>
                  <span className="shrink-0">{S.issuedLabel}</span>
                </Typography>
                <SpareIssuedUnitsCell units={s.fulfilled_units ?? []} inline />
              </div>
            )}
            {returned > 0 && s.return_reason && (
              <ReturnNote label={S.returnReasonLabel} text={s.return_reason} />
            )}
          </div>
        </div>
        <StatusBadge className="mt-0.5 shrink-0" variant={badge.variant}>
          {badge.label}
        </StatusBadge>
      </div>
      {(hasActions || fittable) && (
        <div className="mt-2.5 flex justify-end gap-2 pl-7">
          {fittable && s.part_variant_id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onFit({
                  id: s.id,
                  deviceId: s.stock_item_id,
                  partVariantId: s.part_variant_id as string,
                  partLabel: s.part_variant_name || s.description || S.partFallback,
                })
              }
            >
              <Cpu className="size-3.5" data-icon="inline-start" />
              {SPARES_STRINGS.fitDialog.trigger}
            </Button>
          )}
          <SpareRequestActionsCell
            row={toSpareRequestRow(s)}
            access={access}
            canCancel={canCancel}
            onFulfill={onFulfill}
            onReturn={onReturn}
            onCancel={onCancel}
            emptyFallback={null}
          />
        </div>
      )}
    </li>
  )
}

/** The operator's return reason, clamped to 3 lines with a Show more / Show
 *  less toggle that appears ONLY when the note actually overflows. */
function ReturnNote({ label, text }: { label: string; text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)
  // A DOM measurement in the clamped state; deps are the text only, so
  // expanding never re-measures and the toggle stays put.
  useLayoutEffect(() => {
    const el = ref.current
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 1)
  }, [text])
  return (
    <div className="space-y-0.5">
      <Typography variant="helper" tone="muted" asChild>
        <p ref={ref} className={cn('break-words text-justify leading-snug', !expanded && 'line-clamp-3')}>
          <span className="font-medium">{label}: </span>
          {text}
        </p>
      </Typography>
      {overflows && (
        <Typography variant="helper" asChild>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-medium text-primary hover:underline"
          >
            {expanded ? S.showLess : S.showMore}
          </button>
        </Typography>
      )}
    </div>
  )
}
