import { ArrowRight, ChevronRight } from "lucide-react"

import { cn, stripHtml } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Typography } from "@/components/ui/typography"
import { ExpandableText } from "@/components/common/display/ExpandableText"
import { UI } from "@/shared/constants"
import { formatIST } from "@shared/lib/date"

import { USER_ACTIVITY_STRINGS as S } from "./user-activity.strings"
import { entityBadgeVariant } from "./user-activity.mappers"
import { typeConfig } from "./user-activity.config"
import { type UserActivityEntry } from "./user-activity.types"
import { FieldChangesSection } from "./FieldChangesSection"

interface ActivityEntryCardProps {
  entry: UserActivityEntry
  changesExpanded: boolean
  onToggleChanges: (id: string) => void
  onNavigate: (link?: string) => void
}

/** One timeline entry: leading icon, title, type-specific badges/diffs, the
 *  detail body, the linked record, and the timestamp. The whole card navigates
 *  to the linked record when clickable. */
export function ActivityEntryCard({
  entry,
  changesExpanded,
  onToggleChanges,
  onNavigate,
}: ActivityEntryCardProps) {
  const Icon = typeConfig[entry.type].icon
  const isFieldChange = entry.type === "field_change"
  const isLost = entry.type === "closed_lost"
  const isRejection = entry.type === "rejection"
  const isStageChange = entry.type === "stage_change"
  const clickable = Boolean(entry.link)

  return (
    <div className="relative flex gap-3">
      <div className="absolute -left-6 top-1.5 size-3 rounded-full bg-foreground ring-2 ring-background" />
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={() => onNavigate(entry.link)}
        onKeyDown={(e) => {
          if (clickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            onNavigate(entry.link)
          }
        }}
        className={cn(
          "min-w-0 flex-1 rounded-lg border bg-muted/30 p-3 text-left",
          clickable &&
            "cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/60",
        )}
      >
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <Typography variant="body-strong" className="block break-words">
              {entry.title}
            </Typography>

            {isStageChange && entry.metadata?.from && entry.metadata?.to && (
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="secondary" size="sm">
                  {entry.metadata.from}
                </Badge>
                <ArrowRight className="size-3 text-muted-foreground" />
                <Badge variant="info" size="sm">
                  {entry.metadata.to}
                </Badge>
              </div>
            )}

            {(isLost || isRejection) && entry.metadata?.reason && (
              <div className="mt-1.5 rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2">
                <Typography variant="helper" tone="danger" className="break-words">
                  {entry.metadata.reason}
                </Typography>
              </div>
            )}

            {entry.changes && entry.changes.length > 0 && (
              <FieldChangesSection
                changes={entry.changes}
                expanded={changesExpanded}
                onToggle={() => onToggleChanges(entry.id)}
              />
            )}

            {entry.detail && !isLost && !isRejection && !isFieldChange && (
              <ExpandableText
                text={stripHtml(entry.detail)}
                chunkSize={UI.RICH_TEXT_CLAMP_LIMIT}
                expandMode="all"
                className="mt-0.5"
                showMoreLabel={S.detail.showMore}
                showLessLabel={S.detail.showLess}
                renderContent={(t) => (
                  <Typography
                    variant="body"
                    tone="muted"
                    className="block break-words whitespace-pre-wrap"
                  >
                    {t}
                  </Typography>
                )}
              />
            )}

            {(entry.type === "task" || entry.type === "meeting") &&
              (entry.metadata?.status ||
                entry.metadata?.priority ||
                entry.metadata?.meeting_type) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {entry.metadata?.status && (
                    <Badge variant="secondary" size="sm">
                      {entry.metadata.status}
                    </Badge>
                  )}
                  {entry.type === "task" && entry.metadata?.priority && (
                    <Badge variant="outline" size="sm">
                      {entry.metadata.priority}
                    </Badge>
                  )}
                  {entry.type === "meeting" && entry.metadata?.meeting_type && (
                    <Badge variant="outline" size="sm">
                      {entry.metadata.meeting_type}
                    </Badge>
                  )}
                </div>
              )}

            {/* "Assigned to <name>" — who the task/meeting is assigned to,
                resolved server-side. The row itself is attributed to the
                creator (see backend `_from_task` / `_from_meeting`). */}
            {(entry.type === "task" || entry.type === "meeting") &&
              entry.metadata?.assigned_to_name && (
                <Typography variant="helper" tone="muted" className="mt-1.5 block break-words">
                  {S.assignedTo(entry.metadata.assigned_to_name)}
                </Typography>
              )}

            {entry.linkLabel && (
              <div className="mt-1.5 flex items-center gap-1">
                {entry.entityKind && (
                  <Badge
                    variant={entityBadgeVariant(entry.entityKind)}
                    size="sm"
                    className="shrink-0"
                  >
                    {entry.entityKind}
                  </Badge>
                )}
                <Typography variant="helper" tone="primary" className="min-w-0 truncate font-medium">
                  {entry.linkLabel}
                </Typography>
                {clickable && <ChevronRight className="size-3 shrink-0 text-muted-foreground" />}
              </div>
            )}

            <Typography variant="helper" tone="muted" className="mt-1.5 block">
              {formatIST(entry.timestamp)}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  )
}
