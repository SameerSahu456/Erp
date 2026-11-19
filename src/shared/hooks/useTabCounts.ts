import { useQueries, type QueryKey } from "@tanstack/react-query";

interface UseTabCountsArgs<TId extends string, TParams> {
  tabIds: readonly TId[];
  activeTab: TId;
  /** The active tab's count — the list query's own `total`, so it is never
   *  fetched twice. */
  activeTotal: number;
  /** Each tab's count params (that tab's own filters, page size 1). */
  paramsFor: (id: TId) => TParams;
  /** The owning module's count key — from its key factory, never inline. */
  queryKey: (params: TParams) => QueryKey;
  fetchCount: (params: TParams) => Promise<{ total: number }>;
}

/** Filter-aware tab counts: the active tab uses `total`, each inactive tab runs a slim
 *  count query with its own filters (§16.7 / §16.8). */
export function useTabCounts<TId extends string, TParams>({
  tabIds,
  activeTab,
  activeTotal,
  paramsFor,
  queryKey,
  fetchCount,
}: UseTabCountsArgs<TId, TParams>): (id: TId) => number {
  const results = useQueries({
    queries: tabIds.map((id) => {
      const params = paramsFor(id);
      return {
        queryKey: queryKey(params),
        queryFn: () => fetchCount(params),
        enabled: id !== activeTab,
      };
    }),
  });
  return (id: TId) => {
    if (id === activeTab) return activeTotal;
    const index = tabIds.indexOf(id);
    return results[index]?.data?.total ?? 0;
  };
}
