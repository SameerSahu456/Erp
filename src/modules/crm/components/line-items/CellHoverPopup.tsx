/**
 * Read-only cell → full-value popup.
 *
 * In the read-only grid (Quote view, SO detail) every cell is a disabled,
 * single-line input that clips long values. Clicking a cell opens the SAME
 * centred modal the SO detail description used to have, showing the whole
 * value — rich text (headings, lists, pasted spec tables) when `html` is
 * given, plain text otherwise. Hover does nothing (2026-10-16: the resting-
 * pointer auto-open was removed — it kept throwing modals up while users
 * scanned the grid). Dismiss with Esc, the × or a click outside, like every
 * other dialog in the app.
 *
 * The plain-text value is read from the wrapped DOM at open time (the input's
 * value, else the cell's text), so callers don't have to plumb resolved
 * category / OEM names through just for the popup.
 *
 * A row inside a `CellLinkContext` (a rental SO's lines) links each cell
 * instead — see `CellLink`.
 */
import { useContext, useRef, useState, type ReactNode } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RichTextView } from "@/components/ui/rich-text-editor"
import { Typography } from "@/components/ui/typography"
import { stripHtml } from "@/lib/utils"

import { CellLink } from "./CellLink"
import { CellLinkContext } from "./cell-link-context"

interface CellHoverPopupProps {
  /** Off (edit mode) → children render untouched. */
  enabled: boolean
  /** Dialog heading — the cell's column label. */
  title: string
  /** Rich-text value (description). Takes precedence over the DOM text. */
  html?: string | null
  children: ReactNode
}

export function CellHoverPopup({ enabled, title, html, children }: CellHoverPopupProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const wrapRef = useRef<HTMLDivElement>(null)
  // A row that links its cells somewhere (see `CellLink`) opens that, not the modal.
  const href = useContext(CellLinkContext)

  if (!enabled) return <>{children}</>
  if (href) return <CellLink href={href}>{children}</CellLink>

  const hasHtml = !!html && stripHtml(html).trim().length > 0

  function resolveText(): string {
    const el = wrapRef.current
    if (!el) return ""
    const input = el.querySelector<HTMLInputElement>("input")
    return (input?.value ?? el.textContent ?? "").trim()
  }

  function tryOpen() {
    if (hasHtml) {
      setOpen(true)
      return
    }
    const t = resolveText()
    // Nothing to show for an empty cell or an em-dash placeholder.
    if (!t || t === "—" || t === "…") return
    setText(t)
    setOpen(true)
  }

  return (
    <>
      <div ref={wrapRef} className="cell-hover" onClick={tryOpen}>
        {children}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* The FRAME does not scroll — the body inside it does, so the ×
            and title stay put whatever the content width. */}
        <DialogContent className="flex max-h-[85vh] flex-col overflow-x-hidden overflow-y-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
            {hasHtml ? (
              // One horizontal scroller for the whole popup; pasted spec
              // tables keep their natural width (see RichTextView notes).
              <div className="no-scrollbar overflow-x-auto">
                <RichTextView
                  html={html ?? ""}
                  className="[&_table]:table! [&_table]:max-w-none! [&_table]:overflow-visible!"
                />
              </div>
            ) : (
              <Typography variant="body" className="whitespace-pre-wrap break-words">
                {text}
              </Typography>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
