/** The list-view state every rentals register shares: page, size, search,
 *  filters and sort in memory state (survives a detail round trip), plus the
 *  debounced search and sort param the query needs (§16.7, §6.9). */
import { useDebounce } from "@/shared/hooks";
import { useMemoryState } from "@/shared/hooks/useMemoryState";
import { PAGINATION } from "@/shared/constants";
import { UI } from "@shared/constants/ui";
import { toSortParam } from "@shared/lib/sort-param";
import type { SortDirection } from "@/components/common/tables/BusinessMetricsTable";

export interface ListSort {
  column: string | null;
  direction: SortDirection;
}

interface Options {
  /** Memory-state key prefix, unique per page. */
  viewKey: string;
  /** Table column key → backend sort field. */
  sortFields: Readonly<Record<string, string>>;
  pageSize?: number;
}

export function useServerListView({ viewKey, sortFields, pageSize: size = PAGINATION.DEFAULT_PAGE_SIZE }: Options) {
  const [page, setPage] = useMemoryState(`${viewKey}:page`, 1);
  const [pageSize, setPageSize] = useMemoryState<number>(`${viewKey}:pageSize`, size);
  const [search, setSearch] = useMemoryState(`${viewKey}:search`, "");
  const [filters, setFilters] = useMemoryState<Record<string, string>>(`${viewKey}:filters`, {});
  const [sort, setSort] = useMemoryState<ListSort>(`${viewKey}:sort`, { column: null, direction: null });

  // The box shows `search`; the query uses `q`, so typing isn't a request per key.
  const q = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS) || undefined;
  const sortParam = toSortParam(sort.column, sort.direction, sortFields);

  /** Wrap a setter so any filter change goes back to page 1 (§16.7). */
  function withPageReset<A extends unknown[]>(fn: (...args: A) => void) {
    return (...args: A) => {
      fn(...args);
      setPage(1);
    };
  }

  return {
    page,
    setPage,
    pageSize,
    setPageSize: withPageReset(setPageSize),
    search,
    setSearch: withPageReset(setSearch),
    filters,
    setFilters: withPageReset(setFilters),
    sort,
    setSort: withPageReset(setSort),
    q,
    sortParam,
    withPageReset,
  };
}
