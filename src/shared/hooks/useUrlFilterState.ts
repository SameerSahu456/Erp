import { useCallback, useMemo } from "react";

import type { DateRange } from "@/components/common/pickers/DateRangePicker";
import type { ValueRange } from "@/components/common/pickers/ValueRangeInput";
import { orderDateRange, parseDateParam, toDateParam } from "@/shared/lib/date";
import { exceedsMoneyDigits, parseNonNegativeNumber } from "@/shared/lib/validation";

import { useFilterParams } from "./useFilterParams";

/**
 * URL-backed list filters — the filter equivalent of `useUrlPagination`.
 *
 * Each hook reads its value from the query string and writes back through
 * `useFilterParams`, so every filter survives refresh, detail round-trips,
 * and browser back/forward exactly like `?page` does. Writing any filter key
 * also clears `?page` (via `useFilterParams.set`/`setMany`), so a filter
 * change always lands the user back on page 1 — no manual `setPage(1)` in the
 * change handler.
 *
 * A value equal to its `defaultValue` is omitted from the URL, so the clean
 * "no filters" state has no query string and sentinel defaults (`"__all__"`,
 * `"all"`, …) never bloat the address bar.
 */

/** Single-select string filter (status, stage, priority, …). */
export function useUrlFilter(
  key: string,
  defaultValue: string,
): [string, (next: string) => void] {
  const { get, set } = useFilterParams();
  const value = get(key, defaultValue) || defaultValue;
  const setValue = useCallback(
    (next: string) => set(key, next && next !== defaultValue ? next : null),
    [set, key, defaultValue],
  );
  return [value, setValue];
}

/** Boolean toggle filter (orphanOnly, overdueOnly, …). Stored as `1` / absent. */
export function useUrlBoolFilter(
  key: string,
): [boolean, (next: boolean) => void] {
  const { get, set } = useFilterParams();
  const value = get(key) === "1";
  const setValue = useCallback(
    (next: boolean) => set(key, next ? "1" : null),
    [set, key],
  );
  return [value, setValue];
}

/**
 * Multi-select string filter (assignees, owners, …). Encoded as a
 * comma-separated list under one key (`?assigned_to=a,b,c`). Empty list ⇒
 * key omitted. Order and duplicates are preserved as given by the caller.
 */
export function useUrlMultiFilter(
  key: string,
): [string[], (next: string[]) => void] {
  const { get, set } = useFilterParams();
  const raw = get(key);
  const value = useMemo(
    () => (raw ? raw.split(",").filter(Boolean) : []),
    [raw],
  );
  const setValue = useCallback(
    (next: string[]) => set(key, next.length > 0 ? next.join(",") : null),
    [set, key],
  );
  return [value, setValue];
}

/**
 * Date-range filter backed by two URL keys (default `date_from` / `date_to`,
 * each `YYYY-MM-DD`). Both bounds are written in one navigation via `setMany`
 * so a partial range never leaves a stale opposite bound on the URL.
 */
export function useUrlDateRange(
  fromKey = "date_from",
  toKey = "date_to",
): [DateRange | undefined, (next: DateRange | undefined) => void] {
  const { get, setMany } = useFilterParams();
  const from = get(fromKey);
  const to = get(toKey);
  const value = useMemo<DateRange | undefined>(() => {
    const fromDate = parseDateParam(from);
    const toDate = parseDateParam(to);
    if (!fromDate && !toDate) return undefined;
    // A hand-edited / stale URL may carry from > to — show it ordered.
    return orderDateRange({ from: fromDate, to: toDate });
  }, [from, to]);
  const setValue = useCallback(
    (next: DateRange | undefined) => {
      const ordered = orderDateRange(next);
      setMany({
        [fromKey]: ordered?.from ? toDateParam(ordered.from) : null,
        [toKey]: ordered?.to ? toDateParam(ordered.to) : null,
      });
    },
    [setMany, fromKey, toKey],
  );
  return [value, setValue];
}

/**
 * Numeric min/max range filter backed by two URL keys (default
 * `min_quote_value` / `max_quote_value`). Mirrors {@link useUrlDateRange}: both
 * bounds are written in one navigation via `setMany` so a partial range never
 * strands a stale opposite bound, and an all-empty range clears both keys.
 * Values are plain numeric strings in the URL.
 */
export function useUrlValueRange(
  minKey = "min_quote_value",
  maxKey = "max_quote_value",
  /** URL values are untrusted (§11.1): a bound with more digits than this is
   *  dropped instead of being sent — the backend would answer 422. Omit for no cap. */
  maxDigits?: number,
): [ValueRange | undefined, (next: ValueRange | undefined) => void] {
  const { get, setMany } = useFilterParams();
  const rawMin = get(minKey);
  const rawMax = get(maxKey);
  const value = useMemo<ValueRange | undefined>(() => {
    // NUMERIC(maxDigits, 2): at most maxDigits in total and maxDigits - 2 whole.
    const withinCap = (raw: string | null | undefined) =>
      maxDigits == null || !exceedsMoneyDigits(raw ?? "", maxDigits, 2);
    const min = withinCap(rawMin) ? parseNonNegativeNumber(rawMin) : undefined;
    const max = withinCap(rawMax) ? parseNonNegativeNumber(rawMax) : undefined;
    if (min == null && max == null) return undefined;
    return { min, max };
  }, [rawMin, rawMax, maxDigits]);
  const setValue = useCallback(
    (next: ValueRange | undefined) =>
      setMany({
        [minKey]: next?.min != null ? String(next.min) : null,
        [maxKey]: next?.max != null ? String(next.max) : null,
      }),
    [setMany, minKey, maxKey],
  );
  return [value, setValue];
}
