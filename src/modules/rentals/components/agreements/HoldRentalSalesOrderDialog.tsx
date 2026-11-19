import { useState } from "react";

import { FieldError } from "@/components/common/forms/FieldError";
import { DatePicker } from "@/components/common/pickers/DatePicker";
import { Textarea } from "@/components/ui/textarea";
import { istTodayDateParam } from "@shared/lib/date";

import { useHoldSo, useRentalSalesOrderBilling } from "../../hooks/agreements/useAgreement";
import { formatRentalDay } from "../../lib/format";
import { earliestHoldDay } from "../../lib/hold-dates";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { ActionDialog, type ActionProps } from "./ActionDialog";
import { ActionField } from "./ActionField";

const H = S.actions.hold;

export function HoldRentalSalesOrderDialog({ salesOrderId, open, onOpenChange, onDone }: ActionProps) {
  const [fromDate, setFromDate] = useState(istTodayDateParam());
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("");
  const mut = useHoldSo();
  // Same billing read the actions menu already holds in cache.
  const config = useRentalSalesOrderBilling(salesOrderId, { enabled: open }).data?.config;
  const earliest = earliestHoldDay([config?.start_date, config?.last_billed_date]);
  const tooEarly = !!earliest && !!fromDate && fromDate < earliest;

  function submit() {
    mut.mutate(
      { id: salesOrderId, from_date: fromDate, until: until || null, reason: reason.trim() || null },
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
      isDirty={fromDate !== istTodayDateParam() || until !== "" || reason !== ""}
      open={open}
      onOpenChange={onOpenChange}
      title={H.title}
      description={H.description}
      submitLabel={H.submit}
      pending={mut.isPending}
      error={mut.error}
      canSubmit={!!fromDate && !tooEarly}
      onSubmit={submit}
    >
      <ActionField
        label={H.fromDate}
        htmlFor="hold-from"
        help={earliest ? H.fromHelp(formatRentalDay(earliest)) : undefined}
      >
        <DatePicker id="hold-from" min={earliest} value={fromDate} onChange={setFromDate} />
        <FieldError message={tooEarly && earliest ? H.fromTooEarly(formatRentalDay(earliest)) : undefined} />
      </ActionField>
      <ActionField label={H.until} htmlFor="hold-until" help={H.untilHelp}>
        <DatePicker id="hold-until" min={fromDate || undefined} value={until} onChange={setUntil} />
      </ActionField>
      <ActionField label={H.reason} htmlFor="hold-reason">
        <Textarea id="hold-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </ActionField>
    </ActionDialog>
  );
}
