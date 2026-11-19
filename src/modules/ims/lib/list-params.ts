// URL list-param guards (Coding-guideline §11.1).
//
// Values read from the address bar are untrusted: a crafted or bookmarked
// `?sort=` / `?condition=` can carry anything. The backend's `sort` and enum
// filters are DB Literals, so an unknown value is a 422 — which collapses the
// whole list into a "Couldn't load" error state instead of showing rows. These
// helpers validate the raw value before it reaches the API and drop anything
// invalid (repair over reject). Centralised so every IMS list shares one guard
// rather than each page re-deriving it; mirrors the in-place sort repair that
// StockBody shipped first.

/**
 * Map a raw `sort` URL value (optionally `-`-prefixed for descending) to a
 * backend sort field, DROPPING any column not present in `map`. Returns
 * `undefined` for an empty or unknown key so the API call omits `sort` and the
 * list renders unsorted rather than 422-ing.
 */
export function resolveSortParam(
  raw: string | null | undefined,
  map: Record<string, string>,
): string | undefined {
  if (!raw) return undefined;
  const desc = raw.startsWith("-");
  const field = map[raw.replace(/^-/, "")];
  return field === undefined ? undefined : (desc ? "-" : "") + field;
}

/**
 * Return `raw` only when it is one of `allowed`; otherwise `fallback`. Guards an
 * enum filter (e.g. stock condition) read from the URL before it is sent to an
 * API Literal param, so `?condition=banana` falls back to the no-filter default
 * instead of breaking the page.
 */
export function resolveEnumParam<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return raw != null && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Return `raw` only when it is a well-formed UUID; otherwise `undefined`. Guards
 * an id filter read from the URL before it reaches an API path/filter that
 * would 422 on a malformed value (a well-formed id that matches nothing just
 * returns an empty result, which is fine). Shape-check only — mirrors the
 * `usePmQueueFilters` UUID guard.
 */
export function resolveUuidParam(
  raw: string | null | undefined,
): string | undefined {
  return raw && UUID_RE.test(raw) ? raw : undefined;
}
