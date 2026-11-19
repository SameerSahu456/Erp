import { useState } from "react";
import { Loader2 } from "lucide-react";

import { DatePicker } from "@/components/common/pickers/DatePicker";
import { Button } from "@/components/ui/button";
import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

import {
  useExtendBounds,
  useExtendDevice,
} from "../../hooks/devices/useRentalDevices";
import { isRateFromTooLate, lastRateFromDay } from "../../hooks/agreements/extend-so-helpers";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

export interface ExtendDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  /** The unit's current contract end, pre-filling the picker so the
   *  operator moves a real date rather than typing one from scratch. */
  contractEnd: string | null;
  today: string;
}

/** Extends ONE unit — and, through it, its order.
 *
 *  Three things move together server-side: this unit's contract end, its
 *  own order line, and the order's end date. The dialog says so, because
 *  an operator extending what looks like a single unit is also moving the
 *  contract it belongs to.
 *
 *  The rate is optional and deliberately paired with its own date: a new
 *  rate is time-phased, so periods before the effective date keep the old
 *  price. Sending one without the other is refused server-side, so the
 *  submit guard mirrors that rather than letting the request fail.
 */
export function ExtendDeviceDialog({
  open,
  onOpenChange,
  deviceId,
  contractEnd,
  today,
}: ExtendDeviceDialogProps) {
  const [endDate, setEndDate] = useState<string>(contractEnd ?? today);
  const [rate, setRate] = useState<string>("");
  const [rateFrom, setRateFrom] = useState<string>("");
  const mutation = useExtendDevice();

  // The dates the server would actually accept, so the pickers can grey
  // out the rest instead of letting the operator pick one and meet a 400.
  // Fetched only while open — it is a per-device lookup.
  const bounds = useExtendBounds(deviceId, open);

  // A rate needs its effective date; a date alone is harmless but means
  // nothing, so both or neither.
  const rateIncomplete = rate.trim() !== "" && !rateFrom;
  // ...and it must start before the end date — which can be moved after the
  // rate date was picked.
  const rateTooLate = rate.trim() !== "" && isRateFromTooLate(rateFrom, endDate);
  const blocked = !endDate || rateIncomplete || rateTooLate;

  function handleSubmit() {
    if (blocked) return;
    mutation.mutate(
      {
        id: deviceId,
        new_end_date: endDate,
        monthly_rate: rate.trim() || null,
        rate_effective_date: rate.trim() ? rateFrom : null,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={S.devices.extendDialog.title}
      description={S.devices.extendDialog.help}
      isDirty={endDate !== (contractEnd ?? today) || rate !== ""}
      footer={({ requestClose }) => (
        <>
          <Button
            variant="outline"
            onClick={requestClose}
            disabled={mutation.isPending}
          >
            {C.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={blocked || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mutation.isPending ? S.dialogs.extending : S.devices.extend}
          </Button>
        </>
      )}
    >
        <div className="min-w-0 space-y-4">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="extend-end-date" required>
              {S.devices.extendDialog.endDate}
            </Label>
            <DatePicker
              id="extend-end-date"
              value={endDate}
              onChange={setEndDate}
              // Below the originally contracted end an extend is a
              // termination — a different action with its own permission.
              min={bounds.data?.end_date_min ?? undefined}
              disabled={mutation.isPending}
            />
            <Typography variant="helper">
              {S.devices.extendDialog.endDateHelp}
            </Typography>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="extend-rate">{S.devices.extendDialog.rate}</Label>
            <Input
              id="extend-rate"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder={S.devices.extendDialog.ratePlaceholder}
              disabled={mutation.isPending}
            />
          </div>

          {rate.trim() ? (
            <RateFromField
              value={rateFrom}
              onChange={setRateFrom}
              min={bounds.data?.rate_effective_min ?? undefined}
              endDate={endDate}
              tooLate={rateTooLate}
              disabled={mutation.isPending}
            />
          ) : null}
        </div>

        {mutation.isError ? (
          <Typography variant="helper" tone="danger">
            {mutation.error instanceof Error ? mutation.error.message : S.dialogs.extendFailed}
          </Typography>
        ) : null}
    </OperationDialog>
  );
}

/** When the new rate starts. Rates never change mid-tenure, so the earliest
 *  is the end of the tenure in progress (`min`, from the server); and a rate
 *  must start before the end date being set in this same dialog, which is
 *  why the max tracks local state rather than the server. */
function RateFromField({
  value,
  onChange,
  min,
  endDate,
  tooLate,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  min: string | undefined;
  endDate: string;
  tooLate: boolean;
  disabled: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor="extend-rate-from" required>
        {S.devices.extendDialog.rateFrom}
      </Label>
      <DatePicker
        id="extend-rate-from"
        value={value}
        onChange={onChange}
        min={min}
        max={lastRateFromDay(endDate)}
        disabled={disabled}
      />
      <Typography variant="helper" tone={tooLate ? "danger" : undefined}>
        {tooLate ? S.devices.extendDialog.rateFromTooLate : S.devices.extendDialog.rateFromHelp}
      </Typography>
    </div>
  );
}
