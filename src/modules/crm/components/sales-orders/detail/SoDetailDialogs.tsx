import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FieldError } from "@/components/common/forms/FieldError"
import { useFormErrors } from "@/hooks/use-form-errors"

import type { SalesOrderWire } from "../../../api"
import type { SalesOrderDetailController } from "../../../hooks/sales-orders/useSalesOrderDetail"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

// Reason is mandatory on amend so the audit trail carries human context.
// Capped to 500 chars to match the other CRM reason fields (line reassign).
const REVISE_REASON_MAX = 500

export function SoDetailDialogs({
  so,
  detail,
}: {
  so: SalesOrderWire
  detail: SalesOrderDetailController
}) {
  const {
    deleteOpen,
    setDeleteOpen,
    submitOpen,
    setSubmitOpen,
    reviseOpen,
    setReviseOpen,
    reviseReason,
    setReviseReason,
    handleDelete,
    handleSubmit,
    handleRevise,
    deleteMut,
    submitMut,
    reviseMut,
    missingApproverCount,
  } = detail

  const { errors, setError, clearError } = useFormErrors()

  // Reason is required to amend. Validate here so the dialog stays open on
  // failure (handleRevise closes it immediately on entry).
  function handleAmendConfirm() {
    const trimmed = reviseReason.trim()
    if (!trimmed) {
      setError("reason", "A reason is required to amend a sales order.")
      toast.error("Please provide a reason for the amendment.")
      return
    }
    if (trimmed.length > REVISE_REASON_MAX) {
      setError("reason", `Reason must be ${REVISE_REASON_MAX} characters or less.`)
      toast.error("Please fix the highlighted field.")
      return
    }
    clearError("reason")
    handleRevise()
  }

  return (
    <>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{S.detail.deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{so.order_number}</strong>
              {S.detail.deleteDialog.bodyAfter}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{S.detail.deleteDialog.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {S.detail.deleteDialog.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{S.detail.submitDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{so.order_number}</strong>
              {S.detail.submitDialog.bodyMiddle}
              <strong>{S.detail.submitDialog.bodyStatus}</strong>
              {S.detail.submitDialog.bodyAfter}
              {missingApproverCount() > 0 && (
                <span className="mt-2 block text-muted-foreground">
                  {S.detail.submitDialog.missingApprovers}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{S.detail.submitDialog.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={submitMut.isPending}
            >
              {submitMut.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {S.detail.submitDialog.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reviseOpen} onOpenChange={setReviseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{S.detail.reviseDialog.title(so.order_number)}</DialogTitle>
            <DialogDescription>
              {S.detail.reviseDialog.bodyBefore}
              <strong>{S.detail.reviseDialog.draftWord}</strong>
              {S.detail.reviseDialog.bodyAfter}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="so-revise-reason">
              {S.detail.reviseDialog.reasonLabel}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="so-revise-reason"
              value={reviseReason}
              onChange={(e) => {
                setReviseReason(e.target.value)
                clearError("reason")
              }}
              placeholder={S.detail.reviseDialog.reasonPlaceholder}
              rows={3}
              maxLength={REVISE_REASON_MAX + 1}
              aria-invalid={Boolean(errors.reason)}
              aria-required
            />
            <FieldError message={errors.reason} />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {S.detail.reviseDialog.cancel}
            </DialogClose>
            <Button
              onClick={handleAmendConfirm}
              disabled={reviseMut.isPending || !reviseReason.trim()}
            >
              {reviseMut.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {S.detail.reviseDialog.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
