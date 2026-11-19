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

import { REPLACEMENT_REQUEST_DATA_STRINGS as S } from "../../components/replacement-requests/replacement-requests.strings"
import {
  approveReplacementItem,
  approveReplacementItems,
  cancelReplacementRequest,
  createReplacementRequest,
  fetchReplacementEligibleItems,
  fetchReplacementEligibleUnits,
  fetchReplacementEligibleUnitComponents,
  fetchReplacementEligibleSources,
  fetchReplacementSourceOrders,
  fetchReplacementRequest,
  fetchReplacementRequests,
  fetchReplacementRequestsPendingPM,
  fetchSalesOrderReplacementRollup,
  fetchReplacementApproverCandidates,
  patchReplacementRequest,
  reassignReplacementItem,
  rejectReplacementItem,
  waiveReplacementReturn,
  markReplacementItemNotNeeded,
  type ReplacementNotNeededWire,
  changeReplacementItemOutcome,
  type ReplacementOutcomeChangeWire,
  type FetchReplacementEligibleSourcesParams,
  type FetchReplacementSourceOrdersParams,
  type FetchReplacementRequestsParams,
  type ReplacementRequestCreateWire,
  type ReplacementRequestPatchWire,
  type ReplacementRequestWire,
} from "../../api"

const REPLACEMENT_REQUESTS_KEY = ["crm", "replacement-requests"] as const
const LIST_KEY = [...REPLACEMENT_REQUESTS_KEY, "list"] as const
const DETAIL_KEY = [...REPLACEMENT_REQUESTS_KEY, "detail"] as const
const ELIGIBLE_SOURCES_KEY = [
  ...REPLACEMENT_REQUESTS_KEY,
  "eligible-sources",
] as const
const SOURCE_ORDERS_KEY = [
  ...REPLACEMENT_REQUESTS_KEY,
  "source-orders",
] as const
const ELIGIBLE_ITEMS_KEY = [
  ...REPLACEMENT_REQUESTS_KEY,
  "eligible-items",
] as const
const ELIGIBLE_UNITS_KEY = [
  ...REPLACEMENT_REQUESTS_KEY,
  "eligible-units",
] as const
const ELIGIBLE_UNIT_COMPONENTS_KEY = [
  ...REPLACEMENT_REQUESTS_KEY,
  "eligible-unit-components",
] as const
const PM_QUEUE_KEY = [...REPLACEMENT_REQUESTS_KEY, "pm-queue"] as const
const SO_ROLLUP_KEY = [...REPLACEMENT_REQUESTS_KEY, "so-rollup"] as const

/**
 * Turn a server error into copy the user can act on.
 *
 * The API answers a handful of refusals with a business code — a unit already
 * claimed, a line someone else decided, a request too far along to cancel.
 * Those read as jargon, so they get explained; anything else falls back to the
 * server's own message.
 */
function explain(error: Error, fallback: string): string {
  const code = error instanceof ApiError ? error.businessCode : undefined
  return (code && S.errors[code]) || error.message || fallback
}

// ── Queries ─────────────────────────────────────────────────────────
// No staleTime / gcTime / retry / refetchOn* here: query config is global
// (Coding-guideline §6.5.1, auto-reject). The QueryClient in app/providers
// owns it.

export function useReplacementRequests(
  params: FetchReplacementRequestsParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchReplacementRequests(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

/**
 * Replacement requests waiting on THIS product manager.
 *
 * Feeds the PM approvals queue. Scoped server-side, so every row is one
 * this user can actually decide.
 */
export function useReplacementRequestsPendingPM(
  params: Parameters<typeof fetchReplacementRequestsPendingPM>[0] = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...PM_QUEUE_KEY, params],
    queryFn: () => fetchReplacementRequestsPendingPM(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

export function useReplacementRequest(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id],
    queryFn: () => fetchReplacementRequest(id as string),
    enabled: !!id && (options?.enabled ?? true),
  })
}

/**
 * Per-status row counts for the list page's stat strip + tab badges.
 *
 * One slim `page_size:1` count query per status bucket (plus "all"), each
 * honouring the shared `q`/`account_id` filter so the numbers move with the
 * search. Mirrors the per-bucket count pattern the dispatch list uses; the
 * counts read straight off the paginated `total`, never `items.length`.
 */
export function useReplacementRequestCounts(
  statuses: readonly string[],
  params: Omit<FetchReplacementRequestsParams, "page" | "page_size" | "status"> = {},
  // §1.1.H — the active tab reuses the list query's `total`, so its own count
  // query is disabled to avoid a duplicate call. Pass the active tab id; when a
  // bucket matches it, its slim count is skipped (the caller supplies `total`).
  activeStatus?: string,
): Record<string, number> {
  const results = useQueries({
    queries: statuses.map((status) => ({
      queryKey: [...LIST_KEY, "count", { ...params, status }],
      queryFn: () =>
        fetchReplacementRequests({
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

// Infinite variant for the AsyncSelect source picker (§16.11).
export function useReplacementRequestsInfinite(
  params: Omit<FetchReplacementRequestsParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...LIST_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchReplacementRequests({
        ...params,
        page: pageParam,
        page_size: pageSize,
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options?.enabled ?? true,
  })
}

/**
 * Sales orders with at least one unit still free to replace.
 *
 * Infinite + server-side search per §16.11 — the create wizard's SO picker
 * must never load every eligible order and filter in the browser.
 */
export function useReplacementEligibleSourcesInfinite(
  params: Omit<FetchReplacementEligibleSourcesParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...ELIGIBLE_SOURCES_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchReplacementEligibleSources({
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

/**
 * SOs that already HAVE a replacement request — backs the SO FILTER on the
 * listing (distinct from the create form's eligible-sources picker). Only
 * orders with a request appear, so filtering by one always yields rows
 * (CP-220). Same infinite-scroll shape as the eligible-sources picker.
 */
export function useReplacementSourceOrdersInfinite(
  params: Omit<FetchReplacementSourceOrdersParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...SOURCE_ORDERS_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchReplacementSourceOrders({
        ...params,
        page: pageParam,
        page_size: pageSize,
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options?.enabled ?? true,
  })
}

/**
 * Replaceable units on one sales order.
 *
 * Rows are grouped by `(sales_order_item, variant, generation)`; a row tagged
 * `generation: "replacement"` is a unit an earlier replacement shipped, which
 * is itself replaceable.
 */
export function useReplacementEligibleItems(
  salesOrderId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...ELIGIBLE_ITEMS_KEY, salesOrderId],
    queryFn: () => fetchReplacementEligibleItems(salesOrderId as string),
    enabled: !!salesOrderId && (options?.enabled ?? true),
  })
}

/**
 * The dispatched units of a sales order, serial by serial.
 *
 * Feeds the optional per-unit pin in the create wizard, alongside
 * `useReplacementEligibleItems` — that one gives the counts, this one the
 * serials behind them.
 */
export function useReplacementEligibleUnits(
  salesOrderId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...ELIGIBLE_UNITS_KEY, salesOrderId],
    queryFn: () => fetchReplacementEligibleUnits(salesOrderId as string),
    enabled: !!salesOrderId && (options?.enabled ?? true),
  })
}

/** The components inside one dispatched unit, for a component replacement line. */
export function useReplacementEligibleUnitComponents(
  salesOrderId: string | null | undefined,
  dispatchRequestItemId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...ELIGIBLE_UNIT_COMPONENTS_KEY, salesOrderId, dispatchRequestItemId],
    queryFn: () =>
      fetchReplacementEligibleUnitComponents(
        salesOrderId as string,
        dispatchRequestItemId as string,
      ),
    enabled: !!salesOrderId && !!dispatchRequestItemId && (options?.enabled ?? true),
  })
}

/** Per-SO-line replacement activity for the SO Replacement tab. */
export function useSalesOrderReplacementRollup(
  salesOrderId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...SO_ROLLUP_KEY, salesOrderId],
    queryFn: () => fetchSalesOrderReplacementRollup(salesOrderId as string),
    enabled: !!salesOrderId && (options?.enabled ?? true),
  })
}

// ── Mutations ───────────────────────────────────────────────────────
// Invalidation stays narrow per §16.9: the touched detail key plus the list.
// A decision also refreshes the SO rollup and the eligible-items picker,
// because both report on claims this request just changed.

function useRrCacheSync() {
  const qc = useQueryClient()
  return (rr: ReplacementRequestWire) => {
    qc.setQueryData([...DETAIL_KEY, rr.id], rr)
    void qc.invalidateQueries({ queryKey: LIST_KEY })
    void qc.invalidateQueries({ queryKey: [...SO_ROLLUP_KEY, rr.entity_id] })
    void qc.invalidateQueries({
      queryKey: [...ELIGIBLE_ITEMS_KEY, rr.entity_id],
    })
    // A decision removes the request from the PM's queue.
    void qc.invalidateQueries({ queryKey: PM_QUEUE_KEY })
  }
}

export function useCreateReplacementRequest() {
  const sync = useRrCacheSync()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ReplacementRequestCreateWire) =>
      createReplacementRequest(body),
    onSuccess: (created) => {
      sync(created)
      // A new claim removes units from the picker, so the SO list is stale.
      void qc.invalidateQueries({ queryKey: ELIGIBLE_SOURCES_KEY })
      // A component line flags its component as taken in the component picker.
      void qc.invalidateQueries({ queryKey: ELIGIBLE_UNIT_COMPONENTS_KEY })
      toast.success(S.mutation.created(created.request_number))
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.createFailed))
    },
  })
}

export function useApproveReplacementItem() {
  const sync = useRrCacheSync()
  return useMutation({
    mutationFn: ({
      rrId,
      itemId,
      notes,
    }: {
      rrId: string
      itemId: string
      notes?: string
    }) => approveReplacementItem(rrId, itemId, { notes }),
    onSuccess: (rr) => {
      sync(rr)
      toast.success(S.mutation.lineApproved)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.approveFailed))
    },
  })
}

/**
 * Approve several lines in one call.
 *
 * The group action on the detail page uses this rather than firing one request
 * per line: the server does a single transaction, one header rollup and one
 * notification, and rejects the whole batch if any line is undecidable.
 */
export function useApproveReplacementItems() {
  const sync = useRrCacheSync()
  return useMutation({
    mutationFn: ({
      rrId,
      itemIds,
      notes,
    }: {
      rrId: string
      itemIds: string[]
      notes?: string
    }) => approveReplacementItems(rrId, { item_ids: itemIds, notes }),
    onSuccess: (rr, { itemIds }) => {
      sync(rr)
      toast.success(S.mutation.linesApproved(itemIds.length))
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.approveFailed))
    },
  })
}

export function useRejectReplacementItem() {
  const sync = useRrCacheSync()
  return useMutation({
    mutationFn: ({
      rrId,
      itemId,
      reason,
    }: {
      rrId: string
      itemId: string
      reason: string
    }) => rejectReplacementItem(rrId, itemId, { reason }),
    onSuccess: (rr) => {
      sync(rr)
      toast.success(S.mutation.lineRejected)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.rejectFailed))
    },
  })
}

/** Edit a pending request's header fields. */
export function usePatchReplacementRequest() {
  const sync = useRrCacheSync()
  return useMutation({
    mutationFn: ({ rrId, body }: { rrId: string; body: ReplacementRequestPatchWire }) =>
      patchReplacementRequest(rrId, body),
    onSuccess: (rr) => {
      sync(rr)
      toast.success(S.mutation.updated)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.updateFailed))
    },
  })
}

/** The Reassign dialog's picker. Fetched only while the dialog is open. */
export function useReplacementApproverCandidates(
  rrId: string | undefined,
  itemId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...DETAIL_KEY, rrId, "approver-candidates", itemId],
    queryFn: () => fetchReplacementApproverCandidates(rrId as string, itemId as string),
    enabled: !!rrId && !!itemId && (options?.enabled ?? true),
  })
}

export function useReassignReplacementItem() {
  const sync = useRrCacheSync()
  return useMutation({
    mutationFn: ({
      rrId,
      itemId,
      productManagerId,
      reason,
    }: {
      rrId: string
      itemId: string
      productManagerId: string
      reason: string
    }) =>
      reassignReplacementItem(rrId, itemId, {
        product_manager_id: productManagerId,
        reason,
      }),
    onSuccess: (rr) => {
      sync(rr)
      toast.success(S.mutation.reassigned)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.reassignFailed))
    },
  })
}

/**
 * Write off the outstanding return on one line.
 *
 * The advance-mode escape hatch: the replacement shipped first and the old
 * unit never came back, so without this the request can never close. It does
 * not unlock a normal-mode dispatch — that still needs the unit in hand.
 */
export function useWaiveReplacementReturn() {
  const sync = useRrCacheSync()
  return useMutation({
    mutationFn: ({
      rrId,
      itemId,
      reason,
    }: {
      rrId: string
      itemId: string
      reason: string
    }) => waiveReplacementReturn(rrId, itemId, { reason }),
    onSuccess: (rr) => {
      sync(rr)
      toast.success(S.mutation.returnWaived)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.waiveFailed))
    },
  })
}

export function useMarkReplacementItemNotNeeded() {
  const sync = useRrCacheSync()
  return useMutation({
    mutationFn: ({
      rrId,
      itemId,
      body,
    }: {
      rrId: string
      itemId: string
      body: ReplacementNotNeededWire
    }) => markReplacementItemNotNeeded(rrId, itemId, body),
    onSuccess: (rr) => {
      sync(rr)
      toast.success(S.mutation.notNeeded)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.notNeededFailed))
    },
  })
}

export function useChangeReplacementItemOutcome() {
  const sync = useRrCacheSync()
  return useMutation({
    mutationFn: ({
      rrId,
      itemId,
      body,
    }: {
      rrId: string
      itemId: string
      body: ReplacementOutcomeChangeWire
    }) => changeReplacementItemOutcome(rrId, itemId, body),
    onSuccess: (rr) => {
      sync(rr)
      toast.success(S.mutation.outcomeChanged)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.outcomeChangeFailed))
    },
  })
}

export function useCancelReplacementRequest() {
  const sync = useRrCacheSync()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rrId, reason }: { rrId: string; reason?: string }) =>
      cancelReplacementRequest(rrId, { reason }),
    onSuccess: (rr) => {
      sync(rr)
      // Cancelling frees the claimed units, so they return to the pickers.
      void qc.invalidateQueries({ queryKey: ELIGIBLE_SOURCES_KEY })
      toast.success(S.mutation.cancelled)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.cancelFailed))
    },
  })
}
