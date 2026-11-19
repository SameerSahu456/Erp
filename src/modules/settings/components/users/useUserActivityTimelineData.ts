import { useMemo } from "react"

import { useInfiniteDropdownLoader } from "@/shared/hooks"
import { formatIST_date } from "@shared/lib/date"
import {
  useUserActivityLogInfinite,
  useUserActivityLogPage,
  USER_ACTIVITY_PAGE_SIZE,
} from "@modules/crm"

import { mapItem } from "./user-activity.mappers"
import { type FilterKey, type UserActivityEntry } from "./user-activity.types"

interface UseTimelineDataArgs {
  userId: string
  mode: "scroll" | "pager"
  activeFilter: FilterKey
  page: number
  dateFrom?: string
  dateTo?: string
  /** Scroll container + sentinel nodes for the infinite loader (scroll mode). */
  scrollerNode: HTMLDivElement | null
  sentinelNode: HTMLDivElement | null
}

interface ActivityDayGroup {
  day: string
  items: UserActivityEntry[]
}

/**
 * Fetches the activity feed for the active filter/page/date window and shapes it
 * for rendering: the two query modes (infinite scroll vs numbered pager), the
 * day-bucketed groups, and the infinite-scroll handlers. Only the query matching
 * `mode` is enabled, so only it fetches.
 */
export function useUserActivityTimelineData({
  userId,
  mode,
  activeFilter,
  page,
  dateFrom,
  dateTo,
  scrollerNode,
  sentinelNode,
}: UseTimelineDataArgs) {
  const infinite = useUserActivityLogInfinite(userId, {
    tab: activeFilter,
    fromDate: dateFrom,
    toDate: dateTo,
    enabled: mode === "scroll",
  })
  const paged = useUserActivityLogPage(userId, {
    tab: activeFilter,
    page,
    fromDate: dateFrom,
    toDate: dateTo,
    enabled: mode === "pager",
  })

  const isLoading = mode === "scroll" ? infinite.isLoading : paged.isLoading
  const isError = mode === "scroll" ? infinite.isError : paged.isError
  const error = mode === "scroll" ? infinite.error : paged.error

  const total =
    mode === "scroll" ? infinite.data?.pages[0]?.total ?? 0 : paged.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / USER_ACTIVITY_PAGE_SIZE))

  // Rows actually rendered → mapped to the view model.
  const displayItems = useMemo<UserActivityEntry[]>(() => {
    const wire =
      mode === "scroll"
        ? infinite.data?.pages.flatMap((p) => p.items) ?? []
        : paged.data?.items ?? []
    // No client-side dropping: the backend is authoritative about which rows
    // surface (it already discards no-op generic `update`s). Filtering here also
    // hid legitimate auth actions (User updated / roles assigned) whose diff is
    // empty — those must still show as entries.
    return wire.map(mapItem)
  }, [mode, infinite.data, paged.data])

  const hasNextPage = mode === "scroll" && (infinite.hasNextPage ?? false)

  // Scroll mode: reveal the next chunk when the sentinel scrolls into view.
  // Reuses the project's dropdown loader (IntersectionObserver + onScroll/onWheel
  // fallbacks). Inert in pager mode (hasNextPage is false).
  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open: mode === "scroll",
    scrollerNode,
    sentinelNode,
    hasNextPage,
    isFetchingNextPage: infinite.isFetchingNextPage,
    fetchNextPage: () => {
      void infinite.fetchNextPage()
    },
    loadedCount: displayItems.length,
  })

  // Day-bucket only the rendered rows (newest-first order preserved).
  const groups = useMemo<ActivityDayGroup[]>(() => {
    const out: ActivityDayGroup[] = []
    for (const entry of displayItems) {
      const day = formatIST_date(entry.timestamp)
      const last = out[out.length - 1]
      if (last && last.day === day) last.items.push(entry)
      else out.push({ day, items: [entry] })
    }
    return out
  }, [displayItems])

  return {
    isLoading,
    isError,
    error,
    total,
    totalPages,
    groups,
    hasNextPage,
    onScroll,
    onWheel,
  }
}
