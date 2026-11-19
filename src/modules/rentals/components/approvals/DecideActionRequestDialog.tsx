import { useState } from "react"

import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { FieldError } from "@/components/common/forms/FieldError"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"
import { formatIST_date, istTodayDateParam } from "@shared/lib/date"
import { usePermission } from "@shared/rbac"

import type { DecidableRequest } from "../../api/action-requests"
import { useDecideActionRequest } from "../../hooks/approvals/useActionRequests"
import { rentalsCan } from "../../permissions"
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings"
import { APPROVALS_STRINGS } from "./approvals.strings"

const S = APPROVALS_STRINGS.actions

/** A request to decide: the action-request row, or an early-exit queue row. */
export interface DecideRow extends DecidableRequest {
  reason: string
  /** Terminations: the early-exit charge it raises. */
  earlyExitAmount?: string | null
  /** Terminations: the requester asked for that charge to be waived. */
  waiveRequested?: boolean
  /** Terminations: the agreed end. Ahead of today, approving schedules it. */
  effectiveDate?: string | null
}

/** Approve (which terminates the order / voids the invoice), reject — or,
 *  for a termination, approve AND waive the early-exit charge it raises
 *  (2026-11-15: one request, one decision). Waiving also needs the early-exit
 *  waiver authority. A rejection needs notes — the requester acts on them. */
export function DecideActionRequestDialog({ row, onClose }: { row: DecideRow; onClose: () => void }) {
  const decide = useDecideActionRequest()
  const canWaive = usePermission().can([...rentalsCan.approveEarlyExitWaiver])
  const [notes, setNotes] = useState("")
  const [notesError, setNotesError] = useState<string | null>(null)
  const isTermination = row.subject === "terminate"
  const hasCharge = isTermination && !!row.earlyExitAmount && Number(row.earlyExitAmount) > 0
  // ISO dates compare as strings.
  const schedules = isTermination && !!row.effectiveDate && row.effectiveDate > istTodayDateParam()

  const run = (approve: boolean, waiveEarlyExit = false) => {
    if (!approve && !notes.trim()) {
      setNotesError(S.rejectNeedsNotes)
      return
    }
    decide.mutate({ row, approve, notes: notes.trim() || undefined, waiveEarlyExit }, { onSuccess: onClose })
  }
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.decideTitle[row.subject]}
      isDirty={!!notes}
      footer={({ requestClose }) => (
        // Up to four buttons: they wrap rather than push the dialog wide (§8.7).
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={requestClose} disabled={decide.isPending}>
            {C.cancel}
          </Button>
          <Button variant="destructive" onClick={() => run(false)} disabled={decide.isPending}>
            {C.reject}
          </Button>
          {hasCharge && canWaive ? (
            <Button variant="outline" onClick={() => run(true, true)} disabled={decide.isPending}>
              {S.approveAndWaive}
            </Button>
          ) : null}
          <Button onClick={() => run(true)} disabled={decide.isPending}>
            {hasCharge ? S.approveCharge : C.approve}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <Typography variant="body" tone="warning">
          {schedules && row.effectiveDate
            ? S.approveScheduledWarning(formatIST_date(row.effectiveDate))
            : S.approveWarning[row.subject]}
        </Typography>
        {hasCharge ? (
          <div className="min-w-0 space-y-1">
            <Typography variant="caption" tone="muted">
              {S.chargeLabel}
            </Typography>
            <Typography variant="body-strong">
              {S.chargeLine(formatINR(Number(row.earlyExitAmount)), !!row.waiveRequested)}
            </Typography>
          </div>
        ) : null}
        <div className="min-w-0 space-y-1">
          <Typography variant="caption" tone="muted">
            {C.reason}
          </Typography>
          <Typography variant="body" className="[overflow-wrap:anywhere]">
            {row.reason}
          </Typography>
        </div>
        <div className="space-y-2">
          <Label htmlFor="action-decision-notes">{C.notes}</Label>
          <Textarea
            id="action-decision-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              setNotesError(null)
            }}
            rows={3}
            aria-invalid={!!notesError}
          />
          <FieldError message={notesError ?? undefined} />
        </div>
      </div>
    </OperationDialog>
  )
}
