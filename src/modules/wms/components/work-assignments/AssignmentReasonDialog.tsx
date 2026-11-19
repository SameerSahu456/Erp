/**
 * Confirm an action that changes a lot, and say why.
 *
 * Close is TERMINAL — there is no reopen — and Withdraw pulls devices out of a
 * document people work from. Firing either straight off a toolbar click, which
 * is what this screen did at first, means one stray click ends a lot for good.
 * A reason is not paperwork here: it is the only record of why the work stopped
 * short.
 */
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

interface AssignmentReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  /** When true the action cannot proceed without a reason. */
  reasonRequired: boolean
  isPending: boolean
  onConfirm: (reason: string) => void
}

export function AssignmentReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  reasonRequired,
  isPending,
  onConfirm,
}: AssignmentReasonDialogProps) {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()
  const canConfirm = (!reasonRequired || trimmed.length > 0) && !isPending
  // §0.9 — name the fixable gate (a required reason still empty) in a tooltip.
  // The in-flight state is not a fixable gate, so it is excluded below.
  const blockReason =
    reasonRequired && trimmed.length === 0 ? S.detail.blockedReason : null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason('')
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wa-reason" required={reasonRequired}>
            {reasonRequired ? S.detail.reasonRequired : S.detail.reasonOptional}
          </Label>
          <Textarea
            id="wa-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={255}
            placeholder={S.detail.reasonPlaceholder}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {S.detail.cancelAction}
          </Button>
          {/* Close is terminal and Withdraw pulls devices from a live document —
              both are destructive, so the confirm reads red (§3.1). */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  variant="destructive"
                  disabled={!canConfirm}
                  onClick={() => onConfirm(trimmed)}
                >
                  {confirmLabel}
                </Button>
              </TooltipTrigger>
              {blockReason && !isPending && (
                <TooltipContent>{blockReason}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
