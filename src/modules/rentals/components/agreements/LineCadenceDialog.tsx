import { useState } from "react";

import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Typography } from "@/components/ui/typography";

import type {
  RentalLineCadence,
  RentalLineCadencePayload,
} from "../../api/agreements";
import {
  fitCadenceToPeriod,
  isCustomCadence,
  validateCadence,
  type BillingSettings,
  type RentalPeriod,
} from "../../lib/cadence";
import { useSaveLineCadence } from "../../hooks/agreements/useAgreement";
import { CadenceScheduleFields } from "../shared/CadenceScheduleFields";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

const L = S.agreement.lines;

/** Either the line follows the order, or it states its own cycle. */
type CadenceSource = "inherit" | "own";

export interface LineCadenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreementId: string;
  /** The cadence rows are read back as part of the AGREEMENT DETAIL, which
   *  is cached under the ORDER id — so the save needs both. */
  salesOrderId: string;
  /** The line as it reads TODAY: already resolved against the order, so
   *  the fields open on the real values whether or not it overrides. */
  line: RentalLineCadence;
  /** What the order itself bills on, for the sentence under "follow the
   *  order". Shown rather than left implicit: "follow the order" is only a
   *  meaningful choice if the reader can see what it resolves to. */
  orderCadenceLabel: string;
  /** The order's dates — the period a line with no dates of its own runs on. */
  orderStart?: string | null;
  orderEnd?: string | null;
}

/** The "own" form's starting values: the line's effective cadence, or, for a
 *  line rented for less than a month, a custom cycle of its length. */
function seedLineCadence(line: RentalLineCadence, period: RentalPeriod): BillingSettings {
  return fitCadenceToPeriod(
    {
      billing_type: line.billing_type,
      billing_mode: line.billing_mode,
      billing_day: line.billing_day ?? null,
      bill_issue_day: line.bill_issue_day ?? null,
      custom_days: line.custom_days ?? null,
      invoicing_mode: null,
      credit_period_days: null,
    },
    period,
  );
}

/** Set or clear ONE line's billing cycle.
 *
 *  Two decisions, in order: does this line follow the order, and if not,
 *  what is its own cycle. They are one dialog rather than a toggle on the
 *  row because an override must be stated in WHOLE — the backend's
 *  `override_is_whole` CHECK refuses a `billing_type` without a
 *  `billing_mode` — so there is no coherent half-saved state to show.
 *
 *  Clearing sends an all-null payload to the same PUT, not a DELETE: the
 *  cadence row carries `last_billed_date` and must survive being returned
 *  to inheritance.
 */
export function LineCadenceDialog({
  open,
  onOpenChange,
  agreementId,
  salesOrderId,
  line,
  orderCadenceLabel,
  orderStart,
  orderEnd,
}: LineCadenceDialogProps) {
  const [source, setSource] = useState<CadenceSource>(
    line.is_override ? "own" : "inherit",
  );
  // The LINE's own dates, else the order's — the same fallback billing uses.
  const period = {
    start: line.rental_start_date ?? orderStart,
    end: line.rental_end_date ?? orderEnd,
  };
  // Seeded from the EFFECTIVE cadence, so switching to "own" starts from
  // what the line bills on now rather than from an empty form — the
  // common edit is one field off the inherited cycle.
  //
  // `invoicing_mode` and `credit_period_days` are null and stay null: they
  // are ORDER-level settings with no per-line column, and this dialog
  // renders only the schedule half of the editor. `billing_grace_days` is
  // left undefined, which is what tells `validateCadence` there is no
  // grace field on this form.
  const [cadence, setCadence] = useState<BillingSettings>(() => seedLineCadence(line, period));
  const mutation = useSaveLineCadence(agreementId, salesOrderId);
  const problem = source === "own" ? validateCadence(cadence, period) : null;

  function handleSubmit() {
    if (problem) return;
    const payload: RentalLineCadencePayload =
      source === "inherit"
        ? {
            billing_type: null,
            billing_mode: null,
            billing_day: null,
            bill_issue_day: null,
            custom_days: null,
          }
        : {
            billing_type: cadence.billing_type,
            billing_mode: cadence.billing_mode,
            // A custom cycle has no month grid and a fixed one has no
            // interval; sending the other half is the contradictory pair
            // the DB CHECK refuses outright.
            billing_day: isCustomCadence(cadence.billing_type)
              ? null
              : cadence.billing_day,
            bill_issue_day: isCustomCadence(cadence.billing_type)
              ? null
              : cadence.bill_issue_day,
            custom_days: isCustomCadence(cadence.billing_type)
              ? cadence.custom_days
              : null,
          };
    mutation.mutate(
      { lineId: line.sales_order_item_id, payload },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={L.dialogTitle}
      description={L.dialogDescription}
      className="sm:max-w-xl"
      isDirty={source !== (line.is_override ? "own" : "inherit")}
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
            disabled={!!problem || mutation.isPending}
          >
            {mutation.isPending ? C.saving : L.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <Typography variant="helper" tone="muted" asChild>
          <p className="min-w-0">{line.item_name}</p>
        </Typography>

        {/* An already-invoiced line is NOT frozen — the backend accepts the
            change — but the periods already raised keep the cycle they
            were raised under, so say so before the operator saves. */}
        {line.last_billed_date ? (
          <Alert>
            <AlertDescription>{L.billedWarning}</AlertDescription>
          </Alert>
        ) : null}

        <RadioGroup
          value={source}
          onValueChange={(next) => setSource(next as CadenceSource)}
          disabled={mutation.isPending}
        >
          <div className="space-y-1">
            <label className="flex items-center gap-3" htmlFor="cadence-inherit">
              <RadioGroupItem id="cadence-inherit" value="inherit" />
              <Label htmlFor="cadence-inherit">{L.modeFollow}</Label>
            </label>
            <Typography variant="helper" tone="muted" className="pl-8">
              {L.orderCycleIs}
              {orderCadenceLabel}. {L.modeFollowHelp}
            </Typography>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-3" htmlFor="cadence-own">
              <RadioGroupItem id="cadence-own" value="own" />
              <Label htmlFor="cadence-own">{L.modeOwn}</Label>
            </label>
            <Typography variant="helper" tone="muted" className="pl-8">
              {L.modeOwnHelp}
            </Typography>
          </div>
        </RadioGroup>

        {/* Mounted only while "own" is chosen. Left mounted-but-disabled it
            would read as a cycle this line has, which is the exact
            confusion the override is meant to remove. */}
        {source === "own" ? (
          <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
            <CadenceScheduleFields
              value={cadence}
              onChange={setCadence}
              disabled={mutation.isPending}
              idPrefix="line-cadence"
              period={period}
            />
          </div>
        ) : null}

        {problem ? (
          <Typography variant="helper" tone="danger">
            {problem}
          </Typography>
        ) : null}

        {mutation.isError ? (
          <Typography variant="helper" tone="danger">
            {mutation.error instanceof Error ? mutation.error.message : L.failed}
          </Typography>
        ) : null}
      </div>
    </OperationDialog>
  );
}
