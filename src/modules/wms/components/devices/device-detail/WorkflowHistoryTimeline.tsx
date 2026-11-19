import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { Timeline } from '@/components/common/display/Timeline'

import type { CycleTimelineEntry } from './workflow-event-registry'
import { WORKFLOW_HISTORY_CARD_STRINGS } from './workflow-history-card.strings'

/** Timeline body: skeleton, per-cycle partitions, a single timeline, or empty. */
export function WorkflowHistoryTimeline({
  isLoading,
  orderedEntries,
  cycleGroups,
  multiCycle,
}: {
  isLoading: boolean
  orderedEntries: CycleTimelineEntry[]
  cycleGroups: { cycle: number; entries: CycleTimelineEntry[] }[]
  multiCycle: boolean
}) {
  if (isLoading && orderedEntries.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }
  if (orderedEntries.length === 0) {
    return (
      <Typography variant="body" tone="muted">
        {WORKFLOW_HISTORY_CARD_STRINGS.card.empty}
      </Typography>
    )
  }
  if (!multiCycle) return <Timeline entries={orderedEntries} />
  return (
    // One partition per workflow cycle so each lifecycle reads separately.
    <div className="space-y-6">
      {cycleGroups.map((g) => (
        <div key={g.cycle} className="space-y-3">
          <div className="flex items-center gap-3">
            <Typography variant="helper" tone="muted" asChild>
              <span className="uppercase tracking-wide">
                {WORKFLOW_HISTORY_CARD_STRINGS.card.cyclePartition(g.cycle)}
              </span>
            </Typography>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Timeline entries={g.entries} />
        </div>
      ))}
    </div>
  )
}
