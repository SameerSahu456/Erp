import { DatePicker } from "@/components/common/pickers/DatePicker";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

import { useExtendSoForm, type ExtendSoForm } from "../../hooks/agreements/useExtendSoForm";
import { formatRentalDayLong } from "../../lib/format";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { ActionDialog, type ActionProps } from "./ActionDialog";
import { ActionField } from "./ActionField";
import { ExtendLineRateRow } from "./ExtendLineRateRow";

const E = S.actions.extend;

export function ExtendRentalSalesOrderDialog({ salesOrderId, open, onOpenChange, onDone }: ActionProps) {
  const form = useExtendSoForm(salesOrderId, open);

  return (
    <ActionDialog
      isDirty={form.isDirty}
      open={open}
      onOpenChange={onOpenChange}
      title={E.title}
      description={E.description}
      submitLabel={E.submit}
      className="sm:max-w-2xl"
      pending={form.pending}
      error={form.error}
      canSubmit={form.canSubmit}
      onSubmit={() =>
        form.submit(() => {
          onOpenChange(false);
          onDone?.();
        })
      }
    >
      {/* The floor is said, not just enforced — a calendar that silently
          refuses every day before 2030 reads as broken. */}
      <ActionField
        label={E.newEndDate}
        htmlFor="extend-end-date"
        help={form.endDateMin ? E.endDateFloor(formatRentalDayLong(form.endDateMin)) : undefined}
      >
        <DatePicker id="extend-end-date" value={form.newEndDate} onChange={form.setNewEndDate} min={form.endDateMin} />
      </ActionField>
      <ActionField label={E.reason} htmlFor="extend-reason">
        <Textarea id="extend-reason" rows={2} value={form.reason} onChange={(e) => form.setReason(e.target.value)} />
      </ActionField>
      {form.rentalLines.length > 0 && <ExtendLineRates form={form} />}
    </ActionDialog>
  );
}

function ExtendLineRates({ form }: { form: ExtendSoForm }) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Typography variant="body-strong">{E.ratesHeading}</Typography>
      <Typography variant="helper" tone="muted">
        {E.ratesHelp}
      </Typography>
      {form.rentalLines.map((line) => (
        <ExtendLineRateRow
          key={line.id}
          lineId={line.id}
          lineName={line.item_name}
          contractedRate={line.rate}
          selection={form.lines.get(line.id)}
          targetsState={form.targetsState}
          rate={form.lineRates[line.id] ?? ""}
          flattenOk={form.flattenOk[line.id] ?? false}
          onRate={form.setRate}
          onAllUnits={form.setAllUnits}
          onUnit={form.toggleUnit}
          onFlatten={form.setFlatten}
        />
      ))}
      {form.anyPriced && (
        <ActionField
          label={E.rateFrom}
          htmlFor="extend-rate-from"
          help={form.rateFromMin ? E.rateFromFloor(formatRentalDayLong(form.rateFromMin)) : E.rateFromCeiling}
        >
          {/* A rate cannot outlive the contract: it must start before the
              end chosen above, so the last selectable day is the one before. */}
          <DatePicker
            id="extend-rate-from"
            value={form.rateFrom}
            onChange={form.setRateFrom}
            min={form.rateFromMin}
            max={form.rateFromMax}
          />
        </ActionField>
      )}
      <GuardMessages guards={form.guards} />
    </div>
  );
}

function GuardMessages({ guards }: { guards: ExtendSoForm["guards"] }) {
  const all: Array<[boolean, string]> = [
    [guards.ratesIncomplete, E.rateFromRequired],
    [guards.rateFromTooLate, E.rateFromCeiling],
    [guards.targetsUnknown, E.unitsRequired],
    [guards.emptySelection, E.unitsNoneSelected],
    [guards.unacknowledged, E.flattenRequired],
  ];
  return all.filter(([on]) => on).map(([, message]) => (
    <Typography key={message} variant="helper" tone="danger">
      {message}
    </Typography>
  ));
}
