import { useFormContext, useWatch } from "react-hook-form";

import { AsyncSelect } from "@/components/ui/async-select";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

import {
  useRemovableUnitOptions,
  type RemovableUnitOption,
} from "../../hooks/stock-adjustments/useRemovableUnitOptions";
import { adjustmentItemLabel } from "../../lib/stock-adjustment-labels";
import type { StockAdjustmentForm } from "../../lib/stock-adjustment-form";
import { AdjustmentVariantPicker } from "./AdjustmentVariantPicker";
import { STOCK_ADJUSTMENTS_STRINGS } from "./stock-adjustments.strings";

const S = STOCK_ADJUSTMENTS_STRINGS.serialPicker;
const DIRTY = { shouldDirty: true } as const;

const unitLabel = (u: RemovableUnitOption) =>
  adjustmentItemLabel(u.internal_serial, u.manufacturer_serial, u.location_label);

/** A blocked unit stays listed (disabled) and says why on hover. */
function UnitOptionRow({ unit }: { unit: RemovableUnitOption }) {
  const text = unitLabel(unit);
  if (!unit.blocked_reason) return <span className="block truncate">{text}</span>;
  return (
    <span className="block truncate" title={S.blockedReason(unit.blocked_reason)}>
      {S.unavailable(text, unit.blocked_reason)}
    </span>
  );
}

/** Remove by serial: pick the variant, then one of its removable units in this
 *  warehouse (never-labelled first). Blocked units are disabled with the reason
 *  so it is clear why a known serial cannot be taken. */
export function LineSerialPicker({ index }: { index: number }) {
  const form = useFormContext<StockAdjustmentForm>();
  const [warehouseId, variantId, variantLabel, internalSerial] = useWatch({
    control: form.control,
    name: ["warehouseId", `lines.${index}.variantId`, `lines.${index}.variantLabel`, `lines.${index}.internalSerial`],
  });
  const useOptions = useRemovableUnitOptions({ warehouseId, variantId });
  const pickSerial = (internal: string) => {
    form.setValue(`lines.${index}.internalSerial`, internal, DIRTY);
    form.setValue(`lines.${index}.manufacturerSerial`, "", DIRTY);
  };

  return (
    <>
      <div className="min-w-0 space-y-1.5 md:col-span-2">
        <Label htmlFor={`sa-line-${index}-serial-variant`}>{S.variant}</Label>
        <AdjustmentVariantPicker
          id={`sa-line-${index}-serial-variant`}
          value={variantId}
          label={variantLabel}
          onChange={(id, label) => {
            form.setValue(`lines.${index}.variantId`, id, DIRTY);
            form.setValue(`lines.${index}.variantLabel`, label);
            // A unit of the previous variant no longer belongs to this line.
            pickSerial("");
          }}
        />
      </div>
      <div className="min-w-0 space-y-1.5 md:col-span-2">
        <Label htmlFor={`sa-line-${index}-serial-unit`}>{S.unit}</Label>
        <AsyncSelect<RemovableUnitOption>
          id={`sa-line-${index}-serial-unit`}
          value={internalSerial ? { id: internalSerial, label: internalSerial } : null}
          onValueChange={(opt) => {
            if (!opt) pickSerial("");
          }}
          onItemPick={(unit) => pickSerial(unit.internal_serial)}
          isItemDisabled={(unit) => !!unit.blocked_reason}
          renderItem={(unit) => <UnitOptionRow unit={unit} />}
          useOptions={useOptions}
          toLabel={(unit) => unit.internal_serial}
          placeholder={S.placeholder}
          searchPlaceholder={S.search}
          disabled={!warehouseId || !variantId}
          className="w-full"
          clearable
          loadOnOpen
        />
        {!warehouseId || !variantId ? (
          <Typography variant="helper">{warehouseId ? S.needVariant : S.needWarehouse}</Typography>
        ) : null}
      </div>
    </>
  );
}
