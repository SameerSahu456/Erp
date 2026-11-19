import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Clears every URL search param AND every BusinessMetricsTable-persisted
 * sessionStorage key on a browser refresh (F5 / Cmd+R / Cmd+Shift+R),
 * leaving them untouched on SPA navigations.
 *
 * Why: list pages persist filters in two places.
 *   1. The URL — drives the server query and survives back-nav from a
 *      detail page (see `useFilterParams`).
 *   2. SessionStorage under the `bmt:<persistKey>:*` prefix — used by
 *      BusinessMetricsTable's internal `usePersistedState` for search /
 *      sort / page / column-filter state. SessionStorage survives the
 *      tab across refreshes, so without this hook the user wipes the
 *      URL but the search input still rehydrates the old text.
 * Users expect refresh to be a "start over" signal in both surfaces.
 *
 * Detection uses the Navigation Timing API. `navigation.type === "reload"`
 * is set when the document was loaded via reload (covers both soft and
 * hard refresh — browsers do not separate the two on this surface). The
 * entry reflects the *initial* page load, never the in-app routes that
 * follow, so we capture it once at module load and consume it the first
 * time any caller mounts. Subsequent route mounts (back-nav, sidebar
 * navigation between list pages) see the flag already consumed and
 * become no-ops.
 *
 * Usage:
 *
 *   export default function PartsPage() {
 *     useClearFiltersOnReload();
 *     // …rest of the page, including useFilterParams() / useSearchParams()
 *   }
 *
 * The hook must run *before* any code reads the search params off the
 * URL, otherwise the first render of the page renders with the about-
 * to-be-cleared filters in place. In practice React batches the `useEffect`
 * + setSearchParams into the next paint, so the user sees one
 * unfiltered frame instead of a flash of filtered content.
 */

// SessionStorage key prefix used by BusinessMetricsTable. Kept in sync
// with BMT's own `pk = \`bmt:${persistKey}\`` derivation — change here
// and there together if the BMT prefix ever moves.
const BMT_STORAGE_PREFIX = "bmt:";

/**
 * Wipes every sessionStorage key whose name starts with `bmt:`. Used
 * once per session on the initial reload. Kept narrow on purpose —
 * other storage (auth, theme, recent items) is unaffected.
 */
function clearBMTPersistedState(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    // Collect keys first then delete, since removing during iteration
    // re-indexes sessionStorage and skips entries.
    const doomed: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(BMT_STORAGE_PREFIX)) doomed.push(key);
    }
    for (const key of doomed) sessionStorage.removeItem(key);
  } catch {
    // SecurityError / quota — silently ignore; the URL clear still ran.
  }
}

// Captured once at module import (i.e. once per browser session). The
// entry is the document's initial navigation; SPA route changes never
// rewrite it. `as` cast because TS narrows the union to the base
// `PerformanceEntry` until we look at `.type`.
const wasReload: boolean =
  typeof window !== "undefined" &&
  typeof performance !== "undefined" &&
  (
    performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined
  )?.type === "reload";

// Wipe BMT's sessionStorage immediately on a reload — synchronously, at
// module-load time, before any component renders. `useEffect` would be
// too late: BMT's `usePersistedState` reads storage in its initial-state
// initializer (during the first render), so by the time an effect ran
// the search input would already be hydrated with the stale value. The
// URL clear still happens inside the hook's effect, because that needs
// the React Router `setSearchParams`.
if (wasReload) {
  clearBMTPersistedState();
}

// Module-level latch — flips to `true` after the first caller consumes
// the reload signal. Guarantees that if PartsPage clears its URL on a
// refresh, a later soft-nav to StockPage in the same session doesn't
// wipe StockPage's filters too.
let consumed = !wasReload;

export function useClearFiltersOnReload(options?: {
  /** URL params to PRESERVE across the refresh-clear. Everything else is
   *  wiped. Detail pages that keep list-view filters in the URL alongside
   *  non-filter state (e.g. the active `tab`) pass those keys so a refresh
   *  clears the filters without also dropping the tab (CP-136 #1). */
  keep?: readonly string[];
}): void {
  // NUL-joined so the effect can depend on the CONTENTS of `keep`, not the
  // array's per-render identity (a fresh `["tab"]` literal each render would
  // otherwise churn the dep). The once-per-session latch guards the body
  // regardless, so re-runs are harmless no-ops.
  const keepKey = (options?.keep ?? []).join("\u0000");
  const [searchParams, setSearchParams] = useSearchParams();
  // Per-instance latch — guards against StrictMode's double-invoke in
  // dev. The module flag also catches it, but the ref makes the intent
  // explicit at the call site.
  const ranRef = useRef(false);

  useEffect(() => {
    if (consumed || ranRef.current) return;
    consumed = true;
    ranRef.current = true;
    // sessionStorage was already wiped synchronously at module load
    // (see the `if (wasReload)` block above). The only thing left to
    // do here is clear the URL — that needs `setSearchParams` from the
    // router, which we can only call inside the component tree.
    const keep = keepKey ? keepKey.split("\u0000") : [];
    if (keep.length > 0) {
      const next = new URLSearchParams();
      for (const key of keep) {
        const value = searchParams.get(key);
        if (value !== null) next.set(key, value);
      }
      setSearchParams(next, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams, searchParams, keepKey]);
}
