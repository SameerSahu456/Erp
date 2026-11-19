import { Progress } from '@/components/ui/progress'
import { Typography } from '@/components/ui/typography'
import type { ChecklistItem } from '../../api'
import { isItemAnswered, type ChecklistResponses } from './checklistResponses'

interface ChecklistProgressProps {
  items: ChecklistItem[]
  responses: ChecklistResponses
  /** Section label (e.g. "Checklist") — module-local string per §16.12. */
  label: string
  /** "N/M required" formatter — module-local string per §16.12. */
  formatProgress: (answered: number, required: number) => string
}

// Slim the primitive's track to the hairline this header has always used.
const TRACK_CLASS =
  '[&_[data-slot=progress-track]]:h-1 [&_[data-slot=progress-track]]:bg-muted motion-reduce:[&_[data-slot=progress-indicator]]:transition-none'

/**
 * The shared "X/Y required" checklist header + completion meter used by every
 * stage-complete dialog (inspection / repair / qc) so the operator sees how
 * many required items remain — one implementation, one behaviour (§7).
 *
 * The meter is the shared `<Progress>` primitive, slimmed to the original
 * hairline (h-1 on a muted track): primary while filling, success once every
 * required item is answered.
 */
export function ChecklistProgress({
  items,
  responses,
  label,
  formatProgress,
}: ChecklistProgressProps) {
  const requiredCount = items.filter((i) => i.required).length
  const answeredRequired = items.filter(
    (i) => i.required && isItemAnswered(i, responses[i.key]),
  ).length
  const done = answeredRequired >= requiredCount

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Typography variant="badge" tone="muted" asChild>
          <span>{label}</span>
        </Typography>
        <Typography variant="helper" tone={done ? 'success' : 'muted'} numeric asChild>
          <span>{formatProgress(answeredRequired, requiredCount)}</span>
        </Typography>
      </div>
      {requiredCount > 0 && (
        <Progress
          value={Math.min(100, (answeredRequired / requiredCount) * 100)}
          color={done ? 'success' : 'dark'}
          aria-label={label}
          className={TRACK_CLASS}
        />
      )}
    </div>
  )
}
