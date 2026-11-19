import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { usePatchReplacementRequest, type ReplacementRequestWire } from "@modules/crm"

import {
  REPLACEMENT_PRIORITY_LABEL,
  type ReplacementPriority,
} from "../../constants/replacement-request-status"
import { PRIORITIES } from "./replacement-request-form-helpers"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

const D = S.detail.dialogs

/** Edit a pending request's header — priority, ticket, details, notes.
 *  Mounted only while open, so every edit starts from the saved values. */
export function EditReplacementRequestDialog({
  rr,
  open,
  onOpenChange,
}: {
  rr: ReplacementRequestWire
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const patch = usePatchReplacementRequest()
  const [priority, setPriority] = useState<ReplacementPriority>(rr.priority as ReplacementPriority)
  const [ticket, setTicket] = useState(rr.external_ticket_no ?? "")
  const [system, setSystem] = useState(rr.external_system ?? "")
  const [description, setDescription] = useState(rr.description ?? "")
  const [notes, setNotes] = useState(rr.notes ?? "")

  const isDirty =
    priority !== rr.priority ||
    ticket !== (rr.external_ticket_no ?? "") ||
    system !== (rr.external_system ?? "") ||
    description !== (rr.description ?? "") ||
    notes !== (rr.notes ?? "")

  const save = async () => {
    await patch.mutateAsync({
      rrId: rr.id,
      body: {
        priority,
        external_ticket_no: ticket.trim() || null,
        external_system: system.trim() || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
      },
    })
    onOpenChange(false)
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={D.editTitle}
      description={D.editBody}
      isDirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={patch.isPending}>
            {D.dismiss}
          </Button>
          <Button onClick={() => void save()} disabled={patch.isPending || !isDirty}>
            {D.editConfirm}
          </Button>
        </>
      )}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="rr-edit-priority">{D.editPriority}</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as ReplacementPriority)}>
            <SelectTrigger id="rr-edit-priority" clearable={false} className="w-full">
              <SelectValue>{REPLACEMENT_PRIORITY_LABEL[priority]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {REPLACEMENT_PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="rr-edit-ticket">{D.editTicket}</Label>
            <Input id="rr-edit-ticket" value={ticket} maxLength={100} onChange={(e) => setTicket(e.target.value)} />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="rr-edit-system">{D.editSystem}</Label>
            <Input id="rr-edit-system" value={system} maxLength={100} onChange={(e) => setSystem(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rr-edit-description">{D.editDescription}</Label>
          <Textarea id="rr-edit-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rr-edit-notes">{D.editNotes}</Label>
          <Textarea id="rr-edit-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </OperationDialog>
  )
}
