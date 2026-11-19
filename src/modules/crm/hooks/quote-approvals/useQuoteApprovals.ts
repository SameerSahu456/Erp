import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import {
  approveQuoteItem,
  fetchMyPendingQuotes,
  rejectQuoteItem,
  type QuoteApprovalsPendingPageWire,
  type QuoteItemApproveBody,
  type QuoteItemRejectBody,
} from "../../api/quote-approvals"

// Query key hierarchy — mirrors the SO inbox so §16.9 targeted
// invalidation stays easy to reason about (approve/reject invalidate
// only the inbox + the specific quote's detail + the list).
const QUOTE_APPROVALS_KEY = ["crm", "quote-approvals"] as const
const ME_PENDING_KEY = [...QUOTE_APPROVALS_KEY, "me", "pending"] as const
// Must match useQuotes.ts DETAIL_KEY / LIST_KEY exactly so invalidation reaches
// the right cached queries. The "detail" level was missing before, causing the
// quote detail page to stay stale after an approve/reject until manual refresh.
const QUOTE_DETAIL_KEY = ["crm", "quotes", "detail"] as const
const QUOTE_LIST_KEY = ["crm", "quotes", "list"] as const

interface UseMyPendingQuotesArgs {
  enabled?: boolean
  page: number
  pageSize: number
}

export function useMyPendingQuotes({
  enabled,
  page,
  pageSize,
}: UseMyPendingQuotesArgs) {
  const query = useQuery<QuoteApprovalsPendingPageWire>({
    queryKey: [...ME_PENDING_KEY, { page, pageSize }],
    queryFn: () => fetchMyPendingQuotes({ page, page_size: pageSize }),
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

// Which lines of ONE quote the viewer may act on — the same backend rule
// that feeds the PM Approvals queue (``eligible_items``). The detail page
// renders only these, mirroring the queue card on FEATURE-quote-approval,
// instead of re-deriving eligibility from ``approver_id`` (always NULL on a
// pending line — the resolver stamps the approver only when a human acts).
export function useMyPendingQuoteEligibility(quoteId: string | null) {
  const query = useQuery<QuoteApprovalsPendingPageWire>({
    queryKey: [...ME_PENDING_KEY, "quote", quoteId],
    queryFn: () => fetchMyPendingQuotes({ quote_id: quoteId ?? undefined, page: 1, page_size: 1 }),
    enabled: quoteId != null,
  })

  const entry = query.data?.items[0] ?? null
  const eligibleItemIds = new Set(entry?.eligible_items.map((it) => it.item_id) ?? [])

  return {
    entry,
    eligibleItemIds,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

function invalidateInboxAndDetail(
  qc: ReturnType<typeof useQueryClient>,
  quoteId: string,
) {
  void qc.invalidateQueries({ queryKey: ME_PENDING_KEY })
  void qc.invalidateQueries({ queryKey: [...QUOTE_DETAIL_KEY, quoteId] })
  void qc.invalidateQueries({ queryKey: QUOTE_LIST_KEY })
}

export function useApproveQuoteItem(quoteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body?: QuoteItemApproveBody }) =>
      approveQuoteItem(quoteId, itemId, body ?? {}),
    onSuccess: () => {
      invalidateInboxAndDetail(qc, quoteId)
      toast.success("Line approved")
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error && err.message ? err.message : "Failed to approve line"
      toast.error(msg)
    },
  })
}

export function useRejectQuoteItem(quoteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: QuoteItemRejectBody }) =>
      rejectQuoteItem(quoteId, itemId, body),
    onSuccess: () => {
      invalidateInboxAndDetail(qc, quoteId)
      toast.success("Line rejected")
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error && err.message ? err.message : "Failed to reject line"
      toast.error(msg)
    },
  })
}
