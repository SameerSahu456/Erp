import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert a rich-text HTML string to plain text for compact list-cell
// rendering. Uses the browser's own HTML parser so `&amp;`, `&nbsp;`, etc.
// decode properly and tag attributes can't bleed through. Whitespace is
// collapsed so a `<p>foo</p><p>bar</p>` cell reads as "foo bar".
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ""
  const doc = new DOMParser().parseFromString(html, "text/html")
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim()
}

/**
 * What the user actually typed into a controlled input whose DOM value was
 * `prev` before the keystroke. A single insertion / deletion / paste at the
 * caret is `prev` with one contiguous run replaced, so stripping the common
 * prefix and suffix leaves exactly that run. Used by the typeahead cells to
 * start a fresh search when a keystroke lands while the list is closed but
 * the input still shows the selected label.
 */
export function typedDelta(prev: string, next: string): string {
  let prefix = 0
  while (prefix < prev.length && prefix < next.length && prev[prefix] === next[prefix]) prefix++
  let suffix = 0
  while (
    suffix < prev.length - prefix &&
    suffix < next.length - prefix &&
    prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) suffix++
  return next.slice(prefix, next.length - suffix)
}
