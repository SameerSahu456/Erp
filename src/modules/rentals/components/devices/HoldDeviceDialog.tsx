import { useState } from "react";
import { Loader2 } from "lucide-react";

import { DatePicker } from "@/components/common/pickers/DatePicker";
import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

import { FieldError } from "@/components/common/forms/FieldError";
import { useHoldDevice } from "../../hooks/devices/useRentalDevices";
import { formatRentalDay } from "../../lib/format";
import { earliestHoldDay } from "../../lib/hold-dates";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

const H = S.devices.holdDialog;

export interface HoldDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  /** The unit's dispatch date — the API refuses a hold that precedes it
   *  (`HOLD_BEFORE_DISPATCH`), so the picker is bounded by it rather
   *  than letting the operator discover the rule from an error. */
  dispatched: string | null;
  /** The unit's billing start — a hold starts after it. */
  billingStart: string | null;
  /** The unit's first day not yet billed — a hold cannot reach back past it. */
  firstUnbilled: string | null;
  /** Today as `YYYY-MM-DD`, passed in so the whole page agrees on one
   *  date across a midnight boundary. */
  today: string;
}

/** Put one unit on hold, from a chosen day.
 *
 *  The API has always taken `from_date`, an inclusive `until` and a
 *  `reason`. Nothing sent any of them: the menu fired
 *  `hold.mutate({ from_date: today })` straight from the click, so a
 *  hold could only ever start today, never end on a planned day, and
 *  never record why. Backdating a hold the customer reported last week
 *  was impossible, which is what made it look broken.
 */
export function HoldDeviceDialog({
  open,
  onOpenChange,
  deviceId,
  dispatched,
  billingStart,
  firstUnbilled,
  today,
}: HoldDeviceDialogProps) {
  const [fromDate, setFromDate] = useState(today);
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("");
  const mutation = useHoldDevice();

  // Mirrors `HOLD_WINDOW_INVERTED`, so the operator reads it on the field
  // rather than as a refusal after submitting.
  const inverted = until !== "" && until < fromDate;
  // Mirrors the API's start / billed-period / dispatch rules.
  const earliest = earliestHoldDay([billingStart], [dispatched, firstUnbilled]);
  const tooEarly = !!earliest && !!fromDate && fromDate < earliest;

  function handleSubmit() {
    if (!fromDate || inverted || tooEarly) return;
    mutation.mutate(
      {
        id: deviceId,
        from_date: fromDate,
        until: until || null,
        reason: reason.trim() || null,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={H.title}
      description={H.description}
      className="sm:max-w-md"
      isDirty={fromDate !== today || until !== "" || reason !== ""}
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
            disabled={!fromDate || inverted || tooEarly || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mutation.isPending ? H.submitting : H.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="hold-from" required>
            {H.fromLabel}
          </Label>
          <DatePicker
            id="hold-from"
            value={fromDate}
            min={earliest}
            onChange={setFromDate}
            disabled={mutation.isPending}
          />
          <Typography variant="helper" tone="muted">
            {earliest ? H.fromHelpEarliest(formatRentalDay(earliest)) : H.fromHelp}
          </Typography>
          <FieldError
            message={tooEarly && earliest ? H.fromTooEarly(formatRentalDay(earliest)) : undefined}
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="hold-until">{H.untilLabel}</Label>
          <DatePicker
            id="hold-until"
            value={until}
            min={fromDate || undefined}
            onChange={setUntil}
            disabled={mutation.isPending}
            clearable
          />
          {/* Open-ended is the normal case — a unit comes back on hold
              until somebody resumes it — so the blank state is spelled
              out rather than left to be inferred. */}
          <Typography variant="helper" tone="muted">
            {H.untilHelp}
          </Typography>
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="hold-reason">{H.reasonLabel}</Label>
          <Textarea
            id="hold-reason"
            value={reason}
            maxLength={2000}
            rows={3}
            onChange={(e) => setReason(e.target.value)}
            disabled={mutation.isPending}
            placeholder={H.reasonPlaceholder}
          />
        </div>

        {inverted ? (
          <Typography variant="helper" tone="danger">
            {H.inverted}
          </Typography>
        ) : null}

        {mutation.isError ? (
          <Typography variant="helper" tone="danger">
            {mutation.error instanceof Error ? mutation.error.message : H.failed}
          </Typography>
        ) : null}
      </div>
    </OperationDialog>
  );
}
