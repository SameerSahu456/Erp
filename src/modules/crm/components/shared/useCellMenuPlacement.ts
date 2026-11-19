import { useEffect, useState, type RefObject } from "react"

/** Tallest the scrolling list inside a cell menu gets. */
export const MENU_LIST_MAX = 240
/** Room the menu needs below the input before it flips above it. */
const MENU_FLIP_AT = 200
/** Gap between the input edge and the menu, plus the viewport margin kept. */
const MENU_GAP = 2
const MENU_MARGIN = 8

export interface DropPlacement {
  left: number
  minWidth: number
  /** Height budget for the scrolling list, so the menu never runs off-screen. */
  maxHeight: number
  /** One of these is set: `top` when the menu opens below the input, `bottom`
   *  (distance from the viewport bottom) when it opens above. */
  top?: number
  bottom?: number
}

export function placeMenu(r: DOMRect, minWidth = 240): DropPlacement {
  const spaceBelow = window.innerHeight - r.bottom - MENU_GAP - MENU_MARGIN
  const spaceAbove = r.top - MENU_GAP - MENU_MARGIN
  const base = { left: r.left, minWidth: Math.max(r.width, minWidth) }
  if (spaceBelow < MENU_FLIP_AT && spaceAbove > spaceBelow) {
    return {
      ...base,
      bottom: window.innerHeight - r.top + MENU_GAP,
      maxHeight: Math.max(120, Math.min(MENU_LIST_MAX, spaceAbove)),
    }
  }
  return {
    ...base,
    top: r.bottom + MENU_GAP,
    maxHeight: Math.max(120, Math.min(MENU_LIST_MAX, spaceBelow)),
  }
}

/**
 * Viewport placement for a portalled, `position: fixed` cell dropdown.
 *
 * Re-measured on every scroll (any ancestor — the grid's own scroller
 * included) and resize while `open`, so the menu stays glued to its input
 * rather than being left at the spot it opened at, and flips above the input
 * when a row near the bottom of the viewport has no room below.
 */
export function useCellMenuPlacement(
  open: boolean,
  inputRef: RefObject<HTMLElement | null>,
  minWidth: number,
) {
  const [placement, setPlacement] = useState<DropPlacement>({
    left: 0,
    top: 0,
    minWidth,
    maxHeight: MENU_LIST_MAX,
  })

  function measure() {
    const el = inputRef.current
    if (el) setPlacement(placeMenu(el.getBoundingClientRect(), minWidth))
  }

  useEffect(() => {
    if (!open) return
    const onMove = () => {
      const el = inputRef.current
      if (el) setPlacement(placeMenu(el.getBoundingClientRect(), minWidth))
    }
    // Capture phase so scrolls inside any scroll container are seen.
    window.addEventListener("scroll", onMove, true)
    window.addEventListener("resize", onMove)
    return () => {
      window.removeEventListener("scroll", onMove, true)
      window.removeEventListener("resize", onMove)
    }
  }, [open, inputRef, minWidth])

  return { placement, measure }
}
