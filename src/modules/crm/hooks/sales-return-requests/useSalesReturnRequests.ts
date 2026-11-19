import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { PAGINATION } from "@/shared/constants"
import { ApiError } from "@shared/api/envelope"

import { SALES_RETURN_REQUEST_DATA_STRINGS as S } from "../../components/sales-return-requests/sales-return-requests.strings"
import {
  cancelSalesReturnRequest,
  createSalesReturnRequest,
  decideSalesReturnRequestItems,
  fetchSalesReturnEligibleSources,
  fetchSalesReturnSourceOrders,
  fetchSalesReturnEligibleUnits,
  fetchSalesReturnRequest,
  fetchSalesReturnRequests,
  fetchSalesReturnRequestsPendingPM,
  patchSalesReturnRequest,
  reassignSalesReturnRequestPM,
  type FetchSalesReturnEligibleSourcesParams,
  type FetchSalesReturnRequestsParams,
  type SalesReturnRequestBatchApproveWire,
  type SalesReturnRequestCreateWire,
  type SalesReturnRequestUpdateWire,
  type SalesReturnRequestWire,
} from "../../api"

const SRET_KEY = ["crm", "sales-return-requests"] as const
const LIST_KEY = [...SRET_KEY, "list"] as const
const DETAIL_KEY = [...SRET_KEY, "detail"] as const
const PM_QUEUE_KEY = [...SRET_KEY, "pm-queue"] as const
const ELIGIBLE_SOURCES_KEY = [...SRET_KEY, "eligible-sources"] as const
const SOURCE_ORDERS_KEY = [...SRET_KEY, "source-orders"] as const
const ELIGIBLE_UNITS_KEY = [...SRET_KEY, "eligible-units"] as const

/**
 * Turn a server refusal into copy the user can act on.
 *
 * The API answers its business rules with a code — a unit already claimed,
 * a line someone else owns, a request too far along to cancel. Those read as
 * jargon, so they get explained; anything else falls back to the server's own
 * message.
 */
function explain(error: Error, fallback: string): string {
  const code = error instanceof ApiError ? error.businessCode : undefined
  return (code && S.errors[code]) || error.message || fallback
}

// ── Queries ─────────────────────────────────────────────────────────
// No staleTime / gcTime / retry / refetchOn* here: query config is global
// (Coding-guideline §6.5.1, auto-reject). The QueryClient in app/providers
// owns it.

export function useSalesReturnRequests(
  params: FetchSalesReturnRequestsParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchSalesReturnRequests(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

/**
 * Sales returns waiting on THIS product manager.
 *
 * Feeds the PM approvals queue alongside material inquiries, sales orders
 * and demo requests. Scoped server-side, so every row is actionable.
 */
export function useSalesReturnRequestsPendingPM(
  params: Parameters<typeof fetchSalesReturnRequestsPendingPM>[0] = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...PM_QUEUE_KEY, params],
    queryFn: () => fetchSalesReturnRequestsPendingPM(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

export function useSalesReturnRequest(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id],
    queryFn: () => fetchSalesReturnRequest(id as string),
    enabled: !!id && (options?.enabled ?? true),
  })
}

/**
 * Per-status row counts for the list page's tab badges.
 *
 * One slim `page_size:1` count query per bucket, each honouring the shared
 * filters so the numbers move with the search. Counts read off the paginated
 * `total`, never `items.length`.
 */
export function useSalesReturnRequestCounts(
  statuses: readonly string[],
  params: Omit<
    FetchSalesReturnRequestsParams,
    "page" | "page_size" | "status"
  > = {},
  // §1.1.H — the active tab reuses the list query's `total`, so its own count
  // query is disabled to avoid a duplicate call. Pass the active tab id; when a
  // bucket matches it, its slim count is skipped (the caller supplies `total`).
  activeStatus?: string,
): Record<string, number> {
  const results = useQueries({
    queries: statuses.map((status) => ({
      queryKey: [...LIST_KEY, "count", { ...params, status }],
      queryFn: () =>
        fetchSalesReturnRequests({
          ...params,
          status: status === "all" ? undefined : [status],
          page: 1,
          page_size: 1,
        }),
      enabled: status !== activeStatus,
      placeholderData: keepPreviousData,
    })),
  })
  const countByStatus: Record<string, number> = {}
  statuses.forEach((status, i) => {
    countByStatus[status] = results[i]?.data?.total ?? 0
  })
  return countByStatus
}

/**
 * Sales orders with at least one unit still free to return.
 *
 * Infinite + server-side search per §16.11 — the create wizard's order picker
 * must never load every eligible order and filter in the browser.
 */
export function useSalesReturnEligibleSourcesInfinite(
  params: Omit<FetchSalesReturnEligibleSourcesParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...ELIGIBLE_SOURCES_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchSalesReturnEligibleSources({
        ...params,
        page: pageParam,
        page_size: pageSize,
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      // The endpoint now returns a full page of ELIGIBLE sources plus the true
      // eligible `total` (filter-then-paginate on the backend), so standard
      // "loaded < total" paging is correct — one call on open, more on scroll.
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options?.enabled ?? true,
  })
}

/** List-filter picker: only orders that have a sales return, searched and paged (§16.11). */
export function useSalesReturnSourceOrdersInfinite(
  params: Omit<FetchSalesReturnEligibleSourcesParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...SOURCE_ORDERS_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchSalesReturnSourceOrders({ ...params, page: pageParam, page_size: pageSize }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options?.enabled ?? true,
  })
}

/**
 * The returnable units of one order, serial by serial.
 *
 * Not paginated on purpose: this is the unit checklist for a single order,
 * bounded by what that order shipped, and the operator needs to see all of
 * it at once to choose.
 */
export function useSalesReturnEligibleUnits(
  salesOrderId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...ELIGIBLE_UNITS_KEY, salesOrderId],
    queryFn: () => fetchSalesReturnEligibleUnits(salesOrderId as string),
    enabled: !!salesOrderId && (options?.enabled ?? true),
  })
}

// ── Mutations ───────────────────────────────────────────────────────
// Invalidation stays narrow per §16.9: the touched detail key plus the list.
// Anything that changes a CLAIM also refreshes both pickers — leaving them
// cached is how an operator gets offered a unit the create endpoint then
// 409s on.

function useSretCacheSync() {
  const qc = useQueryClient()
  return (sret: SalesReturnRequestWire) => {
    qc.setQueryData([...DETAIL_KEY, sret.id], sret)
    void qc.invalidateQueries({ queryKey: LIST_KEY })
    void qc.invalidateQueries({
      queryKey: [...ELIGIBLE_UNITS_KEY, sret.entity_id],
    })
    void qc.invalidateQueries({ queryKey: ELIGIBLE_SOURCES_KEY })
    // A decision removes the request from the PM's queue.
    void qc.invalidateQueries({ queryKey: PM_QUEUE_KEY })
  }
}

export function useCreateSalesReturnRequest() {
  const sync = useSretCacheSync()
  return useMutation({
    mutationFn: (body: SalesReturnRequestCreateWire) =>
      createSalesReturnRequest(body),
    onSuccess: (created) => {
      sync(created)
      toast.success(S.mutation.created(created.request_number))
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.createFailed))
    },
  })
}

/**
 * Approve / reject several lines in one call.
 *
 * A rejection releases the unit's claim, so this refreshes the pickers too.
 */
export function useDecideSalesReturnRequestItems() {
  const sync = useSretCacheSync()
  return useMutation({
    mutationFn: ({
      sretId,
      body,
    }: {
      sretId: string
      body: SalesReturnRequestBatchApproveWire
    }) => decideSalesReturnRequestItems(sretId, body),
    onSuccess: (updated) => {
      sync(updated)
      toast.success(S.mutation.decided)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.decideFailed))
    },
  })
}

export function useCancelSalesReturnRequest() {
  const sync = useSretCacheSync()
  return useMutation({
    mutationFn: ({
      sretId,
      cancelReason,
    }: {
      sretId: string
      cancelReason: string
    }) => cancelSalesReturnRequest(sretId, { cancel_reason: cancelReason }),
    onSuccess: (updated) => {
      sync(updated)
      toast.success(S.mutation.cancelled(updated.request_number))
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.cancelFailed))
    },
  })
}

/**
 * Header edit — logistics and free text.
 *
 * Touches no claim, so the pickers are left alone; only the detail and list
 * need refreshing.
 */
export function usePatchSalesReturnRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sretId,
      body,
    }: {
      sretId: string
      body: SalesReturnRequestUpdateWire
    }) => patchSalesReturnRequest(sretId, body),
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, updated.id], updated)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      toast.success(S.mutation.updated)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.updateFailed))
    },
  })
}

export function useReassignSalesReturnRequestPM() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sretId,
      itemId,
      productManagerId,
    }: {
      sretId: string
      itemId: string
      productManagerId: string
    }) =>
      reassignSalesReturnRequestPM(sretId, itemId, {
        product_manager_id: productManagerId,
      }),
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, updated.id], updated)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      toast.success(S.mutation.reassigned)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.reassignFailed))
    },
  })
}
