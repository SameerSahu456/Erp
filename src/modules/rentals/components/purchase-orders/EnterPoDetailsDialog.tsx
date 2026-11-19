import { useState } from "react";

import { istTodayDateParam } from "@shared/lib/date";

import type { RentalPurchaseOrder } from "../../api/purchase-orders";
import { useRecordPurchaseOrderDetails } from "../../hooks/purchase-orders/usePurchaseOrders";
import { emptyPoPaper, isPoPaperTouched, poPaperProblem, type PoPaper } from "../../lib/poPaper";
import { PoDialogShell } from "./PoDialogShell";
import { PoPaperFields } from "./PoPaperFields";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const D = S.details;

interface EnterPoDetailsDialogProps {
  purchaseOrder: RentalPurchaseOrder;
  onClose: () => void;
}

/** The awaited PO has arrived: its number, date and document. Saving makes it
 *  the PO in force and invoices everything held back while it was awaited. */
export function EnterPoDetailsDialog({ purchaseOrder, onClose }: EnterPoDetailsDialogProps) {
  const [paper, setPaper] = useState<PoPaper>(() => emptyPoPaper(istTodayDateParam()));
  const save = useRecordPurchaseOrderDetails(purchaseOrder.sales_order_id);

  const submit = () =>
    save.mutate(
      {
        purchaseOrderId: purchaseOrder.id,
        payload: { po_number: paper.poNumber.trim(), po_date: paper.poDate },
        file: paper.file,
      },
      { onSuccess: onClose },
    );

  return (
    <PoDialogShell
      open
      onOpenChange={(next) => !next && onClose()}
      title={D.title}
      description={D.description}
      submitLabel={D.submit}
      onSubmit={submit}
      pending={save.isPending}
      canSubmit={poPaperProblem(paper) === null}
      isDirty={isPoPaperTouched(paper)}
      error={save.error}
      className="sm:max-w-lg"
    >
      <PoPaperFields
        idPrefix="po-details"
        value={paper}
        onChange={setPaper}
        allowAwaiting={false}
        disabled={save.isPending}
      />
    </PoDialogShell>
  );
}
