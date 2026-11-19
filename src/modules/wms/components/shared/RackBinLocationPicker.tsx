import { useMemo, useState } from "react";

import { AsyncSelect } from "@/components/ui/async-select";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type { BinOption, RackOption } from "../../api";
import {
  makeUseBinOptions,
  makeUseRackOptions,
} from "../../hooks/warehouses/useWarehouseLocations";
import { LOCATION_PICKER_STRINGS as S } from "./location-picker.strings";

const FIELD_WIDTH_INLINE = "w-full sm:w-72";

interface Props {
  warehouseId: string;
  /** Gate the fetch to when the parent dialog is open. */
  enabled: boolean;
  /** Currently chosen leaf location id — a direct-storage rack (pallet) or a
   *  bin. Empty while nothing terminal is picked yet. */
  value: string;
  onChange: (locationId: string) => void;
  /** Optional detail callback fired alongside `onChange` when a terminal
   *  location is picked, so callers can show the rack + bin split (a pallet
   *  rack reports `binName: null`). Cleared with an empty id. */
  onPick?: (detail: { locationId: string; rackName: string; binName: string | null }) => void;
  /** Drop the field labels — for a table row whose column headers name them. */
  hideLabels?: boolean;
  /** Fixed-width fields side by side, so whatever follows the picker sits right
   *  after the last visible field instead of after an empty bin column. */
  inline?: boolean;
}

/** Trailing occupancy / tag suffix for a rack option row. `is_full` comes from
 *  the backend (rack-options); a full rack is disabled in the dropdown. */
function RackSuffix({ r }: { r: RackOption }) {
  const full = r.is_full;
  const palletTag = r.can_store_stock ? S.rackPalletTag : null;
  const tag = full ? S.fullTag : palletTag;
  const parts = [
    tag,
    // Only a direct-storage rack/pallet carries meaningful own occupancy; a
    // rack-with-bins reports it per bin in the second step. `capacity || null`
    // maps the rollup's 0 (uncapped) back to the "N in use" wording.
    r.can_store_stock ? S.occupancy(r.current_occupancy, r.capacity || null) : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <Typography variant="caption" tone="muted" asChild>
      <span className="shrink-0">{parts.join(" · ")}</span>
    </Typography>
  );
}

/** Trailing occupancy / tag suffix for a bin option row. `is_full` comes from
 *  the backend (bin-options); a full bin is disabled in the dropdown. */
function BinSuffix({ b }: { b: BinOption }) {
  const full = b.is_full;
  const occ = S.occupancy(b.current_occupancy, b.capacity);
  return (
    <Typography variant="caption" tone="muted" asChild>
      <span className="shrink-0">{full ? `${occ} · ${S.fullTag}` : occ}</span>
    </Typography>
  );
}

// Two-step destination picker mirroring the warehouse model. The first dropdown
// searches every top-level location — racks AND pallets, both pickable. The
// second appears only when the picked location is a rack-with-bins; a
// direct-storage rack / pallet is terminal. The chosen leaf id is stored as
// location_id. Both dropdowns query the backend as the operator types
// (rack-options / bin-options), so a warehouse with many racks/bins searches
// instead of loading them all. Full locations still appear (with a "Full" tag,
// sorted last by the server) and stay selectable; the backend rejects an
// assignment to a full slot.
export function RackBinLocationPicker({
  warehouseId,
  enabled,
  value,
  onChange,
  onPick,
  hideLabels = false,
  inline = false,
}: Props) {
  // Labels + the cascade come from the operator's picks (the search results),
  // not a full tree. Cleared when the picker unmounts on form reset, so they
  // never go stale. `value` starts empty in every caller and is driven by the
  // picks below.
  const [pickedRack, setPickedRack] = useState<RackOption | null>(null);
  const [pickedBin, setPickedBin] = useState<BinOption | null>(null);

  const useRackOptions = useMemo(() => makeUseRackOptions(warehouseId), [warehouseId]);
  const useBinOptions = useMemo(
    () => makeUseBinOptions(pickedRack?.id ?? ""),
    [pickedRack?.id],
  );

  // A rack-with-bins needs the second step; a direct rack / pallet is terminal.
  const needsBin = !!pickedRack && !pickedRack.can_store_stock;

  const onRackPick = (r: RackOption) => {
    setPickedRack(r);
    setPickedBin(null);
    if (r.can_store_stock) {
      // Terminal — the rack/pallet is itself the slot.
      onChange(r.id);
      onPick?.({ locationId: r.id, rackName: r.name, binName: null });
    } else {
      // Rack-with-bins: hold the leaf empty until a bin is picked.
      onChange("");
    }
  };

  const onRackClear = () => {
    setPickedRack(null);
    setPickedBin(null);
    onChange("");
  };

  const onBinPick = (b: BinOption) => {
    setPickedBin(b);
    onChange(b.id);
    if (pickedRack) {
      onPick?.({ locationId: b.id, rackName: pickedRack.name, binName: b.name });
    }
  };

  const rackValue = pickedRack ? { id: pickedRack.id, label: pickedRack.name } : null;
  // A terminal rack IS the leaf `value`; a bin's leaf is the bin. Keep the chip
  // in sync with the committed value so an external reset (value → "") clears it.
  const binValue =
    pickedBin && value === pickedBin.id ? { id: pickedBin.id, label: pickedBin.name } : null;

  return (
    <div className="min-w-0 space-y-2">
      <div className={inline ? "flex flex-wrap items-end gap-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
        {/* Field 1 — Rack / Pallet (searchable) */}
        <div className={cn("min-w-0 space-y-1.5", inline && FIELD_WIDTH_INLINE)}>
          {!hideLabels && <Label>{S.rackLabel}</Label>}
          <AsyncSelect<RackOption>
            value={rackValue}
            onValueChange={(v) => {
              if (!v) onRackClear();
            }}
            onItemPick={onRackPick}
            useOptions={useRackOptions}
            isItemDisabled={(r) => r.is_full}
            toLabel={(r) => r.name}
            renderItem={(r) => (
              <span className="flex w-full items-center justify-between gap-2">
                <span className="min-w-0 truncate">{r.name}</span>
                <RackSuffix r={r} />
              </span>
            )}
            placeholder={S.rackPlaceholder}
            searchPlaceholder={S.rackSearchPlaceholder}
            disabled={!enabled}
            loadOnOpen
            className="w-full"
          />
        </div>

        {/* Field 2 — Bin of the selected rack. Shown only for a rack-with-bins. */}
        {needsBin && pickedRack && (
          <div className={cn("min-w-0 space-y-1.5", inline && FIELD_WIDTH_INLINE)}>
            {!hideLabels && <Label>{S.binLabel}</Label>}
            <AsyncSelect<BinOption>
              value={binValue}
              onValueChange={(v) => {
                if (!v) {
                  setPickedBin(null);
                  onChange("");
                }
              }}
              onItemPick={onBinPick}
              useOptions={useBinOptions}
              isItemDisabled={(b) => b.is_full}
              toLabel={(b) => b.name}
              renderItem={(b) => (
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{b.name}</span>
                  <BinSuffix b={b} />
                </span>
              )}
              placeholder={S.binPlaceholder}
              searchPlaceholder={S.binSearchPlaceholder}
              loadOnOpen
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
