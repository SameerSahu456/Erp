import { useState } from 'react'
import { Info, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

import type { ViewRepair } from '../../../hooks/dashboard/insight-view.params'
import { FIELD_LABEL } from './facet-options'
import { INSIGHTS_STRINGS } from './insights.strings'

// "We adjusted this link" — shown when the URL carried something the board
// could not send and `parseInsightParams` repaired it.
//
// WHY A NOTICE AT ALL: the repair is a guess (an inverted range is swapped, an
// unusable one falls back to monthly). A silent guess means the board answers a
// different question than the URL claims — the number is right and the label a
// lie. The same call the Growth tile already makes when its period is coerced.
//
// INLINE, not a toast: the condition persists for as long as the URL does, and
// a `sonner` toast is gone in four seconds. Not a modal either — the board
// underneath is perfectly usable, which is the entire point of repairing rather
// than rejecting.
//
// Renders NOTHING when `repairs` is empty, which is the overwhelmingly common
// case — so the three pages mount it unconditionally and pay nothing for it.

const S = INSIGHTS_STRINGS.viewRepair

/** One repair → one sentence. A `switch` rather than a lookup map because the
 *  `bad-id` case needs the repair's own payload (`param`, `dropped.length`). */
function describe(repair: ViewRepair): string {
  if (repair.param === 'period') return S.periodUnknown
  if (repair.param === 'view') return S.viewUnknown
  if (repair.param === 'role') return repair.reason === 'multiple' ? S.roleMultiple : S.roleUnknown
  if (repair.param === 'range') {
    if (repair.reason === 'inverted') return S.rangeInverted
    if (repair.reason === 'future') return S.rangeFuture
    return S.rangeMalformed
  }
  // A facet — `param` is the `MultiFilterKey`, so it names itself.
  return S.badIds(FIELD_LABEL[repair.param].toLowerCase(), repair.dropped.length)
}

export function InsightViewNotice({ repairs }: { repairs: ViewRepair[] }) {
  const [dismissed, setDismissed] = useState(false)

  if (repairs.length === 0 || dismissed) return null

  // DEDUPE the sentences, not the repairs. A malformed range can push both
  // `future` and `malformed` (a wholly-future window is clamped, then found
  // inverted), and two facets with bad ids produce two DIFFERENT sentences that
  // must both survive. Keying on the rendered text handles both correctly.
  const lines = [...new Set(repairs.map(describe))]

  return (
    <div
      // `role="status"` not `alert`: this is informational and the page is
      // usable — an alert would interrupt a screen reader mid-flow for something
      // the user did not just do.
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning-soft px-3.5 py-2.5"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={2} aria-hidden />
      {/* min-w-0 so a long sentence wraps instead of pushing the row wide (§8.7). */}
      <div className="min-w-0 flex-1">
        <Typography variant="body-strong">{S.title}</Typography>
        <ul className="mt-0.5 space-y-0.5">
          {lines.map((line) => (
            <li key={line}>
              <Typography variant="helper" tone="muted">
                {line}
              </Typography>
            </li>
          ))}
        </ul>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={() => setDismissed(true)}
        aria-label={S.dismiss}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
