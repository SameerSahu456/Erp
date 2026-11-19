import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import {
  fetchUserActivityLog,
  type ActivityLogTab,
  type UserActivityLogPage,
} from "../../api/activity-log"

// Rows per page (detail-page pager) and per scroll-reveal chunk (sidebar
// sheet). Kept at the legacy value so the timeline looks and pages exactly as
// before — intentionally NOT derived from PAGINATION.DEFAULT_PAGE_SIZE so the
// dynamic version is visually identical to the static one.
// See comprint-erp-docs/modules/foundation/audit/PLAN_user_activity_log_dynamic.md.
export const USER_ACTIVITY_PAGE_SIZE = 10

/**
 * Infinite (load-on-scroll) feed for the Activity Log slide-over sheet.
 * `getNextPageParam` computes "has next" from `page * page_size < total` —
 * the backend does NOT serialize `page_count`.
 */
export function useUserActivityLogInfinite(
  userId: string | null | undefined,
  opts: {
    tab: ActivityLogTab
    fromDate?: string
    toDate?: string
    enabled?: boolean
  },
) {
  return useInfiniteQuery<UserActivityLogPage>({
    queryKey: [
      "crm",
      "user-activity-log",
      "infinite",
      userId ?? "",
      opts.tab,
      opts.fromDate ?? "",
      opts.toDate ?? "",
    ],
    queryFn: ({ pageParam }) =>
      fetchUserActivityLog({
        userId: userId as string,
        tab: opts.tab,
        fromDate: opts.fromDate,
        toDate: opts.toDate,
        page: pageParam as number,
        pageSize: USER_ACTIVITY_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    enabled: !!userId && (opts.enabled ?? true),
  })
}

/**
 * Page-at-a-time feed for the user detail page's numbered pagination.
 */
export function useUserActivityLogPage(
  userId: string | null | undefined,
  opts: {
    tab: ActivityLogTab
    page: number
    fromDate?: string
    toDate?: string
    enabled?: boolean
  },
) {
  return useQuery<UserActivityLogPage>({
    queryKey: [
      "crm",
      "user-activity-log",
      "page",
      userId ?? "",
      opts.tab,
      opts.page,
      opts.fromDate ?? "",
      opts.toDate ?? "",
    ],
    queryFn: () =>
      fetchUserActivityLog({
        userId: userId as string,
        tab: opts.tab,
        fromDate: opts.fromDate,
        toDate: opts.toDate,
        page: opts.page,
        pageSize: USER_ACTIVITY_PAGE_SIZE,
      }),
    enabled: !!userId && (opts.enabled ?? true),
  })
}
