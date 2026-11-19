import { UI } from "@/shared/constants";

import { useDebounce } from "./useDebounce";

export interface ListSearchFiltersResult {
  /** Debounced, trimmed, length-capped search to send to the API. `undefined`
   *  below `minLength` so a too-short / empty query never hits the endpoint. */
  searchParam: string | undefined;
  /** True when ANY search text or filter is active. Feed to
   *  `BusinessMetricsTable`'s `externalFiltersActive` so a zero-row result
   *  shows the "No results match your filters" (Clear filters) state instead of
   *  the generic "no data" one — on listing pages AND detail-tab tables. */
  externalFiltersActive: boolean;
}

/**
 * One place for server-backed list search + filter-empty-state handling, so
 * every table (listings and detail-page tabs) behaves identically. Two jobs:
 *
 *  1. Length-cap the search to the endpoint's `max_length` BEFORE it hits the
 *     API, so a long paste or a crafted `?search=<long>` URL can't 422
 *     (§11.1). Pass the backend's own limits via `maxLength` /
 *     `minLength` (IMS list endpoints are min 2 / max 100).
 *  2. Derive `externalFiltersActive` from the raw search plus any filter flags
 *     the caller passes, so BMT shows the right empty state even when the
 *     emptiness comes from server-side filters BMT can't see (rendered via
 *     `renderFilter`, or applied from the URL on load before the table's own
 *     search state hydrates).
 *
 * `externalFiltersActive` reflects intent immediately (it reads the RAW search,
 * not the debounced one) so the empty state flips the moment a filter/search is
 * applied, while `searchParam` stays debounced so the fetch doesn't thrash.
 */
export function useListSearchFilters(opts: {
  /** Raw search string, typically read from the URL. */
  search: string;
  /** Backend `max_length` for this endpoint's search param. */
  maxLength: number;
  /** Booleans for every NON-search filter (true = active). The caller
   *  normalizes each value ("all" / "" → false). */
  filterFlags?: readonly boolean[];
  /** Backend `min_length` (default 2). Below it, `searchParam` is undefined. */
  minLength?: number;
  /** Debounce for the search value. Defaults to `UI.DEBOUNCE_SEARCH_MS`. */
  debounceMs?: number;
}): ListSearchFiltersResult {
  const { search, maxLength, filterFlags, minLength = 2, debounceMs } = opts;
  const trimmed = search.trim();
  const debounced = useDebounce(trimmed, debounceMs ?? UI.DEBOUNCE_SEARCH_MS);
  const searchParam =
    debounced.length >= minLength ? debounced.slice(0, maxLength) : undefined;
  const externalFiltersActive =
    trimmed.length > 0 || (filterFlags ?? []).some(Boolean);
  return { searchParam, externalFiltersActive };
}
