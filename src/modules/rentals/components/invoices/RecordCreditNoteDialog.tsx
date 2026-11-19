import { useState } from "react";

import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { DatePicker } from "@/components/common/pickers/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { istTodayDateParam } from "@shared/lib/date";

import type { RentalInvoiceLine } from "../../api/invoices";
import { useCreateCreditNote } from "../../hooks/invoices/useCreditNotes";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { RENTALS_COMMON_STRINGS as RC } from "../shared/common.strings";

const C = S.invoices.creditNotes;

/** A line's label: part (or the one-off's description) and its period. */
function lineLabel(line: RentalInvoiceLine): string {
  return S.creditNotes.lineLabel(line.part || line.description || "", line.period);
}

/** What the typed figures add up to, and whether any line is over what it
 *  billed — the server refuses that, so the dialog says it first. */
function summarise(lines: RentalInvoiceLine[], typed: Record<number, string>) {
  let total = 0;
  const over = new Set<number>();
  for (const [key, raw] of Object.entries(typed)) {
    const index = Number(key);
    const amount = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(amount) || amount <= 0) continue;
    if (amount > Number(lines[index]?.rate ?? 0)) over.add(index);
    total += amount;
  }
  return { total, over };
}

interface RecordCreditNoteDialogProps {
  invoiceId: string;
  lines: RentalInvoiceLine[];
  onClose: () => void;
}

/** Record a credit note raised in Tally against this invoice: its number
 *  (optional), date, reason and the ex-GST credit per line. */
export function RecordCreditNoteDialog({
  invoiceId,
  lines,
  onClose,
}: RecordCreditNoteDialogProps) {
  const [cnNumber, setCnNumber] = useState("");
  const [cnDate, setCnDate] = useState(istTodayDateParam());
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState<Record<number, string>>({});
  const create = useCreateCreditNote(invoiceId);
  const { total, over } = summarise(lines, typed);
  const credited = Object.entries(typed).filter(([, raw]) => Number(raw) > 0);
  const canSubmit =
    reason.trim() !== "" &&
    cnDate !== "" &&
    credited.length > 0 &&
    over.size === 0;

  const submit = () =>
    create.mutate(
      {
        cn_number: cnNumber.trim() || null,
        cn_date: cnDate,
        reason: reason.trim(),
        lines: credited.map(([index, raw]) => ({
          line_index: Number(index),
          credit_amount: raw.trim(),
        })),
      },
      { onSuccess: onClose },
    );

  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={C.recordTitle}
      description={C.recordDescription}
      className="sm:max-w-2xl"
      isDirty={cnNumber !== "" || reason !== "" || credited.length > 0}
      footer={({ requestClose }) => (
        <>
          <Button
            variant="outline"
            onClick={requestClose}
            disabled={create.isPending}
          >
            {RC.cancel}
          </Button>
          <Button onClick={submit} disabled={!canSubmit || create.isPending}>
            {C.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="cn-number">{C.number}</Label>
            <Input
              id="cn-number"
              maxLength={50}
              value={cnNumber}
              onChange={(e) => setCnNumber(e.target.value)}
            />
            <Typography variant="helper" tone="muted">
              {C.cnNumberHelp}
            </Typography>
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="cn-date" required>
              {C.date}
            </Label>
            <DatePicker id="cn-date" value={cnDate} onChange={setCnDate} />
          </div>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="cn-reason" required>
            {C.reason}
          </Label>
          <Textarea
            id="cn-reason"
            rows={2}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="space-y-3 rounded-lg border border-border p-3">
          <Typography variant="body-strong">{C.lineHeading}</Typography>
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid min-w-0 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]"
            >
              <div className="min-w-0">
                <Typography
                  variant="body"
                  className="line-clamp-2 [overflow-wrap:anywhere]"
                >
                  {lineLabel(line)}
                </Typography>
                <Typography variant="helper" tone="muted">
                  {C.lineBilled(formatINR(Number(line.rate ?? 0)))}
                </Typography>
              </div>
              <div className="min-w-0 space-y-1">
                <Input
                  aria-label={lineLabel(line)}
                  inputMode="decimal"
                  value={typed[index] ?? ""}
                  aria-invalid={over.has(index)}
                  onChange={(e) =>
                    setTyped((prev) => ({ ...prev, [index]: e.target.value }))
                  }
                />
                {over.has(index) ? (
                  <Typography variant="helper" tone="danger">
                    {C.lineTooHigh}
                  </Typography>
                ) : null}
              </div>
            </div>
          ))}
          {total > 0 ? (
            <Typography variant="body-strong">
              {C.total(formatINR(total))}
            </Typography>
          ) : null}
        </div>
      </div>
      {create.error ? (
        <Typography variant="helper" tone="danger">
          {create.error instanceof Error
            ? create.error.message
            : String(create.error)}
        </Typography>
      ) : null}
    </OperationDialog>
  );
}
