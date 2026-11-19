import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useUser, getUserDisplayName } from '@modules/users'

import type { ActivityWire } from '../../api'
import {
  configFor,
  formatRelativeTime,
  humanize,
  variantCircleStyles,
} from './activityFeedConfig'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

// Per-row component so each row owns its own useUser() call. React Query
// dedupes per-id; "System" renders without firing a query at all.
function ActorName({ id }: { id: string | null }) {
  const q = useUser(id ?? '')
  if (!id) return <>{CRM_SHARED_STRINGS.activityRow.system}</>
  if (q.isLoading)
    return <span className="text-muted-foreground">{CRM_SHARED_STRINGS.activityRow.loading}</span>
  if (q.data) return <>{getUserDisplayName(q.data)}</>
  return (
    <span className="text-muted-foreground" title={id}>
      {CRM_SHARED_STRINGS.activityRow.unknown}
    </span>
  )
}

export function ActivityRow({ activity }: { activity: ActivityWire }) {
  const config = configFor(activity.activity_type)
  const Icon = config.icon
  return (
    <div className="relative flex gap-3 group">
      <div
        className={cn(
          'absolute -left-7 top-0.5 flex size-[17px] items-center justify-center rounded-full ring-[3px] ring-card',
          variantCircleStyles[config.variant],
        )}
      >
        <Icon className="size-2.5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-foreground leading-snug">
            {activity.title}
          </p>
          {activity.outcome && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {humanize(activity.outcome)}
            </Badge>
          )}
          {activity.direction && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {activity.direction}
            </Badge>
          )}
        </div>
        {activity.description && (
          <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {activity.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground/80">
          <span className="font-medium">
            <ActorName id={activity.actor_id} />
          </span>
          <span className="opacity-40">·</span>
          <span>{formatRelativeTime(activity.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
