import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { notifyMutationError } from "@/shared/api/notify-mutation-error"
import { PAGINATION, UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"
import { saveBlob } from "@shared/lib/saveBlob"
import { PURCHASE_ORDERS_STRINGS } from "../../components/purchase-orders/purchase-orders.strings"

import type { FetchMyPoApprovalsParams } from "../../api"
import {
  createPurchaseOrder,
  downloadPurchaseOrderPdf,
  downloadPurchaseOrderVersionPdf,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  fetchPurchaseOrderReturns,
  fetchReturnablePurchaseOrders,
  type FetchPurchaseOrdersParams,
  type PurchaseOrder,
  type PurchaseOrderCreatePayload,
} from "../../api"

const KEY = ["procurement", "purchase-orders"] as const
const LIST_KEY = [...KEY, "list"] as const
const DETAIL_KEY = [...KEY, "detail"] as const
const OPTIONS_KEY = [...KEY, "options"] as const

export function usePurchaseOrders(params: FetchPurchaseOrdersParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchPurchaseOrders(params),
    placeholderData: keepPreviousData,
  })
}

/** Per-tab filtered COUNT queries (`page_size: 1`, one per entry) — used to keep
 *  a tab's badge showing ITS OWN filtered count even while another tab is
 *  active. Pass only the tabs that actually need it (e.g. inactive tabs with an
 *  active filter); returns a `{ [tabId]: count }` map. */
export function usePurchaseOrderTabCounts(
  entries: { id: string; params: FetchPurchaseOrdersParams }[],
) {
  const results = useQueries({
    queries: entries.map((e) => ({
      queryKey: [...LIST_KEY, "count", e.id, e.params],
      queryFn: () => fetchPurchaseOrders(e.params),
      placeholderData: keepPreviousData,
    })),
  })
  const map: Record<string, number> = {}
  entries.forEach((e, i) => {
    const t = results[i]?.data?.total
    if (typeof t === "number") map[e.id] = t
  })
  return map
}

// Infinite-scroll picker hook for PO dropdowns (Coding-guideline §16.11).
// Pairs with `<AsyncSelect useOptions={…}>`; debounced `?q` search, one page
// per scroll. Backed by the procurement:read-gated list endpoint — for the WMS
// purchase-return picker use `useReturnablePurchaseOrderOptions` instead, which
// hits the procurement:po_return_write-gated feed.
export function usePurchaseOrderOptions(
  rawSearch: string,
  options: { enabled?: boolean } = {},
) {
  const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE

  return useInfiniteQuery({
    queryKey: [...OPTIONS_KEY, { search: debounced }],
    queryFn: ({ pageParam }) =>
      fetchPurchaseOrders({
        page: pageParam,
        page_size: pageSize,
        q: debounced || undefined,
        sort: "-created_at",
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options.enabled ?? true,
  })
}

// Same infinite-scroll picker as `usePurchaseOrderOptions`, but backed by the
// `procurement:po_return_write`-gated `/purchase-orders/returnable` endpoint.
// The WMS purchase-return form uses this so store_manager / mis (who hold
// po_return_write but not the coarse procurement:read) can list POs to return
// against — the generic list endpoint 403'd them.
const RETURNABLE_OPTIONS_KEY = [...KEY, "returnable-options"] as const

export function useReturnablePurchaseOrderOptions(
  rawSearch: string,
  options: { enabled?: boolean; warehouseIds?: string[] } = {},
) {
  const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
  // Follow the navbar warehouse scope; empty = all accessible warehouses. Part of
  // the queryKey so switching the scope refetches the picker feed.
  const warehouseIds = options.warehouseIds ?? []

  return useInfiniteQuery({
    queryKey: [...RETURNABLE_OPTIONS_KEY, { search: debounced, warehouseIds }],
    queryFn: ({ pageParam }) =>
      fetchReturnablePurchaseOrders({
        page: pageParam,
        page_size: pageSize,
        warehouse_ids: warehouseIds,
        q: debounced || undefined,
        sort: "-created_at",
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options.enabled ?? true,
  })
}

export function usePurchaseOrder(
  id: string | null | undefined,
  // Detail page passes `include: "returns"` to get `credit_rollup` attached.
  // The include variant lives under a distinct `"returns"` key segment so the
  // cheap default (form / amend / approval callers) is untouched and their
  // optimistic `setQueryData` writes keep matching.
  opts: { include?: "returns" } = {},
) {
  const { include } = opts
  return useQuery({
    queryKey: include
      ? [...DETAIL_KEY, id ?? "", "returns"]
      : [...DETAIL_KEY, id ?? ""],
    queryFn: () => fetchPurchaseOrder(id as string, include),
    enabled: !!id,
  })
}

/** The PO's raised returns — audit trail for the detail's Returns tab + the
 *  per-line `Returned` count. Under the `"returns"` key prefix so it refreshes
 *  alongside the credit rollup on any PO mutation (see `onPoMutated`). */
export function usePurchaseOrderReturns(id: string | null | undefined) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id ?? "", "returns", "list"],
    queryFn: () => fetchPurchaseOrderReturns(id as string),
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PurchaseOrderCreatePayload) => createPurchaseOrder(body),
    onSuccess: (created: PurchaseOrder) => {
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.setQueryData([...DETAIL_KEY, created.id], created)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.created)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Approval lifecycle hooks (Tier A) ───────────────────────────────────

import {
  amendPurchaseOrder,
  approvePurchaseOrder,
  clonePurchaseOrder,
  fetchMyPoApprovals,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  type PurchaseOrderApprovePayload,
  type PurchaseOrderRejectPayload,
} from "../../api"

const APPROVALS_KEY = [...KEY, "approvals"] as const
const STATS_KEY = [...KEY, "stats"] as const

// Canonical PO query-key builders, exported for cross-module invalidation —
// WMS purchase-return mutations move PO quantity / credit rollups and must
// invalidate these caches without hand-duplicating the literals (§16.9).
// Consumers import via `@modules/procurement`, never copy the arrays.
export const purchaseOrderKeys = {
  list: LIST_KEY,
  stats: STATS_KEY,
  detail: (id: string) => [...DETAIL_KEY, id] as const,
} as const

function onPoMutated(qc: ReturnType<typeof useQueryClient>, po: PurchaseOrder) {
  void qc.invalidateQueries({ queryKey: LIST_KEY })
  void qc.invalidateQueries({ queryKey: APPROVALS_KEY })
  // Status flips (submit/approve/close/cancel) move the PO between tabs —
  // the tab-badge counts + KPI tiles must follow.
  void qc.invalidateQueries({ queryKey: STATS_KEY })
  qc.setQueryData([...DETAIL_KEY, po.id], po)
  // The version trail / pending-changes panel is a separate query — refresh it
  // too, otherwise approve / reject / amend / cancel leave a stale amendment
  // showing until the page is reloaded.
  void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, po.id, "versions"] })
  // Close / cancel / amend flip status + the credit rollup — refresh the
  // detail's `?include=returns` variant and the returns list (both under the
  // `"returns"` key prefix) so the credit banner + Returns tab stay live.
  void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, po.id, "returns"] })
}

export function useDownloadPurchaseOrderPdf() {
  return useMutation({
    mutationFn: (po: PurchaseOrder) => downloadPurchaseOrderPdf(po.id),
    onSuccess: (blob, po) => saveBlob(blob, `${po.po_number}.pdf`),
    onError: notifyMutationError,
  })
}

export function useDownloadPurchaseOrderVersionPdf() {
  return useMutation({
    mutationFn: ({ po, version }: { po: PurchaseOrder; version: number }) =>
      downloadPurchaseOrderVersionPdf(po.id, version),
    onSuccess: (blob, { po, version }) => saveBlob(blob, `${po.po_number}-v${version}.pdf`),
    onError: notifyMutationError,
  })
}

export function useSubmitPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => submitPurchaseOrder(id),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.submittedForApproval)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useApprovePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; body?: PurchaseOrderApprovePayload }) =>
      approvePurchaseOrder(v.id, v.body),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.approved)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRejectPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; body: PurchaseOrderRejectPayload }) =>
      rejectPurchaseOrder(v.id, v.body),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.rejected)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useClonePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => clonePurchaseOrder(id),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.cloned)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAmendPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => amendPurchaseOrder(id),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.reopenedForAmendment)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Stats (tab badges + KPI tiles) ───────────────────────────────────────

import { fetchPurchaseOrderStats } from "../../api"

export function usePurchaseOrderStats(
  params: {
    warehouse_id?: string
    supplier_id?: string
    condition?: "new" | "refurbished"
    q?: string
  } = {},
) {
  return useQuery({
    queryKey: [...STATS_KEY, params],
    queryFn: () => fetchPurchaseOrderStats(params),
    placeholderData: keepPreviousData,
  })
}

// ── Close / Cancel (terminal actions) ────────────────────────────────────

import {
  cancelPurchaseOrder,
  closePurchaseOrder,
  type PurchaseOrderCancelPayload,
  type PurchaseOrderClosePayload,
} from "../../api"

export function useClosePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; body?: PurchaseOrderClosePayload }) =>
      closePurchaseOrder(v.id, v.body),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.closed)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; body: PurchaseOrderCancelPayload }) =>
      cancelPurchaseOrder(v.id, v.body),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.cancelled)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useMyPoApprovals(
  params: FetchMyPoApprovalsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...APPROVALS_KEY, params],
    queryFn: () => fetchMyPoApprovals(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  })
}

// ── Amend (issued) + version trail hooks (Tier B) ───────────────────────

import {
  amendIssuedPurchaseOrder,
  fetchPurchaseOrderVersions,
  type PurchaseOrderAmendPayload,
} from "../../api"

export function useAmendIssuedPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; body: PurchaseOrderAmendPayload }) =>
      amendIssuedPurchaseOrder(v.id, v.body),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.amendmentDrafted)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function usePurchaseOrderVersions(id: string | null | undefined) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id ?? "", "versions"],
    queryFn: () => fetchPurchaseOrderVersions(id as string),
    enabled: !!id,
  })
}

import { updateDraftPurchaseOrder } from "../../api"

export function useUpdateDraftPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; body: PurchaseOrderCreatePayload }) =>
      updateDraftPurchaseOrder(v.id, v.body),
    onSuccess: (po) => {
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.setQueryData([...DETAIL_KEY, po.id], po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.draftUpdated)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

import {
  editAmendment,
  submitAmendment,
  cancelAmendment,
} from "../../api"

export function useEditAmendment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; body: PurchaseOrderAmendPayload }) =>
      editAmendment(v.id, v.body),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.amendmentUpdated)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSubmitAmendment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => submitAmendment(id),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.amendmentSubmitted)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCancelAmendment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelAmendment(id),
    onSuccess: (po) => {
      onPoMutated(qc, po)
      toast.success(PURCHASE_ORDERS_STRINGS.toast.amendmentCancelled)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
