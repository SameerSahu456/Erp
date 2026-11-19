import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

// URL-backed page-size state. Persists the user's "Records per page"
// choice through detail-page round-trips and refreshes, since local
// `useState` resets on remount.
//
// Writes the page-size and clears the page key in ONE setSearchParams
// call so callers don't need a follow-up `setPage(1)` — two sequential
// `setSearchParams((prev)=>…)` calls in the same React batch see the
// same `prev` URL and stomp each other, so the page-size update would
// silently lose to the page reset.
//
// The page-size URL key is removed when the value equals `defaultSize`,
// so the default never bloats query strings; a non-default selection
// writes `<key>=<n>`.
export function usePageSizeParam(opts: {
  key?: string;
  defaultSize: number;
  // URL key for pagination. Set to `null` to skip the page reset.
  pageKey?: string | null;
}): [number, (n: number) => void] {
  const { key = "page_size", defaultSize, pageKey = "page" } = opts;
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const parsed = raw != null ? Number(raw) : NaN;
  const value =
    Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : defaultSize;

  const setValue = useCallback(
    (next: number) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          if (!Number.isFinite(next) || next <= 0 || next === defaultSize) {
            updated.delete(key);
          } else {
            updated.set(key, String(Math.floor(next)));
          }
          // Reset pagination atomically — a page size change otherwise
          // leaves the user on a now-invalid page index (e.g. page 4 of
          // 25 → ~page 10 of 10).
          if (pageKey) updated.delete(pageKey);
          return updated;
        },
        { replace: true },
      );
    },
    [defaultSize, key, pageKey, setParams],
  );

  return [value, setValue];
}
