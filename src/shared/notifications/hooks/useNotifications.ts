import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { PAGINATION } from "@/shared/constants"

import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api"
import { FIRST_PAGE, nextPage } from "@/shared/api/pagination"

// Query keys split structurally so mutations invalidate precisely
// (Coding-guideline §16.9). The list key carries `{unreadOnly}` so the
// "All" and "Unread" buckets cache independently.
const NOTIFS_KEY = ["notifications"] as const
const LIST_KEY = [...NOTIFS_KEY, "list"] as const
const UNREAD_COUNT_KEY = [...NOTIFS_KEY, "unread-count"] as const

// staleTime / refetchOnMount inherited from global QueryClient defaults
// (§6.5.1 — never set them per-hook). The bell sits in a persistent
// header so it never unmounts on navigation; the route-aware refresh
// hook below handles "check for new notifications on every page load".

export function useNotifications(
  unreadOnly: boolean = false,
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: [...LIST_KEY, { unreadOnly }],
    queryFn: ({ pageParam }) =>
      fetchNotifications({
        unread_only: unreadOnly,
        page: pageParam,
        page_size: PAGINATION.DEFAULT_PAGE_SIZE,
      }),
    initialPageParam: FIRST_PAGE,
    enabled: options?.enabled ?? true,
    getNextPageParam: nextPage,
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: fetchUnreadCount,
    select: (data) => data.count,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
    },
    // No success toast — the row visually fades to read in the popover
    // and the badge ticks down. Adding a toast would be noise.
    onError: (e: Error) => {
      toast.error(e.message || "Failed to mark notification as read")
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
      toast.success("All notifications marked as read")
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to mark all read")
    },
  })
}

/**
 * Re-fetch the unread-count whenever the user navigates between routes.
 *
 * The bell sits in the persistent app header, so `refetchOnMount: 'always'`
 * (the global default) only runs once at app boot. Without this hook the
 * badge would only update when the user actively opens the popover or
 * does a full page reload — meaning notifications fired by other users
 * while the current user is mid-session don't surface until much later.
 *
 * Mount this once at the same level as the bell (App / providers).
 */
export function useRefreshUnreadCountOnNavigation() {
  const location = useLocation()
  const qc = useQueryClient()
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
    // We deliberately do NOT invalidate the LIST query here — it
    // refetches when the popover opens (its own component mount), and
    // invalidating on every route change would cause a request even
    // when the user never opens the bell.
  }, [location.pathname, qc])
}
