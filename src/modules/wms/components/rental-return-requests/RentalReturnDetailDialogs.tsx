import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"

import { ReasonDialog, type ReasonDialogCopy } from "@/components/common/dialogs/ReasonDialog"
import { modelLabel, outstandingOf } from "./rental-return-request-detail-helpers"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"
import type { RentalReturnDetailState } from "../../hooks/rental-return-requests/useRentalReturnDetail"

export type DetailDialog = "approve" | "reject" | "cancel" | null

const A = S.detail.approval
const C = S.detail.cancel
const X = S.detail.closeShort

const REJECT_COPY: ReasonDialogCopy = {
  title: A.rejectDialogTitle,
  reasonLabel: A.rejectReasonLabel,
  reasonPlaceholder: A.rejectReasonPlaceholder,
  confirm: A.rejectConfirm,
  dismiss: A.dismiss,
}

const CANCEL_COPY: ReasonDialogCopy = {
  title: C.dialogTitle,
  body: C.dialogBody,
  reasonLabel: C.reasonLabel,
  reasonPlaceholder: C.reasonPlaceholder,
  confirm: C.confirm,
  dismiss: C.dismiss,
}

function closeShortCopy(state: RentalReturnDetailState): ReasonDialogCopy {
  const target = state.closeTarget
  const body =
    target?.kind === "line"
      ? X.dialogBodyLine(outstandingOf(target.item), modelLabel(target.item, S.detail.lines.unknown))
      : X.dialogBodyRequest(state.outstanding)
  return {
    title: X.dialogTitle,
    body,
    reasonLabel: X.reasonLabel,
    reasonPlaceholder: X.reasonPlaceholder,
    confirm: X.confirm,
    dismiss: X.dismiss,
  }
}

/** Every dialog the detail page can open, driven by one `open` value plus
 *  the close-short target held in the detail state. */
export function RentalReturnDetailDialogs({
  state,
  open,
  setOpen,
}: {
  state: RentalReturnDetailState
  open: DetailDialog
  setOpen: (next: DetailDialog) => void
}) {
  const close = () => setOpen(null)
  const picked = state.selectedDecidable.length
  return (
    <>
      <ConfirmDialog
        open={open === "approve"}
        onOpenChange={(o) => setOpen(o ? "approve" : null)}
        title={A.approveDialogTitle}
        description={A.approveDialogBody(picked)}
        confirmLabel={A.approveConfirm(picked)}
        // The confirm button does not close the dialog itself: close it once
        // the batch approve lands. A failure keeps it open (the mutation toasts).
        onConfirm={() => {
          state.decide("approved").then(close, () => undefined)
        }}
      />
      {open === "reject" && (
        <ReasonDialog
          copy={REJECT_COPY}
          pending={state.deciding}
          onConfirm={(reason) => state.decide("rejected", reason)}
          onClose={close}
        />
      )}
      {open === "cancel" && (
        <ReasonDialog
          copy={CANCEL_COPY}
          pending={state.cancelling}
          onConfirm={state.cancel}
          onClose={close}
        />
      )}
      {state.closeTarget && (
        <ReasonDialog
          copy={closeShortCopy(state)}
          pending={state.closingShort}
          onConfirm={state.closeShort}
          onClose={() => state.setCloseTarget(null)}
        />
      )}
    </>
  )
}
