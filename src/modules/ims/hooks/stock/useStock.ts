import {
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
  useQuery,
} from "@tanstack/react-query";

import { FIRST_PAGE, nextPage } from "@shared/api/pagination";

import {
  fetchStockByVariant,
  fetchStockItem,
  fetchStockItemComponents,
  fetchStockItemsPage,
  fetchStockMovements,
} from "../../api";
import { IMS_PAGE_SIZE } from "../../constants";
import { imsKeys } from "../keys";

const KEY = imsKeys.stock;

export function useStockItemsPage(
  params?: {
    q?: string;
    category_id?: string;
    oem_id?: string;
    condition?: string;
    // Repeatable server-side — a single value is a one-element array. Mirrors
    // fetchStockItemsPage; this shape is hand-duplicated in three places
    // (here, ims/api.ts, and schema.gen.ts), so widen all three together.
    status?: string | readonly string[];
    warehouse_id?: string;
    part_id?: string;
    part_variant_id?: string;
    available_for_pick?: boolean;
    page?: number;
    page_size?: number;
  },
  options?: { enabled?: boolean },
) {
  const merged = { page_size: IMS_PAGE_SIZE, page: 1, ...params };
  return useQuery({
    queryKey: [...KEY, "items-page", merged],
    queryFn: () => fetchStockItemsPage(merged),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Infinite, server-searched stock-item picker for AsyncSelect dropdowns (per
 * §16.11: load one page, fetch the next on scroll, debounced `q` sent as a
 * query param — never fetch-all-and-filter). The `search` term maps to the
 * backend `q`; every other filter (part_variant_id, status, warehouse_id, …)
 * rides in `options`. Page size is the global `IMS_PAGE_SIZE` so pickers and
 * list pages stay in sync (§16.6).
 */
export function useStockItemsInfinite(
  search: string,
  options?: {
    enabled?: boolean;
    category_id?: string;
    oem_id?: string;
    condition?: string;
    status?: string | readonly string[];
    warehouse_id?: string;
    part_id?: string;
    part_variant_id?: string;
    is_tracking?: boolean;
    available_for_pick?: boolean;
  },
) {
  const { enabled = true, ...filters } = options ?? {};
  return useInfiniteQuery({
    queryKey: [...KEY, "items-infinite", { search, ...filters }],
    queryFn: ({ pageParam }) =>
      fetchStockItemsPage({
        ...filters,
        q: search || undefined,
        page: pageParam,
        page_size: IMS_PAGE_SIZE,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled,
  });
}

/** What is physically inside a unit (component-tracking D1).
 *
 *  `includeRemoved` is part of the query key, so toggling the harvest history
 *  on a device detail page refetches rather than serving the current-only
 *  payload from cache. */
export function useStockItemComponents(
  id: string,
  options: { includeRemoved?: boolean; enabled?: boolean } = {},
) {
  const includeRemoved = options.includeRemoved ?? false;
  return useQuery({
    queryKey: [...KEY, "item", id, "components", { includeRemoved }],
    queryFn: () => fetchStockItemComponents(id, { includeRemoved }),
    enabled: (options.enabled ?? true) && !!id,
  });
}

export function useStockItem(id: string) {
  return useQuery({
    queryKey: [...KEY, "item", id],
    queryFn: () => fetchStockItem(id),
    enabled: !!id,
  });
}

// Resolve several stock items by id at once (e.g. to show serials for a set of
// unit rows). Deduped; each id is its own cached query.
export function useStockItemsByIds(ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  return useQueries({
    queries: unique.map((id) => ({
      queryKey: [...KEY, "item", id],
      queryFn: () => fetchStockItem(id),
      enabled: !!id,
    })),
  });
}

export function useStockByVariant(variantId: string) {
  return useQuery({
    queryKey: [...KEY, "by-variant", variantId],
    queryFn: () => fetchStockByVariant(variantId),
    enabled: !!variantId,
  });
}

export function useStockMovements(itemId: string) {
  return useQuery({
    queryKey: [...KEY, itemId, "movements"],
    queryFn: () => fetchStockMovements(itemId),
    enabled: !!itemId,
  });
}
