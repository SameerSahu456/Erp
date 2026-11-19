import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import {
  useMarkReplacementItemNotNeeded,
  type ReplacementRequestItemWire,
} from "@modules/crm"

import {
  REPLACEMENT_NOT_NEEDED_REASON_LABEL,
  type ReplacementNotNeededReason,
} from "../../constants/replacement-request-status"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

const D = S.detail.dialogs
const REASONS = Object.keys(REPLACEMENT_NOT_NEEDED_REASON_LABEL) as ReplacementNotNeededReason[]

/** Close an approved component line without a swap (spec D13): the part
 *  turned out fine, or the swap is no longer wanted. The reason comes from a
 *  fixed list; "Other" needs notes. Mounted only while open. */
export function NotNeededReplacementLineDialog({
  rrId,
  item,
  onClose,
}: {
  rrId: string
  item: ReplacementRequestItemWire
  onClose: () => void
}) {
  const markNotNeeded = useMarkReplacementItemNotNeeded()
  const [reason, setReason] = useState<ReplacementNotNeededReason | null>(null)
  const [notes, setNotes] = useState("")
  const part =
    item.component_description ?? item.replacement_part_name ?? S.detail.lines.unknownPart
  const notesRequired = reason === "other"
  const blocked = !reason || (notesRequired && !notes.trim())

  const submit = async () => {
    if (!reason) return
    await markNotNeeded.mutateAsync({
      rrId,
      itemId: item.id,
      body: { reason, notes: notes.trim() || null },
    })
    onClose()
  }

  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={D.notNeededTitle}
      description={D.notNeededBody(part)}
      isDirty={reason !== null || notes.length > 0}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={markNotNeeded.isPending}>
            {D.dismiss}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={markNotNeeded.isPending || blocked}
          >
            {D.notNeededConfirm}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label required>{D.notNeededReason}</Label>
          <Select
            value={reason}
            onValueChange={(v) => v && setReason(v as ReplacementNotNeededReason)}
          >
            <SelectTrigger className="w-full" clearable={false} aria-label={D.notNeededReason}>
              <SelectValue placeholder={D.notNeededReason}>
                {reason ? REPLACEMENT_NOT_NEEDED_REASON_LABEL[reason] : D.notNeededReason}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {REPLACEMENT_NOT_NEEDED_REASON_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rr-not-needed-notes" required={notesRequired}>
            {D.notNeededNotes}
          </Label>
          <Textarea
            id="rr-not-needed-notes"
            rows={2}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={D.notNeededNotesPlaceholder}
          />
        </div>
      </div>
    </OperationDialog>
  )
}
