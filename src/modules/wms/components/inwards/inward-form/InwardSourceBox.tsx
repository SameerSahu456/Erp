import { Typography } from '@/components/ui/typography'

import type { InwardForm } from './useInwardForm'
import { ManualCaptureFields } from './ManualCaptureFields'
import { ReturnSourcePicker } from './ReturnSourcePicker'
import { PoSourcePicker } from './PoSourcePicker'
import { INWARDS_STRINGS } from '../inwards.strings'

// Which source UI to show for the chosen inward type. Early returns instead of
// a nested ternary (§14 #5); behaviour matches the original branch order.
function SourceBoxInner({ f }: { f: InwardForm }) {
  const { sourcesQuery, isManual, isReturn, sources, cfg } = f

  if (isManual) return <ManualCaptureFields f={f} />
  if (isReturn) {
    if (sourcesQuery.isLoading)
      return <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-muted" />
    if (sources.length === 0)
      return (
        <Typography variant="body" tone="muted">
          {INWARDS_STRINGS.sourceBox.noPendingReturn(
            cfg?.noun ?? INWARDS_STRINGS.sourceBox.sourceNounFallback,
          )}
        </Typography>
      )
    return <ReturnSourcePicker f={f} />
  }
  // PO flow: always render the picker so the New/Refurbished switch stays
  // visible even when the chosen origin has no receivable POs. The picker owns
  // its own loading and empty states inside the PO field, so the operator can
  // always flip origin instead of getting stranded on an empty condition.
  return <PoSourcePicker f={f} />
}

/** The dashed source box under the type grid — switches between loading, on-call
 *  capture, the return picker, and the PO picker. */
export function InwardSourceBox({ f }: { f: InwardForm }) {
  return (
    <div className="space-y-4 rounded-lg border border-dashed bg-muted/20 p-4">
      <SourceBoxInner f={f} />
    </div>
  )
}
