import { BellOff } from "lucide-react"

import { EmptyState } from "@/components/common/feedback/EmptyState"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { useNotificationCenter } from "../../hooks/notifications/useNotificationCenter"
import { NotificationRow } from "./NotificationRow"
import { NOTIFICATIONS_STRINGS } from "./notifications.strings"

export function NotificationList({ center }: { center: ReturnType<typeof useNotificationCenter> }) {
  if (center.isLoading && center.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        {NOTIFICATIONS_STRINGS.list.loading}
      </div>
    )
  }

  if (center.isError) {
    return (
      <LoadErrorState
        error={center.error}
        fallback={NOTIFICATIONS_STRINGS.list.loadError}
        compact
      />
    )
  }

  if (center.items.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title={
          center.filter === "unread"
            ? NOTIFICATIONS_STRINGS.list.emptyUnread.title
            : NOTIFICATIONS_STRINGS.list.emptyAll.title
        }
        description={
          center.filter === "unread"
            ? NOTIFICATIONS_STRINGS.list.emptyUnread.description
            : NOTIFICATIONS_STRINGS.list.emptyAll.description
        }
      />
    )
  }

  return (
    <div className="space-y-2">
      {center.items.map((n) => (
        <NotificationRow key={n.id} notification={n} onClick={center.handleRowClick} />
      ))}
      {center.hasNextPage && (
        <div
          ref={center.sentinelRef}
          className="py-4 text-center text-[11px] text-muted-foreground"
        >
          {center.isFetchingNextPage
            ? NOTIFICATIONS_STRINGS.list.loadingMore
            : NOTIFICATIONS_STRINGS.list.scrollForMore}
        </div>
      )}
    </div>
  )
}
