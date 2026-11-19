import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/shared/notifications/hooks/useNotifications"
import { notificationHref } from "@/shared/notifications/routing"
import type { NotificationWire } from "@/shared/notifications/api"

import { NOTIFICATIONS_STRINGS } from "../../components/notifications/notifications.strings"

export type FilterTab = "all" | "unread"

export const FILTER_LABEL: Record<FilterTab, string> = {
  all: NOTIFICATIONS_STRINGS.filterTabs.all,
  unread: NOTIFICATIONS_STRINGS.filterTabs.unread,
}

// Container logic for the full-page Notification Center: the All/Unread filter,
// the paginated feed (with page-scoped infinite scroll), and read mutations.
export function useNotificationCenter() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterTab>("all")

  const { data: unreadCount = 0 } = useUnreadNotificationCount()
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotifications(filter === "unread")
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const items = useMemo<NotificationWire[]>(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )

  // Page-scoped infinite scroll — IntersectionObserver against the viewport.
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
      { rootMargin: "0px 0px 400px 0px", threshold: 0.01 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  function handleRowClick(n: NotificationWire) {
    if (!n.is_read) markRead.mutate(n.id)
    const href = notificationHref(n)
    if (href) navigate(href)
  }

  return {
    filter,
    setFilter,
    unreadCount,
    items,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    sentinelRef,
    markAllRead,
    handleRowClick,
  }
}
