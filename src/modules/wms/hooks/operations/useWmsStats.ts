import { useQuery } from "@tanstack/react-query";

import { fetchWmsStats, type WmsStatsScope } from "../../api";
import { warehouseScopeKey, wmsKeys } from "../keys";

/** Page stat-card counts from the dedicated GET /wms/stats/{scope} endpoint —
 *  filter-independent, warehouse-scoped. Backs <WmsStatsCards>. */
export function useWmsStats(
  scope: WmsStatsScope,
  warehouseIds?: string[],
  assigneeId?: string,
) {
  const key = warehouseScopeKey(warehouseIds ?? []);
  return useQuery({
    queryKey: wmsKeys.stats.scope(scope, key || null, assigneeId ?? null),
    queryFn: () => fetchWmsStats(scope, warehouseIds, assigneeId),
  });
}
