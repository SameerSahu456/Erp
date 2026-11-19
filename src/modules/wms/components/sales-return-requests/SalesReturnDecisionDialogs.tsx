import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Typography } from "@/components/ui/typography"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { SalesReturnRequestDetailState } from "../../hooks/sales-return-requests/useSalesReturnRequestDetail"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

type SalesReturnDecisionDialogsProps = Pick<
  SalesReturnRequestDetailState,
  | "decideMutation"
  | "cancelMutation"
  | "selectedDecidable"
  | "approveOpen"
  | "setApproveOpen"
  | "approveSelected"
  | "rejectOpen"
  | "setRejectOpen"
  | "rejectReason"
  | "setRejectReason"
  | "rejectBlockReason"
  | "rejectSelected"
  | "cancelOpen"
  | "setCancelOpen"
  | "cancelReason"
  | "setCancelReason"
  | "cancelBlockReason"
  | "confirmCancel"
>

/** The reject / cancel reason dialogs and the batch-approve confirm. */
export function SalesReturnDecisionDialogs({
  decideMutation,
  cancelMutation,
  selectedDecidable,
  approveOpen,
  setApproveOpen,
  approveSelected,
  rejectOpen,
  setRejectOpen,
  rejectReason,
  setRejectReason,
  rejectBlockReason,
  rejectSelected,
  cancelOpen,
  setCancelOpen,
  cancelReason,
  setCancelReason,
  cancelBlockReason,
  confirmCancel,
}: SalesReturnDecisionDialogsProps) {
  return (
    <>
      {/* Reject — the server requires a reason on every rejected line. */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{S.detail.approval.rejectDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sret-reject-reason">
              {S.detail.approval.rejectReasonLabel}
            </Label>
            <Textarea
              id="sret-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={S.detail.approval.rejectReasonPlaceholder}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRejectOpen(false)}
              disabled={decideMutation.isPending}
            >
              {S.detail.approval.dismiss}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    variant="destructive"
                    onClick={() => void rejectSelected()}
                    disabled={!rejectReason.trim() || decideMutation.isPending}
                  >
                    {decideMutation.isPending && (
                      <Loader2
                        className="size-4 animate-spin"
                        data-icon="inline-start"
                      />
                    )}
                    {S.detail.approval.rejectConfirm}
                  </Button>
                </TooltipTrigger>
                {rejectBlockReason && !decideMutation.isPending && (
                  <TooltipContent>{rejectBlockReason}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel — releases every unit the request had claimed. */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{S.detail.cancel.dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Typography variant="body" tone="muted">
              {S.detail.cancel.dialogBody}
            </Typography>
            <div className="space-y-2">
              <Label htmlFor="sret-cancel-reason">{S.detail.cancel.reasonLabel}</Label>
              <Textarea
                id="sret-cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={S.detail.cancel.reasonPlaceholder}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              {S.detail.cancel.dismiss}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    variant="destructive"
                    onClick={() => void confirmCancel()}
                    disabled={!cancelReason.trim() || cancelMutation.isPending}
                  >
                    {cancelMutation.isPending && (
                      <Loader2
                        className="size-4 animate-spin"
                        data-icon="inline-start"
                      />
                    )}
                    {S.detail.cancel.confirm}
                  </Button>
                </TooltipTrigger>
                {cancelBlockReason && !cancelMutation.isPending && (
                  <TooltipContent>{cancelBlockReason}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm the batch approve before it runs (§0 bulk actions). */}
      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={S.detail.approval.approveDialogTitle}
        description={S.detail.approval.approveDialogBody(selectedDecidable.length)}
        confirmLabel={S.detail.approval.approveConfirm(selectedDecidable.length)}
        onConfirm={() => void approveSelected()}
      />
    </>
  )
}
