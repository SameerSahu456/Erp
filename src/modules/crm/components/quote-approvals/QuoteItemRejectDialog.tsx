import { useState } from "react"
import { ThumbsDown } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"
import { UnsavedChangesDialog } from "@/components/common/dialogs/UnsavedChangesDialog"
import { useFormErrors } from "@/hooks/use-form-errors"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"

import { QUOTE_LINE_NOTES_MAX } from "../../api/quote-approvals"
import { QUOTE_APPROVALS_STRINGS } from "./quote-approvals.strings"

// Quote-line reject dialog. Visually and behaviourally mirrors the SO
// RejectLineDialog (components/sales-orders/SalesOrderApprovalDialogs.tsx):
// centred destructive icon header, "<item> on quote <number>" body, required
// Reason textarea with inline FieldError + toast, outline Cancel / destructive
// Reject footer, and an unsaved-changes guard on dismiss. Unlike the SO
// dialog the mutation is owned by the caller (the PM queue row and the detail
// panel bind it to different quote ids), so this component only collects the
// reason and reports `onConfirm(notes)`.
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (notes: string) => void
  isPending: boolean
  /** Line being rejected — shown bold in the body. */
  lineItemName: string
  /** Parent quote number — shown bold in the body. */
  quoteNumber: string
}

export function QuoteItemRejectDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  lineItemName,
  quoteNumber,
}: Props) {
  const S = QUOTE_APPROVALS_STRINGS.rejectDialog
  const [notes, setNotes] = useState("")
  const { errors, setError, clearError, clearAll } = useFormErrors()

  // Reset local state whenever the dialog closes — avoids a stale reason
  // leaking into the next rejection. Done as a render-time prop→state
  // adjustment (React's sanctioned pattern) rather than in an effect, so
  // the reset lands in the same render as the close instead of a frame later.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      setNotes("")
      clearAll()
    }
  }

  const isDirty = open && notes.length > 0
  const guard = useUnsavedChangesGuard({ isDirty })

  function handleAttemptClose() {
    guard.attempt(() => onOpenChange(false))
  }

  function handleConfirm() {
    const trimmed = notes.trim()
    if (!trimmed) {
      setError("notes", S.validation.reasonRequired)
      toast.error(S.validation.fixHighlighted)
      return
    }
    if (trimmed.length > QUOTE_LINE_NOTES_MAX) {
      setError("notes", S.validation.reasonTooLong(QUOTE_LINE_NOTES_MAX))
      toast.error(S.validation.fixHighlighted)
      return
    }
    onConfirm(trimmed)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleAttemptClose()
          return
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <ThumbsDown className="size-6 text-destructive" />
          </div>
          <DialogTitle className="text-lg">{S.title}</DialogTitle>
          <DialogDescription>
            {S.bodyBefore}
            <span className="font-medium text-foreground">{lineItemName}</span>
            {S.bodyMiddle}
            <span className="font-medium text-foreground">{quoteNumber}</span>
            {S.bodyAfter}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 pt-1">
          <Label htmlFor="quote-line-reject-reason" className="text-sm font-medium">
            {S.reason} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="quote-line-reject-reason"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              clearError("notes")
            }}
            placeholder={S.reasonPlaceholder}
            rows={4}
            className="min-h-24 resize-y"
            maxLength={QUOTE_LINE_NOTES_MAX + 1}
            aria-invalid={Boolean(errors.notes)}
            autoFocus
          />
          <div className="flex items-start justify-between gap-3">
            <FieldError message={errors.notes} />
            <Typography
              variant="helper"
              tone={notes.trim().length > QUOTE_LINE_NOTES_MAX ? "danger" : "muted"}
              numeric
              className="ml-auto shrink-0"
            >
              {S.charCount(notes.trim().length, QUOTE_LINE_NOTES_MAX)}
            </Typography>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleAttemptClose} disabled={isPending}>
            {S.cancel}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            <ThumbsDown className="size-3.5" data-icon="inline-start" />
            {isPending ? QUOTE_APPROVALS_STRINGS.actions.rejecting : S.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onOpenChange={guard.onDialogOpenChange}
        onConfirm={guard.onConfirmDiscard}
      />
    </Dialog>
  )
}
