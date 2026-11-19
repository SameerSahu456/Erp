import { useState } from "react"

import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"

import type { WaiverRequest } from "../../api/early-exit"
import { waiverSubjectLabel } from "../../constants/early-exit"
import { useDecideWaiverRequest } from "../../hooks/early-exit/useEarlyExit"
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings"

/** Approve or reject a waiver / terms request. The requester's reason is
 *  user data, so it sits in the body, never in the dialog's header. */
export function DecideWaiverDialog({
  row,
  onClose,
}: {
  // The early-exit queue row carries these too, so either may be decided.
  row: Pick<WaiverRequest, "id" | "subject" | "reason">
  onClose: () => void
}) {
  const decide = useDecideWaiverRequest()
  const [notes, setNotes] = useState("")
  const run = (approve: boolean) =>
    decide.mutate({ id: row.id, approve, notes: notes.trim() || undefined }, { onSuccess: onClose })
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={waiverSubjectLabel(row.subject)}
      isDirty={!!notes}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={decide.isPending}>
            {C.cancel}
          </Button>
          <Button variant="destructive" onClick={() => run(false)} disabled={decide.isPending}>
            {C.reject}
          </Button>
          <Button onClick={() => run(true)} disabled={decide.isPending}>
            {C.approve}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="min-w-0 space-y-1">
          <Typography variant="caption" tone="muted">
            {C.reason}
          </Typography>
          <Typography variant="body" className="[overflow-wrap:anywhere]">
            {row.reason}
          </Typography>
        </div>
        <div className="space-y-2">
          <Label htmlFor="waiver-decision-notes">{C.notes}</Label>
          <Textarea id="waiver-decision-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>
    </OperationDialog>
  )
}
