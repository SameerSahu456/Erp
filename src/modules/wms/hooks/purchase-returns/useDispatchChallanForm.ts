import { useState } from "react";
import { z } from "zod";

import { isPhoneInput, validateName, validatePhoneIndia } from "@shared/lib/validation";
import type {
  DispatchChallan,
  ShippableUnit,
} from "../../components/purchase-returns/DispatchDialog";
import {
  buildCreateMetadata,
  buildDeliveryDetails,
} from "../../components/dispatches/dispatch-create-helpers";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "../../components/purchase-returns/purchase-returns.strings";
import { useDispatchCreateLogistics } from "../dispatches/useDispatchCreateLogistics";

// Backend caps driver_name at 100 characters.
const DRIVER_NAME_MAX = 100;
const driverNameError = (v: string) =>
  validateName(v, { maxLength: DRIVER_NAME_MAX, label: S.dispatchDialog.fields.driverName });

// One typed rule for what a consignment needs to leave (§9): an AWB (the
// backend's own final gate), at least one unit aboard, and a well-formed
// driver name / phone when given. `canSubmit` and the confirm payload both
// derive from it — a single source of validity.
const dispatchChallanSchema = z.object({
  awbNumber: z.string().trim().min(1),
  driverName: z.string().refine((v) => driverNameError(v) === null),
  driverPhone: z.string().refine((v) => validatePhoneIndia(v) === null),
  expectedDeliveryDate: z.string().optional(),
  returnAddress: z.string().optional(),
  itemIds: z.array(z.string()).min(1),
});

/** Challan form state, validity, why-tooltip and dirty flag for DispatchDialog. */
export function useDispatchChallanForm(
  initialReturnAddress: string | null | undefined,
  shippableUnits: ShippableUnit[],
) {
  // Courier / docket / mode / packages / freight / invoice amount + the AWB —
  // the same Logistics block as the Dispatch Request form.
  const logistics = useDispatchCreateLogistics();
  const awbNumber = logistics.logi.courier_tracking_number;
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  // Inline errors show once a field is left, not while typing.
  const [touched, setTouched] = useState({ driverName: false, driverPhone: false });
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [returnAddress, setReturnAddress] = useState(initialReturnAddress ?? "");
  // Everything shippable is ticked by default (a partial consignment is an
  // explicit untick). Mount-only initialisers: the parent remounts per open (its
  // `key`) so a second consignment never inherits the first one's AWB or units.
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    shippableUnits.map((u) => u.id),
  );

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const nameError = driverNameError(driverName);
  const phoneError = validatePhoneIndia(driverPhone);

  // Driver name/phone are optional (a courier has no driver); the server stamps
  // `dispatched_at` itself.
  const challan: DispatchChallan = {
    awbNumber: awbNumber.trim(),
    driverName: driverName.trim(),
    // Sent without separators so "+91 98765 43210" fits the backend's 20 chars.
    driverPhone: driverPhone.replace(/[\s-]/g, ""),
    expectedDeliveryDate: expectedDeliveryDate.trim() || undefined,
    returnAddress: returnAddress.trim() || undefined,
    itemIds: selectedIds,
    createMetadata: buildCreateMetadata(
      buildDeliveryDetails(logistics.logi),
      logistics.invoiceAmount,
    ),
  };
  const canSubmit = dispatchChallanSchema.safeParse({ ...challan, driverPhone }).success;

  // §0.9 — name the first unmet gate in a why-tooltip on the disabled confirm
  // (units are ticked by default, so the AWB is the usual one missing).
  let blockReason: string | null = null;
  if (selectedIds.length === 0) blockReason = S.dispatchDialog.noUnitsSelected;
  else if (awbNumber.trim() === "") blockReason = S.dispatchDialog.needsAwb;
  else blockReason = nameError ?? phoneError;

  // Dirty when any field diverges from the freshly-mounted defaults, so Cancel /
  // Esc route through the discard guard instead of dropping a half-filled challan.
  const typed = [
    ...Object.values(logistics.logi),
    logistics.invoiceAmount,
    driverName,
    driverPhone,
    expectedDeliveryDate,
  ];
  const dirty =
    typed.some((v) => v.trim() !== "") ||
    returnAddress !== (initialReturnAddress ?? "") ||
    selectedIds.length !== shippableUnits.length;

  return {
    logistics,
    driverName,
    setDriverName,
    driverPhone,
    // Keystroke filter: digits, +, spaces and hyphens only.
    setDriverPhone: (v: string) => {
      if (isPhoneInput(v)) setDriverPhone(v);
    },
    driverNameError: touched.driverName ? nameError : null,
    driverPhoneError: touched.driverPhone ? phoneError : null,
    touch: (field: keyof typeof touched) => setTouched((t) => ({ ...t, [field]: true })),
    expectedDeliveryDate,
    setExpectedDeliveryDate,
    returnAddress,
    setReturnAddress,
    selectedIds,
    toggle,
    challan,
    canSubmit,
    blockReason,
    dirty,
  };
}
