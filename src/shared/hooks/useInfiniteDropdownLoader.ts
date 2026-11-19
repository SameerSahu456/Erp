import * as React from "react"

interface Args {
  /** Whether the popover containing the scroller is currently open. */
  open: boolean
  /** Live DOM ref for the scroll container — must be a callback-ref state
   *  value, not a `useRef`, so effects re-run when Radix re-mounts the
   *  popover content. */
  scrollerNode: HTMLDivElement | null
  /** Live DOM ref for the sentinel row rendered at the bottom of the
   *  list. Same callback-ref-state requirement as `scrollerNode`. */
  sentinelNode: HTMLDivElement | null
  hasNextPage: boolean | undefined
  isFetchingNextPage: boolean
  fetchNextPage: () => unknown | Promise<unknown>
  /** Total items loaded so far (sum of every page's items.length). Used
   *  as a dep on the auto-fetch layout effect so newly arrived pages
   *  trigger a re-measure (the just-loaded page may still not be enough
   *  to overflow the scroller). */
  loadedCount: number
}

/**
 * Robust infinite-scroll loader for popover-anchored async dropdowns.
 *
 * Three triggers stack so the next page fetches reliably regardless of
 * popover lifecycle timing:
 *
 *   1. **`onScroll`** — fires when the scroller actually scrolls past the
 *      "near bottom" threshold (80px). Wire onto the scroller div via the
 *      React JSX prop so React rebinds to the freshly mounted node every
 *      time Radix re-mounts the popover content.
 *   2. **`onWheel`** — when the loaded items already fit and the scroller
 *      can't move (no scroll event possible), a downward wheel still
 *      indicates intent to load more. Wire onto the same scroller div.
 *   3. **Auto-fetch (`useLayoutEffect` + double rAF)** — measures the
 *      scroller after the popover's enter animation settles. If the
 *      content fits without a scrollbar or already sits near the bottom,
 *      pull the next page immediately. Catches the close→reopen flake
 *      where IntersectionObserver attaches after Radix's transition
 *      completes and misses the in-view sentinel.
 *
 * Also runs the IntersectionObserver as the standard "scroll-into-view"
 * trigger.
 *
 * TanStack Query's `fetchNextPage` dedupes overlapping calls, so the
 * triple-firing is safe.
 */
export function useInfiniteDropdownLoader({
  open,
  scrollerNode,
  sentinelNode,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  loadedCount,
}: Args) {
  const fetchingRef = React.useRef(false)

  const requestNextPage = React.useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || fetchingRef.current) return
    fetchingRef.current = true
    const result = fetchNextPage()
    if (result && typeof result === "object" && "finally" in result) {
      void (result as Promise<unknown>).finally(() => {
        fetchingRef.current = false
      })
    } else {
      fetchingRef.current = false
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const onScroll = React.useCallback<React.UIEventHandler<HTMLDivElement>>(
    (e) => {
      if (!hasNextPage) return
      const el = e.currentTarget
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distance < 80) requestNextPage()
    },
    [hasNextPage, requestNextPage],
  )

  const onWheel = React.useCallback<React.WheelEventHandler<HTMLDivElement>>(
    (e) => {
      if (!hasNextPage || isFetchingNextPage) return
      if (e.deltaY <= 0) return
      const el = e.currentTarget
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distance < 80) requestNextPage()
    },
    [hasNextPage, isFetchingNextPage, requestNextPage],
  )

  React.useEffect(() => {
    if (!open || !scrollerNode || !sentinelNode || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) requestNextPage()
        }
      },
      { root: scrollerNode, rootMargin: "0px 0px 80px 0px", threshold: 0.01 },
    )
    observer.observe(sentinelNode)
    return () => observer.disconnect()
  }, [open, scrollerNode, sentinelNode, hasNextPage, requestNextPage])

  React.useLayoutEffect(() => {
    if (!open || !scrollerNode || !hasNextPage || isFetchingNextPage) return
    let cancelled = false
    function check() {
      if (cancelled || !scrollerNode || !hasNextPage || isFetchingNextPage)
        return
      const distance =
        scrollerNode.scrollHeight -
        scrollerNode.scrollTop -
        scrollerNode.clientHeight
      if (
        scrollerNode.scrollHeight <= scrollerNode.clientHeight ||
        distance < 80
      ) {
        requestNextPage()
      }
    }
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(check)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
    }
  }, [
    open,
    scrollerNode,
    hasNextPage,
    isFetchingNextPage,
    loadedCount,
    requestNextPage,
  ])

  return { onScroll, onWheel, requestNextPage }
}
