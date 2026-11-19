import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { PAGINATION } from "@/shared/constants"

import { DEMO_REQUESTS_STRINGS as S } from "../../components/demo-requests/demo-requests.strings"
import {
  approveDemoRequestItem,
  convertDemoRequestToOrder,
  createDemoRequest,
  fetchDemoRequest,
  fetchDemoRequests,
  fetchDemoRequestStats,
  fetchDemoRequestFulfillment,
  fetchPendingDemoRequestsForPM,
  rejectDemoRequestItem,
  fetchDemoDispatchedUnits,
  fetchDemoSalesOrders,
  updateDemoRequestItem,
  type ConvertDemoToOrderPayload,
  type DemoRequestCreatePayload,
  type DemoRequestItemApproveBody,
  type DemoRequestItemRejectBody,
  type FetchPendingDemoRequestsForPMParams,
  type DemoRequestStatusWire,
  type DemoRequestWire,
  type FetchDemoRequestStatsParams,
  type FetchDemoRequestsParams,
} from "../../api"

const DEMO_REQUESTS_KEY = ["crm", "demo-requests"] as const
const LIST_KEY = [...DEMO_REQUESTS_KEY, "list"] as const
const DETAIL_KEY = [...DEMO_REQUESTS_KEY, "detail"] as const
const PM_PENDING_KEY = [...DEMO_REQUESTS_KEY, "pm-pending"] as const

// Wire statuses a pending-item approve/reject can move a demo between.
const APPROVAL_AFFECTED_STATUSES: DemoRequestStatusWire[] = [
  "Pending for Approval",
  "PartiallyApproved",
  "Approved",
  "Rejected",
]
// Wire statuses a convert-to-order can move a demo between (any SO-eligible
// pre-state → ConvertedToSO).
const CONVERT_AFFECTED_STATUSES: DemoRequestStatusWire[] = [
  "Approved",
  "Dispatched",
  "WithCustomer",
  "PartiallyReturned",
  "Returned",
  "Closed",
  "ConvertedToSO",
]

// §16.9 — targeted invalidation. Instead of blanket-invalidating every cached
// demo-request list, only invalidate the list queries whose status bucket
// could contain the affected demo before or after the transition. The bucket
// lives in the params object at the END of the list queryKey (both the plain
// `[...LIST_KEY, params]` and infinite `[...LIST_KEY, "infinite", params]`
// shapes), so predicate-match on that rather than restructuring the key —
// every list consumer keeps its current key shape.
function invalidateDemoListBuckets(
  qc: QueryClient,
  affectedStatuses: DemoRequestStatusWire[],
) {
  void qc.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey
      if (
        key[0] !== LIST_KEY[0] ||
        key[1] !== LIST_KEY[1] ||
        key[2] !== LIST_KEY[2]
      ) {
        return false
      }
      const params = key[key.length - 1]
      // Defensive: a list query with no recognisable params object is
      // conservatively refetched.
      if (typeof params !== "object" || params === null) return true
      const bucket = (params as { status?: DemoRequestStatusWire[] }).status
      // Unfiltered queries (the "all" tab, overdue-only, pickers) always
      // contain / could contain the row.
      if (!bucket || bucket.length === 0) return true
      return bucket.some((status) => affectedStatuses.includes(status))
    },
  })
}

export function useDemoRequests(
  params: FetchDemoRequestsParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchDemoRequests(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

// KPI cards + status-tab counts. Keyed under `[...LIST_KEY, "stats", params]`
// so the bucket-targeted invalidation above (which reads the trailing params
// object, finds no `status`, and refetches) keeps it fresh after any
// status-changing mutation.
export function useDemoRequestStats(
  params: FetchDemoRequestStatsParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...LIST_KEY, "stats", params],
    queryFn: () => fetchDemoRequestStats(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

export function usePendingDemoRequestsForPM(
  params: FetchPendingDemoRequestsForPMParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    // PM_PENDING_KEY stays the prefix, so the decision mutations' prefix
    // invalidation still refreshes every page / filter combination.
    queryKey: [...PM_PENDING_KEY, params],
    queryFn: () => fetchPendingDemoRequestsForPM(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

export function useDemoRequest(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id],
    queryFn: () => fetchDemoRequest(id as string),
    enabled: !!id && (options?.enabled ?? true),
  })
}

export function useCreateDemoRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: DemoRequestCreatePayload) => createDemoRequest(body),
    onSuccess: (created) => {
      qc.setQueryData([...DETAIL_KEY, created.id], created)
      invalidateDemoListBuckets(qc, [created.status])
      void qc.invalidateQueries({ queryKey: PM_PENDING_KEY })
      // No toast here — each submit flow raises its own, more specific
      // success toast (with the demo number), so the hook staying silent
      // avoids a double toast.
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.createFailed)
    },
  })
}

export function useApproveDemoRequestItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      demoRequestId,
      items,
      body,
    }: {
      demoRequestId: string
      items?: Array<{ id: string; unit_price?: number | string }>
      body?: DemoRequestItemApproveBody
    }) => {
      let latest: DemoRequestWire | null = null
      const targetItems: Array<{ id: string; unit_price?: number | string }> =
        items ?? (await fetchDemoRequest(demoRequestId)).items
          .filter((item) => item.pm_status === "Pending")
          .map((item) => ({ id: item.id }))
      // Sequential per-item calls — a mid-loop failure leaves a partial
      // batch, so surface how far it got instead of a bare error message.
      let succeeded = 0
      try {
        for (const item of targetItems) {
          if (item.unit_price != null) {
            await updateDemoRequestItem(demoRequestId, item.id, {
              unit_price: item.unit_price,
            })
          }
          latest = await approveDemoRequestItem(demoRequestId, item.id, body ?? {})
          succeeded += 1
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : S.toast.approveFailed
        throw new Error(
          S.toast.partialBatchFailed(succeeded, targetItems.length, message),
        )
      }
      if (!latest) {
        latest = await fetchDemoRequest(demoRequestId)
      }
      return latest
    },
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, updated.id], updated)
      toast.success(S.toast.itemsApproved)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.approveFailed)
    },
    // Invalidate on success AND failure — a partial batch has already
    // mutated items server-side, so the caches must refetch either way.
    onSettled: (_updated, _error, variables) => {
      void qc.invalidateQueries({
        queryKey: [...DETAIL_KEY, variables.demoRequestId],
      })
      void qc.invalidateQueries({ queryKey: PM_PENDING_KEY })
      invalidateDemoListBuckets(qc, APPROVAL_AFFECTED_STATUSES)
    },
  })
}

export function useRejectDemoRequestItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      demoRequestId,
      items,
      body,
    }: {
      demoRequestId: string
      items?: Array<{ id: string }>
      body: DemoRequestItemRejectBody
    }) => {
      let latest: DemoRequestWire | null = null
      const targetItems = items ?? (await fetchDemoRequest(demoRequestId)).items
        .filter((item) => item.pm_status === "Pending")
        .map((item) => ({ id: item.id }))
      // Same partial-batch story as the approve loop above.
      let succeeded = 0
      try {
        for (const item of targetItems) {
          latest = await rejectDemoRequestItem(demoRequestId, item.id, body)
          succeeded += 1
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : S.toast.rejectFailed
        throw new Error(
          S.toast.partialBatchFailed(succeeded, targetItems.length, message),
        )
      }
      if (!latest) {
        latest = await fetchDemoRequest(demoRequestId)
      }
      return latest
    },
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, updated.id], updated)
      toast.success(S.toast.itemsRejected)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.rejectFailed)
    },
    onSettled: (_updated, _error, variables) => {
      void qc.invalidateQueries({
        queryKey: [...DETAIL_KEY, variables.demoRequestId],
      })
      void qc.invalidateQueries({ queryKey: PM_PENDING_KEY })
      invalidateDemoListBuckets(qc, APPROVAL_AFFECTED_STATUSES)
    },
  })
}

export function useConvertDemoRequestToOrder(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ConvertDemoToOrderPayload) =>
      convertDemoRequestToOrder(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, id], updated)
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, id] })
      void qc.invalidateQueries({ queryKey: PM_PENDING_KEY })
      invalidateDemoListBuckets(qc, CONVERT_AFFECTED_STATUSES)
      toast.success(S.toast.convertedToSo)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.convertFailed)
    },
  })
}

/** Still-dispatched units (serials) of a demo — the per-serial convert-to-SO
 *  picker. `enabled` gates the fetch until the dialog opens. */
export function useDemoDispatchedUnits(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id, "dispatched-units"],
    queryFn: () => fetchDemoDispatchedUnits(id),
    enabled: (options?.enabled ?? true) && Boolean(id),
  })
}

/** Sales orders derived from this demo — for the demo detail Sales Orders tab. */
export function useDemoSalesOrders(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id, "sales-orders"],
    queryFn: () => fetchDemoSalesOrders(id),
    enabled: (options?.enabled ?? true) && Boolean(id),
  })
}

// Infinite variant for the AsyncSelect source picker (§16.11).
export function useDemoRequestsInfinite(
  params: Omit<FetchDemoRequestsParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...LIST_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchDemoRequests({ ...params, page: pageParam, page_size: pageSize }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options?.enabled ?? true,
  })
}

// Per-line + rollup fulfillment counts for the demo detail page — the card
// strip and each line's custody chips read from this one query.
//
// Twin of `useSalesOrderFulfillment`; global QueryClient defaults apply
// (§6.5.1 — no per-hook overrides).
export function useDemoRequestFulfillment(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id, "fulfillment"],
    queryFn: () => fetchDemoRequestFulfillment(id as string),
    enabled: !!id && (options?.enabled ?? true),
  })
}
