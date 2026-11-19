import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { AccessRequestsController } from "../../hooks/accounts/useAccessRequests"

/**
 * Decision dialog for an account access request. Shows the requester's reason,
 * takes a decision note (optional to grant, required to reject), and exposes the
 * single action the approver chose — Grant when opened via Grant, Reject when
 * opened via Reject (driven by `intent`), never both at once.
 */
export function AccountAccessReviewDialog({ c }: { c: AccessRequestsController }) {
  const { review, intent, note, setNote, closeReview, confirmApprove, confirmReject, isDeciding } = c

  return (
    <Dialog open={!!review} onOpenChange={(open) => { if (!open) closeReview() }}>
      <DialogContent className="sm:max-w-md">
        {review && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Access request
              </DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">
                  {review.requested_by.name}
                </span>{" "}
                is requesting access to{" "}
                <span className="font-medium text-foreground">
                  {review.account.name}
                </span>
                .
              </DialogDescription>
            </DialogHeader>

            {/* ── Reason given by the requester ── */}
            <div className="min-w-0 rounded-lg border border-border bg-muted/30 px-3.5 py-3">
              <Typography
                variant="helper"
                tone="muted"
                className="font-semibold uppercase tracking-wider"
              >
                Reason given
              </Typography>
              <Typography
                variant="body"
                className="mt-1 line-clamp-2 break-words"
                title={review.requested_notes || undefined}
              >
                {review.requested_notes || "—"}
              </Typography>
            </div>

            {/* ── Decision note ── */}
            <div className="space-y-2">
              <Label htmlFor="access-decision-note">
                Decision note
                <Typography variant="helper" tone="muted" asChild>
                  <span className="ml-1.5 font-normal">
                    {intent === "Rejected" ? "— required to reject" : "— optional"}
                  </span>
                </Typography>
              </Label>
              <Textarea
                id="access-decision-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  intent === "Rejected"
                    ? "Explain why this request is being rejected…"
                    : "Add an optional note for this decision…"
                }
                rows={2}
                className="max-h-40 resize-none overflow-y-auto"
                autoFocus={intent === "Rejected"}
              />
            </div>

            {/* ── Actions ── */}
            {/* Single-action: the row button the approver clicked sets `intent`,
                so only the matching decision shows here (Grant → Grant only,
                Reject → Reject only). */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={closeReview} disabled={isDeciding}>
                Cancel
              </Button>
              {intent === "Rejected" ? (
                <Button
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive-soft"
                  disabled={isDeciding || !note.trim()}
                  onClick={confirmReject}
                >
                  <XCircle className="mr-1.5 size-4" />
                  Reject
                </Button>
              ) : (
                <Button onClick={confirmApprove} disabled={isDeciding}>
                  <CheckCircle2 className="mr-1.5 size-4" />
                  Grant access
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
