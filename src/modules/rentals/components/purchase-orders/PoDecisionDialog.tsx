import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

import type { RentalPurchaseOrder } from "../../api/purchase-orders";
import {
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
} from "../../hooks/purchase-orders/usePurchaseOrders";
import { PoDialogShell, PoField } from "./PoDialogShell";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const D = S.decision;

export type PoDecision = "approve" | "reject";

interface PoDecisionDialogProps {
  purchaseOrder: RentalPurchaseOrder;
  decision: PoDecision;
  onClose: () => void;
}

/** Approve or reject an Extend PO that carries new rates.
 *
 *  Rejecting needs a reason — the requester has to know what to change.
 *  The server refuses the requester deciding their own; callers hide the
 *  buttons for them, and that refusal is the backstop. */
export function PoDecisionDialog({
  purchaseOrder,
  decision,
  onClose,
}: PoDecisionDialogProps) {
  const [notes, setNotes] = useState("");
  const approve = useApprovePurchaseOrder();
  const reject = useRejectPurchaseOrder();
  const isReject = decision === "reject";
  const mutation = isReject ? reject : approve;
  const vars = {
    id: purchaseOrder.id,
    salesOrderId: purchaseOrder.sales_order_id,
  };

  const submit = () => {
    const done = { onSuccess: onClose };
    if (isReject) {
      reject.mutate({ ...vars, notes: notes.trim() }, done);
    } else {
      approve.mutate({ ...vars, notes: notes.trim() || null }, done);
    }
  };

  return (
    <PoDialogShell
      open
      onOpenChange={(open) => !open && onClose()}
      title={isReject ? D.rejectTitle : D.approveTitle}
      description={isReject ? D.rejectDescription : D.approveDescription}
      submitLabel={isReject ? D.reject : D.approve}
      onSubmit={submit}
      pending={mutation.isPending}
      canSubmit={!isReject || notes.trim() !== ""}
      isDirty={notes !== ""}
      error={mutation.error}
    >
      <PoField
        label={isReject ? D.rejectReason : D.notes}
        htmlFor="po-decision-notes"
        required={isReject}
      >
        <Textarea
          id="po-decision-notes"
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </PoField>
      {isReject && notes.trim() === "" ? (
        <Typography variant="helper" tone="muted">
          {D.rejectReasonRequired}
        </Typography>
      ) : null}
    </PoDialogShell>
  );
}
