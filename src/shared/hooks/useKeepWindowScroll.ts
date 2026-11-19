import { useEffect, useLayoutEffect, useRef } from "react"

/**
 * Keep the page's vertical scroll steady across a `key`-driven remount of a
 * tall child (e.g. the kanban board snapping a rejected drop back). The
 * remount briefly collapses the content height, so the browser clamps
 * `window.scrollY` and the page jumps up; this puts it back before paint.
 */
export function useKeepWindowScroll(remountKey: number | string): void {
  const lastY = useRef(0)
  const prevKey = useRef(remountKey)

  // Track the real offset from scroll events — the clamp that follows a
  // remount fires its event after the layout effect below has already run.
  useEffect(() => {
    lastY.current = window.scrollY
    const onScroll = () => {
      lastY.current = window.scrollY
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useLayoutEffect(() => {
    if (prevKey.current === remountKey) return
    prevKey.current = remountKey
    window.scrollTo({ top: lastY.current })
  }, [remountKey])
}
