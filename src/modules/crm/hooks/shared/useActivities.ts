import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { CRM_SHARED_STRINGS } from "../../components/shared/crm-shared.strings"

import { PAGINATION } from "@/shared/constants"

import {
  fetchEntityActivities,
  logEntityActivity,
} from "../../api"
import type {
  ActivityEntityType,
  ActivityListWire,
  LogActivityInput,
} from "../../api"

// Cursor-paginated: backend returns {items, has_more, next_cursor}.
// queryKey is structural so per-entity invalidation stays narrow (§16.9).
const ACTIVITIES_KEY = ["crm", "activities"] as const
const byEntityKey = (entityType: ActivityEntityType, entityId: string) =>
  [...ACTIVITIES_KEY, entityType, entityId] as const

// staleTime / refetchOnMount inherited from the global QueryClient defaults
// (§6.5.1 — never set them per-hook). Per §16.11 — paginated feeds in the
// UI MUST be infinite-scrolled.
export function useActivities(
  entityType: ActivityEntityType,
  entityId: string | null | undefined,
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery<ActivityListWire>({
    queryKey: byEntityKey(entityType, entityId ?? ""),
    queryFn: ({ pageParam }) =>
      fetchEntityActivities(entityType, entityId as string, {
        limit: pageSize,
        before_id: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.has_more ? last.next_cursor ?? undefined : undefined,
    enabled: !!entityId && (options?.enabled ?? true),
  })
}

export function useLogActivity(
  entityType: ActivityEntityType,
  entityId: string,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LogActivityInput) =>
      logEntityActivity(entityType, entityId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: byEntityKey(entityType, entityId),
      })
      toast.success(CRM_SHARED_STRINGS.toast.activityLogged)
    },
    onError: (error: Error) => {
      toast.error(error.message || CRM_SHARED_STRINGS.toast.activityLogFailed)
    },
  })
}
