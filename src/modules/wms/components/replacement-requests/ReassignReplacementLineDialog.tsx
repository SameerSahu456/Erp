import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import {
  useReassignReplacementItem,
  useReplacementApproverCandidates,
  type ReplacementRequestItemWire,
} from "@modules/crm"

import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

const D = S.detail.dialogs

/** Reassign one pending line to another approver. The candidates come from
 *  the server (category product managers, plus rental managers on a rental
 *  order), so the picker never offers someone the reassign would refuse.
 *  Mounted only while open. */
export function ReassignReplacementLineDialog({
  rrId,
  item,
  onClose,
}: {
  rrId: string
  item: ReplacementRequestItemWire
  onClose: () => void
}) {
  const candidates = useReplacementApproverCandidates(rrId, item.id)
  const reassign = useReassignReplacementItem()
  const [pick, setPick] = useState("")
  const [reason, setReason] = useState("")
  const rows = candidates.data ?? []
  const choosable = rows.filter((c) => !c.is_current)
  const unit = item.replacement_part_name ?? S.detail.lines.unknownPart

  const submit = async () => {
    await reassign.mutateAsync({ rrId, itemId: item.id, productManagerId: pick, reason: reason.trim() })
    onClose()
  }

  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={D.reassignTitle}
      description={D.reassignBody(unit)}
      isDirty={pick !== "" || reason.length > 0}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={reassign.isPending}>
            {D.dismiss}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={reassign.isPending || !pick || !reason.trim()}
          >
            {D.reassignConfirm}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{D.reassignPicker}</Label>
          {candidates.isLoading ? (
            <Typography variant="helper" tone="muted" className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {D.reassignLoading}
            </Typography>
          ) : candidates.isError ? (
            <Typography variant="helper" tone="danger">
              {D.reassignLoadFailed}
            </Typography>
          ) : choosable.length === 0 ? (
            <Typography variant="helper" tone="muted">
              {D.reassignNone}
            </Typography>
          ) : (
            <RadioGroup value={pick} onValueChange={(v) => setPick(v as string)} disabled={reassign.isPending}>
              {rows.map((c) => (
                <label
                  key={c.user_id}
                  htmlFor={`rr-reassign-${c.user_id}`}
                  className="flex min-w-0 items-center gap-3 rounded-md border p-2"
                >
                  <RadioGroupItem id={`rr-reassign-${c.user_id}`} value={c.user_id} disabled={c.is_current} />
                  <span className="min-w-0 flex-1">
                    <Typography variant="body" className="block min-w-0 truncate">
                      {c.name}
                    </Typography>
                    <Typography variant="helper" tone="muted" className="block min-w-0 truncate">
                      {c.email}
                    </Typography>
                  </span>
                  <Badge variant="secondary" className="shrink-0 font-normal">
                    {c.is_current
                      ? D.reassignCurrent
                      : c.source === "rental_manager"
                        ? D.reassignSourceRental
                        : D.reassignSourcePm}
                  </Badge>
                </label>
              ))}
            </RadioGroup>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="rr-reassign-reason" required>
            {D.reassignReason}
          </Label>
          <Textarea
            id="rr-reassign-reason"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={D.reassignPlaceholder}
          />
        </div>
      </div>
    </OperationDialog>
  )
}
