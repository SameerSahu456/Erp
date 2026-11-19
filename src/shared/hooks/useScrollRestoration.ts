import { useCallback, useLayoutEffect, useRef } from "react";

// SessionStorage key prefix for saved scroll offsets. SessionStorage (not
// local) so positions survive in-app navigation (list → detail → back) and
// browser back/forward within the tab, but reset when the tab closes — the
// same lifetime as the CRM filter/pagination state.
const STORAGE_PREFIX = "scrollpos:";

// A hard refresh (F5 / reload button) should open the view at the top, not
// replay an offset saved earlier in the tab — that reads as the board
// "scrolling on its own". Back/forward and in-app navigation still restore.
function isPageReload(): boolean {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return nav?.type === "reload";
  } catch {
    return false;
  }
}

// Runs once when the bundle loads: on a reload, drop every saved offset so
// each scroller (board track + every column) starts at the top. In-app
// navigation never reloads the bundle, so list → detail → back still restores.
if (typeof window !== "undefined" && isPageReload()) {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) sessionStorage.removeItem(k);
    }
  } catch {
    // storage disabled — nothing to clear
  }
}

interface Options {
  /** When false the hook is inert (no save, no restore) — pass the empty
   *  string as `key` or `enabled: false` to opt a container out. */
  enabled?: boolean;
  /**
   * How long (ms) to keep re-applying the saved offset after mount while
   * async content (e.g. infinite-scroll pages) is still growing the
   * scroller. Once the target is reached, or this window elapses, saving
   * takes over. Default 1500ms.
   */
  restoreWindowMs?: number;
}

/**
 * Save & restore the scroll offset of a single overflow container across
 * unmounts — for scrollers the browser's native history scroll restoration
 * can't reach (anything that isn't the document scrolling element, e.g. a
 * kanban board's horizontal track or a column's vertical card list).
 *
 * Returns a ref callback to attach to the scrollable element. On mount it
 * re-applies the last saved `{top,left}` (retrying for `restoreWindowMs` so
 * the offset still lands once cached infinite-scroll pages re-render and grow
 * the content); on scroll it persists the current offset to sessionStorage.
 *
 * The save is suppressed during the restore window so the programmatic
 * `scrollTop` writes (which emit `scroll` events, clamped to the current
 * max while content is still short) can't overwrite the real target.
 */
export function useScrollRestoration<T extends HTMLElement>(
  key: string,
  { enabled = true, restoreWindowMs = 1500 }: Options = {},
): (node: T | null) => void {
  const elRef = useRef<T | null>(null);
  // True while we're actively re-applying the saved offset; gates the
  // scroll-save so restoration writes don't clobber the stored target.
  const restoringRef = useRef(false);

  const setRef = useCallback((node: T | null) => {
    elRef.current = node;
  }, []);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el || !enabled || !key) return;
    const storageKey = STORAGE_PREFIX + key;

    let target: { top: number; left: number } | null = null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) target = JSON.parse(raw) as { top: number; left: number };
    } catch {
      // corrupt entry — ignore and fall through to a clean save cycle
    }

    let raf = 0;
    let safety = 0;
    let cleanupUserStop: (() => void) | undefined;
    const reached = () =>
      !target ||
      (Math.abs(el.scrollTop - target.top) <= 1 &&
        Math.abs(el.scrollLeft - target.left) <= 1);

    if (target && (target.top > 0 || target.left > 0)) {
      restoringRef.current = true;
      const start = performance.now();
      // Apply once synchronously (before paint) to avoid a flash at offset 0,
      // then keep re-applying across frames while async content grows the
      // scroller enough for the offset to actually land.
      const tick = () => {
        if (!target) return;
        el.scrollTop = target.top;
        el.scrollLeft = target.left;
        if (reached() || performance.now() - start > restoreWindowMs) {
          restoringRef.current = false;
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
      // The user taking over must win: stop re-applying the saved offset the
      // moment they scroll / touch / press a key, or the retry loop yanks the
      // board back while they are mid-scroll.
      const stopRestoring = () => {
        restoringRef.current = false;
        if (raf) cancelAnimationFrame(raf);
        target = null;
      };
      for (const ev of ["wheel", "touchstart", "pointerdown", "keydown"] as const) {
        el.addEventListener(ev, stopRestoring, { passive: true, once: true });
      }
      cleanupUserStop = () => {
        for (const ev of ["wheel", "touchstart", "pointerdown", "keydown"] as const) {
          el.removeEventListener(ev, stopRestoring);
        }
      };
      // Hard stop in case `reached()` never converges (content shorter than
      // when saved — e.g. cache was GC'd and only page 1 reloaded).
      safety = window.setTimeout(() => {
        restoringRef.current = false;
      }, restoreWindowMs + 100);
    }

    let saveRaf = 0;
    const onScroll = () => {
      if (restoringRef.current || saveRaf) return;
      // Coalesce the burst of scroll events into one write per frame.
      saveRaf = requestAnimationFrame(() => {
        saveRaf = 0;
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({ top: el.scrollTop, left: el.scrollLeft }),
          );
        } catch {
          // quota / disabled storage — non-critical, drop silently
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (saveRaf) cancelAnimationFrame(saveRaf);
      if (safety) clearTimeout(safety);
      cleanupUserStop?.();
    };
  }, [key, enabled, restoreWindowMs]);

  return setRef;
}
