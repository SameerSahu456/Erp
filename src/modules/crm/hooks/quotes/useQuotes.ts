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
  calculateQuotePreview,
  createQuote,
  deleteQuoteItem,
  fetchNextNumber,
  fetchQuote,
  fetchQuotes,
  updateQuote,
  updateQuoteStatus,
  versionQuote,
} from "../../api"
import type {
  FetchQuotesParams,
  QuoteCalculateRequest,
  QuoteCreatePayload,
  QuoteStatus,
  QuoteUpdatePayload,
} from "../../api"
import { QUOTES_STRINGS as S } from "../../components/quotes/quotes.strings"
import { invalidateEntityStats } from "../shared/entityStats"

// Query keys split into structural levels per Coding-guideline §16.9 so
// mutations can do targeted invalidation. `invalidateQueries({ queryKey:
// LIST_KEY })` only refetches lists; detail queries stay put unless we say
// so. Versions live at their own level — the version chain only changes when
// /version is called or a status flip retires a version, so blanket
// LIST_KEY invalidation should NOT touch it.
const QUOTES_KEY = ["crm", "quotes"] as const
const LIST_KEY = [...QUOTES_KEY, "list"] as const
const DETAIL_KEY = [...QUOTES_KEY, "detail"] as const
const VERSIONS_KEY = [...QUOTES_KEY, "versions"] as const

export function useQuotes(
  params: FetchQuotesParams = {},
  options?: { enabled?: boolean },
) {
  // staleTime inherited from global QueryClient defaults — see useQuote.
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchQuotes(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

// Infinite-scroll variant for embedded list views (Lead/Deal detail
// "Quotes" tab) per Coding-guideline §16.11: page through the same
// `?quotable_type=&quotable_id=` filter and let the consumer drive
// `fetchNextPage()` on scroll.
export function useQuotesInfinite(
  params: Omit<FetchQuotesParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...LIST_KEY, "infinite", { ...params, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchQuotes({ ...params, page: pageParam, page_size: pageSize }),
    initialPageParam: 1 as number,
    getNextPageParam: (last, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < last.total ? allPages.length + 1 : undefined
    },
    enabled: options?.enabled ?? true,
  })
}

export function useQuote(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  // Inherits `staleTime: 0` + `refetchOnMount: "always"` from the global
  // QueryClient defaults (see app/providers.tsx → API.QUERY_DEFAULTS).
  // Don't re-set them here — and crucially, DON'T override staleTime to
  // anything non-zero, otherwise the always-refetch contract gets broken.
  return useQuery({
    queryKey: [...DETAIL_KEY, id],
    queryFn: () => fetchQuote(id as string),
    enabled: !!id && (options?.enabled ?? true),
  })
}

// Provisional next quote number for the create form's read-only "Quote
// Number" field. The value is a *preview* — POST /crm/quotes allocates the
// authoritative number on save (see fetchNextNumber). Pass `enabled: false`
// in edit/amend mode, where the quote already carries its own number.
export function useNextQuoteNumber(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...QUOTES_KEY, "next-number"],
    queryFn: () => fetchNextNumber("quotes"),
    enabled: options?.enabled ?? true,
  })
}

// Stateless live-preview of header + per-line totals. Caller passes the
// ALREADY-DEBOUNCED payload — debouncing here would split the cache key from
// the request body and produce stale state during typing. Disable when
// `items.length === 0` so the calc doesn't fire on an empty form. The
// queryKey serializes the payload so any field change triggers a fresh
// fetch. Errors don't toast (they're a normal preview failure mode while
// the user is mid-edit) — surface via `query.isError` / `query.error`.
export function useQuoteCalculate(
  payload: QuoteCalculateRequest,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...QUOTES_KEY, "calculate", payload],
    queryFn: () => calculateQuotePreview(payload),
    enabled: (options?.enabled ?? true) && payload.items.length > 0,
    placeholderData: keepPreviousData,
  })
}

// ── Quote-level mutations ──────────────────────────────────────────────

export function useCreateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: QuoteCreatePayload) => createQuote(body),
    onSuccess: (created) => {
      qc.setQueryData([...DETAIL_KEY, created.id], created)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      // Bump the parent lead/deal's Quotes count badge. The quotable isn't in
      // scope here, so refresh whichever entity-stats query is cached.
      invalidateEntityStats(qc)
      toast.success(S.toast.created)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.createFailed)
    },
  })
}

export function useUpdateQuote(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: QuoteUpdatePayload) => updateQuote(id, body),
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

// Spawn v(N+1) Draft from a Rejected quote. Backend returns 400
// QUOTE_INVALID_TRANSITION if the source isn't Rejected, so callers must
// gate the UI (per plan §5.3) — the toast surfaces the backend message.
export function useVersionQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sourceId: string) => versionQuote(sourceId),
    onSuccess: (created, sourceId) => {
      qc.setQueryData([...DETAIL_KEY, created.id], created)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: [...VERSIONS_KEY, sourceId] })
      void qc.invalidateQueries({ queryKey: [...VERSIONS_KEY, created.id] })
      // A new version is a new quote row → the parent's Quotes count moves.
      invalidateEntityStats(qc)
      toast.success(S.toast.versionCreated(created.version_number))
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.versionFailed)
    },
  })
}

// Status transition: Draft→Sent (needs ≥1 item, pre-checked at call site),
// Sent→Accepted, Sent→Rejected. Anything else returns 400 from the backend.
// The list query needs invalidation because tabs are status-driven.
export function useUpdateQuoteStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: QuoteStatus) => updateQuoteStatus(id, status),
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, id], updated)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      toast.success(S.toast.statusChanged(updated.status))
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.statusChangeFailed)
    },
  })
}

// ── Item-level mutations ───────────────────────────────────────────────
//
// All three invalidate the parent quote's detail entry so the embedded
// items array reflects the change. The list query also gets invalidated
// because the row's `updated_at` will move and a future "items count"
// column will need to refresh.

export function useDeleteQuoteItem(quoteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => deleteQuoteItem(quoteId, itemId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, quoteId] })
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      toast.success(S.toast.itemRemoved)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.itemRemoveFailed)
    },
  })
}
