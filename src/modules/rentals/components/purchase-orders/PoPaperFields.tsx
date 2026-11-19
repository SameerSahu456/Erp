import { FileCheck2, Paperclip } from "lucide-react";

import { DatePicker } from "@/components/common/pickers/DatePicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";

import { PO_DOCUMENT } from "../../constants/billing";
import type { PoPaper } from "../../lib/poPaper";
import { PoField } from "./PoDialogShell";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

const P = S.paper;

interface PoPaperFieldsProps {
  value: PoPaper;
  onChange: (next: PoPaper) => void;
  /** Prefix for the field ids — two forms can sit on one page. */
  idPrefix: string;
  disabled?: boolean;
  /** Offer "PO not available yet". Off where the PO has just arrived. */
  allowAwaiting?: boolean;
  numberLabel?: string;
}

/** The customer's PO as the user has it: its number, date and document — all
 *  three mandatory — or, when it has not been issued yet, a tick that lets the
 *  order carry on as Awaiting PO, unbilled until they are entered. */
export function PoPaperFields({
  value,
  onChange,
  idPrefix,
  disabled,
  allowAwaiting = true,
  numberLabel = P.number,
}: PoPaperFieldsProps) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="space-y-4">
      {allowAwaiting ? (
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={id("unavailable")} className="flex items-center gap-2">
            <Checkbox
              id={id("unavailable")}
              checked={!value.available}
              onCheckedChange={(checked) => onChange({ ...value, available: checked !== true })}
              disabled={disabled}
            />
            <Typography variant="body">{P.unavailable}</Typography>
          </label>
          <Typography variant="helper" tone="muted">
            {P.unavailableHelp}
          </Typography>
        </div>
      ) : null}
      {value.available ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <PoField label={numberLabel} htmlFor={id("number")} required>
            <Input
              id={id("number")}
              maxLength={50}
              value={value.poNumber}
              onChange={(e) => onChange({ ...value, poNumber: e.target.value })}
              disabled={disabled}
            />
          </PoField>
          <PoField label={P.date} htmlFor={id("date")} required>
            <DatePicker
              id={id("date")}
              value={value.poDate}
              onChange={(poDate) => onChange({ ...value, poDate })}
              disabled={disabled}
            />
          </PoField>
          <div className="sm:col-span-2">
            <PoFilePicker
              id={id("file")}
              file={value.file}
              onChange={(file) => onChange({ ...value, file })}
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface PoFilePickerProps {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

/** Pick the PO document. Uploaded after the PO row exists, by the save. */
function PoFilePicker({ id, file, onChange, disabled }: PoFilePickerProps) {
  return (
    <PoField label={P.document} htmlFor={id} required help={P.documentHelp}>
      <div className="flex min-w-0 items-center gap-2">
        <label className="inline-flex shrink-0">
          <input
            id={id}
            type="file"
            accept={PO_DOCUMENT.accept}
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              // Cleared so re-picking the same file still fires a change.
              e.target.value = "";
              if (picked) onChange(picked);
            }}
          />
          <Button variant="outline" size="sm" render={<span />} disabled={disabled}>
            <Paperclip className="size-4" />
            {file ? P.replaceDocument : P.chooseDocument}
          </Button>
        </label>
        {file ? (
          <span className="flex min-w-0 flex-1 items-center gap-1">
            <FileCheck2 className="size-4 shrink-0 text-success" />
            <Typography variant="helper" truncate className="min-w-0 flex-1">
              {file.name}
            </Typography>
          </span>
        ) : null}
      </div>
    </PoField>
  );
}
