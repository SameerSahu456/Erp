import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"

// Wire shapes mirror
// `comprint-erp-backend/app/modules/crm/schemas/quote.py` (QUOTE-APPR-T6/T8).

export interface QuoteApprovalPendingItemWire {
  item_id: string
  item_name: string
  qty: number
  rate: number
  amount: number
  is_stamped_to_me: boolean
}

export interface QuoteApprovalPendingQuoteWire {
  quote_id: string
  quote_number: string
  status: string
  account_name: string | null
  // Link targets: resolved customer account (null for lead-quotes) and the
  // quote's own source record (lead / deal / account).
  account_id: string | null
  quotable_type: "account" | "deal" | "lead" | null
  quotable_id: string | null
  submitted_by_name: string | null
  source_number: string | null
  updated_at: string
  eligible_items: QuoteApprovalPendingItemWire[]
  eligible_items_count: number
  total_pending_items: number
}

export interface QuoteApprovalsPendingPageWire {
  items: QuoteApprovalPendingQuoteWire[]
  total: number
  page: number
  page_size: number
}

export interface FetchMyPendingQuotesParams {
  page?: number
  page_size?: number
  // Narrow the inbox to one quote — the approval detail page uses this to
  // learn which of that quote's lines the viewer may act on.
  quote_id?: string
}

export async function fetchMyPendingQuotes(
  params: FetchMyPendingQuotesParams = {},
): Promise<QuoteApprovalsPendingPageWire> {
  return apiClient.get<QuoteApprovalsPendingPageWire>(
    endpoints.crm.quoteApprovalsPending,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        ...(params.quote_id ? { quote_id: params.quote_id } : {}),
      },
    },
  )
}

// Per-line approve / reject. Response payload is the full quote
// (QuoteResponse) — the FE caller refreshes the inbox + the detail
// view off this single payload.

export interface QuoteItemApproveBody {
  notes?: string
}

export interface QuoteItemRejectBody {
  notes: string
}

export async function approveQuoteItem(
  quoteId: string,
  itemId: string,
  body: QuoteItemApproveBody = {},
): Promise<unknown> {
  return apiClient.post(
    endpoints.crm.quoteItemApprove(quoteId, itemId),
    body,
  )
}

export async function rejectQuoteItem(
  quoteId: string,
  itemId: string,
  body: QuoteItemRejectBody,
): Promise<unknown> {
  return apiClient.post(
    endpoints.crm.quoteItemReject(quoteId, itemId),
    body,
  )
}

// Max length for the approve / reject `notes` body — mirrors the backend
// Pydantic constraint on QuoteItemRejectRequest (max_length=1000). Same
// figure as SO_LINE_NOTES_MAX so the two line-decision dialogs match.
export const QUOTE_LINE_NOTES_MAX = 1000
