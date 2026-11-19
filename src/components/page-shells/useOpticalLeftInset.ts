import { useLayoutEffect, useRef } from 'react'

// Optical left alignment.
//
// A glyph's ink starts a little INSIDE its text box (its left side bearing). The
// gap grows with font size and differs by letter shape (a round "C" has less than
// a straight "L"), so two lines of text that share a box edge still look like they
// start at different x positions. This hook measures the real bearing of the first
// letter and pulls the text left by exactly that much, so the ink itself starts on
// the container edge — whatever the font size or first letter.

const RASTER_SCALE = 16 // 1/16 px accuracy
const RASTER_SIZE = 48 // css px square — comfortably holds one glyph up to ~30px
const INK_ALPHA = 96

const bearingCache = new Map<string, number>()

/** How far (css px) the ink of `char` starts to the right of its text-box edge. */
function measureLeftBearing(char: string, style: CSSStyleDeclaration): number {
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const key = `${font}|${char}`
  const cached = bearingCache.get(key)
  if (cached !== undefined) return cached

  const canvas = document.createElement('canvas')
  canvas.width = RASTER_SIZE * RASTER_SCALE
  canvas.height = RASTER_SIZE * RASTER_SCALE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return 0

  const originX = 8
  ctx.scale(RASTER_SCALE, RASTER_SCALE)
  ctx.font = font
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(char, originX, RASTER_SIZE * 0.75)

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let bearing = 0
  scan: for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (data[(y * width + x) * 4 + 3] > INK_ALPHA) {
        bearing = x / RASTER_SCALE - originX
        break scan
      }
    }
  }

  // A bearing is a small positive number; anything else means the measure failed
  // (font not ready, glyph not drawable) — leave the text where it is.
  const safe = bearing > 0 && bearing < parseFloat(style.fontSize) * 0.25 ? bearing : 0
  bearingCache.set(key, safe)
  return safe
}

function firstTextParent(root: HTMLElement): HTMLElement | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent?.trim()) return node.parentElement
  }
  return null
}

/**
 * Returns a ref for the element whose first visible letter should start flush on
 * its left edge. `text` is the string the element renders (its first letter is the
 * one measured). `extraPx` shifts the text by a further fixed amount (positive =
 * right) after the bearing is removed. Re-measures once web fonts finish loading.
 *
 * The margin is set on the ref'd element itself, which should be a block-level
 * wrapper: a negative margin on an inline child inside a shrink-to-fit box makes
 * the box narrower than its text and the text wraps.
 */
export function useOpticalLeftInset<T extends HTMLElement>(
  text: string | undefined,
  extraPx = 0,
) {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const firstChar = text?.trim()[0]
    if (!el || !firstChar) return

    let cancelled = false
    const apply = () => {
      const host = firstTextParent(el)
      if (cancelled || !host) return
      const bearing = measureLeftBearing(firstChar, getComputedStyle(host))
      const inset = extraPx - bearing
      el.style.marginLeft = inset ? `${inset}px` : ''
    }
    apply()
    void document.fonts?.ready.then(apply)

    return () => {
      cancelled = true
      el.style.marginLeft = ''
    }
  }, [text, extraPx])

  return ref
}
