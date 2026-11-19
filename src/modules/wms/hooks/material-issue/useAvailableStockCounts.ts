import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { wmsKeys } from "../keys";

import { fetchAvailableStockCounts } from "../../api/stock";

/**
 * On-hand pickable counts for a set of variants in one warehouse, as a
 * `Map<variantId, availableQty>`. Backed by `GET /wms/available-stock/counts`.
 *
 * The Material Issue "Add line item" dropdown uses it to show how many units
 * are actually available at the chosen warehouse next to the demand still
 * pending. Disabled until a warehouse is chosen and there's at least one
 * variant to count; a variant absent from the map means zero available.
 */
export function useAvailableStockCounts(
  warehouseId: string | null | undefined,
  variantIds: string[],
) {
  // Stable, de-duplicated, sorted key so the query cache hits regardless of the
  // caller's array identity or ordering.
  const ids = useMemo(
    () => [...new Set(variantIds.filter(Boolean))].sort(),
    [variantIds],
  );
  const query = useQuery({
    queryKey: wmsKeys.availableStock.counts(warehouseId ?? "", ids),
    queryFn: () =>
      fetchAvailableStockCounts({
        warehouse_id: warehouseId as string,
        part_variant_ids: ids,
      }),
    enabled: !!warehouseId && ids.length > 0,
  });

  const countByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of query.data ?? [])
      map.set(row.part_variant_id, row.available_qty);
    return map;
  }, [query.data]);

  return { countByVariant, isLoading: query.isLoading };
}
