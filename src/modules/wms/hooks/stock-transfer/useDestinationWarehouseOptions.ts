import { useMemo } from "react";

import { useWarehouseFilterOptions } from "../warehouses/useWarehouses";

/** Destination picker options: server-searched active warehouses (§16.11), minus the source warehouse. */
export function useDestinationWarehouseOptions(excludeId: string) {
  // Every active warehouse is a valid transfer destination — not just the ones
  // the user is assigned to — so this picker opts out of the assigned-warehouse
  // scope (CP-375 #2); otherwise a single-warehouse manager saw no destinations.
  const useActiveWarehouses = useWarehouseFilterOptions({ asTransferTarget: true });
  return function useDestinationOptions(
    search: string,
    opts?: { enabled?: boolean },
  ) {
    const query = useActiveWarehouses(search, opts);
    // Read per render: when the source changes, the new one must drop out of the
    // list and the old one come back (it was cached on query.data alone before).
    const excluded = excludeId;
    const data = useMemo(
      () =>
        query.data
          ? {
              ...query.data,
              pages: query.data.pages.map((p) => ({
                ...p,
                items: p.items.filter((w) => w.id !== excluded),
              })),
            }
          : undefined,
      [query.data, excluded],
    );
    return {
      data,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      fetchNextPage: query.fetchNextPage,
    };
  };
}
