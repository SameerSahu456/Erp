import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import { formatIST } from '@shared/lib/date'

import type { Activity } from '../../types'
import {
  activityTypeConfig,
  computeDiff,
  formatRelativeTime,
  humaniseKey,
  humaniseStage,
  stageBadgeVariant,
} from './auditTrailHelpers'
import { DiffValue } from './AuditResolvedName'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

interface AuditEntryProps {
  activity: Activity
  expanded: boolean
  onToggleExpand: () => void
}

// One timeline entry: status dot + content card (stage badges, reason boxes,
// description, actor/timestamp) and the collapsible field-level diff.
export function AuditEntry({ activity, expanded, onToggleExpand }: AuditEntryProps) {
  const config = activityTypeConfig[activity.type]
  const Icon = config.icon
  const isSuccess = ['account_created', 'deal_created', 'so_created', 'reinstatement'].includes(
    activity.type,
  )
  const isRejection = activity.type === 'rejection'
  const isClosedLost = activity.type === 'closed_lost'
  const isStageChange = activity.type === 'stage_change'

  const diff = computeDiff(activity.before, activity.after)
  const Chevron = expanded ? ChevronUp : ChevronDown

  return (
    <div className="relative flex gap-3">
      {/* Dot */}
      <div
        className={cn(
          'absolute -left-6 top-1.5 flex size-3 items-center justify-center rounded-full',
          config.dotColor,
        )}
      />

      {/* Content Card — `id` is the deep-link scroll/flash target:
          `useScrollToHashTarget` (notification + activity-log clicks) finds
          this node by `audit-<id>`. `scroll-mt-24` clears the sticky header. */}
      <div
        id={`audit-${activity.id}`}
        className={cn(
          // p-3 (not the old p-1.5) gives the deep-link flash ring the same
          // breathing room as the Comments / Tasks / Notes cards, so the
          // shared highlight frames the row instead of hugging the text.
          'min-w-0 flex-1 scroll-mt-24 rounded-lg border p-3',
          isSuccess && 'border-success/30 bg-success-soft/50',
          isStageChange && 'border-info-soft/80 bg-info-soft',
          (isRejection || isClosedLost) && 'border-destructive/30 bg-destructive-soft/50',
          !isSuccess && !isStageChange && !isRejection && !isClosedLost && 'bg-muted/30',
        )}
      >
        <div className="flex items-start gap-2">
          <Icon
            className={cn(
              'mt-0.5 size-4 shrink-0',
              isRejection || isClosedLost
                ? 'text-destructive'
                : isSuccess
                  ? 'text-success'
                  : 'text-muted-foreground',
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">{activity.title}</p>

            {/* Stage change: from → to badges. */}
            {isStageChange && activity.metadata?.from && activity.metadata?.to && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="grey-soft"
                  size="default"
                  className="border border-input bg-card text-muted-foreground line-through decoration-muted-foreground/60 decoration-1 shadow-sm"
                >
                  {humaniseStage(activity.metadata.from)}
                </Badge>
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border border-info-soft bg-info-soft text-info shadow-sm"
                  data-testid="stage-arrow"
                  role="img"
                  aria-label={CRM_SHARED_STRINGS.auditEntry.changedToLabel}
                >
                  <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                </span>
                <Badge
                  variant={stageBadgeVariant(activity.metadata.to)}
                  size="default"
                  className="ring-1 ring-current/10 shadow-sm"
                >
                  {humaniseStage(activity.metadata.to)}
                </Badge>
              </div>
            )}

            {/* Rejection: reason warning box */}
            {isRejection && activity.metadata?.reason && (
              <div className="mt-1.5 rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-warning">
                {activity.metadata.reason}
              </div>
            )}

            {/* Closed Lost: reason + notes */}
            {isClosedLost && activity.metadata?.reason && (
              <div className="mt-1.5 space-y-1">
                <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-xs text-destructive">
                  <span className="font-medium">
                    {CRM_SHARED_STRINGS.auditEntry.lostReasonLabel}
                  </span>{' '}
                  {activity.metadata.reason}
                </div>
                {activity.metadata.notes && (
                  <Typography variant="helper" className="italic" asChild>
                    <p>{activity.metadata.notes}</p>
                  </Typography>
                )}
              </div>
            )}

            {/* Description */}
            {activity.description && !isRejection && !isClosedLost && (
              <Typography variant="body" tone="muted" className="mt-0.5">
                {activity.description}
              </Typography>
            )}

            {/* User + timestamp (relative + absolute IST date/time) */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{activity.user}</span>
              <span>·</span>
              <span>{formatRelativeTime(activity.timestamp)}</span>
              <span>·</span>
              <span>{formatIST(activity.timestamp)}</span>
            </div>

            {/* Field-level diff — collapsed by default. */}
            {diff.length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  data-testid={`audit-expand-${activity.id}`}
                  aria-expanded={expanded}
                >
                  <Chevron className="size-3.5" />
                  <span>
                    {expanded
                      ? CRM_SHARED_STRINGS.auditEntry.hideChanges
                      : CRM_SHARED_STRINGS.auditEntry.showChanges}
                  </span>
                  {!expanded && (
                    <>
                      <span className="sr-only"> (</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground">
                        {diff.length}
                      </span>
                      <span className="sr-only">)</span>
                    </>
                  )}
                </button>
                {expanded && (
                  <div
                    className="mt-2 space-y-1 rounded-md border bg-background/70 p-2"
                    data-testid={`audit-diff-${activity.id}`}
                  >
                    {diff.map((row) => (
                      <div
                        key={row.key}
                        className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs"
                      >
                        <span className="font-medium text-foreground">
                          {humaniseKey(row.key)}:
                        </span>
                        {row.kind === 'added' && (
                          <>
                            <span className="text-muted-foreground">
                              <span className="text-success">
                                {CRM_SHARED_STRINGS.auditEntry.added}
                              </span>{' '}
                            </span>
                            <span className="text-foreground">
                              <DiffValue k={row.key} v={row.after} />
                            </span>
                          </>
                        )}
                        {row.kind === 'removed' && (
                          <>
                            <span className="text-muted-foreground">
                              <span className="text-destructive">
                                {CRM_SHARED_STRINGS.auditEntry.removed}
                              </span>{' '}
                            </span>
                            <span className="text-foreground">
                              <DiffValue k={row.key} v={row.before} />
                            </span>
                          </>
                        )}
                        {row.kind === 'changed' && (
                          <>
                            <span className="text-muted-foreground line-through">
                              <DiffValue k={row.key} v={row.before} />
                            </span>
                            <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                            <span className="text-foreground">
                              <DiffValue k={row.key} v={row.after} />
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
