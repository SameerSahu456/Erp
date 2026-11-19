import { useCallback, useEffect, useRef, useState } from "react"

// Horizontal scroll behaviour shared by the CRM pivots (Category × Brand,
// Category — Period Comparison): native bar hidden, frozen leading column(s),
// edge cues and a slim thumb that covers only the columns that scroll. Pair
// with <PivotMiniScrollbar> and the `cpt-pivot-*` classes (comprint.css).

/** Which edges of the scroller still have content behind them.
 *
 *  The native scrollbar is hidden, so this drives the cues that replace it:
 *  that the matrix runs past the right edge, that — once you have scrolled —
 *  columns are hidden to the left under the frozen category column, and the
 *  mini scroll indicator's thumb (`thumb`: size and offset as fractions of
 *  the track). Each cue shows ONLY while it is true; a table that fits
 *  renders with no extra chrome at all.
 *
 *  Recomputed on scroll AND on resize: the card changes width with the grid
 *  breakpoints and with the sidebar collapsing, either of which can turn a
 *  scrolling table into a fitting one without a scroll event ever firing. */
export function usePivotScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const [thumb, setThumb] = useState({ size: 1, offset: 0, inset: 0 })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    // No end padding. It used to pad the scroller so the far-right stop also
    // landed on a column start, but that left up to a column's width of blank
    // card after TOTAL. The table now ends flush at TOTAL; at the far end the
    // column under the frozen category column may be partly covered.
    const maxScroll = el.scrollWidth - el.clientWidth
    const left = el.scrollLeft > 1
    // 1px of slack: sub-pixel layout means scrollLeft rarely lands exactly on
    // maxScroll, and without it the right cue never quite switches off.
    const right = el.scrollLeft < maxScroll - 1
    // The frozen category column never moves, so the indicator only covers
    // the brand columns that actually scroll: it starts where they start and
    // its thumb is sized against their width, not the whole table's.
    // Width of the frozen block — one column on the Category × Brand pivot,
    // two (# + Category) on the Category — Period Comparison. SUM the frozen
    // cells of one row: widths are layout-stable, whereas a sticky cell's
    // `offsetLeft` shifts with the scroll and would drag the divider across.
    const frozenRow = el.querySelector<HTMLElement>(".cpt-pivot-frozen")?.parentElement
    const inset = frozenRow
      ? Array.from(frozenRow.querySelectorAll<HTMLElement>(":scope > .cpt-pivot-frozen")).reduce(
          (width, cell) => width + cell.offsetWidth,
          0,
        )
      : 0
    const visible = el.clientWidth - inset
    const total = el.scrollWidth - inset
    const size = total > 0 ? Math.min(visible / total, 1) : 1
    const offset = maxScroll > 0 ? (el.scrollLeft / maxScroll) * (1 - size) : 0
    // Bail out when nothing changed. This runs on EVERY scroll event — every
    // pixel of a pan, every frame of a snap animation, every stray pixel of
    // sideways drift while the page scrolls past — and a fresh state object
    // each time re-rendered the whole matrix (hundreds of cells) for nothing.
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
    setThumb((prev) =>
      prev.size === size && prev.offset === offset && prev.inset === inset
        ? prev
        : { size, offset, inset },
    )
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const unlock = attachWheelAxisLock(el)
    return () => {
      ro.disconnect()
      unlock()
    }
  }, [measure])

  return { ref, edges, thumb, measure }
}

// Axis lock for trackpad gestures.
//
// A hard vertical flick on a trackpad is never perfectly vertical: it carries
// a few pixels of sideways delta. The browser latches the gesture onto the
// pivot (it can scroll in x), hands it that sideways delta, and the
// `scroll-snap-type: x mandatory` on the scroller then turns three pixels of
// drift into a whole-column jump — the matrix "shifts left" when all the user
// did was scroll the page hard.
//
// PASSIVE, deliberately. The first version cancelled the event, which needs a
// non-passive listener — and a non-passive wheel listener makes the browser
// wait for the main thread before it can scroll the page at all, for every
// wheel event over the card. That read as the page lagging whenever the cursor
// reached a pivot. A passive listener never blocks the scroll.
//
// So instead of blocking the pan, the lock takes snapping away for the
// duration of a vertical-intent gesture: without snap, the drift stays the
// few pixels it really is. When the gesture goes quiet the scroller is put
// back exactly where it was and snapping is restored — so the net effect of a
// page scroll on the matrix is nothing at all. Horizontal-intent events are
// untouched: the matrix pans and snaps as before.
const GESTURE_QUIET_MS = 150

function attachWheelAxisLock(el: HTMLElement): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let restoreTo: number | undefined

  const settle = () => {
    timer = undefined
    if (restoreTo === undefined) return
    el.scrollLeft = restoreTo
    restoreTo = undefined
    el.style.scrollSnapType = ""
  }

  const onWheel = (e: WheelEvent) => {
    if (e.deltaX === 0 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
    if (restoreTo === undefined) {
      restoreTo = el.scrollLeft
      el.style.scrollSnapType = "none"
    }
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(settle, GESTURE_QUIET_MS)
  }

  el.addEventListener("wheel", onWheel, { passive: true })
  return () => {
    el.removeEventListener("wheel", onWheel)
    if (timer !== undefined) clearTimeout(timer)
    settle()
  }
}
