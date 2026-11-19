import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { istTodayDateParam } from "@shared/lib/date";

import { useRecordPurchaseOrder } from "../../hooks/purchase-orders/usePurchaseOrders";
import {
  emptyPoPaper,
  isPoPaperTouched,
  poPaperPayload,
  poPaperProblem,
  type PoPaper,
} from "../../lib/poPaper";
import { PoDialogShell, PoField } from "./PoDialogShell";
import { PoPaperFields } from "./PoPaperFields";
import { PoPeriodFields } from "./PoPeriodFields";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const R = S.record;

interface RecordPoDialogProps {
  salesOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Record a customer PO on an order that is NOT PO Required, for reference
 *  (2026-11-16): the order's dates, status and billing are untouched, and
 *  one recorded without its number and date holds nothing back. PO Required
 *  orders move from PO to PO with Extend PO instead. */
export function RecordPoDialog({ salesOrderId, open, onOpenChange }: RecordPoDialogProps) {
  const [paper, setPaper] = useState<PoPaper>(() => emptyPoPaper(istTodayDateParam()));
  const [period, setPeriod] = useState({ validFrom: "", validTo: "" });
  const [notes, setNotes] = useState("");
  const record = useRecordPurchaseOrder(salesOrderId);

  const submit = () =>
    record.mutate(
      {
        payload: {
          ...poPaperPayload(paper),
          valid_from: period.validFrom || null,
          valid_to: period.validTo || null,
          notes: notes.trim() || null,
        },
        file: paper.available ? paper.file : null,
      },
      { onSuccess: () => onOpenChange(false) },
    );

  return (
    <PoDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={R.title}
      description={R.description}
      submitLabel={paper.available ? R.submit : R.submitAwaiting}
      onSubmit={submit}
      pending={record.isPending}
      canSubmit={poPaperProblem(paper) === null}
      isDirty={isPoPaperTouched(paper) || period.validTo !== "" || notes !== ""}
      error={record.error}
      className="sm:max-w-lg"
    >
      <PoPaperFields idPrefix="po-record" value={paper} onChange={setPaper} disabled={record.isPending} />
      <PoPeriodFields
        idPrefix="po-record"
        validFrom={period.validFrom}
        validTo={period.validTo}
        onChange={setPeriod}
        // A reference PO's period is its own; it never moves the order's.
        orderEnd={null}
        required={false}
        disabled={record.isPending}
      />
      <PoField label={R.notes} htmlFor="po-record-notes">
        <Textarea
          id="po-record-notes"
          rows={2}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </PoField>
    </PoDialogShell>
  );
}
