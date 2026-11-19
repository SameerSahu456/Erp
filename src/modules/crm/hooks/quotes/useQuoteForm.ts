import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { useQuote } from "./useQuotes"
import { useCrmPrefillGuard } from "../shared/useCrmPrefillGuard"
import { useLead } from "../leads/useLeads"
import { checkLeadCloseWonReady, hasLeadDescription } from "../../lib/lead-close-won-gate"
import type { QuoteStatus } from "../../api"

// Container logic for the Quote view/edit/create page: the view-vs-edit route
// split, amend mode, deep-link prefill validation, and convert-to-SO routing.
export function useQuoteForm() {
  const { id: quoteId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  // Two routes share this page:
  //   /crm/quotes/:id        → read-only view
  //   /crm/quotes/:id/edit   → editable form (Save → PATCH)
  const viewOnly = !!quoteId && !location.pathname.endsWith("/edit")

  const isEdit = !!quoteId
  const quoteQuery = useQuote(quoteId, { enabled: isEdit })
  const quote = quoteQuery.data

  // Visible only because the viewer was @mentioned on the quote's lead/deal
  // (backend `access_level: "view"`) — no edit / amend / convert. A typed-in
  // `/edit` URL bounces back to the read-only view.
  const mentionViewOnly = quote?.access_level === "view"
  useEffect(() => {
    if (mentionViewOnly && !viewOnly && quoteId) {
      navigate(`/crm/quotes/${quoteId}`, { replace: true })
    }
  }, [mentionViewOnly, viewOnly, quoteId, navigate])

  // For LEAD quotes in view mode, prefetch the lead so Convert-to-SO can run
  // the close-won gate (stage past New/Contacted + Type set) at the click —
  // toast and stay put when blocked, instead of bouncing through the wizard.
  const convertLeadQuery = useLead(
    viewOnly && quote?.quotable_type === "lead" ? quote.quotable_id : "",
  )

  // Amend mode: clicking "Amend" on a Rejected quote enters this local flag.
  const [amendMode, setAmendMode] = useState(false)

  // Unsaved-changes flag — the QuoteBuilderPanel owns the form state and
  // reports up to here. FormPageShell consumes it for the back-arrow guard.
  const [panelDirty, setPanelDirty] = useState(false)

  // Deep-link prefill (only consulted in create mode).
  const prefill = isEdit
    ? undefined
    : {
        accountId: searchParams.get("accountId") ?? undefined,
        leadId: searchParams.get("leadId") ?? undefined,
        dealId: searchParams.get("dealId") ?? undefined,
      }

  // Validate the deep-link prefill ids — a hand-edited or stale id 404s.
  const prefillGuard = useCrmPrefillGuard({
    leadId: prefill?.leadId,
    dealId: prefill?.dealId,
    accountId: prefill?.accountId,
  })

  function handleAmend() {
    if (!quote) return
    // Local-only switch — the POST /version is fired by the panel on Save.
    setAmendMode(true)
  }

  function handleConvertToSO() {
    if (!quote) return
    // Lead / Deal quotes route through ClosedWonPage so the cascade UI runs;
    // account quotes have no cascade and stay on the standalone form.
    if (quote.quotable_type === "lead") {
      // Same close-won gate as the kanban drag: the lead must be past
      // New/Contacted and carry Name, Company, email-or-phone, Type,
      // Categories, Description and an owner.
      // Blocked = toast only, stay here. This query holds the RAW API lead,
      // so the fields are snake_case, not the mapped shape.
      const lead = convertLeadQuery.data
      if (
        lead &&
        !checkLeadCloseWonReady(lead.stage, {
          hasName: Boolean(lead.contact_name?.trim()),
          hasCompany: Boolean(lead.company_name?.trim()),
          hasContact: Boolean(lead.email?.trim() || lead.phone?.trim()),
          hasType: !!lead.channel_type,
          hasCategories: lead.categories.length > 0,
          hasDescription: hasLeadDescription(lead.description),
          hasOwner: !!lead.assigned_to,
        })
      ) {
        return
      }
      navigate(`/crm/leads/${quote.quotable_id}/close-won?type=lead&quoteId=${quote.id}`)
      return
    }
    if (quote.quotable_type === "deal") {
      navigate(`/crm/deals/${quote.quotable_id}/close-won?type=deal&quoteId=${quote.id}`)
      return
    }
    navigate(`/crm/sales-orders/new?quoteId=${quote.id}`)
  }

  const status: QuoteStatus = quote?.status ?? "Draft"

  return {
    quoteId,
    navigate,
    isEdit,
    viewOnly,
    mentionViewOnly,
    quoteQuery,
    quote,
    amendMode,
    setAmendMode,
    panelDirty,
    setPanelDirty,
    prefill,
    prefillGuard,
    handleAmend,
    handleConvertToSO,
    status,
  }
}
