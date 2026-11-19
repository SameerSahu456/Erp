import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"

import type { CustomerDeficiencyWire } from "../../api"
import {
  useDecideDeficiencyWaiver,
  useMarkDeficiencyRecovered,
  useRequestDeficiencyWaiver,
} from "../../hooks/deficiencies/useDeficiencies"
import { DEFICIENCIES_STRINGS as S } from "./deficiencies.strings"

interface Props {
  row: CustomerDeficiencyWire
  onClose: () => void
}

/** Ask a manager to waive it — or, for a credit, propose the amount (R14). */
export function WaiverDialog({ row, onClose }: Props) {
  const request = useRequestDeficiencyWaiver()
  const [reason, setReason] = useState("")
  const [amount, setAmount] = useState("")
  const W = S.waiver
  const amountOk = !row.is_credit || (amount.trim() !== "" && Number(amount) >= 0)
  const confirm = async () => {
    await request.mutateAsync({ id: row.id, reason: reason.trim(), amount: row.is_credit ? amount : undefined })
    onClose()
  }
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={row.is_credit ? W.creditTitle : W.title}
      isDirty={!!reason || !!amount}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={request.isPending}>
            {W.cancel}
          </Button>
          <Button onClick={() => void confirm()} disabled={!reason.trim() || !amountOk || request.isPending}>
            {W.confirm}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {row.is_credit && (
          <div className="space-y-2">
            <Label required htmlFor="def-amount">{W.amount}</Label>
            <Input id="def-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label required htmlFor="def-reason">{W.reason}</Label>
          <Textarea id="def-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={W.reasonPlaceholder} rows={3} />
        </div>
      </div>
    </OperationDialog>
  )
}

/** A manager decides a pending waiver — never the person who asked. */
export function DecideWaiverDialog({ row, approve, onClose }: Props & { approve: boolean }) {
  const decide = useDecideDeficiencyWaiver()
  const [notes, setNotes] = useState("")
  const D = S.decide
  const confirm = async () => {
    await decide.mutateAsync({ id: row.id, approve, notes: notes.trim() || undefined })
    onClose()
  }
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={approve ? D.approveTitle : D.rejectTitle}
      isDirty={!!notes}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={decide.isPending}>
            {D.dismiss}
          </Button>
          <Button variant={approve ? "default" : "destructive"} onClick={() => void confirm()} disabled={decide.isPending}>
            {approve ? D.approve : D.reject}
          </Button>
        </>
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="def-notes">{D.notes}</Label>
        <Textarea id="def-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={D.notesPlaceholder} rows={3} />
      </div>
    </OperationDialog>
  )
}

/** Nothing to charge any more — the customer sent it or fixed it. */
export function RecoveredDialog({ row, onClose }: Props) {
  const recover = useMarkDeficiencyRecovered()
  const [notes, setNotes] = useState("")
  const R = S.recovered
  const confirm = async () => {
    await recover.mutateAsync({ id: row.id, notes: notes.trim() })
    onClose()
  }
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={R.title}
      description={R.body}
      isDirty={!!notes}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={recover.isPending}>
            {R.dismiss}
          </Button>
          <Button onClick={() => void confirm()} disabled={!notes.trim() || recover.isPending}>
            {R.confirm}
          </Button>
        </>
      )}
    >
      <div className="space-y-2">
        <Label required htmlFor="def-reasonlabel">{R.reasonLabel}</Label>
        <Textarea id="def-reasonlabel" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={R.reasonPlaceholder} rows={3} />
      </div>
    </OperationDialog>
  )
}
