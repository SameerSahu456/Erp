import { useState } from "react";
import { X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { Typography } from "@/components/ui/typography";
import { Textarea } from "@/components/ui/textarea";

import { MI_NOTE_MAX_LENGTH } from "./returnable-lines";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import {
  type IssueRow,
  LINE_GRID,
  scannedVariantLabel,
  suggestedUnitPatch,
} from "./material-issue-form-helpers";
import { VariantScanSelect } from "./VariantScanSelect";
import { UnitSerialScanSelect } from "./UnitSerialScanSelect";
import { ScanAnyUnitSelect } from "./ScanAnyUnitSelect";
import { QtyCell } from "./QtyCell";

type PatchRow = (patch: Partial<IssueRow>) => void;

/** Which source line this row is for. A long description-based label collapses
 *  to one line with a Show more / Show less toggle. */
export function IssueRowLabel({ label }: { label: string }) {
  const [labelExpanded, setLabelExpanded] = useState(false);
  const labelIsLong = label.length > 80;
  return (
    <div className="border-b bg-muted/20 px-3 py-2">
      <Typography variant="body-strong" asChild>
        <span className={cn("block", !labelExpanded && "truncate")}>
          {label}
        </span>
      </Typography>
      {labelIsLong && (
        <button
          type="button"
          onClick={() => setLabelExpanded((v) => !v)}
          className="mt-0.5"
        >
          <Typography variant="caption" tone="primary">
            {labelExpanded ? S.form.lines.showLess : S.form.lines.showMore}
          </Typography>
        </button>
      )}
    </div>
  );
}

/** Danger strip under/over the row grid; `className` picks the border side. */
export function IssueRowErrorBanner({
  message,
  className,
}: {
  message: string;
  className: string;
}) {
  return (
    <div
      className={cn("border-destructive/30 bg-destructive-soft px-3 py-1.5", className)}
    >
      <Typography variant="helper" tone="danger" asChild>
        <span className="inline-flex items-center gap-1.5">
          <XIcon className="size-3.5 shrink-0" />
          {message}
        </span>
      </Typography>
    </div>
  );
}

interface IssueRowFieldsProps {
  row: IssueRow;
  maxQty: number;
  warehouseId: string;
  serialDuplicate: boolean;
  selectedSerials?: Set<string>;
  onPatch: PatchRow;
  onRemove: () => void;
}

/** Part | Serial | Qty | ✕ */
export function IssueRowFields({
  row,
  maxQty,
  warehouseId,
  serialDuplicate,
  selectedSerials,
  onPatch,
  onRemove,
}: IssueRowFieldsProps) {
  const variantId = row.variantOption?.id ?? "";
  const locked = row.isTracking || row.serial.trim().length > 0;
  return (
    <div className={cn(LINE_GRID, "p-3")}>
      <div className="min-w-0">
        <VariantScanSelect
          value={row.variantOption}
          warehouseId={warehouseId}
          onPick={(opt, isTracking) =>
            onPatch({ variantOption: opt, isTracking, serial: "" })
          }
          onClear={() =>
            onPatch({ variantOption: null, isTracking: false, serial: "" })
          }
        />
      </div>
      <div
        className={cn(
          "min-w-0 rounded-md",
          serialDuplicate && "ring-2 ring-destructive",
        )}
      >
        {row.variantOption ? (
          <UnitSerialScanSelect
            warehouseId={warehouseId}
            variantId={variantId}
            serial={row.serial}
            selectedSerials={selectedSerials}
            onPicked={(unit) =>
              onPatch(
                unit.part_variant_id === variantId
                  ? { serial: unit.internal_serial }
                  : {
                      variantOption: {
                        id: unit.part_variant_id,
                        label: scannedVariantLabel(unit),
                      },
                      isTracking: !!unit.is_tracking,
                      serial: unit.internal_serial,
                      quantity: 1,
                    },
              )
            }
            onClear={() => onPatch({ serial: "" })}
          />
        ) : (
          // No part yet: scanning the unit fills the part and serial in together.
          <ScanAnyUnitSelect
            warehouseId={warehouseId}
            onScanned={(unit) => onPatch({ ...unit, quantity: 1 })}
          />
        )}
      </div>
      <div className="flex h-9 items-center justify-end">
        {row.variantOption ? (
          <QtyCell
            locked={locked}
            quantity={row.quantity}
            max={maxQty}
            onChange={(quantity) =>
              onPatch({ quantity: Math.min(maxQty, quantity) })
            }
          />
        ) : (
          <Typography variant="body" tone="muted" numeric asChild>
            <span>—</span>
          </Typography>
        )}
      </div>
      <div className="flex h-9 items-center justify-end">
        <button
          type="button"
          onClick={onRemove}
          aria-label={S.form.lines.remove}
          className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** A replacement line names the unit to issue: the customer's own unit,
 *  required (repair) or offered first (same part, returned and repaired). */
export function IssueRowSuggestedUnit({
  row,
  warehouseId,
  onPatch,
}: {
  row: IssueRow;
  warehouseId: string;
  onPatch: PatchRow;
}) {
  const unit = row.suggestedUnit;
  if (!unit) return null;
  const elsewhere = !!unit.warehouseId && !!warehouseId && unit.warehouseId !== warehouseId;
  const chosen = row.serial.trim() === unit.serial;
  const message = elsewhere
    ? S.form.lines.suggestedUnitElsewhere(unit.serial)
    : unit.mustIssue
      ? S.form.lines.mustIssueUnit(unit.serial)
      : S.form.lines.suggestedUnit(unit.serial);
  return (
    <div className="flex items-center justify-between gap-3 border-b bg-info-soft px-3 py-1.5">
      <Typography variant="helper" tone={!chosen && unit.mustIssue ? "warning" : "muted"}>
        {message}
      </Typography>
      {!chosen && !elsewhere && (
        <button
          type="button"
          onClick={() => onPatch(suggestedUnitPatch(unit, row))}
          className="shrink-0"
        >
          <Typography variant="caption" tone="primary">
            {S.form.lines.useSuggestedUnit}
          </Typography>
        </button>
      )}
    </div>
  );
}

/** Substitute part picked: ask why. */
export function IssueRowSubstitution({
  reason,
  onPatch,
}: {
  reason: string;
  onPatch: PatchRow;
}) {
  return (
    <div className="space-y-1 border-t px-3 py-2">
      <Typography variant="helper" tone="warning">
        {S.form.lines.substituteHint}
      </Typography>
      <Textarea
        value={reason}
        onChange={(e) => onPatch({ substitutionReason: e.target.value })}
        placeholder={S.form.lines.substitutionReasonPlaceholder}
        rows={2}
        maxLength={MI_NOTE_MAX_LENGTH}
      />
      <div className="flex justify-end">
        <Typography variant="helper" tone="muted">
          {S.charCount(reason.length, MI_NOTE_MAX_LENGTH)}
        </Typography>
      </div>
    </div>
  );
}
