import type { ReactNode } from "react";

import { AsyncSelect } from "@/components/ui/async-select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

import type { MoveStockPageState, TransferType } from "../../hooks/stock-transfer/useMoveStockPage";
import { useDestinationWarehouseOptions } from "../../hooks/stock-transfer/useDestinationWarehouseOptions";
import { RackBinLocationPicker } from "../shared/RackBinLocationPicker";
import { NOTES_MAX } from "./move-stock-helpers";
import { MOVE_STOCK_PAGE_STRINGS as P, STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";
import { TransferCarrierFields } from "./TransferCarrierFields";
import { CarrierField, ChallanField, ExpectedDeliveryField } from "./TransferDeliveryForm";

/** One band of the form card; bands are split by a hairline, as in the design. */
export function FormBand({ children }: { children: ReactNode }) {
  return <section className="space-y-4 border-b border-border px-6 py-5 last:border-b-0">{children}</section>;
}

/** Radio options laid out in a row. */
export function RadioRow<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (next: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as T)}
      className="flex flex-wrap items-center gap-x-10 gap-y-3"
    >
      {options.map((o) => (
        <label key={o.value} htmlFor={`${name}-${o.value}`} className="flex cursor-pointer items-center gap-2.5">
          <RadioGroupItem id={`${name}-${o.value}`} value={o.value} />
          <Typography variant="body-strong">{o.label}</Typography>
        </label>
      ))}
    </RadioGroup>
  );
}

const TRANSFER_TYPES = [
  { value: "internal", label: P.internal },
  { value: "external", label: P.external },
] as const satisfies readonly { value: TransferType; label: string }[];

/** Internal (rack to rack, here) or External (to another warehouse). */
export function TransferTypeBand({ p }: { p: MoveStockPageState }) {
  return (
    <FormBand>
      <div className="space-y-3">
        <Label required>{P.transferTypeLabel}</Label>
        <RadioRow name="mv-type" value={p.transferType} onChange={p.changeTransferType} options={TRANSFER_TYPES} />
      </div>
    </FormBand>
  );
}

/** From: picked here, or locked to the navbar's warehouse when it names one. */
function SourceField({ p }: { p: MoveStockPageState }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="mv-from" required>
        {P.fromLabel}
      </Label>
      <AsyncSelect<{ id: string; label: string }>
        id="mv-from"
        value={p.source.id ? { id: p.source.id, label: p.source.name } : null}
        onValueChange={(next) => p.changeSource(next?.id ?? "")}
        useOptions={p.source.useOptions}
        toLabel={(o) => o.label}
        placeholder={P.warehousePlaceholder}
        searchPlaceholder={P.warehouseSearch}
        clearable={false}
        disabled={p.source.isFixed}
        className="w-full"
      />
    </div>
  );
}

function ExternalDestination({ p }: { p: MoveStockPageState }) {
  const { move } = p;
  const useOptions = useDestinationWarehouseOptions(p.source.id);
  return (
    <div className="space-y-2">
      <Label htmlFor="mv-warehouse" required>
        {P.toLabel}
      </Label>
      <AsyncSelect<{ id: string; label: string }>
        id="mv-warehouse"
        value={move.isTransfer ? { id: move.destination.id, label: move.destination.name } : null}
        onValueChange={(next) => move.destination.change(next ? { id: next.id, name: next.label } : null)}
        useOptions={useOptions}
        toLabel={(o) => o.label}
        placeholder={P.warehousePlaceholder}
        searchPlaceholder={P.warehouseSearch}
        disabled={!p.source.id}
        loadOnOpen
        className="w-full"
      />
    </div>
  );
}

/** External: From | To | Carrier | Challan Number, then Expected Delivery and
 *  any carrier-specific fields. Internal: From | Rack / Pallet | Bin. */
export function DestinationBand({ p }: { p: MoveStockPageState }) {
  const { move } = p;
  if (p.transferType === "external") {
    return (
      <FormBand>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SourceField p={p} />
          <ExternalDestination p={p} />
          <CarrierField move={move} />
          <ChallanField move={move} label={P.challanLabel} />
          <ExpectedDeliveryField move={move} label={P.expectedDeliveryLabel} />
          <TransferCarrierFields move={move} />
        </div>
      </FormBand>
    );
  }
  return (
    <FormBand>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SourceField p={p} />
        <div className="sm:col-span-2">
          {/* Re-mounted per source warehouse so its rack / bin picks never go stale. */}
          <RackBinLocationPicker
            key={p.source.id}
            warehouseId={p.source.id}
            enabled={!!p.source.id}
            value={move.destination.locationId}
            onChange={move.destination.setLocationId}
            onPick={(d) => move.destination.setLocationLabel([d.rackName, d.binName].filter(Boolean).join(" / "))}
          />
        </div>
      </div>
    </FormBand>
  );
}

export function NoteBand({ p }: { p: MoveStockPageState }) {
  const { move } = p;
  return (
    <FormBand>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="mv-notes">{P.noteLabel}</Label>
          <Typography variant="helper" tone="muted">
            {S.notesCounter(move.notes.length, NOTES_MAX)}
          </Typography>
        </div>
        <Textarea
          id="mv-notes"
          maxLength={NOTES_MAX}
          placeholder={S.notesPlaceholder}
          value={move.notes}
          onChange={(e) => move.setNotes(e.target.value)}
        />
      </div>
    </FormBand>
  );
}

/** Footer left side: how many units, and where they will go. */
export function MoveStockFooterSummary({ p }: { p: MoveStockPageState }) {
  const { move } = p;
  const where =
    p.transferType === "external"
      ? move.destination.id
        ? P.readyExternal(move.destination.name)
        : P.needWarehouse
      : move.destination.locationId && move.destination.locationLabel
        ? P.readyInternal(move.destination.locationLabel)
        : P.needRack;
  return (
    <div>
      <Typography variant="body-strong">{P.unitsSelected(move.selection.selected.size)}</Typography>
      <Typography variant="helper" tone="muted">
        {where}
      </Typography>
    </div>
  );
}
