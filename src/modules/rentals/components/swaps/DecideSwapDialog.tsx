import { useState } from "react"

import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { useDecideSwap } from "../../hooks/swaps/useSwaps"
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings"
import { SWAPS_STRINGS } from "./swaps.strings"

const S = SWAPS_STRINGS.detail

/** Approve or reject a pending swap, with optional notes (R10). */
export function DecideSwapDialog({
  swapId,
  approve,
  onClose,
}: {
  swapId: string
  approve: boolean
  onClose: () => void
}) {
  const decide = useDecideSwap()
  const [notes, setNotes] = useState("")
  const confirm = () =>
    decide.mutate({ id: swapId, approve, notes: notes.trim() || undefined }, { onSuccess: onClose })
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.decideTitle(approve)}
      description={S.decideBody(approve)}
      isDirty={!!notes}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={decide.isPending}>
            {C.cancel}
          </Button>
          <Button variant={approve ? "default" : "destructive"} onClick={confirm} disabled={decide.isPending}>
            {approve ? C.approve : C.reject}
          </Button>
        </>
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="swap-decision-notes">{C.notes}</Label>
        <Textarea id="swap-decision-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
    </OperationDialog>
  )
}
