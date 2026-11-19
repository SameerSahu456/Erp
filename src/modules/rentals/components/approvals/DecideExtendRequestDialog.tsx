import { useState } from "react"

import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { FieldError } from "@/components/common/forms/FieldError"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"

import type { ExtendDecision, ExtendRequest } from "../../api/extend-requests"
import { useDecideExtendRequest } from "../../hooks/approvals/useExtendRequests"
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings"
import { APPROVALS_STRINGS } from "./approvals.strings"
import { ExtendRateLines } from "./ExtendRateLines"

const S = APPROVALS_STRINGS.rateChange

interface DecideExtendRequestDialogProps {
  request: ExtendRequest
  decision: ExtendDecision
  onClose: () => void
}

/** Approve a rate-changing extend (which applies it) or reject it. Both show
 *  the rates being decided; a rejection needs notes — the requester acts on
 *  them, and the server refuses a bare no. */
export function DecideExtendRequestDialog({ request, decision, onClose }: DecideExtendRequestDialogProps) {
  const decide = useDecideExtendRequest()
  const [notes, setNotes] = useState("")
  const [notesError, setNotesError] = useState<string | null>(null)
  const isReject = decision === "reject"

  const submit = () => {
    if (isReject && !notes.trim()) {
      setNotesError(S.rejectNeedsNotes)
      return
    }
    decide.mutate({ request, decision, notes: notes.trim() || null }, { onSuccess: onClose })
  }

  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={isReject ? S.rejectTitle : S.approveTitle}
      isDirty={!!notes}
      footer={({ requestClose }) => (
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={requestClose} disabled={decide.isPending}>
            {C.cancel}
          </Button>
          <Button variant={isReject ? "destructive" : "default"} onClick={submit} disabled={decide.isPending}>
            {isReject ? C.reject : C.approve}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <Typography variant="body" tone={isReject ? "muted" : "warning"}>
          {isReject ? S.rejectWarning : S.approveWarning}
        </Typography>
        <ExtendRateLines request={request} />
        {request.reason ? (
          <div className="min-w-0 space-y-1">
            <Typography variant="caption" tone="muted">
              {C.reason}
            </Typography>
            <Typography variant="body" className="[overflow-wrap:anywhere]">
              {request.reason}
            </Typography>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="extend-decision-notes">{C.notes}</Label>
          <Textarea
            id="extend-decision-notes"
            value={notes}
            maxLength={2000}
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
