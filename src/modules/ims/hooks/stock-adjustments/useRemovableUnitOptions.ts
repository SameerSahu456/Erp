import { useInfiniteQuery } from "@tanstack/react-query";

import { useDebounce } from "@/shared/hooks";
import { PAGINATION, UI } from "@/shared/constants";

import { fetchRemovableUnits, type RemovableUnit } from "../../stock-adjustments.api";
import { imsKeys } from "../keys";

/** A picker row. Keyed by internal serial — the value the form stores — so the
 *  selected chip and the options share one id. */
export type RemovableUnitOption = RemovableUnit & { id: string };

/** Option hook factory for the remove-by-serial picker (§16.11): server
 *  paged and searched, scoped to the adjustment's warehouse + chosen variant. */
export function useRemovableUnitOptions(scope: { warehouseId: string; variantId: string }) {
  return function useOptions(rawSearch: string, options: { enabled?: boolean } = {}) {
    const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS);
    const params = {
      warehouse_id: scope.warehouseId,
      part_variant_id: scope.variantId,
      search: search || undefined,
    };
    return useInfiniteQuery({
      queryKey: imsKeys.stockAdjustments.removableUnits(params),
      queryFn: async ({ pageParam }) => {
        const page = await fetchRemovableUnits({
          ...params,
          page: pageParam,
          page_size: PAGINATION.DEFAULT_PAGE_SIZE,
        });
        const items: RemovableUnitOption[] = page.items.map((u) => ({ ...u, id: u.internal_serial }));
        return { ...page, items };
      },
      initialPageParam: 1,
      getNextPageParam: (last) =>
        last.page * last.page_size < last.total ? last.page + 1 : undefined,
      enabled: (options.enabled ?? true) && !!scope.warehouseId && !!scope.variantId,
    });
  };
}
