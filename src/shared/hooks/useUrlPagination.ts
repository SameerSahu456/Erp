import { useCallback, useEffect, useRef } from "react";

import { useFilterParams } from "./useFilterParams";
import { usePageSizeParam } from "./usePageSizeParam";

interface UrlPaginationOptions {
  /** URL key for the page-size param (e.g. "contacts_size"). */
  sizeKey: string;
  /** URL key for the page-number param. Defaults to `"page"`. Override when two
   *  paginated lists share one route (e.g. tabs) so their pagers don't collide
   *  — e.g. `"rej_page"` for an admin-only Rejected tab. */
  pageKey?: string;
  /** Default page size; the size param is omitted from the URL at this value. */
  defaultSize: number;
  /**
   * Filter values that should reset the listing to page 1 when they change.
   * The reset is **mount-safe** — it never fires on the initial mount, so a
   * back-nav into `?page=3` keeps the page. Omit when the caller already
   * resets the page from its own change handlers.
   */
  resetOn?: readonly unknown[];
}

interface UrlPagination {
  page: number;
  setPage: (n: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
}

/**
 * URL-backed list pagination. The page number (`?page`) and page size
 * (`?<sizeKey>`) live in the query string so they persist across detail
 * round-trips, refreshes, and browser back/forward — the IMS list-page
 * pattern. A page-size change clears the `page` param atomically
 * (usePageSizeParam's default `pageKey: "page"`), so the user lands on page 1.
 *
 * Two reset styles:
 *  - Pass `resetOn: [filterA, filterB, …]` to auto-reset to page 1 on filter
 *    changes (mount-safe).
 *  - Omit `resetOn` and call `setPage(1)` yourself from change handlers.
 */
export function useUrlPagination({
  sizeKey,
  pageKey = "page",
  defaultSize,
  resetOn,
}: UrlPaginationOptions): UrlPagination {
  const { get, set } = useFilterParams({ pageKey });
  const page = Math.max(1, Number(get(pageKey, "1")) || 1);
  const setPage = useCallback(
    (n: number) => set(pageKey, n > 1 ? String(n) : null),
    [set, pageKey],
  );
  const [pageSize, setPageSize] = usePageSizeParam({ key: sizeKey, defaultSize, pageKey });

  // Reset to page 1 when a watched filter changes — but never on mount.
  // Comparing the serialized signature (rather than a "first render" flag)
  // keeps this correct under React StrictMode's double-mount.
  const signature = resetOn ? JSON.stringify(resetOn) : null;
  const prevSignature = useRef<string | null>(null);
  useEffect(() => {
    if (signature === null) return;
    if (prevSignature.current === null) {
      prevSignature.current = signature;
      return;
    }
    if (prevSignature.current !== signature) {
      prevSignature.current = signature;
      setPage(1);
    }
  }, [signature, setPage]);

  return { page, setPage, pageSize, setPageSize };
}
