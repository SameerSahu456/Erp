import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import { USER_ACTIVITY_STRINGS as S } from "./user-activity.strings"
import { type UserActivityEntry } from "./user-activity.types"
import { ActivityEntryCard } from "./ActivityEntryCard"

interface ActivityDayGroup {
  day: string
  items: UserActivityEntry[]
}

interface ActivityTimelineListProps {
  isLoading: boolean
  isError: boolean
  error: unknown
  groups: ActivityDayGroup[]
  expandedChanges: Set<string>
  onToggleChanges: (id: string) => void
  onNavigate: (link?: string) => void
  /** Scroll mode: render the IntersectionObserver sentinel after the list. */
  showSentinel: boolean
  setSentinelNode: (node: HTMLDivElement | null) => void
}

/** The timeline body: loading skeletons, error/empty states, or the day-bucketed
 *  list of activity cards, plus the infinite-scroll sentinel in scroll mode. */
export function ActivityTimelineList({
  isLoading,
  isError,
  error,
  groups,
  expandedChanges,
  onToggleChanges,
  onNavigate,
  showSentinel,
  setSentinelNode,
}: ActivityTimelineListProps) {
  return (
    <>
      {isError ? (
        <LoadErrorState error={error} fallback={S.loadError} />
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.day} className="space-y-3">
              <Typography
                variant="helper"
                tone="muted"
                className="block font-medium uppercase tracking-wide"
              >
                {group.day}
              </Typography>
              <div className="relative space-y-3 pl-6">
                <div className="absolute bottom-0 left-[5px] top-1.5 w-0.5 bg-foreground/15" />
                {group.items.map((entry) => (
                  <ActivityEntryCard
                    key={entry.id}
                    entry={entry}
                    changesExpanded={expandedChanges.has(entry.id)}
                    onToggleChanges={onToggleChanges}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Typography variant="body" tone="muted">
            {S.empty}
          </Typography>
        </div>
      )}

      {/* Scroll mode: sentinel the IntersectionObserver watches to load more. */}
      {showSentinel && <div ref={setSentinelNode} className="h-1" />}
    </>
  )
}
