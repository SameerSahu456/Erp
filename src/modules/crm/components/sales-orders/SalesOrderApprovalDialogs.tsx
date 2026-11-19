import { useEffect, useState } from "react"
import { CheckCircle2, ThumbsDown, UserCog } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Typography } from "@/components/ui/typography"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldError } from "@/components/common/forms/FieldError"
import { UnsavedChangesDialog } from "@/components/common/dialogs/UnsavedChangesDialog"
import { useFormErrors } from "@/hooks/use-form-errors"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"

import { SO_LINE_NOTES_MAX, SO_REASSIGN_REASON_MAX } from "../../api"
import {
  useApproveSalesOrderLine,
  useRejectSalesOrderLine,
  useReassignSalesOrderLine,
} from "../../hooks/sales-orders/useSalesOrders"
import { useEligiblePMs } from "@modules/ims"

import { SALES_ORDERS_STRINGS as S } from "./sales-orders.strings"

// All three dialogs share the same prop shape: `open`/`onOpenChange` for
// the trigger row to control mount, plus the SO + line context. Each
// dialog owns its own form state and its mutation, and closes itself on
// success. Notes / reason limits mirror the backend Pydantic constraints
// (LineApproveRequest, LineRejectRequest, LineReassignRequest).

interface BaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  soId: string
  soOrderNumber: string
  lineId: string
  lineItemName: string
}

// ── Approve ────────────────────────────────────────────────────────────

export function ApproveLineDialog({
  open,
  onOpenChange,
  soId,
  soOrderNumber,
  lineId,
  lineItemName,
}: BaseDialogProps) {
  const [notes, setNotes] = useState("")
  const { errors, setError, clearError, clearAll } = useFormErrors()
  const mutation = useApproveSalesOrderLine()

  function reset() {
    setNotes("")
    clearAll()
  }

  useEffect(() => {
    if (!open) reset()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = open && notes.length > 0
  const guard = useUnsavedChangesGuard({ isDirty })

  function handleAttemptClose() {
    guard.attempt(() => onOpenChange(false))
  }

  function handleConfirm() {
    if (notes.length > SO_LINE_NOTES_MAX) {
      setError("notes", S.approval.validation.notesTooLong(SO_LINE_NOTES_MAX))
      toast.error(S.approval.validation.fixHighlighted)
      return
    }
    mutation.mutate(
      {
        soId,
        lineId,
        body: notes.trim() ? { notes: notes.trim() } : {},
      },
      { onSuccess: () => onOpenChange(false) },
    )
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
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-6 text-emerald-600" />
          </div>
          <DialogTitle className="text-lg">{S.approval.dialogs.approveTitle}</DialogTitle>
          <DialogDescription>
            {S.approval.dialogs.approveBodyBefore}
            <span className="font-medium text-foreground">{lineItemName}</span>
            {S.approval.dialogs.approveBodyMiddle}
            <span className="font-medium text-foreground">{soOrderNumber}</span>
            {S.approval.dialogs.approveBodyAfter}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 pt-2">
          <Label className="text-sm font-medium">{S.approval.dialogs.notesOptional}</Label>
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              clearError("notes")
            }}
            placeholder={S.approval.dialogs.notesPlaceholder}
            rows={3}
            maxLength={SO_LINE_NOTES_MAX + 1}
            aria-invalid={Boolean(errors.notes)}
          />
          <FieldError message={errors.notes} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleAttemptClose} disabled={mutation.isPending}>
            {S.approval.dialogs.cancel}
          </Button>
          <Button onClick={handleConfirm} disabled={mutation.isPending}>
            <CheckCircle2 className="size-3.5" data-icon="inline-start" />
            {mutation.isPending ? S.approval.dialogs.approving : S.approval.dialogs.approve}
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

// ── Reject ─────────────────────────────────────────────────────────────

export function RejectLineDialog({
  open,
  onOpenChange,
  soId,
  soOrderNumber,
  lineId,
  lineItemName,
}: BaseDialogProps) {
  const [notes, setNotes] = useState("")
  const { errors, setError, clearError, clearAll } = useFormErrors()
  const mutation = useRejectSalesOrderLine()

  function reset() {
    setNotes("")
    clearAll()
  }

  useEffect(() => {
    if (!open) reset()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = open && notes.length > 0
  const guard = useUnsavedChangesGuard({ isDirty })

  function handleAttemptClose() {
    guard.attempt(() => onOpenChange(false))
  }

  function handleConfirm() {
    const trimmed = notes.trim()
    if (!trimmed) {
      setError("notes", S.approval.validation.rejectReasonRequired)
      toast.error(S.approval.validation.fixHighlighted)
      return
    }
    if (trimmed.length > SO_LINE_NOTES_MAX) {
      setError("notes", S.approval.validation.notesTooLong(SO_LINE_NOTES_MAX))
      toast.error(S.approval.validation.fixHighlighted)
      return
    }
    mutation.mutate(
      { soId, lineId, body: { notes: trimmed } },
      { onSuccess: () => onOpenChange(false) },
    )
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
          <DialogTitle className="text-lg">{S.approval.dialogs.rejectTitle}</DialogTitle>
          <DialogDescription>
            {S.approval.dialogs.rejectBodyBefore}
            <span className="font-medium text-foreground">{lineItemName}</span>
            {S.approval.dialogs.rejectBodyMiddle}
            <span className="font-medium text-foreground">{soOrderNumber}</span>
            {S.approval.dialogs.rejectBodyAfterBefore}
            <span className="font-medium">{S.approval.dialogs.rejectBodyStatus}</span>
            {S.approval.dialogs.rejectBodyAfterAfter}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 pt-2">
          <Label className="text-sm font-medium">
            {S.approval.dialogs.reason} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              clearError("notes")
            }}
            placeholder={S.approval.dialogs.rejectReasonPlaceholder}
            rows={4}
            maxLength={SO_LINE_NOTES_MAX + 1}
            aria-invalid={Boolean(errors.notes)}
            autoFocus
          />
          <FieldError message={errors.notes} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleAttemptClose} disabled={mutation.isPending}>
            {S.approval.dialogs.cancel}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={mutation.isPending}>
            <ThumbsDown className="size-3.5" data-icon="inline-start" />
            {mutation.isPending ? S.approval.dialogs.rejecting : S.approval.dialogs.reject}
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

// ── Reassign ───────────────────────────────────────────────────────────

interface ReassignDialogProps extends BaseDialogProps {
  /** Snapshot category from the line — drives the eligible-PM lookup. */
  categoryId: string
  /** Current approver — disabled in the dropdown so caller can't pick self. */
  currentApproverId: string | null
}

export function ReassignLineDialog({
  open,
  onOpenChange,
  soId,
  soOrderNumber,
  lineId,
  lineItemName,
  categoryId,
  currentApproverId,
}: ReassignDialogProps) {
  const [newApproverId, setNewApproverId] = useState<string>("")
  const [reason, setReason] = useState("")
  const { errors, setError, clearError, clearAll } = useFormErrors()
  const mutation = useReassignSalesOrderLine()

  // Lazy fetch — only fires when the dialog is open AND we have a
  // category to scope the lookup. Reusing useEligiblePMs lets two open
  // dialogs against different categories cache independently.
  const eligible = useEligiblePMs(
    open && categoryId ? { category_id: categoryId } : null,
    { enabled: open },
  )

  function reset() {
    setNewApproverId("")
    setReason("")
    clearAll()
  }

  useEffect(() => {
    if (!open) reset()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = open && (newApproverId !== "" || reason.length > 0)
  const guard = useUnsavedChangesGuard({ isDirty })

  function handleAttemptClose() {
    guard.attempt(() => onOpenChange(false))
  }

  function handleConfirm() {
    let ok = true
    if (!newApproverId) {
      setError("new_approver_id", S.approval.validation.pickApprover)
      ok = false
    }
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setError("reason", S.approval.validation.reasonRequired)
      ok = false
    } else if (trimmedReason.length > SO_REASSIGN_REASON_MAX) {
      setError("reason", S.approval.validation.reasonTooLong(SO_REASSIGN_REASON_MAX))
      ok = false
    }
    if (!ok) {
      toast.error(S.approval.validation.fixHighlighted)
      return
    }
    mutation.mutate(
      {
        soId,
        lineId,
        body: { new_approver_id: newApproverId, reason: trimmedReason },
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  const candidates = (eligible.data?.eligible_pms ?? []).filter(
    (pm) => pm.user_id !== currentApproverId,
  )
  const selectedCandidate =
    candidates.find((pm) => pm.user_id === newApproverId) ?? null

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
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10">
            <UserCog className="size-6 text-amber-600" />
          </div>
          <DialogTitle className="text-lg">{S.approval.dialogs.reassignTitle}</DialogTitle>
          <DialogDescription>
            {S.approval.dialogs.reassignBodyBefore}
            <span className="font-medium text-foreground">{lineItemName}</span> ({soOrderNumber})
            {S.approval.dialogs.reassignBodyAfter}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {S.approval.dialogs.newApprover} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={newApproverId}
              onValueChange={(v) => {
                setNewApproverId(v ?? "")
                clearError("new_approver_id")
              }}
              disabled={eligible.isLoading || mutation.isPending}
            >
              <SelectTrigger className="w-full" aria-invalid={Boolean(errors.new_approver_id)}>
                {selectedCandidate ? (
                  <div className="flex min-w-0 flex-col items-start text-left">
                    <Typography variant="body-strong" truncate asChild>
                      <span>{selectedCandidate.name}</span>
                    </Typography>
                    <Typography variant="caption" truncate asChild>
                      <span>{selectedCandidate.email}</span>
                    </Typography>
                  </div>
                ) : (
                  <SelectValue
                    placeholder={
                      eligible.isLoading
                        ? S.approval.dialogs.approversLoading
                        : S.approval.dialogs.selectApprover
                    }
                  />
                )}
              </SelectTrigger>
              <SelectContent align="start" sideOffset={4}>
                {candidates.length === 0 && !eligible.isLoading ? (
                  <Typography
                    variant="body"
                    tone="muted"
                    align="center"
                    className="px-2 py-3"
                    asChild
                  >
                    <div>
                      {eligible.isError
                        ? S.approval.dialogs.approversError
                        : S.approval.dialogs.noOtherPms}
                    </div>
                  </Typography>
                ) : (
                  candidates.map((pm) => (
                    <SelectItem key={pm.user_id} value={pm.user_id}>
                      <div className="flex flex-col">
                        <Typography variant="body-strong" asChild>
                          <span>{pm.name}</span>
                        </Typography>
                        <Typography variant="caption" asChild>
                          <span>{pm.email}</span>
                        </Typography>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FieldError message={errors.new_approver_id} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {S.approval.dialogs.reason} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                clearError("reason")
              }}
              placeholder={S.approval.dialogs.reassignReasonPlaceholder}
              rows={3}
              maxLength={SO_REASSIGN_REASON_MAX + 1}
              aria-invalid={Boolean(errors.reason)}
            />
            <FieldError message={errors.reason} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleAttemptClose} disabled={mutation.isPending}>
            {S.approval.dialogs.cancel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mutation.isPending || eligible.isLoading || candidates.length === 0}
          >
            <UserCog className="size-3.5" data-icon="inline-start" />
            {mutation.isPending ? S.approval.dialogs.reassigning : S.approval.dialogs.reassign}
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
