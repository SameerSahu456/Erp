import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * useState whose value lives in a module-level store keyed by `key`, so it
 * SURVIVES component unmount/remount (in-app navigation keeps the SPA runtime
 * alive) but is WIPED on a full page refresh (a reload rebuilds the module and
 * this store starts empty).
 *
 * That lifetime is exactly what a list view wants: filters + pagination persist
 * across list ↔ detail navigation, yet a browser refresh starts clean. Pair
 * with `clearMemoryState` (see `useScopedViewReset`) to also drop the value when
 * the user leaves the section entirely.
 */
const store = new Map<string, unknown>();

export function useMemoryState<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() =>
    store.has(key)
      ? (store.get(key) as T)
      : typeof initial === "function"
        ? (initial as () => T)()
        : initial,
  );
  useEffect(() => {
    store.set(key, value);
  }, [key, value]);
  return [value, setValue];
}

/** Drop a key from the in-memory store (next mount falls back to its initial). */
export function clearMemoryState(key: string) {
  store.delete(key);
}
