import { useMemo, useState } from "react";

import { useNumberField } from "@/hooks/use-number-field";
import { usePatchDispatchRequest } from "./useDispatchRequests";
import type { DispatchRequestPatch } from "../../api/dispatch";
import type {
  DeliveryDetails,
  DispatchDetailMeta,
} from "../../components/dispatches/dispatch-detail-helpers";

/** Logistics edit-form state for the dispatch detail dialog. */
export function useDispatchLogisticsEdit(
  id: string,
  meta: DispatchDetailMeta,
  isFinalised: boolean,
) {
  const patchMut = usePatchDispatchRequest(id);
  const [editOpen, setEditOpen] = useState(false);
  const [logi, setLogi] = useState<DeliveryDetails>({});
  const [invoiceAmount, setInvoiceAmount] = useState<string>("");

  function openEdit() {
    setLogi(meta.delivery_details ?? {});
    setInvoiceAmount(String(meta.billing_details?.invoice_amount ?? ""));
    setEditOpen(true);
  }

  const set = (k: keyof DeliveryDetails, v: string) =>
    setLogi((p) => ({ ...p, [k]: v || null }));
  // Numeric logistics fields — hook owns a number; keep the stored slots
  // string/null (null when 0) so deliveryPayload and editDirty are unchanged.
  const packagesField = useNumberField(
    Number(logi.number_of_packages ?? 0) || 0,
    (n) => set("number_of_packages", n === 0 ? "" : String(n)),
  );
  const freightChargesField = useNumberField(
    Number(logi.freight_charges ?? 0) || 0,
    (n) => set("freight_charges", n === 0 ? "" : String(n)),
    { decimal: true },
  );
  const invoiceAmountField = useNumberField(
    Number(invoiceAmount) || 0,
    (n) => setInvoiceAmount(n === 0 ? "" : String(n)),
    { decimal: true },
  );

  // PAGE-UI §3.1: dirty only when a field differs from the saved values.
  const editDirty =
    JSON.stringify(logi) !== JSON.stringify(meta.delivery_details ?? {}) ||
    invoiceAmount !== String(meta.billing_details?.invoice_amount ?? "");

  // Finalising required an AWB, and the API would accept clearing it afterwards.
  // An older dispatch that never had one can still save its other fields.
  const awbRequired = isFinalised && !!meta.delivery_details?.courier_tracking_number;
  const awbMissing = awbRequired && !logi.courier_tracking_number?.trim();

  const deliveryPayload = useMemo(
    () => ({
      ...logi,
      number_of_packages: logi.number_of_packages
        ? Number(logi.number_of_packages)
        : null,
      freight_charges: logi.freight_charges
        ? String(logi.freight_charges)
        : null,
    }),
    [logi],
  );

  async function saveLogistics() {
    const body: DispatchRequestPatch = {
      metadata: {
        delivery_details: deliveryPayload,
        billing_details: invoiceAmount
          ? { invoice_amount: invoiceAmount }
          : undefined,
      },
    };
    await patchMut.mutateAsync(body);
    setEditOpen(false);
  }

  return {
    editOpen,
    closeEdit: () => setEditOpen(false),
    openEdit,
    logi,
    set,
    packagesField,
    freightChargesField,
    invoiceAmountField,
    editDirty,
    awbRequired,
    awbMissing,
    saveLogistics,
    isSaving: patchMut.isPending,
  };
}

export type DispatchLogisticsEditState = ReturnType<typeof useDispatchLogisticsEdit>;
