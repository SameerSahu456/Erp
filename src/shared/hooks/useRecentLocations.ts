import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// The last few in-app URLs (path + query + hash), oldest first.
//
// Exists because React Router cannot tell a page WHERE the user came from —
// `location.key` only says whether something is behind us (see
// `useNavigateBack`). A detail page whose own flows rewrite history (the SO
// edit form saves with `navigate(url, { replace: true })`, on top of
// `useUnsavedChangesGuard`'s raw-pushState sentinel) cannot trust
// `navigate(-1)` either: after an edit round trip the entry behind it is the
// stale form or the pre-edit copy of itself. Remembering the URLs lets such a
// page skip past its own sub-routes to the page the user actually came from.
//
// Module state, not React state: nothing renders from it, it is only read on a
// click. It lives for the tab's SPA session — a reload empties it, and callers
// fall back to their declared parent, same as `useNavigateBack`.
const MAX_RECENT = 20;

interface RecentEntry {
  url: string;
  /** React Router's history index (`history.state.idx`) for this entry, or
   *  null when the entry carries none (e.g. the unsaved-changes guard's raw
   *  `pushState` sentinel, and anything replaced on top of it). */
  idx: number | null;
}

const recent: RecentEntry[] = [];

function currentHistoryIdx(): number | null {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" ? idx : null;
}

/** Mount ONCE, in `AppShell`, so every in-app navigation is recorded. The query
 *  string is part of the URL on purpose: returning to "page 3 of the filtered
 *  list" is the point, and list pagination/filters live in the URL. */
export function useRecordRecentLocations() {
  const { pathname, search, hash, key } = useLocation();
  useEffect(() => {
    const url = pathname + search + hash;
    const idx = currentHistoryIdx();
    // Coming back to a URL already on the trail is a RETURN, not a new step:
    // drop everything visited after it and take the entry's current history
    // index. Otherwise list → SO → quote → (back) SO leaves the quote as the
    // latest non-SO entry, and the SO's Back sends the user forward to the
    // quote again instead of to the list.
    const seen = recent.findLastIndex((e) => e.url === url);
    if (seen !== -1) {
      recent.length = seen + 1;
      recent[seen].idx = idx;
      return;
    }
    recent.push({ url, idx });
    if (recent.length > MAX_RECENT) recent.shift();
  }, [pathname, search, hash, key]);
}

export interface RecentBackTarget {
  url: string;
  /** Negative history delta to reach `url` by going BACK (`navigate(delta)`),
   *  or null when it can't be trusted — then push `url` instead. Going back
   *  matters: pushing the parent leaves this page behind it in history, so the
   *  parent's own Back (`navigate(-1)`) bounces straight back here. */
  delta: number | null;
}

/** Most recent recorded URL whose pathname `skip` does not reject, or `null`
 *  when none is on record (fresh load, deep link). */
export function lastRecentLocation(skip: (pathname: string) => boolean): RecentBackTarget | null {
  const here = currentHistoryIdx();
  for (let i = recent.length - 1; i >= 0; i--) {
    const { url, idx } = recent[i];
    if (skip(url.split(/[?#]/, 1)[0])) continue;
    const delta = here != null && idx != null && idx < here ? idx - here : null;
    return { url, delta };
  }
  return null;
}
