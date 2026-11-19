import { useMemo } from "react"

import { type AsyncQueryShape } from "@/components/ui/async-select"

/** The parts of an infinite query this adapter reads. */
export type InfiniteRowsQuery<TRow> = Omit<AsyncQueryShape<{ id: string }>, "data"> & {
  data?: { pages: ReadonlyArray<{ items: ReadonlyArray<TRow> }> }
}

/** Adapt rows without `id` to AsyncSelect without a cast (§14.7). Pages are memoised,
 *  so `remap` must be stable (module-level) or the picker refetch-loops. */
export function useIdRemappedInfinite<TRow, TItem extends { id: string }>(
  query: InfiniteRowsQuery<TRow>,
  remap: (row: TRow) => TItem,
): AsyncQueryShape<TItem> {
  const { data: source } = query
  const data = useMemo(
    () =>
      source && {
        pages: source.pages.map((page) => ({ items: page.items.map(remap) })),
      },
    [source, remap],
  )
  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
