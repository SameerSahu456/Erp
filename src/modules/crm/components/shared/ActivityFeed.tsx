import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { PermissionGuard, usePermission } from '@shared/rbac'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'

import { useActivities, useLogActivity } from '../../hooks/shared/useActivities'
import type { ActivityEntityType, ActivityWire } from '../../api'
import { crmPermissions } from '../../permissions'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'
import { ActivityRow } from './ActivityRow'
import { ActivityLogDialog } from './ActivityLogDialog'

interface ActivityFeedProps {
  entityType: ActivityEntityType
  entityId: string
  className?: string
}

function ActivityFeed({ entityType, entityId, className }: ActivityFeedProps) {
  const { can } = usePermission()
  const canLog = can(crmPermissions.MANAGE)

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useActivities(entityType, entityId)

  const logMut = useLogActivity(entityType, entityId)
  const [dialogOpen, setDialogOpen] = useState(false)

  const activities = useMemo<ActivityWire[]>(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )

  // IntersectionObserver — pull the next cursor page when the sentinel shows. §16.11.
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !isFetchingNextPage && hasNextPage) {
            fetchNextPage()
          }
        }
      },
      { rootMargin: '0px 0px 200px 0px', threshold: 0.01 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Typography
          variant="body-strong"
          tone="muted"
          className="font-ui uppercase tracking-wide"
          asChild
        >
          <h3>{CRM_SHARED_STRINGS.activityFeed.heading}</h3>
        </Typography>
        <PermissionGuard required={crmPermissions.MANAGE}>
          <ActivityLogDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            isPending={logMut.isPending}
            onSubmit={(payload) =>
              logMut.mutate(payload, { onSuccess: () => setDialogOpen(false) })
            }
          />
        </PermissionGuard>
      </div>

      {isLoading ? (
        <div className="space-y-3 pl-7">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : isError ? (
        <LoadErrorState
          error={error}
          fallback={CRM_SHARED_STRINGS.activityFeed.loadErrorFallback}
        />
      ) : activities.length > 0 ? (
        <div className="relative space-y-5 pl-7">
          <div className="absolute top-1 bottom-1 left-[8px] w-px bg-border" />
          {activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
          {hasNextPage && (
            <Typography variant="helper" asChild>
              <div ref={sentinelRef} className="flex items-center justify-center py-3">
                {isFetchingNextPage ? CRM_SHARED_STRINGS.activityFeed.loadingMore : ' '}
              </div>
            </Typography>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Typography variant="body" tone="muted">
            {CRM_SHARED_STRINGS.activityFeed.emptyTitle}
          </Typography>
          <Typography variant="helper" className="mt-1" asChild>
            <p>
              {canLog
                ? CRM_SHARED_STRINGS.activityFeed.emptyDescriptionCanLog
                : CRM_SHARED_STRINGS.activityFeed.emptyDescription}
            </p>
          </Typography>
        </div>
      )}
    </div>
  )
}

export { ActivityFeed, type ActivityFeedProps }
