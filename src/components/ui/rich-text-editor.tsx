import * as React from "react"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Underline as UnderlineIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

export interface RichTextEditorProps {
  /** Current value as an HTML string. */
  value: string
  /** Fires with the new HTML string on every edit. */
  onChange: (html: string) => void
  /** When true the surface is read-only and the toolbar is inert. */
  disabled?: boolean
  /** Placeholder shown while the editor is empty. */
  placeholder?: string
  /** Extra classes for the outer wrapper. */
  className?: string
}

interface ToolbarAction {
  cmd: string
  Icon: typeof Bold
  label: string
}

const TOOLBAR: readonly ToolbarAction[] = [
  { cmd: "bold", Icon: Bold, label: "Bold" },
  { cmd: "italic", Icon: Italic, label: "Italic" },
  { cmd: "underline", Icon: UnderlineIcon, label: "Underline" },
  { cmd: "insertUnorderedList", Icon: List, label: "Bullet list" },
  { cmd: "insertOrderedList", Icon: ListOrdered, label: "Numbered list" },
]

// Tags removed entirely (with their subtree) on paste — they either execute
// code or leak styles/behaviour into the rest of the app. Every other tag
// (tables, lists, spans, headings) survives with its inline `style=""`, so a
// copied quote table or a styled block still looks like itself; what gets
// stripped from those survivors is behaviour and source layout — see
// STRIP_ATTRS and DROP_STYLE_PROPS.
const DANGEROUS_TAGS = new Set([
  "SCRIPT",
  "STYLE", // a global <style> block would leak into the whole app
  "LINK",
  "META",
  "BASE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "FORM",
  "INPUT",
  "BUTTON",
  "TEXTAREA",
  "SELECT",
])

// Attributes stripped from every pasted element. These carry *behaviour and
// app layout*, never content:
//
// - `class` — Tailwind/app classes. Useless from an external page (its CSS
//   isn't loaded here) and actively harmful when the copy came from inside
//   this app: pasting a Description field re-applied `rte-content`,
//   `max-h-28`, `opacity-60`, borders and rings, so the paste rendered as a
//   dead greyed-out mini-editor nested inside the real one.
// - `contenteditable` — a pasted `contenteditable="false"` island cannot be
//   typed in or deleted normally. This is the "pasting doesn't help at all"
//   symptom.
// - `role` / `aria-*` / `data-*` — duplicate `role="textbox"` nodes and a
//   nested `data-placeholder` (which the `.rte-content:empty::before` rule
//   renders as ghost placeholder text).
// - `id` / `tabindex` / `spellcheck` / `draggable` / `hidden` — duplicate IDs,
//   stray tab stops, content hidden after paste.
//
// `aria-` and `data-` are matched by prefix; everything presentational
// (`style`, `href`, `src`, `alt`, `colspan`, `rowspan`, `align`, `width`, …)
// is kept so a copied quote table still renders as a table.
const STRIP_ATTRS = new Set([
  "class",
  "contenteditable",
  "role",
  "id",
  "tabindex",
  "spellcheck",
  "draggable",
  "hidden",
  "slot",
])

// Inline-style properties dropped on paste:
//
// - spacing/indent (`margin`, `padding`, `text-indent`, justified text) that
//   Word, Google Docs and web pages inject, which otherwise makes pasted text
//   land indented;
// - box/layout declarations that belong to the *source container*, not to the
//   content — sizes and scroll caps (`max-height: 112px` clipped the paste),
//   `overflow`, `opacity` (the greyed-out look), `flex`, positioning, and
//   `box-shadow` / `outline` / Tailwind's `--tw-*` internals.
//
// Everything genuinely visual (colour, background, font, weight, style,
// decoration, alignment, borders, `width`, `line-height`) is kept — matched by
// prefix so shorthands go too. `width` survives because pasted tables and
// images rely on it; `height` does not, since a fixed height clips text once
// it reflows to this field's narrower column.
const DROP_STYLE_PROPS =
  /^(margin|padding|text-indent|text-align\s*:\s*justify|max-height|min-height|height|max-width|min-width|overflow|opacity|box-shadow|outline|position|top|right|bottom|left|z-index|flex|order|--tw-)/

/** True for black / near-black / default text colours (Word's `windowtext`,
 *  `#000`, `rgb(0,0,0)`, dark greys). We drop these so plain text follows the
 *  app theme (dark on light, light on dark) instead of coming in hardcoded
 *  black — which would be invisible in dark mode. Real colours (red, blue …)
 *  are kept. */
function isBlackish(value: string): boolean {
  const c = value.trim().toLowerCase()
  if (c === "black" || c === "windowtext" || c === "#000" || c === "#000000") return true
  const near = (r: number, g: number, b: number) => r <= 45 && g <= 45 && b <= 45
  const rgb = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) return near(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]))
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, "$&$&") : hex[1]
    return near(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16))
  }
  return false
}

/** True for white / near-white surfaces (`#fff`, `rgb(255,255,255)`). The
 *  mirror of {@link isBlackish} for backgrounds: a copied card or table cell
 *  carries the source page's white surface, which in dark mode paints an
 *  unreadable white slab inside the field. Real highlights (yellow, soft
 *  red …) are kept. */
function isWhiteish(value: string): boolean {
  const c = value.trim().toLowerCase()
  if (c === "white" || c === "window" || c === "#fff" || c === "#ffffff") return true
  if (c === "transparent" || c === "none") return true
  const near = (r: number, g: number, b: number) => r >= 248 && g >= 248 && b >= 248
  const rgb = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) return near(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]))
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, "$&$&") : hex[1]
    return near(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16))
  }
  return false
}

/** Keep a pasted element's inline style but drop the indentation/spacing and
 *  box/layout declarations, any black/default text colour, and any white
 *  surface — so formatting survives without the foreign indent and plain text
 *  follows the theme in both light and dark mode. */
function cleanInlineStyle(style: string): string {
  // A copied app element carries `border-style`/`border-color` inline while its
  // border *width* came from a class we just stripped. Left alone, CSS falls
  // back to the `medium` (~3px) default and the paste renders inside a fat grey
  // box. So keep border colour/style only when this same rule also sets a
  // width — which is how real pasted tables (`border: 1px solid #000`) come.
  const hasBorderWidth =
    /(^|;)\s*border(-(top|right|bottom|left))?\s*:\s*[^;]*\d/.test(style) ||
    /(^|;)\s*border(-(top|right|bottom|left))?-width\s*:/.test(style)

  return style
    .split(";")
    .map((d) => d.trim())
    .filter((decl) => {
      if (!decl) return false
      const low = decl.toLowerCase()
      if (DROP_STYLE_PROPS.test(low)) return false
      if (!hasBorderWidth && /^border(-(top|right|bottom|left))?-(style|color)\s*:/.test(low)) {
        return false
      }
      const color = low.match(/^color\s*:\s*(.+)$/)
      if (color && isBlackish(color[1])) return false
      const background = low.match(/^background(-color)?\s*:\s*(.+)$/)
      if (background && isWhiteish(background[2])) return false
      // `font-size: medium` is the browser's *default* keyword, emitted by the
      // clipboard serializer rather than chosen by anyone — honouring it would
      // paste 16px text into a 13.5px field. Real sizes (14px, 1.2em, large)
      // are kept.
      if (/^font-size\s*:\s*(medium|inherit|initial|unset)$/.test(low)) return false
      return true
    })
    .join("; ")
}

/**
 * Sanitise a pasted HTML fragment while preserving its structure and styling.
 * The user wants what they copied — tables stay tables, colours/widths in
 * inline `style` survive — so we keep all presentational markup and strip only
 * what's unsafe (script-bearing tags, `on*` handlers, `javascript:` URLs) and
 * what belongs to the source page rather than the content (behavioural
 * attributes per STRIP_ATTRS, layout/spacing declarations per
 * DROP_STYLE_PROPS). Disallowed tags are removed with their subtree (not
 * unwrapped) since they carry no display value.
 */
function sanitizePastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")

  const clean = (node: Node): void => {
    // Walk a static copy — we mutate `childNodes` as we go.
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement
        if (DANGEROUS_TAGS.has(el.tagName)) {
          el.remove()
          continue
        }
        // Strip unsafe + behavioural attributes, keep presentational ones
        // (style, align, colspan, width, …). See STRIP_ATTRS for why `class`
        // and `contenteditable` have to go.
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase()
          const value = attr.value.trim().toLowerCase()
          const isEventHandler = name.startsWith("on")
          const isJsUrl =
            (name === "href" || name === "src" || name === "xlink:href") &&
            value.startsWith("javascript:")
          const isBehavioural =
            STRIP_ATTRS.has(name) || name.startsWith("aria-") || name.startsWith("data-")
          if (isEventHandler || isJsUrl || isBehavioural) {
            el.removeAttribute(attr.name)
          } else if (name === "style") {
            const cleaned = cleanInlineStyle(attr.value)
            if (cleaned) el.setAttribute("style", cleaned)
            else el.removeAttribute("style")
          }
        }
        clean(el)
      } else if (
        child.nodeType !== Node.TEXT_NODE &&
        child.nodeType !== Node.ELEMENT_NODE
      ) {
        // Drop comments, processing instructions, etc.
        child.remove()
      }
    }
  }

  clean(doc.body)

  // Layout wrappers that carried nothing but `class`/`style` (a flex column, a
  // spacer cell) are now empty `<div>`/`<span>` shells that still render as
  // blank lines. Drop them — but keep anything holding a line break or media,
  // since `<div><br></div>` IS an intentional empty line in contentEditable.
  for (const el of Array.from(doc.body.querySelectorAll("div, span"))) {
    const hasText = !!el.textContent?.trim()
    const hasVisual = !!el.querySelector("br, img, hr, table, svg, video, audio")
    if (!hasText && !hasVisual) el.remove()
  }

  return doc.body.innerHTML
}

/**
 * Lightweight rich-text editor — a `contentEditable` surface plus a small
 * formatting toolbar (bold / italic / underline / bullet + numbered lists).
 * It stores and emits an HTML string via `value` / `onChange`.
 *
 * Intentionally dependency-free: it drives the native `document.execCommand`
 * formatting API, so no editor library has to be added to the project. The
 * trade-off is that `execCommand` is a legacy API — adequate for a basic
 * description field; swap in a dedicated editor lib if richer behaviour is
 * ever needed.
 */
function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Add description…",
  className,
}: RichTextEditorProps) {
  const ref = React.useRef<HTMLDivElement>(null)

  // Push the external value into the DOM only when it diverges AND the user
  // isn't actively typing — writing `innerHTML` while the surface is focused
  // would reset the caret to the start on every keystroke.
  //
  // The incoming value is sanitised with the same pass as a paste, so records
  // saved before the sanitiser tightened (app chrome, `contenteditable="false"`
  // islands) open as clean, editable content instead of a frozen block. The
  // normalised markup is written back on the user's next edit.
  React.useEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el) return
    const next = sanitizePastedHtml(value ?? "")
    if (el.innerHTML !== next) el.innerHTML = next
  }, [value])

  const emit = React.useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML)
  }, [onChange])

  const run = (cmd: string) => {
    if (disabled) return
    ref.current?.focus()
    document.execCommand(cmd, false)
    emit()
  }

  // Intercept paste so we control exactly what lands in the value. We prefer
  // the clipboard's HTML (sanitised but structure-preserving — tables, styles
  // and all) and fall back to escaped plain text when no HTML is available.
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    const html = e.clipboardData.getData("text/html")
    const text = e.clipboardData.getData("text/plain")
    const safe = html
      ? sanitizePastedHtml(html)
      : // No HTML on the clipboard — escape the plain text and keep line breaks.
        text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\r?\n/g, "<br>")
    document.execCommand("insertHTML", false, safe)
    emit()
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[7px] border border-input bg-card shadow-xs",
        "focus-within:border-primary focus-within:ring-3 focus-within:ring-ring",
        // Dim when disabled, but DON'T set `pointer-events-none` on the whole
        // wrapper — that would also block scrolling the (read-only) content
        // area. Editing is already prevented by `contentEditable={false}` and
        // the toolbar buttons' own `disabled` attr, so the value stays
        // read-only while remaining scrollable + selectable.
        disabled && "opacity-60",
        className,
      )}
    >
      <div className="flex items-center gap-0.5 border-b border-input bg-muted/40 px-1 py-0.5">
        {TOOLBAR.map(({ cmd, Icon, label }) => (
          <button
            key={cmd}
            type="button"
            aria-label={label}
            title={label}
            // `preventDefault` on mousedown keeps the editor's text selection
            // alive while the toolbar button is pressed — a normal click
            // would blur the editor first and drop the selection.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(cmd)}
            disabled={disabled}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        className={cn(
          "rte-content max-h-28 min-h-[56px] overflow-y-auto px-2.5 py-2 text-[13.5px] leading-snug outline-none",
          // While editing, wrap long words and never scroll sideways. In the
          // read-only (view) state, allow horizontal scrolling so wide content
          // (long unbroken strings, wide tables, <pre>) can be panned L↔R
          // instead of being clipped.
          disabled ? "overflow-x-auto" : "overflow-x-hidden break-words",
        )}
      />
    </div>
  )
}

export interface RichTextViewProps {
  /** Stored rich-text value (HTML). */
  html?: string | null
  /** Clamp to this many lines with a Show more / less toggle. Omit for full. */
  lines?: 2 | 3 | 4
  className?: string
  showMoreLabel?: string
  showLessLabel?: string
}

/**
 * Read-only render of a rich-text value: the HTML with its pasted styling intact
 * (tables, colours, inline `style`), sanitised the same way as on paste so it
 * reads the way it was entered instead of stripped to plain text. Optionally
 * clamps to `lines` with a Show more / less toggle. The read-only counterpart to
 * {@link RichTextEditor}.
 */
function RichTextView({
  html,
  lines,
  className,
  showMoreLabel = "Show more",
  showLessLabel = "Show less",
}: RichTextViewProps) {
  const clean = React.useMemo(() => sanitizePastedHtml(html ?? ""), [html])
  const [expanded, setExpanded] = React.useState(false)
  const [overflowing, setOverflowing] = React.useState(false)
  // Pixel height that ends exactly at the bottom of line `lines` — null when
  // the content fits (no cap, no toggle).
  const [capPx, setCapPx] = React.useState<number | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)

  // Re-clamp when the content changes so the toggle re-measures.
  const [prev, setPrev] = React.useState(clean)
  if (prev !== clean) {
    setPrev(clean)
    setExpanded(false)
  }

  // Clamp by height (not `line-clamp`) so it works across the block children
  // rich text produces (paragraphs, lists, tables). The cap is MEASURED from
  // the rendered text lines rather than guessed as `lines × 1.6em`: the real
  // line-height and paragraph margins vary, and a guessed cap cut the next
  // line in half. Layout positions don't depend on the cap, so this measures
  // the same whether collapsed or not; a ResizeObserver re-measures when a
  // width change re-wraps the text.
  const collapsed = !!lines && !expanded

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || !lines) return
    const measure = () => {
      const originTop = el.getBoundingClientRect().top
      const boxes: Array<{ top: number; bottom: number }> = []
      const range = document.createRange()
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue
        range.selectNodeContents(node)
        for (const r of Array.from(range.getClientRects())) {
          if (r.height > 0) boxes.push({ top: r.top - originTop, bottom: r.bottom - originTop })
        }
      }
      // A fragment starting in the upper half of the current row is on that
      // row (mixed font sizes); anything lower starts the next row. Tops, not
      // overlap, so a tight line-height can't merge two rows.
      boxes.sort((a, b) => a.top - b.top)
      const rows: Array<{ top: number; bottom: number }> = []
      for (const b of boxes) {
        const last = rows[rows.length - 1]
        if (last && b.top < last.top + (last.bottom - last.top) / 2) {
          last.bottom = Math.max(last.bottom, b.bottom)
        } else {
          rows.push({ ...b })
        }
      }
      const fits = rows.length <= lines
      setOverflowing(!fits)
      // Cut midway between the last shown row and the first hidden one, so
      // the shown row keeps its descenders and none of the next row peeks in.
      setCapPx(fits ? null : Math.floor((rows[lines - 1].bottom + rows[lines].top) / 2))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [clean, lines])

  if (!clean.trim()) return null

  return (
    <div className={cn("min-w-0 max-w-full", className)}>
      <div
        ref={ref}
        className={cn(
          // Wrap everything to the container so pasted content never overflows
          // sideways: break long words, cap child widths, let wide tables /
          // <pre> scroll inside their own box instead of spilling the column.
          "rte-content max-w-full break-words [overflow-wrap:anywhere]",
          "[&_*]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto",
          collapsed && capPx != null && "overflow-hidden",
        )}
        style={collapsed && capPx != null ? { maxHeight: capPx } : undefined}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
      {lines && (overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex text-xs text-primary transition-colors hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {expanded ? showLessLabel : showMoreLabel}
        </button>
      )}
    </div>
  )
}

export { RichTextEditor, RichTextView }
