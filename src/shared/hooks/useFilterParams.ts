import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * URL search params for list-page filters.
 *
 * `set(key, value)` writes `key=value` to the URL with `replace: true`
 * (so typing in a search field doesn't push a history entry per word).
 * Setting any filter key also clears the pagination key (default `page`)
 * so filter changes always land back on page 1.
 *
 * Pair with TanStack Query's global `refetchOnMount: 'always'` (per
 * CLAUDE.md §6.5.1) — a back-nav from a detail page then restores the
 * listing AND fires a fresh fetch instead of serving stale cache.
 *
 * Usage:
 *
 *   const { get, set } = useFilterParams();
 *   const search     = get("search");
 *   const categoryId = get("category_id");
 *   const page       = Math.max(1, Number(get("page", "1")) || 1);
 *
 *   const setSearch     = (v: string) => set("search", v);
 *   const setCategoryId = (v: string) => set("category_id", v);
 *   const setPage       = (n: number) => set("page", n > 1 ? String(n) : null);
 */
export function useFilterParams(opts: { pageKey?: string } = {}) {
  const pageKey = opts.pageKey ?? "page";
  const [params, setParams] = useSearchParams();

  const get = useCallback(
    (key: string, fallback = "") => params.get(key) ?? fallback,
    [params],
  );

  const set = useCallback(
    (key: string, value: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value && value.length > 0) next.set(key, value);
          else next.delete(key);
          if (key !== pageKey) next.delete(pageKey);
          return next;
        },
        { replace: true },
      );
    },
    [setParams, pageKey],
  );

  /**
   * Multi-key updater — applies every change in ONE `setSearchParams`
   * call. Use this when a single handler updates several filters at
   * once (e.g. BMT's `onFiltersChange` callback that fires with the
   * full filter object). Sequential `set()` calls in the same handler
   * stomp each other because React hasn't applied the previous URL yet
   * when the next call reads `prev`. `setMany` sidesteps that by
   * collapsing all updates into a single navigation.
   *
   * Pass `null` (or empty string) for any key to remove it from the URL.
   * If any non-page key is changed, the page key is cleared too —
   * matching the auto-reset behaviour of `set()`.
   */
  const setMany = useCallback(
    (updates: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          let touchedNonPageKey = false;
          for (const [key, value] of Object.entries(updates)) {
            if (value && value.length > 0) next.set(key, value);
            else next.delete(key);
            if (key !== pageKey) touchedNonPageKey = true;
          }
          if (touchedNonPageKey) next.delete(pageKey);
          return next;
        },
        { replace: true },
      );
    },
    [setParams, pageKey],
  );

  /**
   * Wipe every filter param off the URL. Use from the BusinessMetricsTable
   * `onClearFilters` callback so the no-results "Clear filters" button
   * lands the user back on the unfiltered listing instead of the generic
   * "No data" empty state.
   */
  const clear = useCallback(() => {
    setParams({}, { replace: true });
  }, [setParams]);

  return { get, set, setMany, clear };
}
