import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { PAGINATION } from "@/shared/constants"

import {
  approveSalesOrderLine,
  calculateSalesOrderPreview,
  createSalesOrder,
  deleteSalesOrder,
  fetchMyPendingSalesOrders,
  fetchSalesOrder,
  fetchSalesOrderFulfillment,
  fetchSalesOrders,
  reassignSalesOrderLine,
  rejectSalesOrderLine,
  reviseSalesOrder,
  submitSalesOrder,
  updateSalesOrder,
} from "../../api"
import type {
  FetchSalesOrdersParams,
  LineApproveBody,
  LineReassignBody,
  LineRejectBody,
  ReviseSalesOrderInput,
  SalesOrderAccountDocuments,
  SalesOrderAttachmentUpload,
  SalesOrderCalculateRequest,
  SalesOrderCreatePayload,
  SalesOrderUpdatePayload,
} from "../../api"
import { SALES_ORDERS_STRINGS as S } from "../../components/sales-orders/sales-orders.strings"
import { invalidateEntityStats } from "../shared/entityStats"

// Query keys split into structural levels per Coding-guideline §16.9 so
// mutations can do targeted invalidation. Mirror the Quote module shape so
// the patterns are interchangeable: invalidateQueries({ queryKey: LIST_KEY })
// only refetches lists; detail queries stay put unless we explicitly say so.
const SALES_ORDERS_KEY = ["crm", "sales-orders"] as const
const LIST_KEY = [...SALES_ORDERS_KEY, "list"] as const
const DETAIL_KEY = [...SALES_ORDERS_KEY, "detail"] as const
// Personal approver queue — `GET /sales-orders/me/pending`. Distinct from
// the admin list so its targeted invalidation (per-line approve / reject /
// reassign) doesn't blow away the broader SO list cache.
const ME_PENDING_KEY = [...SALES_ORDERS_KEY, "me-pending"] as const

export function useSalesOrders(
  params: FetchSalesOrdersParams = {},
  options?: { enabled?: boolean },
) {
  // staleTime + refetchOnMount inherited from global QueryClient defaults
  // (Coding-guideline §6.5.1). Do NOT override per-hook.
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchSalesOrders(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

// Infinite-scroll variant for embedded list views (Account / Deal / Lead
// detail "Sales Orders" tab) per §16.11.
export function useSalesOrdersInfinite(
  params: Omit<FetchSalesOrdersParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...LIST_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchSalesOrders({ ...params, page: pageParam, page_size: pageSize }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options?.enabled ?? true,
  })
}

export function useSalesOrder(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  // Inherits `staleTime: 0` + `refetchOnMount: "always"` from the global
  // QueryClient (see app/providers.tsx → API.QUERY_DEFAULTS). §6.5.1.
  return useQuery({
    queryKey: [...DETAIL_KEY, id],
    queryFn: () => fetchSalesOrder(id as string),
    enabled: !!id && (options?.enabled ?? true),
  })
}

// Per-line + rollup fulfillment stage counts for the SO detail Line Items tab.
// Backend stitches CRM `ordered` onto WMS-derived stage counts; global
// QueryClient defaults apply (§6.5.1 — no per-hook overrides).
export function useSalesOrderFulfillment(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id, "fulfillment"],
    queryFn: () => fetchSalesOrderFulfillment(id as string),
    enabled: !!id && (options?.enabled ?? true),
  })
}

// Stateless live preview of header + per-line totals. Callers pass the
// ALREADY-DEBOUNCED payload — debouncing inside the hook would split the
// cache key from the request body and produce stale state during typing.
// Disable when `items.length === 0` so the calc doesn't fire on an empty
// form. The queryKey serializes the payload so any field change triggers a
// fresh fetch. Errors are intentionally NOT toasted (normal preview-fail
// mode while the user is mid-edit) — surface via `query.isError` /
// `query.error` at the call site.
export function useSalesOrderCalculate(
  payload: SalesOrderCalculateRequest,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...SALES_ORDERS_KEY, "calculate", payload],
    queryFn: () => calculateSalesOrderPreview(payload),
    enabled: (options?.enabled ?? true) && payload.items.length > 0,
    placeholderData: keepPreviousData,
  })
}

// ── Mutations ──────────────────────────────────────────────────────────

// `documents` is honored only on the lead-cascade branch — backend silently
// drops it elsewhere. Deal/account callers pass `documents: undefined`
// (or omit it entirely).
export interface CreateSalesOrderArgs {
  payload: SalesOrderCreatePayload
  documents?: SalesOrderAccountDocuments
  attachments?: SalesOrderAttachmentUpload[]
}

export function useCreateSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payload, documents, attachments }: CreateSalesOrderArgs) =>
      createSalesOrder(payload, documents, attachments),
    onSuccess: (created) => {
      qc.setQueryData([...DETAIL_KEY, created.id], created)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      invalidateEntityStats(qc)
      toast.success(S.toast.created)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.createFailed)
    },
  })
}

export function useUpdateSalesOrder(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SalesOrderUpdatePayload) => updateSalesOrder(id, body),
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, id], updated)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      toast.success(S.toast.updated)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.updateFailed)
    },
  })
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSalesOrder(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: [...DETAIL_KEY, id] })
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      invalidateEntityStats(qc)
      toast.success(S.toast.deleted)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.deleteFailed)
    },
  })
}

// Draft → Submitted. The list query is tab-filtered by status, so it
// needs invalidation in addition to the detail entry. The hook surfaces
// the backend's typed error code in the toast so sales gets actionable
// feedback (missing approver, empty SO, etc.).
export function useSubmitSalesOrder(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => submitSalesOrder(id),
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, id], updated)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      toast.success(S.toast.submitted)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.submitFailed)
    },
  })
}

// /revise spawns v(N+1) Draft of the source SO and returns the NEW head — its
// `id` differs from the source. Seed the cache under the new id so the redirect
// hits a warm detail entry; invalidate the source's detail because it just got
// demoted (is_latest_order=false, status=Amend). The list is status-tab
// filtered so it needs invalidation too. Surfaces the backend's typed error
// (e.g. SO_REVISE_INVALID_SOURCE_STATUS) verbatim.
export function useReviseSalesOrder(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input?: string | ReviseSalesOrderInput) =>
      reviseSalesOrder(id, input),
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, updated.id], updated)
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, id] })
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      toast.success(S.toast.revised(updated.order_number))
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.reviseFailed)
    },
  })
}

// ── PM approval queue + per-line actions (spec §B7/B8/B10) ─────────────
//
// The Sales Order tab on `/procurement/pm-approvals` is driven by these
// hooks. The list query (useMyPendingSalesOrders) fires once on tab
// activation; the detail query (useSalesOrderApprovalDetail) is LAZY —
// only enabled when a row is expanded. Mutations predicate-invalidate
// exactly the two cache keys (queue + that SO's detail) per §16.9.

// Personal approver queue for the PM Approvals page — `GET
// /crm/sales-orders/me/pending`. The backend scopes the result to SOs where
// the caller is the assigned `approver_id` on ≥1 Pending line AND the header
// is Submitted/PartiallyApproved, so this returns "SOs that need ME", not the
// org-wide in-flight list. (For an admin "all in-flight SOs" view use
// `useSalesOrders({ status: [...] })` — deliberately NOT what this queue is.)
// Server-paginated by (page, pageSize); keyed on ME_PENDING_KEY so the
// per-line approve/reject/reassign mutations (invalidateApprovalCaches) refresh
// it automatically.
//
// `enabled` is the lazy-load gate — pass `activeTab === 'so'` so the
// query doesn't fire while the user is on another tab.
export function useMyPendingSalesOrders({
  enabled,
  page,
  pageSize,
  search,
  accountIds,
  userIds,
  dateFrom,
  dateTo,
  sort,
}: {
  enabled?: boolean
  page: number
  pageSize: number
  /** PM Approvals toolbar filters (server-side). */
  search?: string
  accountIds?: string[]
  userIds?: string[]
  /** submitted_at range, `YYYY-MM-DD` (inclusive IST days). */
  dateFrom?: string
  dateTo?: string
  /** Server sort, `field` or `-field` (desc). */
  sort?: string
}) {
  const filters = { search: search || undefined, accountIds, userIds, dateFrom, dateTo, sort }
  const query = useQuery({
    queryKey: [...ME_PENDING_KEY, { page, pageSize, ...filters }],
    queryFn: () =>
      fetchMyPendingSalesOrders({
        page,
        page_size: pageSize,
        search: filters.search,
        account_id: accountIds,
        user_id: userIds,
        date_from: dateFrom,
        date_to: dateTo,
        sort,
      }),
    enabled: enabled ?? true,
    placeholderData: keepPreviousData,
  })

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  return {
    items,
    total,
    totalPages,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  }
}

// Lazy SO detail fetch for the expanded row. Same cache key as
// useSalesOrder() so opening the row warms (and is warmed by) the regular
// SO detail page. `enabled` driven by the row's expanded state.
export function useSalesOrderApprovalDetail(
  soId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...DETAIL_KEY, soId],
    queryFn: () => fetchSalesOrder(soId as string),
    enabled: !!soId && (options?.enabled ?? true),
  })
}

function invalidateApprovalCaches(
  qc: ReturnType<typeof useQueryClient>,
  soId: string,
) {
  // Refresh every list backing the SO approval surface:
  //   - ME_PENDING_KEY: the personal /me/pending approver queue that drives
  //     the PM Approvals "Sales Orders" tab (useMyPendingSalesOrders).
  //   - LIST_KEY: the generic SO lists (useSalesOrders / detail-tab embeds)
  //     that also show the SO whose line just changed.
  //   - DETAIL_KEY[soId]: the expanded row's detail fetch.
  void qc.invalidateQueries({ queryKey: LIST_KEY })
  void qc.invalidateQueries({ queryKey: ME_PENDING_KEY })
  void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, soId] })
}

export function useApproveSalesOrderLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      soId,
      lineId,
      body,
    }: {
      soId: string
      lineId: string
      body?: LineApproveBody
    }) => approveSalesOrderLine(soId, lineId, body),
    onSuccess: (updated, { soId }) => {
      qc.setQueryData([...DETAIL_KEY, soId], updated)
      invalidateApprovalCaches(qc, soId)
      toast.success(S.toast.lineApproved)
    },
    onError: (error: Error) => {
      toast.error(mapApprovalError(error, S.toast.lineApproveFailed))
    },
  })
}

export function useRejectSalesOrderLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      soId,
      lineId,
      body,
    }: {
      soId: string
      lineId: string
      body: LineRejectBody
    }) => rejectSalesOrderLine(soId, lineId, body),
    onSuccess: (updated, { soId }) => {
      qc.setQueryData([...DETAIL_KEY, soId], updated)
      invalidateApprovalCaches(qc, soId)
      toast.success(S.toast.lineRejected)
    },
    onError: (error: Error) => {
      toast.error(mapApprovalError(error, S.toast.lineRejectFailed))
    },
  })
}

export function useReassignSalesOrderLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      soId,
      lineId,
      body,
    }: {
      soId: string
      lineId: string
      body: LineReassignBody
    }) => reassignSalesOrderLine(soId, lineId, body),
    onSuccess: (updated, { soId }) => {
      qc.setQueryData([...DETAIL_KEY, soId], updated)
      invalidateApprovalCaches(qc, soId)
      toast.success(S.toast.lineReassigned)
    },
    onError: (error: Error) => {
      toast.error(mapApprovalError(error, S.toast.lineReassignFailed))
    },
  })
}

// Friendly text for the typed codes the SO approval endpoints raise.
// Falls back to the server message — which is human-readable for every
// case the spec defines today.
function mapApprovalError(error: Error, fallback: string): string {
  const code = (error as Error & { code?: string }).code
  switch (code) {
    case "LINE_NOT_OWNED_BY_CALLER":
      return S.approvalErrors.lineNotOwned
    case "LINE_ALREADY_DECIDED":
    case "LINE_NOT_PENDING":
      return S.approvalErrors.lineAlreadyDecided
    case "LINE_IS_BOM_CHILD":
      // SO-BOM (2026-05-29): PMs decide the headline; the server-side
      // cascade carries the same decision to every child in one tx.
      return S.approvalErrors.lineIsBomChild
    case "SO_HEADER_FROZEN":
    case "SO_NOT_IN_PENDING_STATE":
    case "SO_NOT_IN_APPROVAL_STATE":
      return S.approvalErrors.soNotAcceptingDecisions
    case "SO_APPROVER_LACKS_PERMISSION":
      return S.approvalErrors.approverLacksPermission
    case "SO_REASSIGN_TARGET_INVALID":
      return S.approvalErrors.reassignTargetInvalid
    case "LINE_NOT_FOUND":
      return S.approvalErrors.lineNotFound
    case "SO_NOT_FOUND":
      return S.approvalErrors.soNotFound
    default:
      return error.message || fallback
  }
}
