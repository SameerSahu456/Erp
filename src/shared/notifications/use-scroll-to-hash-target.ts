import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"

// Tailwind classes for the "you just landed here" flash — a soft ring
// plus a faint bg tint so the row reads as the focus of the view even
// against the section's own card border. Kept here (vs. in each section)
// so the highlight looks identical across Comments, Notes, Tasks and the
// Audit trail. The ring uses a low-opacity primary (not solid `--primary`,
// which is near-black slate-700) so it reads as a gentle highlight rather
// than a hard black outline; a slightly stronger bg tint carries the accent.
const HIGHLIGHT_CLASSES = [
  "ring-2",
  "ring-primary/40",
  "ring-offset-2",
  "ring-offset-background",
  "bg-primary/10",
  "transition-shadow",
] as const

const HIGHLIGHT_MS = 1800

/**
 * Drives notification-driven deep links: when the URL carries a
 * `#<source_entity_type>-<source_entity_id>` hash (set by
 * `shared/notifications/routing.ts`), scroll the matching row into
 * view and flash a highlight ring so the user can spot it.
 *
 * Re-runs whenever the hash or the supplied `ready` value changes —
 * `ready` is typically the loaded row count, since the DOM node only
 * exists after the list fetch resolves.
 *
 * **Auto-paging (infinite scroll)**: when the target row isn't in the DOM
 * yet and the caller supplies `hasMore` + `loadMore`, the hook calls
 * `loadMore()` and waits for the next `ready` tick, repeating until the row
 * appears or `hasMore` flips false. Used by sections still on infinite
 * scroll (e.g. the Activity feed).
 *
 * **Page-walk (numbered pagination)**: when the caller supplies `paginated`
 * ({ page, totalPages, setPage }) instead of `loadMore`, the hook walks the
 * numbered pages toward the target. On the first not-found tick for a hash
 * it restarts at page 1 (so a deep-link works even if the user was already
 * on a later page), then advances one page per tick until the row renders
 * on the current page — at which point it scrolls + flashes. This is the
 * page-walk fallback (no dedicated locate endpoint): correct, just chattier
 * for old rows. `isFetching` gates the walk so we advance one page at a
 * time rather than racing ahead of the in-flight fetch.
 *
 * Idempotent within a single hash: a ref tracks the last hash we
 * scrolled to so React's effect re-runs (e.g. re-fetches that bump
 * `ready` again after the user has already arrived) don't re-flash.
 *
 * Pass `expectedPrefix` to scope the hook to a section that owns one
 * source type — e.g. `expectedPrefix="comment"` in CommentSection
 * stops a `#note-<id>` hash from triggering on the wrong tab.
 */
export function useScrollToHashTarget(opts: {
  ready: number | boolean
  expectedPrefix?: string
  hasMore?: boolean
  isFetching?: boolean
  loadMore?: () => void | Promise<unknown>
  /** Numbered-pagination mode — supply instead of `hasMore`/`loadMore`.
   *  The hook page-walks toward the deep-linked row by calling `setPage`. */
  paginated?: {
    page: number
    totalPages: number
    setPage: (page: number) => void
  }
}): void {
  const { ready, expectedPrefix, hasMore, isFetching, loadMore, paginated } = opts
  const { hash } = useLocation()
  const lastHandledRef = useRef<string | null>(null)
  // Tracks the hash we've begun page-walking so we only reset to page 1 once
  // per deep-link (not on every not-found tick, which would loop on page 1).
  const walkStartedRef = useRef<string | null>(null)

  const page = paginated?.page
  const totalPages = paginated?.totalPages
  const setPage = paginated?.setPage

  useEffect(() => {
    if (!hash) return
    if (!ready) return

    const targetId = hash.startsWith("#") ? hash.slice(1) : hash
    if (!targetId) return
    if (expectedPrefix && !targetId.startsWith(`${expectedPrefix}-`)) return
    if (lastHandledRef.current === targetId) return

    const el = document.getElementById(targetId)
    if (!el) {
      // Row not on the current page. Two ways to reach it:
      if (paginated && setPage && page != null && totalPages != null) {
        // Numbered pagination → page-walk. First tick for this hash:
        // restart at page 1 so the walk is exhaustive even if the user
        // was already on a later page. Subsequent ticks: advance one page
        // (once the in-flight fetch settles) until the row renders.
        if (walkStartedRef.current !== targetId) {
          walkStartedRef.current = targetId
          if (page !== 1) {
            setPage(1)
            return
          }
        }
        if (!isFetching && page < totalPages) {
          setPage(page + 1)
        }
        return
      }
      // Infinite scroll → keep pulling pages until the row shows up or we
      // run out. Without `loadMore`, silent no-op.
      if (hasMore && !isFetching && loadMore) {
        void loadMore()
      }
      return
    }

    lastHandledRef.current = targetId
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    el.classList.add(...HIGHLIGHT_CLASSES)
    const timer = window.setTimeout(() => {
      el.classList.remove(...HIGHLIGHT_CLASSES)
    }, HIGHLIGHT_MS)
    return () => window.clearTimeout(timer)
  }, [
    hash,
    ready,
    expectedPrefix,
    hasMore,
    isFetching,
    loadMore,
    paginated,
    page,
    totalPages,
    setPage,
  ])
}
