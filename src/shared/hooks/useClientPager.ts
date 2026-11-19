import { useCallback, useState } from "react";

export interface ClientPage<T> {
  /** The 1-based page actually shown — clamped into `[1, totalPages]`. */
  page: number;
  totalPages: number;
  pageItems: T[];
}

/** Pure slice of one page out of a fully-loaded array (clamps `page`). */
export function paginateEmbedded<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): ClientPage<T> {
  const size = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    page: safePage,
    totalPages,
    pageItems: items.slice((safePage - 1) * size, safePage * size),
  };
}

/** Client pager for an array fully embedded in a detail response — never for list endpoints (§16.7).
 *  Resets to page 1 when the item count changes. */
export function useClientPager<T>(items: readonly T[], pageSize: number) {
  const count = items.length;
  // The requested page is remembered alongside the count it was chosen for;
  // when the count moves, the stale request is ignored (derived, no effect).
  const [cursor, setCursor] = useState({ page: 1, count });
  const requested = cursor.count === count ? cursor.page : 1;
  const setPage = useCallback(
    (page: number) => setCursor({ page, count }),
    [count],
  );
  const { page, totalPages, pageItems } = paginateEmbedded(
    items,
    requested,
    pageSize,
  );
  return { page, setPage, pageItems, totalPages, total: count };
}
