import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Typography } from "@/components/ui/typography"

import type { ReplacementRequestDetailState } from "../../hooks/replacement-requests/useReplacementRequestDetail"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { DIALOG_COPY } from "./replacement-request-detail-helpers"

/** The reason dialog shared by reject (one unit), write-off (one unit's
 *  return) and cancel (the whole request). */
export function ReplacementRequestReasonDialog({
  state,
}: {
  state: ReplacementRequestDetailState
}) {
  const {
    dialog,
    reason,
    setReason,
    closeDialog,
    submitDialog,
    submitBlockReason,
    submitPending,
  } = state
  const copy = DIALOG_COPY[dialog?.kind ?? "cancel"]
  return (
    <Dialog open={!!dialog} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {dialog?.kind === "rejectSelected" && (
            <Typography variant="helper" tone="muted">
              {S.detail.dialogs.rejectSelectedBody(state.selection.selected.length)}
            </Typography>
          )}
          {dialog?.kind === "waive" && (
            <Typography variant="helper" tone="muted">
              {S.detail.dialogs.waiveBody}
            </Typography>
          )}
          {dialog?.kind === "cancel" && (
            <Typography variant="helper" tone="muted">
              {S.detail.dialogs.cancelBody}
            </Typography>
          )}
          <Label htmlFor="dialog-reason">{copy.reason}</Label>
          {/* A reason is a paragraph, so a multi-line Textarea (§3.1). */}
          <Textarea
            id="dialog-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={copy.placeholder}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            {S.detail.dialogs.dismiss}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  onClick={submitDialog}
                  // Reject / cancel are destructive (red, §6.5); waive keeps the default button.
                  variant={dialog?.kind === "waive" ? "default" : "destructive"}
                  // Every action needs a reason. Also disabled while the
                  // mutation runs — no double-submit (§9).
                  disabled={!!submitBlockReason || submitPending}
                >
                  {submitPending && (
                    <Loader2
                      className="size-4 animate-spin"
                      data-icon="inline-start"
                    />
                  )}
                  {/* Named button per action, never a generic "Confirm" (§9). */}
                  {copy.confirm}
                </Button>
              </TooltipTrigger>
              {submitBlockReason && !submitPending && (
                <TooltipContent>{submitBlockReason}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
