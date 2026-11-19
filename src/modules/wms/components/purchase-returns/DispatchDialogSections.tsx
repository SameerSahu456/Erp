import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { DatePicker } from "@/components/common/pickers/DatePicker";
import { FieldError } from "@/components/common/forms/FieldError";
import { todayDateParam } from "@shared/lib/date";

import type { useDispatchChallanForm } from "../../hooks/purchase-returns/useDispatchChallanForm";
import { DispatchCreateLogisticsFields } from "../dispatches/DispatchCreateLogisticsFields";
import type { ShippableUnit } from "./DispatchDialog";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";

type ChallanForm = ReturnType<typeof useDispatchChallanForm>;

// Typing caps: the backend's 100-char name; a phone with "+91" and separators.
const DRIVER_NAME_INPUT_MAX = 100;
const DRIVER_PHONE_INPUT_MAX = 16;

/** Which decided units go on this consignment. */
export function DispatchUnitPicker({
  units,
  selectedIds,
  onToggle,
}: {
  units: ShippableUnit[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{S.dispatchDialog.unitPicker.label}</Label>
      <Typography variant="body" tone="muted" asChild>
        <p>{S.dispatchDialog.unitPicker.hint}</p>
      </Typography>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
        {units.map((unit) => (
          <label
            key={unit.id}
            className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-muted/50"
          >
            <Checkbox
              checked={selectedIds.includes(unit.id)}
              onCheckedChange={() => onToggle(unit.id)}
            />
            <Typography variant="mono" asChild>
              <span className="shrink-0">{unit.serial}</span>
            </Typography>
            <Typography variant="body" tone="muted" truncate asChild>
              <span className="min-w-0 flex-1">{unit.partLabel}</span>
            </Typography>
            {unit.disposition ? (
              <Typography variant="helper" tone="muted" asChild>
                <span className="ml-auto shrink-0 uppercase">
                  {unit.disposition}
                </span>
              </Typography>
            ) : null}
          </label>
        ))}
      </div>
    </div>
  );
}

/** Logistics (as on the Dispatch Request form), then driver, expected delivery
 *  and return address. */
export function DispatchChallanFields({ form }: { form: ChallanForm }) {
  return (
    <>
      <div className="space-y-3">
        <Typography variant="body-strong">{S.dispatchDialog.sections.logistics}</Typography>
        <DispatchCreateLogisticsFields logistics={form.logistics} />
      </div>
      <div className="space-y-3">
        <Typography variant="body-strong">{S.dispatchDialog.sections.driver}</Typography>
        <DriverAndDeliveryFields form={form} />
      </div>
    </>
  );
}

function DriverAndDeliveryFields({ form }: { form: ChallanForm }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="pr-driver-name">{S.dispatchDialog.fields.driverName}</Label>
        <Input
          id="pr-driver-name"
          value={form.driverName}
          onChange={(e) => form.setDriverName(e.target.value)}
          onBlur={() => form.touch("driverName")}
          placeholder={S.dispatchDialog.placeholders.driverName}
          maxLength={DRIVER_NAME_INPUT_MAX}
          aria-invalid={form.driverNameError != null}
          aria-describedby={form.driverNameError ? "pr-driver-name-error" : undefined}
        />
        <FieldError id="pr-driver-name-error" message={form.driverNameError} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pr-driver-phone">{S.dispatchDialog.fields.driverPhone}</Label>
        <Input
          id="pr-driver-phone"
          type="tel"
          inputMode="tel"
          value={form.driverPhone}
          onChange={(e) => form.setDriverPhone(e.target.value)}
          onBlur={() => form.touch("driverPhone")}
          placeholder={S.dispatchDialog.placeholders.driverPhone}
          maxLength={DRIVER_PHONE_INPUT_MAX}
          aria-invalid={form.driverPhoneError != null}
          aria-describedby={form.driverPhoneError ? "pr-driver-phone-error" : undefined}
        />
        <FieldError id="pr-driver-phone-error" message={form.driverPhoneError} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="pr-expected-date">{S.dispatchDialog.fields.expectedDelivery}</Label>
        <DatePicker
          id="pr-expected-date"
          value={form.expectedDeliveryDate}
          // Delivery is a future event — it can't land before today.
          min={todayDateParam()}
          onChange={form.setExpectedDeliveryDate}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="pr-return-address">{S.dispatchDialog.fields.returnAddress}</Label>
        <Textarea
          id="pr-return-address"
          value={form.returnAddress}
          onChange={(e) => form.setReturnAddress(e.target.value)}
          placeholder={S.dispatchDialog.placeholders.returnAddress}
          rows={3}
        />
      </div>
    </div>
  );
}
