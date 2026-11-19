import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import { INSIGHTS_STRINGS } from './insights.strings'

// The ONE empty state for every insight surface — widgets, detail cells and the
// records page.
//
// It FILLS its container rather than sizing to its one line of text. Before
// this, an empty widget was a ~40px stub ("No records found." with `py-6`)
// sitting beside a 400px populated neighbour, which read as a broken card
// rather than an empty one. `flex-1` claims the widget body's free space —
// `InsightWidget` already lays its body out as `flex flex-1 flex-col`, so the
// card's own height is what the message centres in.
//
// `MIN_H` keeps an empty card from collapsing into a strip without tying its
// height to a neighbouring widget. That matters for paged dashboard cards:
// increasing one widget's page size must not make an empty sibling grow too.
const MIN_H = 'min-h-40'

interface InsightEmptyStateProps {
  /** Override for a surface that needs its own wording. Defaults to the shared
   *  "No records found." — see `NO_RECORDS` in `insights.strings`. */
  label?: string
  className?: string
}

export function InsightEmptyState({ label, className }: InsightEmptyStateProps) {
  return (
    <div className={cn('flex flex-1 items-center justify-center px-3 py-6', MIN_H, className)}>
      <Typography variant="helper" tone="muted" asChild>
        <p className="text-center">{label ?? INSIGHTS_STRINGS.detail.noResults}</p>
      </Typography>
    </div>
  )
}
