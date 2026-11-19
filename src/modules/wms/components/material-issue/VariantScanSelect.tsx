import { AsyncSelect } from "@/components/ui/async-select";
import { useVariantsListInfinite, type VariantListItem } from "@modules/ims";

import { type ScanOption } from "./ScanSelect";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { readTracking } from "./material-issue-form-helpers";
import { variantAvailLabel, variantPartLine } from "./variant-labels";

// Variant picker — the standard AsyncSelect (same searchable dropdown used for
// the source-document picker), backed by the shared variants infinite list.
export function VariantScanSelect({
  value,
  warehouseId,
  onPick,
  onClear,
}: {
  value: ScanOption | null;
  // The issue's warehouse. The "avail" count on each row is scoped to this
  // warehouse's pickable on-hand stock (not the all-warehouses total), so the
  // operator sees exactly what they can pull here. Absent → all-warehouses.
  warehouseId?: string;
  onPick: (opt: ScanOption, isTracking: boolean) => void;
  onClear: () => void;
}) {
  // Thin adapter giving AsyncSelect the exact `(search, {enabled})` signature
  // while closing over `warehouseId` so each row's "avail" count is scoped to
  // the issue's warehouse. Named `use*` so it reads as the custom hook it is
  // (AsyncSelect calls it as one); the infinite hook's queryKey spreads its
  // filters, so switching warehouse refetches with the new scope.
  function useWarehouseScopedVariants(
    search: string,
    opts?: { enabled?: boolean },
  ) {
    return useVariantsListInfinite(
      search,
      // `available_only` keeps the picker to variants with at least one
      // pickable unit in this warehouse — no out-of-stock rows.
      warehouseId
        ? { ...opts, warehouse_id: warehouseId, available_only: true }
        : opts,
    );
  }
  return (
    <AsyncSelect<VariantListItem>
      value={value}
      onValueChange={(opt) => {
        if (!opt) onClear();
      }}
      onItemPick={(item) =>
        onPick({ id: item.id, label: variantAvailLabel(item) }, readTracking(item))
      }
      useOptions={useWarehouseScopedVariants}
      toLabel={variantAvailLabel}
      getDescription={variantPartLine}
      placeholder={S.form.lines.variantPlaceholder}
      searchPlaceholder={S.form.lines.variantSearchPlaceholder}
      searchable
      loadOnOpen
    />
  );
}
