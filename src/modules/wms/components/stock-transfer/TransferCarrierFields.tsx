import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPhoneInput } from "@shared/lib/validation";
import type { MoveStockState } from "../../hooks/stock-transfer/useMoveStock";
import { STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Carrier-specific fields: vehicle + driver for an own vehicle, courier +
 *  docket for any other carrier, nothing until a carrier is chosen. */
export function TransferCarrierFields({ move }: { move: MoveStockState }) {
  const { logistics: f, setLogistic } = move;
  if (f.carrier === "own_vehicle") {
    return (
      <>
        <Field id="mv-vehicle" label={S.vehicleNumberLabel} required>
          <Input
            id="mv-vehicle"
            value={f.vehicleNumber}
            onChange={(e) => setLogistic("vehicleNumber", e.target.value)}
            placeholder={S.vehicleNumberPlaceholder}
          />
        </Field>
        <Field id="mv-driver" label={S.driverNameLabel}>
          <Input
            id="mv-driver"
            value={f.driverName}
            onChange={(e) => setLogistic("driverName", e.target.value)}
            placeholder={S.driverNamePlaceholder}
          />
        </Field>
        <Field id="mv-phone" label={S.driverPhoneLabel}>
          <Input
            id="mv-phone"
            type="tel"
            inputMode="tel"
            maxLength={20}
            value={f.driverPhone}
            // Keystroke filter (digits, +, space, -); the 7–15 digit check stays on submit.
            onChange={(e) => {
              if (isPhoneInput(e.target.value)) setLogistic("driverPhone", e.target.value);
            }}
            placeholder={S.driverPhonePlaceholder}
          />
        </Field>
      </>
    );
  }
  if (!f.carrier) return null;
  return (
    <>
      <Field id="mv-courier" label={S.courierNameLabel} required>
        <Input
          id="mv-courier"
          value={f.courierName}
          onChange={(e) => setLogistic("courierName", e.target.value)}
          placeholder={S.courierNamePlaceholder}
        />
      </Field>
      <Field id="mv-docket" label={S.docketLabel} required>
        <Input
          id="mv-docket"
          value={f.docket}
          onChange={(e) => setLogistic("docket", e.target.value)}
          placeholder={S.docketPlaceholder}
        />
      </Field>
    </>
  );
}
