import { useCallback, useRef } from "react";

/** Run each submit step once per key until `reset()`, so retrying after a later failure
 *  never repeats successful uploads or spare requests. A step that threw can retry.
 *  Shared since its second module (rentals' PO save, after WMS stage completion). */
export function useOnceSteps() {
  const done = useRef(new Set<string>());
  // Cache each step's result so a caller that needs it (e.g. an uploaded
  // attachment's id) gets the same value back on a retry without re-running.
  const results = useRef(new Map<string, unknown>());

  const run = useCallback(async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    if (done.current.has(key)) return results.current.get(key) as T;
    const result = await fn();
    done.current.add(key);
    results.current.set(key, result);
    return result;
  }, []);

  const reset = useCallback(() => {
    done.current.clear();
    results.current.clear();
  }, []);

  return { run, reset };
}

/** Stable per-file step key (a file re-picked between attempts is a new step). */
export function fileStepKey(prefix: string, file: File): string {
  return `${prefix}:${file.name}:${file.size}:${file.lastModified}`;
}
