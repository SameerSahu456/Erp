import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface ReasonDialogCopy {
  readonly title: string
  readonly body?: string
  readonly reasonLabel: string
  readonly reasonPlaceholder: string
  readonly confirm: string
  readonly dismiss: string
}

/**
 * A destructive step the server requires a reason for (reject, cancel,
 * close short). Mounted only while open, so each opening starts empty.
 */
export function ReasonDialog({
  copy,
  pending,
  onConfirm,
  onClose,
}: {
  copy: ReasonDialogCopy
  pending: boolean
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
}) {
  const [reason, setReason] = useState("")
  // Callers reject on purpose to keep the dialog open; catch it to avoid an unhandled rejection.
  const confirm = async () => {
    try {
      await onConfirm(reason.trim())
    } catch {
      return
    }
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {copy.body && (
            <Typography variant="body" tone="muted">
              {copy.body}
            </Typography>
          )}
          <div className="space-y-2">
            <Label required htmlFor="reason-reasonlabel">{copy.reasonLabel}</Label>
            <Textarea id="reason-reasonlabel"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={copy.reasonPlaceholder}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {copy.dismiss}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void confirm()}
            disabled={!reason.trim() || pending}
          >
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
