import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import { TruncatedText } from "@/components/common/display/TruncatedText";

import { formatIST } from "@/shared/lib/date";
import { EMPTY_VALUE } from "@/shared/constants";
import type { ReturnableUnit } from "../../api";
import {
  PURCHASE_RETURN_STRINGS as S,
  RETURN_REASON_CODES,
  RETURN_REASON_LABELS,
  RETURNABLE_UNIT_STATUS_LABELS,
  RETURNABLE_UNIT_STATUS_VARIANT,
  type ReturnReasonCode,
} from "./purchase-returns.strings";
import type { ReturnSelection } from "./return-selection";

/** One unit row (+ its reason/notes row once selected). Rendered inside the
 *  table's TooltipProvider. */
export function ReturnableUnitRows({
  unit,
  selection,
  selected,
  blocked,
  onToggle,
  onChangeReason,
  onChangeNotes,
}: {
  unit: ReturnableUnit;
  selection: ReturnSelection | undefined;
  selected: boolean;
  blocked: boolean;
  onToggle: (unit: ReturnableUnit) => void;
  onChangeReason: (stockItemId: string, reasonCode: ReturnReasonCode) => void;
  onChangeNotes: (stockItemId: string, notes: string) => void;
}) {
  const mutedCell = blocked ? "text-muted-foreground" : undefined;
  const checkbox = (
    <Checkbox
      checked={selected}
      onCheckedChange={() => onToggle(unit)}
      aria-label={S.table.selectUnitAria(unit.internal_serial)}
    />
  );
  const statusBadge = (
    <StatusBadge variant={RETURNABLE_UNIT_STATUS_VARIANT[unit.status] ?? "neutral"}>
      {RETURNABLE_UNIT_STATUS_LABELS[unit.status] ?? unit.status}
    </StatusBadge>
  );

  return (
    <>
      <TableRow className={cn(blocked && "opacity-60")}>
        {/* A unit that can't be returned gets no checkbox at all; why it's
            blocked shows on its Status badge. */}
        <TableCell className="w-10">{blocked ? null : checkbox}</TableCell>
        <TableCell className={cn("font-medium", mutedCell)}>
          <TruncatedSerial value={unit.internal_serial} mono={false} />
        </TableCell>
        <TableCell className={mutedCell}>
          <TruncatedSerial value={unit.manufacturer_serial} />
        </TableCell>
        {/* Past 50 characters each name truncates, full value on hover. */}
        <TableCell className={mutedCell}>
          <TruncatedText
            value={unit.part_number || EMPTY_VALUE}
            className="max-w-[50ch]"
          />
        </TableCell>
        <TableCell className={mutedCell}>
          <TruncatedText
            value={unit.part_variant_name}
            className="max-w-[50ch]"
          />
        </TableCell>
        <TableCell className={mutedCell}>{unit.grn_batch_number}</TableCell>
        <TableCell className={`${mutedCell} text-right tabular-nums`}>
          {formatIST(unit.received_at)}
        </TableCell>
        <TableCell className={mutedCell}>
          {blocked && unit.blocked_reason ? (
            <Tooltip>
              <TooltipTrigger
                render={<span className="inline-flex cursor-default" />}
              >
                {statusBadge}
              </TooltipTrigger>
              <TooltipContent>
                {S.blockedHint(unit.blocked_reason)}
              </TooltipContent>
            </Tooltip>
          ) : (
            statusBadge
          )}
        </TableCell>
      </TableRow>

      {selected && selection && (
        <UnitSelectionRow
          unit={unit}
          selection={selection}
          onChangeReason={onChangeReason}
          onChangeNotes={onChangeNotes}
        />
      )}
    </>
  );
}

/** Reason + notes editor under a selected unit. */
function UnitSelectionRow({
  unit,
  selection,
  onChangeReason,
  onChangeNotes,
}: {
  unit: ReturnableUnit;
  selection: ReturnSelection;
  onChangeReason: (stockItemId: string, reasonCode: ReturnReasonCode) => void;
  onChangeNotes: (stockItemId: string, notes: string) => void;
}) {
  return (
    <TableRow className="bg-muted/40 hover:bg-muted/40">
      <TableCell />
      <TableCell colSpan={7} className="py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selection.reasonCode}
            onValueChange={(v) =>
              v && onChangeReason(unit.stock_item_id, v as ReturnReasonCode)
            }
          >
            <SelectTrigger className="h-9 w-56" clearable={false}>
              {/* Show the reason label, not its raw code (PAGE-UI §7.2). */}
              <SelectValue placeholder={S.table.reasonPlaceholder}>
                {selection.reasonCode
                  ? RETURN_REASON_LABELS[selection.reasonCode]
                  : S.table.reasonPlaceholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RETURN_REASON_CODES.map((code) => (
                <SelectItem key={code} value={code}>
                  {RETURN_REASON_LABELS[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={selection.notes}
            onChange={(e) =>
              onChangeNotes(unit.stock_item_id, e.target.value)
            }
            placeholder={S.table.notesPlaceholder}
            className="h-9 min-w-0 flex-1"
            aria-invalid={
              selection.reasonCode === "other" &&
              selection.notes.trim() === ""
            }
          />

          {selection.edited && (
            // Styled tooltip, never a native `title=` (§0.14). Rendered
            // inside the table's TooltipProvider (like the blocked-row one).
            <Tooltip>
              <TooltipTrigger
                render={<span className="inline-flex shrink-0 cursor-default" />}
              >
                <Typography variant="caption" tone="warning">
                  {S.table.modifiedMarker}
                </Typography>
              </TooltipTrigger>
              <TooltipContent>{S.table.modifiedTitle}</TooltipContent>
            </Tooltip>
          )}

          {selection.reasonCode === "other" &&
            selection.notes.trim() === "" && (
              <Typography
                variant="caption"
                tone="danger"
                className="shrink-0"
              >
                {S.otherNeedsNotes}
              </Typography>
            )}
        </div>
      </TableCell>
    </TableRow>
  );
}
