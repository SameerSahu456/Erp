import { useState } from "react";
import { Loader2 } from "lucide-react";

import { DatePicker } from "@/components/common/pickers/DatePicker";
import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { EMPTY_VALUE } from "@/shared/constants";

import { useUnholdDevice } from "../../hooks/devices/useRentalDevices";
import { parseDateParam } from "@/shared/lib/date";
import { formatRentalDay } from "../../lib/format";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

const R = S.devices.resumeDialog;

/** Days a resume will credit: `hold start` up to, but NOT including, the
 *  resume day.
 *
 *  Mirrors `release_hold`'s `(unhold_day - hold_start).days` exactly, so
 *  the figure on screen is the one the backend will accrue. Null when
 *  either bound is missing; 0 rather than negative when the resume day
 *  is on or before the start, which is the hold-cancelling case.
 */
function heldDaysBetween(
  holdStarted: string | null,
  unholdDay: string,
): number | null {
  const from = parseDateParam(holdStarted ?? undefined);
  const to = parseDateParam(unholdDay);
  if (!from || !to) return null;
  return Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / 86_400_000),
  );
}

export interface ResumeDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  /** The day the hold began. Shown, and used as the picker's floor —
   *  resuming ON it is legal and simply cancels the hold, so the bound
   *  is the start rather than the day after. */
  holdStarted: string | null;
  /** The planned last held day, when the hold was given one. */
  holdUntil: string | null;
  /** Credit from PREVIOUSLY released holds, which the next invoice still
   *  owes. Shown only when non-zero.
   *
   *  `holdDays` used to be a prop beside it and is deliberately gone:
   *  both fields are written only inside `release_hold`, so during an
   *  open hold they describe earlier holds, not this one. The span being
   *  credited now is computed from the picker instead. */
  holdCredit: string | null;
  today: string;
}

/** Resume billing on a held unit, from a chosen day.
 *
 *  `unhold_day` is the day billing RESUMES — the EXCLUSIVE far end of
 *  the held span, so resuming on the 10th means the 9th was the last
 *  held day. The API has always taken it and defaulted it to today; the
 *  menu only ever sent today, so a hold that actually ended last week
 *  could not be recorded and the customer was credited too much.
 *
 *  A BACKDATED resume is handled entirely by `release_hold`, and this
 *  dialog says which of its cases applies rather than leaving the
 *  operator to guess whether the next invoice will be right:
 *
 *    * no invoice ran during the hold — the whole span accrues as credit
 *      and the next arrears invoice bills from the unchanged anchor and
 *      subtracts it;
 *    * an invoice already covered part of the span — the paid days are
 *      not handed back, and only the unbilled tail is affected.
 */
export function ResumeDeviceDialog({
  open,
  onOpenChange,
  deviceId,
  holdStarted,
  holdUntil,
  holdCredit,
  today,
}: ResumeDeviceDialogProps) {
  const [unholdDay, setUnholdDay] = useState(today);
  const mutation = useUnholdDevice();

  // Resuming ON the start day is legal — it cancels a hold entered by
  // mistake, accruing nothing. Worth saying, because it looks like a
  // no-op and is the one case that does not credit anything.
  const cancelsHold = holdStarted !== null && unholdDay <= holdStarted;

  // Computed, not read from the device: `hold_days` / `hold_credit` are
  // written only when a hold is RELEASED, so while one is open they
  // carry the total from previous holds and read 0 on a first hold.
  // Showing that beside "Held since" invited the conclusion that
  // nothing was being credited.
  const daysBeingCredited = heldDaysBetween(holdStarted, unholdDay);

  // Prior released holds, which the next invoice still owes. Hidden at
  // zero rather than shown as ₹0, which is the ambiguity this replaced.
  const priorCredit = Number(holdCredit ?? 0);

  function handleSubmit() {
    if (!unholdDay) return;
    mutation.mutate(
      { id: deviceId, unhold_day: unholdDay },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={R.title}
      description={R.description}
      className="sm:max-w-md"
      isDirty={unholdDay !== today}
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
            disabled={!unholdDay || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mutation.isPending ? R.submitting : R.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {/* The dates the operator came here to see. Held-since is the
            fact that decides what to pick, and it was nowhere on screen
            at the point of action. */}
        <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
          <div className="min-w-0">
            <Typography variant="helper" tone="muted" asChild>
              <dt>{R.heldSince}</dt>
            </Typography>
            <Typography variant="body" asChild>
              <dd>{formatRentalDay(holdStarted)}</dd>
            </Typography>
          </div>
          <div className="min-w-0">
            <Typography variant="helper" tone="muted" asChild>
              <dt>{R.plannedUntil}</dt>
            </Typography>
            <Typography variant="body" asChild>
              <dd>{holdUntil ? formatRentalDay(holdUntil) : R.openEnded}</dd>
            </Typography>
          </div>
          <div className="min-w-0">
            <Typography variant="helper" tone="muted" asChild>
              <dt>{R.daysBeingCredited}</dt>
            </Typography>
            <Typography variant="body" numeric asChild>
              <dd>{daysBeingCredited ?? EMPTY_VALUE}</dd>
            </Typography>
          </div>
          {priorCredit > 0 ? (
            <div className="min-w-0">
              <Typography variant="helper" tone="muted" asChild>
                <dt>{R.previouslyCredited}</dt>
              </Typography>
              <Typography variant="body" numeric asChild>
                <dd>{formatINR(priorCredit)}</dd>
              </Typography>
            </div>
          ) : null}
        </dl>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="resume-on" required>
            {R.resumeLabel}
          </Label>
          <DatePicker
            id="resume-on"
            value={unholdDay}
            min={holdStarted ?? undefined}
            onChange={setUnholdDay}
            disabled={mutation.isPending}
          />
          <Typography variant="helper" tone="muted">
            {R.resumeHelp}
          </Typography>
          <Typography variant="helper" tone="muted">
            {R.daysBeingCreditedHelp}
          </Typography>
        </div>

        {cancelsHold ? (
          <Alert>
            <AlertDescription>{R.cancelsHold}</AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>{R.billingNote}</AlertDescription>
          </Alert>
        )}

        {mutation.isError ? (
          <Typography variant="helper" tone="danger">
            {mutation.error instanceof Error ? mutation.error.message : R.failed}
          </Typography>
        ) : null}
      </div>
    </OperationDialog>
  );
}
