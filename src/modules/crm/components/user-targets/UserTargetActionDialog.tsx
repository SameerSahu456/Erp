import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"

import type { UserSalesTarget } from "../../api"
import {
  useApproveUserTarget,
  useDeleteUserTarget,
  useRejectUserTarget,
} from "../../hooks/user-targets/useUserTargets"
import { USER_TARGETS_STRINGS as S } from "./user-targets.strings"

// ─── One dialog, three terminal actions ────────────────────────────────
//
// Keeps approve / reject / discard in a single file so they share the same
// chrome, button layout, and "optimistic close on success" behaviour. The
// reject variant uniquely needs a `notes` textarea (backend requires ≥ 5
// chars); approve and discard are plain confirms.
export type UserTargetActionKind = "approve" | "reject" | "discard"

interface Props {
  open: boolean
  kind: UserTargetActionKind
  target: UserSalesTarget | null
  onDone: () => void
  onClose: () => void
}

const REJECT_MIN_CHARS = 5

export function UserTargetActionDialog({
  open,
  kind,
  target,
  onDone,
  onClose,
}: Props) {
  const approve = useApproveUserTarget()
  const reject = useRejectUserTarget()
  const discard = useDeleteUserTarget()

  // Parent conditionally renders this dialog (``{dialog.action.open ? …}``),
  // so each open starts from a fresh mount — no manual reset needed.
  const [notes, setNotes] = useState("")
  const [notesError, setNotesError] = useState<string | null>(null)

  const isSaving =
    approve.isPending || reject.isPending || discard.isPending

  async function handleConfirm() {
    if (!target) return
    // ``mutateAsync`` rejects on backend errors (403 non-admin tries to
    // approve, 422 wrong state, etc.) — the hook's ``onError`` already
    // shows a red toast. Catch here so the dialog stays open on failure
    // instead of closing silently via ``onDone``.
    try {
      if (kind === "approve") {
        await approve.mutateAsync(target.id)
        onDone()
        return
      }
      if (kind === "reject") {
        if (notes.trim().length < REJECT_MIN_CHARS) {
          setNotesError(`At least ${REJECT_MIN_CHARS} characters required`)
          return
        }
        await reject.mutateAsync({ id: target.id, notes: notes.trim() })
        onDone()
        return
      }
      if (kind === "discard") {
        await discard.mutateAsync(target.id)
        onDone()
      }
    } catch {
      /* toast fired by hook's onError; dialog stays open for retry */
    }
  }

  const { title, body, confirmLabel, confirmVariant } = resolveCopy(kind)

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Typography variant="section-title">{title}</Typography>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Typography variant="body" tone="muted">
            {body}
          </Typography>

          {target ? (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <Typography variant="helper" tone="muted">
                {target.user.name} · {target.fy_label}
              </Typography>
            </div>
          ) : null}

          {kind === "reject" ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor="reject-notes">{S.dialog.reject.helper}</Label>
              <Textarea
                id="reject-notes"
                placeholder={S.dialog.reject.placeholder}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  if (notesError) setNotesError(null)
                }}
                rows={4}
              />
              <FieldError message={notesError ?? undefined} />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            {S.dialog.actions.cancel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isSaving}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Copy + button variant per action — table lives at the top so the reader
// sees the whole decision in one place instead of chasing three branches
// through the render tree.
function resolveCopy(kind: UserTargetActionKind): {
  title: string
  body: string
  confirmLabel: string
  confirmVariant: "default" | "destructive"
} {
  switch (kind) {
    case "approve":
      return {
        title: S.dialog.approve.title,
        body: S.dialog.approve.body,
        confirmLabel: S.dialog.actions.approve,
        confirmVariant: "default",
      }
    case "reject":
      return {
        title: S.dialog.reject.title,
        body: S.dialog.reject.helper,
        confirmLabel: S.dialog.actions.reject,
        confirmVariant: "destructive",
      }
    case "discard":
      return {
        title: S.dialog.discard.title,
        body: S.dialog.discard.body,
        confirmLabel: S.dialog.actions.confirmDiscard,
        confirmVariant: "destructive",
      }
  }
}
