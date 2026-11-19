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

import { RENTAL_RETURN_REQUEST_DATA_STRINGS as S } from "../../components/rental-return-requests/rental-return-requests.strings"
import {
  cancelRentalReturnRequest,
  closeShortRentalReturnRequest,
  closeShortRentalReturnRequestItem,
  createRentalReturnRequest,
  decideRentalReturnRequestItems,
  fetchRentalReturnEligibleSources,
  fetchRentalReturnEligibleUnits,
  fetchRentalReturnEligibleVariants,
  fetchRentalReturnRequest,
  fetchRentalReturnRequests,
  fetchRentalReturnRequestsPendingPM,
  patchRentalReturnRequest,
  reassignRentalReturnRequestPM,
  type FetchRentalReturnEligibleSourcesParams,
  type FetchRentalReturnRequestsParams,
  type RentalReturnRequestBatchApproveWire,
  type RentalReturnRequestCreateWire,
  type RentalReturnRequestUpdateWire,
  type RentalReturnRequestWire,
} from "../../api"

const RRET_KEY = ["crm", "rental-return-requests"] as const
/** Exported via the CRM barrel for cross-module invalidation (WMS inward
 *  exceptions change these rows) — never a copied literal (§16.9.1). */
export const rentalReturnRequestKeys = { all: RRET_KEY } as const
const LIST_KEY = [...RRET_KEY, "list"] as const
const DETAIL_KEY = [...RRET_KEY, "detail"] as const
const PM_QUEUE_KEY = [...RRET_KEY, "pm-queue"] as const
const ELIGIBLE_SOURCES_KEY = [...RRET_KEY, "eligible-sources"] as const
const ELIGIBLE_UNITS_KEY = [...RRET_KEY, "eligible-units"] as const
const ELIGIBLE_VARIANTS_KEY = [...RRET_KEY, "eligible-variants"] as const

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

export function useRentalReturnRequests(
  params: FetchRentalReturnRequestsParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchRentalReturnRequests(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

/**
 * Rental returns with an early line waiting on the RENTAL MANAGER (approvals
 * spec D1 — the category PM does not decide rental returns). The endpoint
 * keeps its `pending-pm-approval` path for the API contract.
 *
 * Feeds the "Early-exit returns" tab on rentals' Early-exit Approvals page.
 */
export function useRentalReturnRequestsPendingPM(
  params: { page?: number; page_size?: number } = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...PM_QUEUE_KEY, params],
    queryFn: () => fetchRentalReturnRequestsPendingPM(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

export function useRentalReturnRequest(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id],
    queryFn: () => fetchRentalReturnRequest(id as string),
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
export function useRentalReturnRequestCounts(
  statuses: readonly string[],
  params: Omit<
    FetchRentalReturnRequestsParams,
    "page" | "page_size" | "status"
  > = {},
): Record<string, number> {
  const results = useQueries({
    queries: statuses.map((status) => ({
      queryKey: [...LIST_KEY, "count", { ...params, status }],
      queryFn: () =>
        fetchRentalReturnRequests({
          ...params,
          status: status === "all" ? undefined : [status],
          page: 1,
          page_size: 1,
        }),
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
export function useRentalReturnEligibleSourcesInfinite(
  params: Omit<FetchRentalReturnEligibleSourcesParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...ELIGIBLE_SOURCES_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchRentalReturnEligibleSources({
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
 * The returnable units of one order, serial by serial.
 *
 * Not paginated on purpose: this is the unit checklist for a single order,
 * bounded by what that order shipped, and the operator needs to see all of
 * it at once to choose.
 */
export function useRentalReturnEligibleUnits(
  salesOrderId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...ELIGIBLE_UNITS_KEY, salesOrderId],
    queryFn: () => fetchRentalReturnEligibleUnits(salesOrderId as string),
    enabled: !!salesOrderId && (options?.enabled ?? true),
  })
}

/**
 * The account's models on rent and how many of each can still be requested.
 *
 * Not paginated: bounded by the distinct models one customer holds, and the
 * form shows them all as one quantity table.
 */
export function useRentalReturnEligibleVariants(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...ELIGIBLE_VARIANTS_KEY, accountId],
    queryFn: () => fetchRentalReturnEligibleVariants(accountId as string),
    enabled: !!accountId && (options?.enabled ?? true),
  })
}

// ── Mutations ───────────────────────────────────────────────────────
// Invalidation stays narrow per §16.9: the touched detail key plus the list.
// Anything that changes a CLAIM also refreshes both pickers — leaving them
// cached is how an operator gets offered a unit the create endpoint then
// 409s on.

function useSretCacheSync() {
  const qc = useQueryClient()
  return (rret: RentalReturnRequestWire) => {
    qc.setQueryData([...DETAIL_KEY, rret.id], rret)
    void qc.invalidateQueries({ queryKey: LIST_KEY })
    void qc.invalidateQueries({
      queryKey: [...ELIGIBLE_UNITS_KEY, rret.entity_id],
    })
    void qc.invalidateQueries({ queryKey: ELIGIBLE_SOURCES_KEY })
    void qc.invalidateQueries({
      queryKey: [...ELIGIBLE_VARIANTS_KEY, rret.account_id],
    })
    // A decision removes the request from the PM's queue.
    void qc.invalidateQueries({ queryKey: PM_QUEUE_KEY })
  }
}

export function useCreateRentalReturnRequest() {
  const sync = useSretCacheSync()
  return useMutation({
    mutationFn: (body: RentalReturnRequestCreateWire) =>
      createRentalReturnRequest(body),
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
export function useDecideRentalReturnRequestItems() {
  const sync = useSretCacheSync()
  return useMutation({
    mutationFn: ({
      rretId,
      body,
    }: {
      rretId: string
      body: RentalReturnRequestBatchApproveWire
    }) => decideRentalReturnRequestItems(rretId, body),
    onSuccess: (updated) => {
      sync(updated)
      toast.success(S.mutation.decided)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.decideFailed))
    },
  })
}

export function useCancelRentalReturnRequest() {
  const sync = useSretCacheSync()
  return useMutation({
    mutationFn: ({
      rretId,
      cancelReason,
    }: {
      rretId: string
      cancelReason: string
    }) => cancelRentalReturnRequest(rretId, { cancel_reason: cancelReason }),
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
export function usePatchRentalReturnRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      rretId,
      body,
    }: {
      rretId: string
      body: RentalReturnRequestUpdateWire
    }) => patchRentalReturnRequest(rretId, body),
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

export function useReassignRentalReturnRequestPM() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      rretId,
      itemId,
      productManagerId,
    }: {
      rretId: string
      itemId: string
      productManagerId: string
    }) =>
      reassignRentalReturnRequestPM(rretId, itemId, {
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

/**
 * Close short — the whole request (`itemId` omitted) or one line.
 *
 * Releases the outstanding claim, so the pickers refresh with the rest.
 */
export function useCloseShortRentalReturnRequest() {
  const sync = useSretCacheSync()
  return useMutation({
    mutationFn: ({
      rretId,
      itemId,
      reason,
    }: {
      rretId: string
      itemId?: string
      reason: string
    }) =>
      itemId
        ? closeShortRentalReturnRequestItem(rretId, itemId, reason)
        : closeShortRentalReturnRequest(rretId, reason),
    onSuccess: (updated) => {
      sync(updated)
      toast.success(S.mutation.closedShort)
    },
    onError: (error: Error) => {
      toast.error(explain(error, S.mutation.closeShortFailed))
    },
  })
}
