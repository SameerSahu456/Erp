import { useEffect, useMemo } from "react";

import { useStockItemsInfinite } from "@modules/ims";
import type { MovableUnit } from "../../components/stock-transfer/move-stock-helpers";

/** Units for the move dialog (given or resolved by part/variant), narrowed to the source warehouse. */
export function useMovableUnits({
  open,
  partId,
  variantId,
  units,
  warehouseId,
  pickedSourceId,
}: {
  open: boolean;
  partId?: string;
  variantId?: string;
  units: MovableUnit[];
  warehouseId?: string;
  pickedSourceId: string;
}) {
  // Resolve units only when the caller gave an id instead of a list.
  const resolveUnits = open && (!!partId || !!variantId) && units.length === 0;
  // Self-resolve the FULL movable pool: page through every result instead of
  // the backend's first page, so no unit is hidden past a cap and the
  // source-warehouse chooser below sees every warehouse the stock sits in
  // (CP-352 load-more audit — the old single page_size:100 fetch dropped the
  // 101st unit). This dialog needs the COMPLETE set — it groups by source
  // warehouse and offers "select all" — so it auto-advances through the pages
  // rather than waiting on a scroll sentinel. The set is one variant/part in
  // one warehouse, so this is a couple of page requests in practice.
  const unitsQuery = useStockItemsInfinite("", {
    part_id: partId,
    part_variant_id: variantId,
    // Sellable OR still in the ops pipeline. A device waiting for spares is
    // exactly what a store manager parks on a staging pallet — placement is
    // legal at any stage and never touches workflow_status, so restricting
    // this to `available` made the whole park-anywhere capability
    // unreachable from the UI.
    status: ["available", "in_operations"],
    enabled: resolveUnits,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = unitsQuery;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const resolvedUnits = useMemo<MovableUnit[]>(
    () =>
      (unitsQuery.data?.pages ?? [])
        .flatMap((p) => p.items)
        .filter((s) => !!s.serial_number && !!s.warehouse_id)
        .map((s) => ({
          id: s.id,
          status: s.status ?? null,
          internalSerial: s.serial_number ?? s.id,
          manufacturerSerial: s.manufacturer_serial ?? null,
          variantPartId: s.part_variant_id,
          warehouseId: s.warehouse_id,
          partName: s.part_name,
          partNumber: s.part_number,
          skuCode: s.sku_code,
          condition: s.variant_condition,
          variantLabel: s.variant_name,
          categoryName: s.category_name,
          locationName:
            s.location_name ?? ([s.rack, s.bin].filter(Boolean).join(" / ") || null),
        })),
    [unitsQuery.data],
  );

  const effectiveUnits = units.length > 0 ? units : resolvedUnits;

  // Stock can sit in several warehouses and a move has one origin, so the operator picks the source.
  const sourceWarehouseIds = useMemo(
    () =>
      [
        ...new Set(effectiveUnits.map((u) => u.warehouseId).filter(Boolean)),
      ] as string[],
    [effectiveUnits],
  );
  const sourceWarehouseId =
    pickedSourceId || warehouseId || sourceWarehouseIds[0] || "";
  const pool = useMemo(
    () =>
      effectiveUnits.filter(
        (u) => !u.warehouseId || u.warehouseId === sourceWarehouseId,
      ),
    [effectiveUnits, sourceWarehouseId],
  );

  return { sourceWarehouseIds, sourceWarehouseId, pool, poolLoading: unitsQuery.isLoading };
}
