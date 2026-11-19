import { ApiError } from "@shared/api/envelope"

import { useAccount } from "../accounts/useAccounts"
import { useDeal } from "../deals/useDeals"
import { useLead } from "../leads/useLeads"
import { useQuote } from "../quotes/useQuotes"
import { useSalesOrder } from "../sales-orders/useSalesOrders"

// Only the fields the guard reads off a TanStack Query result — keeps this
// decoupled from each detail hook's full return shape.
//
// `failureReason` carries the error from the LAST failed attempt and is
// populated immediately after the first failure — i.e. while the query is
// still retrying (global config is `retry: 1`). `error` is only set once
// all retries are exhausted. Reading `failureReason` lets the guard flag a
// bad id right away instead of sitting on "Loading…" through the retry delay.
interface GuardableQuery {
  isLoading: boolean
  error: unknown
  failureReason: unknown
}

// Any 4xx from a prefill detail fetch means the id in the URL is unusable —
// 404 (no such record), 422 (malformed UUID), 400 (bad request). All of
// them mean "not found" from the operator's point of view. Server errors
// (5xx) and network failures are deliberately ignored: those are transient
// and shouldn't block the whole create form behind a "not found" wall.
function isBadIdError(err: unknown): boolean {
  return (
    err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500
  )
}

export interface CrmPrefillGuardResult {
  /** True while any supplied prefill id is still resolving its detail fetch. */
  isChecking: boolean
  /**
   * The first prefill entity whose id couldn't be resolved (4xx), or null
   * when every supplied id resolves (or none was supplied at all).
   */
  notFound: { entity: string } | null
}

/**
 * Validates the deep-link prefill ids a create form was opened with — e.g.
 * `/crm/quotes/new?leadId=…`, `/crm/material-inquiries/new?dealId=…`,
 * `/crm/sales-orders/new?quoteId=…`.
 *
 * When the operator hand-edits one of those ids to something that doesn't
 * exist (404) or isn't even a valid UUID (422), the backend rejects it.
 * Without this guard the form still renders, but with a relationship chip
 * stuck on "Loading…" forever — a silently broken page. The guard lets the
 * page surface a clean "<Entity> not found" instead.
 *
 * Every detail hook is called unconditionally (Rules of Hooks) and is a
 * no-op when its id is empty. Detail queries dedupe by queryKey, so the
 * form's own `useLead` / `useDeal` / … calls reuse this fetch — no extra
 * network request.
 */
export function useCrmPrefillGuard(prefill: {
  leadId?: string
  dealId?: string
  accountId?: string
  quoteId?: string
  salesOrderId?: string
}): CrmPrefillGuardResult {
  const leadId = prefill.leadId ?? ""
  const dealId = prefill.dealId ?? ""
  const accountId = prefill.accountId ?? ""
  const quoteId = prefill.quoteId ?? ""
  const salesOrderId = prefill.salesOrderId ?? ""

  const leadQuery = useLead(leadId)
  const dealQuery = useDeal(dealId || null)
  // The guard only ever validates deep-link ids on CREATE forms (e.g.
  // /crm/material-inquiries/new?accountId=…). An access-denied 403 is a 4xx,
  // so without the bypass it would be misread as "Account not found" and wall
  // off the whole form. Bypass the per-record access gate so a valid-but-
  // unauthorized account still prefills. (404/422 still correctly flag a bad id.)
  const accountQuery = useAccount(accountId || null, { bypassAccess: true })
  const quoteQuery = useQuote(quoteId || null)
  const salesOrderQuery = useSalesOrder(salesOrderId || null)

  const checks: Array<{ id: string; entity: string; query: GuardableQuery }> = [
    { id: leadId, entity: "Lead", query: leadQuery },
    { id: dealId, entity: "Deal", query: dealQuery },
    { id: accountId, entity: "Account", query: accountQuery },
    { id: quoteId, entity: "Quote", query: quoteQuery },
    { id: salesOrderId, entity: "Sales order", query: salesOrderQuery },
  ]
  const active = checks.filter((c) => c.id)

  // Catch the bad-id error from either the settled error OR the in-flight
  // retry's failure reason, so the page flips to "not found" on the first
  // failed request rather than waiting out the retry (global config: retry 1).
  const missing = active.find(
    (c) => isBadIdError(c.query.error) || isBadIdError(c.query.failureReason),
  )

  return {
    // Once a bad id is confirmed we're no longer "checking" — even if the
    // query is technically still retrying — so the page can render the
    // not-found view immediately instead of the loading one.
    isChecking: !missing && active.some((c) => c.query.isLoading),
    notFound: missing ? { entity: missing.entity } : null,
  }
}
