import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { EntityRef } from "@/components/common/display/EntityRef";
import { EMPTY_VALUE } from "@/shared/constants";

import type { TransferItemResponse } from "../../api";
import type { TransferReceiveState } from "../../hooks/stock-transfer/useTransferReceive";
import { CONDITION_VARIANT, formatCondition } from "../../constants/condition";
import {
  TRANSFER_LINE_STATUS_LABEL,
  TRANSFER_LINE_STATUS_VARIANT,
} from "../../constants/warehouse-transfer-status";
import { RackBinLocationPicker } from "../shared/RackBinLocationPicker";
import { TRANSFERS_PAGE_STRINGS as S } from "./stock-transfer.strings";
import { IN_FLIGHT } from "./transfer-detail-helpers";

/** Disabled buttons swallow pointer events — wrap the trigger in a span so the
 *  "pick a location first" why still shows (§0.9). */
export function PickLocationTooltip({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>{children}</TooltipTrigger>
        {show ? <TooltipContent>{S.pickLocationFirst}</TooltipContent> : null}
      </Tooltip>
    </TooltipProvider>
  );
}

/** ⋯ menu: Inspection, Return to source and (with the grant) Mark lost. */
function RowMenu({ item, receive }: { item: TransferItemResponse; receive: TransferReceiveState }) {
  const serial = item.internal_serial ?? item.stock_item_id;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={S.rowActionsAria(serial)}
        disabled={receive.isPending}
        className="flex size-8 items-center justify-center rounded-md hover:bg-accent/50"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => receive.flagUnit(item.id)}>{S.inspection}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => receive.returnToSource(item.id)}>{S.returnToSource}</DropdownMenuItem>
        {receive.canMarkLost && (
          <DropdownMenuItem variant="destructive" onClick={() => receive.confirmLost([item])}>
            {S.markLost}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type RowProps = { item: TransferItemResponse; receive: TransferReceiveState; toWarehouseId: string };

// Header label + fixed width; Part / Variant takes the space left over.
const COLUMNS: [string, string][] = [
  [S.colSerialNumber, "w-40"],
  [S.colPartVariant, ""],
  [S.colStatus, "w-40"],
  [S.colDestRack, "w-56"],
  [S.colDestBin, "w-48"],
  [S.colActions, "w-32"],
];

function SerialCell({ item }: { item: TransferItemResponse }) {
  return (
    <TableCell>
      {/* Opens the device page; double click copies the serial. */}
      <Typography variant="body-strong" tone="inherit" className="block max-w-full truncate" asChild>
        <EntityRef kind="device" id={item.stock_item_id} value={item.internal_serial ?? item.stock_item_id} />
      </Typography>
      {item.manufacturer_serial && (
        <TruncatedText value={item.manufacturer_serial} className="max-w-full text-muted-foreground" />
      )}
    </TableCell>
  );
}

function PartCell({ item }: { item: TransferItemResponse }) {
  return (
    <TableCell className="max-w-64">
      <div className="flex min-w-0 items-center gap-1.5">
        <TruncatedText value={item.part_name ?? item.part_number ?? EMPTY_VALUE} className="max-w-full" />
        {item.condition && (
          <StatusBadge variant={CONDITION_VARIANT[item.condition] ?? "neutral"}>
            {formatCondition(item.condition)}
          </StatusBadge>
        )}
      </div>
      {/* Part name above, variant name below; the SKU is not shown here. */}
      <TruncatedText value={item.variant_name ?? EMPTY_VALUE} className="max-w-full text-muted-foreground" />
    </TableCell>
  );
}

function StatusCell({ item }: { item: TransferItemResponse }) {
  return (
    <TableCell>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge variant={TRANSFER_LINE_STATUS_VARIANT[item.status] ?? "neutral"}>
          {TRANSFER_LINE_STATUS_LABEL[item.status] ?? item.status}
        </StatusBadge>
        {item.flagged_for_inspection && <StatusBadge variant="warning">{S.flag}</StatusBadge>}
      </div>
    </TableCell>
  );
}

/** Rack + bin pickers spanning the two destination columns, then Place and ⋯. */
function ActionCells({ item, receive, toWarehouseId }: RowProps) {
  const location = receive.locationForRow(item.id);
  return (
    <>
      <TableCell colSpan={2} className="min-w-[26rem]">
        <RackBinLocationPicker
          hideLabels
          warehouseId={toWarehouseId}
          enabled
          value={receive.rowLocations[item.id] ?? ""}
          onChange={(loc) => receive.setRowLocation(item.id, loc)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <PickLocationTooltip show={!location && !receive.isPending}>
            <Button size="sm" disabled={!location || receive.isPending} onClick={() => receive.placeUnit(item.id)}>
              {S.place}
            </Button>
          </PickLocationTooltip>
          <RowMenu item={item} receive={receive} />
        </div>
      </TableCell>
    </>
  );
}

/** Where a settled unit was put away: a bin shows its rack + bin, a rack or
 *  pallet only itself. "—" until the unit is placed. */
function PlacedLocationCells({ item }: { item: TransferItemResponse }) {
  const inBin = !!item.to_parent_location_name;
  return (
    <>
      <TableCell>
        <TruncatedText
          value={(inBin ? item.to_parent_location_name : item.to_location_name) ?? EMPTY_VALUE}
          className="max-w-full"
        />
      </TableCell>
      <TableCell>
        <TruncatedText value={(inBin && item.to_location_name) || EMPTY_VALUE} className="max-w-full" />
      </TableCell>
    </>
  );
}

function UnitRow({ item, receive, toWarehouseId }: RowProps) {
  // Only units still on the road can be settled.
  const actionable = item.status === IN_FLIGHT && receive.canSettle;
  const ticked = receive.selected.has(item.id);
  return (
    <TableRow data-state={ticked ? "selected" : undefined}>
      <TableCell className="w-10">
        {actionable && (
          <Checkbox checked={ticked} onCheckedChange={() => receive.toggle(item.id)} aria-label={item.internal_serial ?? item.id} />
        )}
      </TableCell>
      <SerialCell item={item} />
      <PartCell item={item} />
      <StatusCell item={item} />
      {actionable ? (
        <ActionCells item={item} receive={receive} toWarehouseId={toWarehouseId} />
      ) : (
        <>
          <PlacedLocationCells item={item} />
          <TableCell>{EMPTY_VALUE}</TableCell>
        </>
      )}
    </TableRow>
  );
}

/** Every unit on the transfer; in-transit rows carry pickers and actions. */
export function TransferReceiveTable({
  items,
  selectableIds,
  receive,
  toWarehouseId,
}: {
  items: TransferItemResponse[];
  /** The in-transit units in view — what the header checkbox ticks. */
  selectableIds: string[];
  receive: TransferReceiveState;
  toWarehouseId: string;
}) {
  const allTicked = selectableIds.length > 0 && selectableIds.every((id) => receive.selected.has(id));
  return (
    // A wide 2-D table: it scrolls inside its own box (§8.7), never the page.
    // `[&>div]:overflow-visible` turns off the shared Table's own overflow-x
    // wrapper so this div is the only scroll box and the sticky header holds.
    <div className="max-h-[36rem] overflow-auto rounded-lg border border-border [&>div]:overflow-visible">
      {/* Fixed column widths: a search / status filter showing one row can't
          reshape the columns, so the table keeps one layout before, during and
          after filtering. Rack + Bin together fit the row's 26rem picker. */}
      <Table className="min-w-[68rem] table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              {selectableIds.length > 0 && (
                <Checkbox
                  checked={allTicked}
                  onCheckedChange={() => receive.setAll(selectableIds, !allTicked)}
                  aria-label={S.placeAllShort}
                />
              )}
            </TableHead>
            {COLUMNS.map(([h, width]) => (
              <TableHead key={h} className={width}>
                <Typography variant="badge" tone="muted">
                  {h}
                </Typography>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <UnitRow key={item.id} item={item} receive={receive} toWarehouseId={toWarehouseId} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
