import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";

import {
  fetchPurchaseReturn,
  fetchPurchaseReturnFilterOptions,
  fetchPurchaseReturnStats,
  fetchPurchaseReturnsPage,
  fetchReturnableUnits,
  type PurchaseReturnListParams,
  type PurchaseReturnStatsParams,
} from "../../api";

import { warehouseScopeKey, wmsKeys } from "../keys";

const K = wmsKeys.purchaseReturns;

// KPI rollup for the list page cards (server-backed, like WmsStatsCards). It
// honours the SAME filters as the list (warehouse / date / PO / vendor /
// search) so applying a filter moves the KPI cards + tab badges, not just the
// rows (§1.1.H) — status is the one thing it counts across, not filters by.
export function usePurchaseReturnStats(params: PurchaseReturnStatsParams) {
  return useQuery({
    queryKey: K.stats(params),
    queryFn: () => fetchPurchaseReturnStats(params),
  });
}

// Per-tab badge counts (§1.1.H): each INACTIVE tab that carries its OWN filters
// runs a slim page-size-1 count query with those filters, so its badge reflects
// that tab's filters — never the active tab's. Mirrors usePurchaseOrderTabCounts.
// The active tab reuses the list `total`; filterless inactive tabs read the
// unfiltered stats rollup — so neither needs an entry here.
export function usePurchaseReturnTabCounts(
  entries: { id: string; params: PurchaseReturnListParams }[],
) {
  const results = useQueries({
    queries: entries.map((e) => ({
      queryKey: K.count({ tab: e.id, ...e.params }),
      queryFn: () => fetchPurchaseReturnsPage(e.params),
      placeholderData: keepPreviousData,
    })),
  });
  const map: Record<string, number> = {};
  entries.forEach((e, i) => {
    const t = results[i]?.data?.total;
    if (typeof t === "number") map[e.id] = t;
  });
  return map;
}

// PO + vendor facets for the list filter dropdowns — only ids that have a
// return in the current warehouse scope, so a picked value always matches. Keyed
// on the warehouse scope so switching the navbar filter refetches the facets.
export function usePurchaseReturnFilterOptions(warehouseIds: string[]) {
  const key = warehouseScopeKey(warehouseIds);
  return useQuery({
    queryKey: K.options("facets", key),
    queryFn: () =>
      fetchPurchaseReturnFilterOptions(
        warehouseIds.length ? warehouseIds : undefined,
      ),
  });
}

export function usePurchaseReturns(
  params: PurchaseReturnListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchPurchaseReturnsPage(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseReturn(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.detail(id ?? ""),
    queryFn: () => fetchPurchaseReturn(id as string),
    enabled: !!id && (options?.enabled ?? true),
  });
}

// The serialized units still eligible to go back to the vendor for a PO —
// powers the unit picker on the raise-return form (each row flags whether it's
// returnable and why not).
export function useReturnableUnits(
  poId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.returnableUnits(poId ?? ""),
    queryFn: () => fetchReturnableUnits(poId as string),
    enabled: !!poId && (options?.enabled ?? true),
  });
}
