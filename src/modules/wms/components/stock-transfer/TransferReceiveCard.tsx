import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { TableSearchInput } from "@/components/common/tables/TableSearchInput";

import type { TransferItemResponse } from "../../api";
import type { TransferReceiveState } from "../../hooks/stock-transfer/useTransferReceive";
import { TRANSFER_LINE_STATUS_LABEL } from "../../constants/warehouse-transfer-status";
import { OperationDialog } from "../shared/OperationDialog";
import { RackBinLocationPicker } from "../shared/RackBinLocationPicker";
import { STOCK_TRANSFER_STRINGS, TRANSFERS_PAGE_STRINGS as S } from "./stock-transfer.strings";
import { filterTransferItems, IN_FLIGHT, unplacedFirst } from "./transfer-detail-helpers";
import { PickLocationTooltip, TransferReceiveTable } from "./TransferReceiveTable";
import { TransferNoMatch } from "./TransferNoMatch";

const ALL = "__all__";
// "pending" is a draft-only line state: a draft's units are all pending and a sent
// transfer has none, so filtering by it never narrows the list.
const FILTER_STATUSES = Object.entries(TRANSFER_LINE_STATUS_LABEL).filter(([value]) => value !== "pending");

interface ReceiveCardProps {
  receive: TransferReceiveState;
  items: TransferItemResponse[];
  toWarehouseId: string;
}

/** Grey bar: one rack / bin for every unit still in transit. */
function PlaceAllBar({ receive, outstanding, toWarehouseId }: ReceiveCardProps & { outstanding: TransferItemResponse[] }) {
  const { bulkLocationId, isPending } = receive;
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/50 p-3.5">
      {/* Inline: Place all sits right after the rack field, or after the bin once it shows. */}
      <div className="min-w-0">
        <RackBinLocationPicker inline warehouseId={toWarehouseId} enabled value={bulkLocationId} onChange={receive.setBulkLocationId} />
      </div>
      <PickLocationTooltip show={!bulkLocationId && !isPending}>
        <Button disabled={!bulkLocationId || isPending} onClick={() => void receive.placeAll(outstanding)}>
          {isPending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
          {S.placeAllShort}
        </Button>
      </PickLocationTooltip>
    </div>
  );
}

/** Ticked rows: place them together, or send them to inspection / back / lost. */
function SelectionActions({ receive, items }: { receive: TransferReceiveState; items: TransferItemResponse[] }) {
  const picked = items.filter((i) => receive.selected.has(i.id));
  const busy = receive.isPending;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={busy} onClick={() => receive.setAssignOpen(true)}>
        {S.placeAllShort}
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={receive.flagSelected}>
        {S.inspection}
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={receive.returnSelected}>
        {S.returnToSource}
      </Button>
      {receive.canMarkLost && (
        <Button size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={() => receive.confirmLost(picked)}>
          {S.markLost}
        </Button>
      )}
    </div>
  );
}

function StatusFilter({ receive }: { receive: TransferReceiveState }) {
  return (
    <Select value={receive.status || ALL} onValueChange={(v) => receive.setStatus(!v || v === ALL ? "" : String(v))}>
      <SelectTrigger className="h-9 w-44" clearable={!!receive.status} onClear={() => receive.setStatus("")}>
        <SelectValue>{receive.status ? TRANSFER_LINE_STATUS_LABEL[receive.status] : S.statusAll}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{S.statusAll}</SelectItem>
        {FILTER_STATUSES.map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Pick one location for the ticked units, then place them all there. */
function AssignLocationsDialog({ receive, toWarehouseId }: { receive: TransferReceiveState; toWarehouseId: string }) {
  const [locationId, setLocationId] = useState("");
  const count = receive.selectedIds.length;
  return (
    <OperationDialog
      open={receive.assignOpen}
      onOpenChange={(open) => {
        if (!open) setLocationId("");
        receive.setAssignOpen(open);
      }}
      title={S.assignTitle}
      description={S.assignDescription(count)}
      className="sm:max-w-2xl"
      isDirty={!!locationId}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {STOCK_TRANSFER_STRINGS.cancel}
          </Button>
          <Button disabled={!locationId || receive.isPending} onClick={() => void receive.placeSelected(locationId)}>
            {receive.isPending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
            {S.assign}
          </Button>
        </>
      )}
    >
      {/* Re-mounted per open so its rack / bin picks start empty. */}
      {receive.assignOpen && (
        <RackBinLocationPicker warehouseId={toWarehouseId} enabled value={locationId} onChange={setLocationId} />
      )}
    </OperationDialog>
  );
}

/** Receive units: the place-all bar, search + status filter, the units table,
 *  and the bulk actions that appear once rows are ticked. */
export function TransferReceiveCard({ receive, items, toWarehouseId }: ReceiveCardProps) {
  const outstanding = items.filter((i) => i.status === IN_FLIGHT);
  const shown = unplacedFirst(filterTransferItems(items, receive.search, receive.status));
  const selectableIds = receive.canSettle ? shown.filter((i) => i.status === IN_FLIGHT).map((i) => i.id) : [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle>{S.receiveTitle}</CardTitle>
          <Typography variant="helper" tone="muted">
            {S.receiveHint}
          </Typography>
        </div>
        {outstanding.length > 0 && (
          <Badge variant="grey-soft" className="shrink-0">
            {S.unitsToReceive(outstanding.length)}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {outstanding.length > 0 && receive.canSettle && (
          <PlaceAllBar receive={receive} items={items} outstanding={outstanding} toWarehouseId={toWarehouseId} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <TableSearchInput
              value={receive.search}
              onChange={receive.setSearch}
              placeholder={S.searchUnits}
              className="w-full sm:w-80"
            />
            <StatusFilter receive={receive} />
          </div>
          {receive.selected.size > 0 && <SelectionActions receive={receive} items={items} />}
        </div>
        {shown.length > 0 ? (
          <TransferReceiveTable items={shown} selectableIds={selectableIds} receive={receive} toWarehouseId={toWarehouseId} />
        ) : (
          <TransferNoMatch receive={receive} />
        )}
      </CardContent>
      <AssignLocationsDialog receive={receive} toWarehouseId={toWarehouseId} />
    </Card>
  );
}
