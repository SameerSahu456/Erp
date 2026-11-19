import { useState } from "react";

import { DatePicker } from "@/components/common/pickers/DatePicker";
import { Textarea } from "@/components/ui/textarea";
import { istTodayDateParam } from "@shared/lib/date";

import type { PoInvoicing } from "../../api/purchase-orders";
import {
  useExtendPurchaseOrder,
  useOrderPurchaseOrders,
} from "../../hooks/purchase-orders/usePurchaseOrders";
import { shiftDay } from "../../lib/dateRange";
import { formatRentalDayLong } from "../../lib/format";
import {
  emptyPoPaper,
  isPoPaperTouched,
  poPaperPayload,
  poPaperProblem,
  type PoPaper,
} from "../../lib/poPaper";
import { PoDialogShell, PoField } from "./PoDialogShell";
import { PoInvoicingField } from "./PoInvoicingField";
import { PoLineRatesFields } from "./PoLineRatesFields";
import { PoPaperFields } from "./PoPaperFields";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const E = S.extend;

export interface ExtendPoDialogProps {
  salesOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/** The new PO's last day: after the current PO end, which is shown. */
function ExtendValidToField({
  currentEnd,
  value,
  onChange,
}: {
  currentEnd: string | null;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <PoField
      label={E.validTo}
      htmlFor="po-extend-valid-to"
      required
      help={currentEnd ? E.validToHelp(formatRentalDayLong(currentEnd)) : undefined}
    >
      <DatePicker
        id="po-extend-valid-to"
        value={value}
        onChange={onChange}
        min={currentEnd ? shiftDay(currentEnd, 1) : undefined}
      />
    </PoField>
  );
}

/** rental-billing's Extend PO: the customer's next PO number and how long
 *  it runs. Without new rates it applies at once and invoices the period
 *  since the old PO ended; with them — or when the old PO had already
 *  lapsed — it waits for approval (the approver may be the raiser). With "PO
 *  not available yet" the period still moves, but the order shows Awaiting PO
 *  and is not billed until the PO's number and date are entered. */
export function ExtendPoDialog({
  salesOrderId,
  open,
  onOpenChange,
  onDone,
}: ExtendPoDialogProps) {
  const [paper, setPaper] = useState<PoPaper>(() => emptyPoPaper(istTodayDateParam()));
  const [validTo, setValidTo] = useState("");
  // Null until accounts picks one: the order's own setting applies.
  const [invoicing, setInvoicing] = useState<PoInvoicing | null>(null);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const orderPos = useOrderPurchaseOrders(open ? salesOrderId : null);
  const extend = useExtendPurchaseOrder(salesOrderId);

  const currentEnd = orderPos.data?.po_end_date ?? null;
  const currentInvoicing = orderPos.data?.po_invoicing ?? "multiple";
  const priced = Object.entries(rates).filter(([, rate]) => rate.trim() !== "");
  const effectiveInvoicing = invoicing ?? currentInvoicing;

  const submit = () =>
    extend.mutate(
      {
        payload: {
          ...poPaperPayload(paper),
          valid_to: validTo,
          invoicing: effectiveInvoicing,
          line_rates: priced.map(([sales_order_item_id, monthly_rate]) => ({
            sales_order_item_id,
            monthly_rate: monthly_rate.trim(),
          })),
          notes: notes.trim() || null,
        },
        file: paper.available ? paper.file : null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onDone?.();
        },
      },
    );

  return (
    <PoDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={E.title}
      description={E.description}
      submitLabel={priced.length > 0 ? E.submitForApproval : E.submit}
      onSubmit={submit}
      pending={extend.isPending}
      canSubmit={poPaperProblem(paper) === null && validTo !== ""}
      isDirty={isPoPaperTouched(paper) || validTo !== "" || notes !== "" || priced.length > 0}
      error={extend.error}
      className="sm:max-w-2xl"
    >
      <PoPaperFields
        idPrefix="po-extend"
        value={paper}
        onChange={setPaper}
        numberLabel={E.number}
        disabled={extend.isPending}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ExtendValidToField currentEnd={currentEnd} value={validTo} onChange={setValidTo} />
        {orderPos.data ? (
          <PoInvoicingField
            salesOrderId={salesOrderId}
            orderPos={orderPos.data}
            value={effectiveInvoicing}
            onChange={setInvoicing}
            validTo={validTo}
            ratesChanged={priced.length > 0}
          />
        ) : null}
      </div>
      {open ? (
        <PoLineRatesFields
          salesOrderId={salesOrderId}
          value={rates}
          onChange={setRates}
          disabled={extend.isPending}
        />
      ) : null}
      <PoField label={E.notes} htmlFor="po-extend-notes">
        <Textarea
          id="po-extend-notes"
          rows={2}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </PoField>
    </PoDialogShell>
  );
}
