import { useInfiniteQuery } from "@tanstack/react-query";

import { FIRST_PAGE, nextPage } from "@shared/api/pagination";

import { PAGINATION } from "@shared/constants/pagination";

import { fetchAvailableStock } from "../../api";
import { wmsKeys } from "../keys";

const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

/** Available units of one variant in one warehouse, scroll-paged (§16.11). */
export function useAvailableStockInfinite(
  warehouseId: string,
  variantId: string,
  search: string,
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: wmsKeys.availableStock.units(warehouseId, variantId, search),
    queryFn: ({ pageParam }) =>
      fetchAvailableStock({
        warehouse_id: warehouseId,
        part_variant_id: variantId,
        q: search || undefined,
        page: pageParam,
        page_size: PAGE_SIZE,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: (options.enabled ?? true) && !!warehouseId && !!variantId,
  });
}

/** A scanned serial resolved across every variant in the warehouse — the
 *  scan-first line fills its part in from the unit. Runs only once a serial
 *  is typed, so it never lists the whole warehouse. */
export function useAvailableUnitScanInfinite(
  warehouseId: string,
  search: string,
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: wmsKeys.availableStock.units(warehouseId, "", search),
    queryFn: ({ pageParam }) =>
      fetchAvailableStock({
        warehouse_id: warehouseId,
        q: search,
        page: pageParam,
        page_size: PAGE_SIZE,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: (options.enabled ?? true) && !!warehouseId && !!search,
  });
}
