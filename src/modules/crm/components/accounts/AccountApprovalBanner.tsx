import { useState } from "react"
import { CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { formatIST_date } from "@shared/lib/date"

import type { AccountApprovalStatus } from "../../api"

interface AccountApprovalBannerProps {
  status: AccountApprovalStatus
  /** Whether the current user may decide a pending request. */
  canApprove: boolean
  /** Decision metadata — shown on the Approved/Rejected banner. */
  decidedBy?: string | null
  decidedAt?: string | null
  /** Rejection reason / approval note. */
  reason?: string | null
  /** Disable the action buttons while an approve/reject request is in flight. */
  isDeciding?: boolean
  /** Approve with an optional note. */
  onApprove: (note?: string) => void
  /** Reject with a (required) reason. */
  onReject: (reason: string) => void
}

/**
 * Approval banner shown at the top of the Account detail page, driven purely by
 * the account's `approval_status` (+ decision metadata). The page renders the
 * SAME detail UI for pending/approved/rejected accounts — this banner is the
 * only extra chrome.
 *
 * - Pending + approver  → "pending your approval" + Approve / Reject.
 * - Pending + viewer    → read-only "awaiting approval" notice.
 * - Approved            → green "approved by … · date · note".
 * - Rejected            → red "rejected by … · date · reason".
 */
export function AccountApprovalBanner({
  status,
  canApprove,
  decidedBy,
  decidedAt,
  reason,
  isDeciding = false,
  onApprove,
  onReject,
}: AccountApprovalBannerProps) {
  const [rejecting, setRejecting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [draftReason, setDraftReason] = useState("")
  const [draftNote, setDraftNote] = useState("")

  function confirmReject() {
    if (!draftReason.trim()) return
    onReject(draftReason)
    setRejecting(false)
    setDraftReason("")
  }

  function confirmApprove() {
    // Note is optional — persisted to approval_reason when provided.
    onApprove(draftNote.trim() || undefined)
    setApproving(false)
    setDraftNote("")
  }

  // Shared "by {who} · {when} · {reason}" trail for the decided banners.
  const decidedMeta = (
    <>
      {decidedBy && (
        <>
          {" "}
          by <span className="font-medium">{decidedBy}</span>
        </>
      )}
      {decidedAt && (
        <>
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span className="text-muted-foreground">{formatIST_date(decidedAt)}</span>
        </>
      )}
      {reason && (
        <>
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span className="italic text-muted-foreground">{reason}</span>
        </>
      )}
    </>
  )

  if (status === "Approved") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
        <Typography variant="body" className="min-w-0 break-words">
          <span className="font-semibold">Approved</span>
          {decidedMeta}
        </Typography>
      </div>
    )
  }

  if (status === "Rejected") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive-soft px-4 py-3">
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <Typography variant="body" className="min-w-0 break-words">
          <span className="font-semibold">Rejected</span>
          {decidedMeta}
        </Typography>
      </div>
    )
  }

  // ── Pending, not the approver — read-only notice ──
  if (!canApprove) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 dark:border-warning/40 dark:bg-warning/15">
        <Clock className="size-4 shrink-0 text-warning" />
        <Typography variant="body">
          This account is <span className="font-semibold">pending approval</span>.
        </Typography>
      </div>
    )
  }

  // ── Pending, you can act ──
  return (
    <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 dark:border-warning/40 dark:bg-warning/15">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-4 shrink-0 text-warning" />
          <Typography variant="body">
            This account is{" "}
            <span className="font-semibold">pending your approval</span>.
          </Typography>
        </div>

        {!rejecting && !approving && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive-soft"
              onClick={() => setRejecting(true)}
              disabled={isDeciding}
            >
              <XCircle className="size-3.5" />
              Reject
            </Button>
            <Button size="sm" onClick={() => setApproving(true)} disabled={isDeciding}>
              <CheckCircle2 className="size-3.5" />
              Approve &amp; create
            </Button>
          </div>
        )}
      </div>

      {approving && (
        <div className="mt-3 space-y-2">
          <Textarea
            autoFocus
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="Approval note (optional)…"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setApproving(false)
                setDraftNote("")
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={confirmApprove} disabled={isDeciding}>
              <CheckCircle2 className="size-3.5" />
              Confirm Approve
            </Button>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="mt-3 space-y-2">
          <Textarea
            autoFocus
            value={draftReason}
            onChange={(e) => setDraftReason(e.target.value)}
            placeholder="Rejection reason (required)…"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRejecting(false)
                setDraftReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive-soft"
              onClick={confirmReject}
              disabled={isDeciding || !draftReason.trim()}
            >
              <XCircle className="size-3.5" />
              Confirm Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
