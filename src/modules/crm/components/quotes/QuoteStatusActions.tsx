import { ArrowRight, History, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { usePermission } from "@shared/rbac"

import { crmCan, crmCanAll } from "../../permissions"
import type { QuoteItemWire, QuoteStatus } from "../../api"
import { useUpdateQuoteStatus } from "../../hooks/quotes/useQuotes"
import { QUOTES_STRINGS as S } from "./quotes.strings"

// Shared status-transition button bar. Used by the standalone
// QuoteFormPage action bar (/crm/quotes/:id). List rows (QuotesPage,
// QuoteSection) use QuoteRowActions instead, which surfaces the same
// transitions as items in a 3-dot dropdown.
//
// Mutation logic (Send/Accept/Reject) lives inside this component via
// useUpdateQuoteStatus. Amend / Convert-to-SO are surfaced as callbacks
// because their UX is consumer-specific:
//   - Amend on the standalone page flips a local amendMode flag; on a
//     card it expands the inline editor.
//   - Convert-to-SO navigates to a different module entirely.
//
// Responsive behavior: button labels collapse to icon-only below the
// `sm` breakpoint (640px) so two-button rows (Sent → Accept/Reject) fit
// on a narrow card or mobile viewport. Each button keeps an aria-label
// for screen readers.
export interface QuoteStatusActionsProps {
  quote: {
    id: string
    status: QuoteStatus
    items?: QuoteItemWire[]
    is_latest_quote?: boolean
  }
  /** Optional. When provided, a Rejected quote shows the Amend button —
   *  but only on the latest version of the chain (`is_latest_quote === true`).
   *  Older Rejected versions never expose Amend even if `onAmend` is given. */
  onAmend?: () => void
  /** Optional. When provided, any non-Rejected quote (Draft / Sent /
   *  Accepted) shows Convert-to-SO. Pre-2026-05-20 this was Accepted-only;
   *  status was decoupled from fulfilment so a Draft/Sent quote can also
   *  produce an SO (see docs/plans/QUOTE_SO_FLEXIBILITY_IMPLEMENTATION.md). */
  onConvertToSO?: () => void
  /** True while an amend is in progress — replaces every state button
   *  with a single Cancel Amend control. */
  amendMode?: boolean
  /** Called when the user clicks Cancel Amend. */
  onCancelAmend?: () => void
  size?: "xs" | "sm" | "default"
}

export function QuoteStatusActions({
  quote,
  onAmend,
  onConvertToSO,
  amendMode = false,
  onCancelAmend,
  size = "sm",
}: QuoteStatusActionsProps) {
  const statusMut = useUpdateQuoteStatus(quote.id)
  const { can } = usePermission()
  const canWriteQuote = can([...crmCan.writeQuote])
  // Backend gates status PATCH (Accept / Reject path) on `crm:quote_approve`
  // per spec §"Quote endpoint mapping". Send (Draft → Sent) is a mutation
  // and stays on `crm:quote_write`. Amend creates a new version → write.
  // Approve also requires read (can't responsibly approve what you can't see)
  // — see `crmCanAll.approveQuote`.
  const canApproveQuote = crmCanAll.approveQuote.every((bundle) => can([...bundle]))
  const canConvertToSo = can([...crmCan.quoteAcceptToSo])

  if (amendMode) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={onCancelAmend}
        aria-label={S.statusActions.cancelAmendAria}
      >
        <X className="size-4" />
        <span className="hidden sm:inline">{S.statusActions.cancelAmend}</span>
      </Button>
    )
  }

  const pending = statusMut.isPending

  function handleSend() {
    if (quote.items !== undefined && quote.items.length === 0) {
      toast.error(S.statusActions.sendNeedsItem)
      return
    }
    statusMut.mutate("Sent")
  }

  // Convert-to-SO is gated on `Approved` only (2026-10-07). History:
  // pre-2026-05-20 required `Accepted`; 2026-05-20..2026-10-06 broadened
  // to "any non-Rejected" after fulfilment was decoupled from quote state.
  // Narrowed back to Approved so a quote must clear internal approval
  // before producing an SO.
  const convertToSoButton =
    onConvertToSO && canConvertToSo ? (
      <Button
        size={size}
        onClick={onConvertToSO}
        aria-label={S.statusActions.convertToSOAria}
      >
        <ArrowRight className="size-4" />
        <span className="hidden sm:inline">{S.statusActions.convertToSO}</span>
      </Button>
    ) : null

  // Amend is allowed on Submitted, Partially Approved, Partially Rejected,
  // Approved and Rejected. Must be the chain head (is_latest_quote) so a stale non-head
  // row can't branch the chain. Pending Approval is excluded — it is
  // edited in place instead. A Partially Approved quote may still have a
  // line in an approver's inbox (the status flips as soon as ONE line is
  // approved); amending it withdraws that pending line from the inbox and
  // the new version re-routes it on submit. Draft is directly editable.
  const amendButton =
    onAmend && quote.is_latest_quote && canWriteQuote ? (
      <Button
        variant="outline"
        size={size}
        onClick={onAmend}
        aria-label={S.statusActions.amendAria}
      >
        <History className="size-4" />
        <span className="hidden sm:inline">{S.statusActions.amend}</span>
      </Button>
    ) : null

  switch (quote.status) {
    case "Draft":
      return (
        <>
          {/* Send Quote temporarily disabled
          {canWriteQuote && (
            <Button
              variant="outline"
              size={size}
              onClick={handleSend}
              disabled={pending}
              aria-label="Send Quote"
            >
              <Send className="size-4" />
              <span className="hidden sm:inline">Send Quote</span>
            </Button>
          )}
          */}
        </>
      )
    case "Submitted":
    case "Partially Approved":
    case "Partially Rejected":
    case "Rejected":
      return amendButton
    case "Approved":
      return (
        <>
          {amendButton}
          {convertToSoButton}
        </>
      )
    case "Sent":
      return (
        <>
          {/* Mark Accepted / Mark Rejected temporarily disabled
          {canApproveQuote && (
            <>
              <Button
                variant="outline"
                size={size}
                onClick={() => statusMut.mutate("Accepted")}
                disabled={pending}
                aria-label="Mark Accepted"
              >
                <CheckCircle2 className="size-4" />
                <span className="hidden sm:inline">Mark Accepted</span>
              </Button>
              <Button
                variant="outline"
                size={size}
                onClick={() => statusMut.mutate("Rejected")}
                disabled={pending}
                aria-label="Mark Rejected"
              >
                <XCircle className="size-4" />
                <span className="hidden sm:inline">Mark Rejected</span>
              </Button>
            </>
          )}
          */}
        </>
      )
    default:
      // Pending Approval, Accepted, Amend — no row-level actions available.
      return null
  }
}
