import type * as React from "react"

/** A slim (4px) scroll indicator shown under the pivot's scrolling brand
 *  columns (right of the frozen category column) in place of the native bar. The thumb mirrors the scroller's position; clicking
 *  or dragging anywhere on the track pans the matrix to that point. */
export function PivotMiniScrollbar({
  scrollRef,
  thumb,
}: {
  scrollRef: React.RefObject<HTMLElement | null>
  thumb: { size: number; offset: number; inset: number }
}) {
  const scrollTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    // Centre the thumb on the pointer, clamped to the track.
    const half = thumb.size / 2
    const pos = Math.min(Math.max((e.clientX - rect.left) / rect.width, half), 1 - half)
    const fraction = thumb.size < 1 ? (pos - half) / (1 - thumb.size) : 0
    el.scrollLeft = fraction * (el.scrollWidth - el.clientWidth)
  }

  return (
    <div
      aria-hidden
      className="relative h-1 cursor-pointer touch-none rounded-full"
      style={{ marginLeft: thumb.inset }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        scrollTo(e)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) scrollTo(e)
      }}
    >
      <div
        className="absolute inset-y-0 rounded-full bg-gray-500 hover:bg-gray-600"
        style={{ width: `${thumb.size * 100}%`, left: `${thumb.offset * 100}%` }}
      />
    </div>
  )
}
