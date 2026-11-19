import { useState } from "react";
import { Loader2, Play } from "lucide-react";

import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";
import { DateRangePicker } from "@/components/common/pickers/DateRangePicker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

import { MAX_BILLING_RUN_RANGE_DAYS } from "../../api/settings";
import { useRunBilling } from "../../hooks/configuration/useRentalSettings";
import { daysInclusive, fromRange, toRange } from "../../lib/dateRange";
import { formatRentalDay } from "../../lib/format";
import { CONFIGURATION_STRINGS as S } from "./configuration.strings";

const C = S.configuration;

/** What the range problem is, if any — said before the run, not as a 422.
 *  Future dates are allowed: a run may bill a period ahead of time. */
function rangeProblem(from: string, to: string): string | null {
  if (!from || !to) return null;
  if (to < from) return C.rangeInverted;
  if (daysInclusive(from, to) > MAX_BILLING_RUN_RANGE_DAYS) {
    return C.rangeTooLong(MAX_BILLING_RUN_RANGE_DAYS);
  }
  return null;
}

/** rental-billing's "Run billing" with its From..To range. Each day bills
 *  as the scheduler would on it, so a range never bills a period twice.
 *  Both blank = today; To blank = just From. */
export function ManualBillingRunCard() {
  const run = useRunBilling();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const problem = rangeProblem(from, to);
  const when =
    from && to
      ? C.runRange(formatRentalDay(from), formatRentalDay(to))
      : from || to
        ? C.runOn(formatRentalDay(from || to))
        : C.runToday;

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{C.manualTitle}</CardTitle>
          <CardDescription>{C.manualHelp}</CardDescription>
        </div>
      </CardHeader>
      {/* Column flex: the helper is an inline <span>, so under space-y it
          flowed onto the same line as the Run button. */}
      <CardContent className="flex flex-col items-start gap-4">
        {/* One From..To period — the same dual-calendar picker the rental
            SO form uses for its billing period. A lone start is a one-day
            run (To blank = just From). */}
        <div className="flex w-full min-w-0 max-w-md flex-col gap-1.5">
          <Label htmlFor="billing-run-period">{C.runPeriod}</Label>
          <DateRangePicker
            id="billing-run-period"
            value={toRange({ from, to })}
            onChange={(next) => {
              const r = fromRange(next);
              setFrom(r.from ?? "");
              setTo(r.to ?? "");
            }}
            placeholder={C.runPeriodPlaceholder}
            disabled={run.isPending}
          />
          <Typography variant="helper" tone={problem ? "danger" : "muted"}>
            {problem ?? C.runDateHelp}
          </Typography>
        </div>
        {/* A run writes invoices and advances every billed unit's anchor —
            irreversible, so it is confirmed and the window is named (§5). */}
        <Button disabled={run.isPending || problem !== null} onClick={() => setConfirmOpen(true)}>
          {run.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {run.isPending ? C.running : C.run}
        </Button>
        {/* Controlled: the popup stays up while the run is in flight and
            closes only once it has completed successfully. A failed run
            leaves it open (the hook toasts the error) to retry or cancel. */}
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={(next) => {
            // Not dismissible mid-run — the run is already writing invoices.
            if (!next && run.isPending) return;
            setConfirmOpen(next);
          }}
          title={C.runTitle}
          description={C.runDescription(when)}
          confirmLabel={run.isPending ? C.running : C.runConfirm}
          cancelLabel={C.runCancel}
          onConfirm={() => {
            if (run.isPending) return;
            run.mutate(
              { from: from || null, to: to || null },
              { onSuccess: () => setConfirmOpen(false) },
            );
          }}
        />
      </CardContent>
    </Card>
  );
}
