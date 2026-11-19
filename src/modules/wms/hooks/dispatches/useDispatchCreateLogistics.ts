import { useState } from "react";

import { useNumberField } from "@/hooks/use-number-field";
import {
  EMPTY_LOGISTICS,
  type LogisticsForm,
} from "../../components/dispatches/dispatch-create-helpers";

/** Step-0 logistics fields of the dispatch-create wizard (all optional except
 *  the AWB), plus the invoice amount and notes. */
export function useDispatchCreateLogistics() {
  const [logi, setLogi] = useState<LogisticsForm>(EMPTY_LOGISTICS);
  const setL = (k: keyof LogisticsForm, v: string) =>
    setLogi((prev) => ({ ...prev, [k]: v }));
  // Keep form slots string-valued (empty when 0) so untouched fields are omitted and isDirty stays clean.
  const packagesField = useNumberField(
    Number(logi.number_of_packages) || 0,
    (n) => setL("number_of_packages", n === 0 ? "" : String(n)),
  );
  const freightChargesField = useNumberField(
    Number(logi.freight_charges) || 0,
    (n) => setL("freight_charges", n === 0 ? "" : String(n)),
    { decimal: true },
  );
  // Invoice Amount — billing, not delivery, so it lives in its
  // own state and is sent as metadata.billing_details on create.
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const invoiceAmountField = useNumberField(
    Number(invoiceAmount) || 0,
    (n) => setInvoiceAmount(n === 0 ? "" : String(n)),
    { decimal: true },
  );
  // AWB is required: show an inline error once visited and left empty (§3/§9).
  const [awbTouched, setAwbTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const awbFilled = logi.courier_tracking_number.trim() !== "";

  return {
    logi,
    setL,
    packagesField,
    freightChargesField,
    invoiceAmount,
    invoiceAmountField,
    awbTouched,
    touchAwb: () => setAwbTouched(true),
    awbFilled,
    notes,
    setNotes,
  };
}

export type DispatchCreateLogisticsState = ReturnType<typeof useDispatchCreateLogistics>;
