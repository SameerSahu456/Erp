import { useState } from "react"
import {
  ArrowRight,
  Download,
  History,
  MoreHorizontal,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { fetchQuote } from "../../api"
import type { QuoteStatus } from "../../api"
import { useUpdateQuoteStatus, useVersionQuote } from "../../hooks/quotes/useQuotes"
import {
  beginQuotePdfPoll,
  useQuotePdfPolling,
} from "../../hooks/quotes/useQuotePdfPolling"
import { QUOTES_STRINGS as S } from "./quotes.strings"
import { saveBlob } from "@/shared/lib/saveBlob"

// Per-row actions dropdown for any list of quotes. Used by:
//   * QuotesPage (top-level /crm/quotes list)
//   * QuoteSection (Lead/Deal detail "Quotes" tab table)
//
// State-transition mutations (`useUpdateQuoteStatus`) live inside this
// component because they're bound to a specific quoteId, and React's
// hooks rules forbid calling them inside a parent `.map` callback.
// `useVersionQuote` is shared from the parent (one instance per list).
export interface QuoteRowActionsProps {
  quoteId: string
  quoteNumber: string
  versionNumber: number
  status: QuoteStatus
  /** Only the latest version of a chain may be amended — the parent
   *  (QuotesPage / QuoteSection) reads `is_latest_quote` from the row
   *  and forwards it here. Applies to every amendable status
   *  (Submitted / Partially Approved / Approved / Rejected), not just
   *  Rejected. */
  isLatest: boolean
  /** Called after a successful version-create when `onAmendInline` is NOT
   *  provided. Receives the newly-created draft quote id so the parent
   *  can navigate to its edit page. */
  onAmended: (newId: string) => void
  /** Optional — when supplied, the "Amend" item opens an inline editor
   *  on the EXISTING quote instead of immediately calling the version
   *  endpoint. QuoteBuilderPanel handles creating the new version on
   *  save. Used by the Lead/Deal detail Quotes tab so amending doesn't
   *  navigate the operator off the parent record. */
  onAmendInline?: (quoteId: string) => void
  /** Optional — when supplied, any non-Rejected quote (Draft / Sent /
   *  Accepted) exposes the "Convert to Sales Order" item. Pre-2026-05-20
   *  this was Accepted-only; quote.status was decoupled from fulfilment so
   *  Draft/Sent quotes can also produce SOs. Omit on lists where SO
   *  conversion isn't relevant. */
  onConvertToSO?: () => void
  /** False hides "Amend / new version" (e.g. view-only access or no
   *  quote-write permission). Defaults to true. */
  canAmend?: boolean
  versionMut: ReturnType<typeof useVersionQuote>
}

// Pull the file name out of a (possibly query-stringed) PDF URL — the last
// non-empty path segment, URL-decoded. Returns `fallback` when the URL has no
// usable trailing segment.
function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const { pathname } = new URL(url, window.location.origin)
    const last = pathname.split("/").filter(Boolean).pop()
    if (!last) return fallback
    return decodeURIComponent(last)
  } catch {
    return fallback
  }
}

export function QuoteRowActions({
  quoteId,
  quoteNumber,
  versionNumber,
  status,
  isLatest,
  onAmended,
  onAmendInline,
  onConvertToSO,
  canAmend = true,
  versionMut,
}: QuoteRowActionsProps) {
  const transitionMut = useUpdateQuoteStatus(quoteId)
  const [downloading, setDownloading] = useState(false)
  // Async PDF status for this row. `pending` means the async worker is still
  // rendering after a recent save — download click should nudge the user to
  // wait instead of firing a misleading "PDF unavailable" toast.
  const { status: pdfStatus } = useQuotePdfPolling(quoteId)

  // The list endpoint returns a slim shape without `pdf_url`, so fetch
  // the full quote on click, then GET the PDF as a Blob and trigger a
  // file-save via a synthetic <a download> so the browser surfaces a real
  // Save dialog. The filename is taken straight from the PDF URL (its last
  // path segment), falling back to `<quote-number>-v<version>.pdf` if the
  // URL has no usable name.
  async function handleDownload() {
    if (downloading) return
    setDownloading(true)
    try {
      const quote = await fetchQuote(quoteId)
      if (!quote.pdf_url) {
        // Distinguish "PDF hasn't been rendered yet by the async worker"
        // from "there's no PDF for this quote" — the former is transient,
        // the latter is a real problem.
        toast.error(
          pdfStatus === "pending"
            ? S.rowActions.pdfGeneratingHint
            : S.rowActions.pdfUnavailable,
        )
        return
      }
      const res = await fetch(quote.pdf_url)
      if (!res.ok) {
        toast.error(S.rowActions.pdfDownloadFailedStatus(res.status))
        return
      }
      const blob = await res.blob()
      saveBlob(blob, fileNameFromUrl(quote.pdf_url, `${quoteNumber}-v${versionNumber}.pdf`))
    } catch {
      toast.error(S.rowActions.pdfDownloadFailed)
    } finally {
      setDownloading(false)
    }
  }

  const showDownload = status === "Approved"
  const showConvertToSO = status === "Approved" && !!onConvertToSO
  const showAmend =
    isLatest &&
    canAmend &&
    (status === "Submitted" ||
      status === "Partially Approved" ||
      status === "Partially Rejected" ||
      status === "Approved" ||
      status === "Rejected")

  // No action applies (e.g. Pending Approval, Amend) — render no 3-dot
  // trigger at all rather than one that opens an empty menu.
  if (!showDownload && !showConvertToSO && !showAmend) return null

  return (
    <DropdownMenu>
      {/* Stop propagation so clicking the 3-dot button doesn't bubble up
          to the row's onRowClick navigation. */}
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {/* Download is gated on Approved — the PDF is only a customer-shareable
            artifact once the quote clears internal approval. Pre-approval
            statuses (Draft/Submitted/Pending Approval/Partially Approved) and
            post-approval terminal states (Sent/Accepted/Rejected/Amend) all
            hide it; the detail page mirrors this gate. */}
        {showDownload && (
          <DropdownMenuItem
            onClick={() => {
              if (downloading) return
              handleDownload()
            }}
          >
            <Download className="size-4 mr-2" />
            {downloading ? S.rowActions.downloadingPdf : S.rowActions.downloadPdf}
          </DropdownMenuItem>
        )}
        {/* Send Quote / Mark as Accepted / Mark as Rejected temporarily disabled
        {status === "Draft" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => transitionMut.mutate("Sent")}>
              <Send className="size-4 mr-2" />
              Send Quote
            </DropdownMenuItem>
          </>
        )}
        {status === "Sent" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => transitionMut.mutate("Accepted")}>
              <CheckCircle2 className="size-4 mr-2" />
              Mark as Accepted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => transitionMut.mutate("Rejected")}>
              <XCircle className="size-4 mr-2" />
              Mark as Rejected
            </DropdownMenuItem>
          </>
        )}
        */}
        {/* pre-2026-05-20: status === "Accepted" — restricted to Accepted.
            2026-05-20..2026-10-06: status !== "Rejected" — allowed from any
            non-Rejected status after fulfilment was decoupled from quote
            state. 2026-10-07: narrowed back to Approved only — a quote must
            clear internal approval before producing an SO. */}
        {showConvertToSO && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onConvertToSO}>
              <ArrowRight className="size-4 mr-2" />
              {S.rowActions.convertToSO}
            </DropdownMenuItem>
          </>
        )}
        {/* Mirrors backend QUOTE_VERSIONABLE_STATUSES (enums.py:595). Pending
            Approval is deliberately excluded — amending mid-review invalidates
            in-flight approver stamps; the admin must cancel the review back
            to Draft first. Draft is excluded because the quote is still
            directly editable (no need to fork a version). Sent/Accepted/Amend
            are excluded by backend rule. ``canAmend`` layers the view-only /
            quote-write permission gate on top of the backend status set. */}
        {showAmend && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                if (onAmendInline) {
                  onAmendInline(quoteId)
                  return
                }
                const created = await versionMut.mutateAsync(quoteId)
                // New version starts with no rendered PDF — kick off the
                // async-PDF poll so the new version's detail page settles
                // into a downloadable state.
                beginQuotePdfPoll(created.id, null)
                onAmended(created.id)
              }}
            >
              <History className="size-4 mr-2" />
              {S.rowActions.amend}{onAmendInline ? "" : S.rowActions.amendNewVersionSuffix}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
