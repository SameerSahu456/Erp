import { Typography } from "@/components/ui/typography";
import { RackBinLocationPicker } from "@modules/wms";

import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

/** Optional rack/bin for a line. Always shows the WMS rack→bin cascade as two
 *  selects — Rack/Pallet, plus a Bin select that appears only when the chosen
 *  rack has bins (a direct-storage rack/pallet is terminal). Each select carries
 *  its own label, so no wrapping group label is needed. */
export function LineLocationField({
  id,
  warehouseId,
  location,
  disabled,
  onChange,
}: {
  id: string;
  warehouseId: string;
  location: { id: string; label: string };
  disabled: boolean;
  onChange: (id: string, label: string) => void;
}) {
  if (!warehouseId) {
    return (
      <Typography variant="helper" tone="muted">
        {S.line.pickWarehouseFirst}
      </Typography>
    );
  }
  return (
    <div id={id} className="min-w-0">
      <RackBinLocationPicker
        key={warehouseId}
        warehouseId={warehouseId}
        enabled={!disabled}
        value={location.id}
        onChange={(picked) => {
          if (!picked) onChange("", "");
        }}
        onPick={({ locationId, rackName, binName }) => onChange(locationId, S.line.rackBin(rackName, binName))}
      />
    </div>
  );
}
