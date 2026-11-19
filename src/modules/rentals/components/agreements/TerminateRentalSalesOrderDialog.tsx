import { useState } from "react";

import { DatePicker } from "@/components/common/pickers/DatePicker";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { istTodayDateParam } from "@shared/lib/date";

import { useTerminateSo } from "../../hooks/agreements/useAgreement";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { ActionDialog, type ActionProps } from "./ActionDialog";
import { ActionField } from "./ActionField";

const T = S.actions.terminate;

/** Raise a termination request. It waits for the rental manager's approval
 *  (2026-11-14), so nothing on the order moves here — the return that
 *  collects the units is raised once the termination is approved. */
export function TerminateRentalSalesOrderDialog({ salesOrderId, open, onOpenChange, onDone }: ActionProps) {
  const [effectiveDate, setEffectiveDate] = useState(istTodayDateParam());
  const [reason, setReason] = useState("");
  // Early exit IS the termination (2026-11-15): the charge it raises is
  // waived, or not, in the same request and the same decision.
  const [waive, setWaive] = useState(false);
  const mut = useTerminateSo();

  function submit() {
    mut.mutate(
      {
        id: salesOrderId,
        effective_date: effectiveDate,
        reason: reason.trim(),
        waive_early_exit: waive,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onDone?.();
        },
      },
    );
  }

  return (
    <ActionDialog
      isDirty={effectiveDate !== istTodayDateParam() || reason !== "" || waive}
      open={open}
      onOpenChange={onOpenChange}
      title={T.title}
      description={T.description}
      submitLabel={T.submit}
      pending={mut.isPending}
      error={mut.error}
      canSubmit={!!effectiveDate && reason.trim() !== ""}
      onSubmit={submit}
    >
      <ActionField label={T.effectiveDate} htmlFor="terminate-date" required>
        <DatePicker id="terminate-date" value={effectiveDate} onChange={setEffectiveDate} />
      </ActionField>
      <ActionField label={T.reason} htmlFor="terminate-reason" required>
        <Textarea
          id="terminate-reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-required
        />
      </ActionField>
      <label htmlFor="terminate-waive" className="flex items-start gap-2">
        <Checkbox
          id="terminate-waive"
          checked={waive}
          onCheckedChange={(on) => setWaive(on === true)}
          className="mt-0.5"
        />
        <span className="min-w-0 space-y-0.5">
          <Typography variant="body">{T.waive}</Typography>
          <Typography variant="helper" tone="muted" asChild>
            <span className="block">{T.waiveHelp}</span>
          </Typography>
        </span>
      </label>
    </ActionDialog>
  );
}
