/**
 * Read-only cell → hyperlink, instead of `CellHoverPopup`'s full-value modal.
 *
 * A surface that wants every cell of a line to open somewhere (a rental SO's
 * cells open that line's units in Device Tracking) provides the line's href
 * through `CellLinkContext` (`cell-link-context.ts`), once per row; every
 * `CellHoverPopup` inside that row then renders this link instead of its modal.
 *
 * Not an `<a>`: the cell holds a disabled input, and interactive content inside
 * an anchor is invalid HTML. A `role="link"` wrapper keeps link semantics —
 * focusable, Enter to follow, Ctrl/⌘/middle click opens a new tab.
 */
import type { KeyboardEvent, MouseEvent, ReactNode } from "react"
import { useNavigate } from "react-router-dom"

export function CellLink({ href, children }: { href: string; children: ReactNode }) {
  const navigate = useNavigate()
  const follow = (newTab: boolean) => {
    if (newTab) window.open(href, "_blank", "noopener")
    else navigate(href)
  }
  return (
    <div
      role="link"
      tabIndex={0}
      className="cell-hover cell-link cursor-pointer [&_input]:cursor-pointer [&_input]:text-primary"
      onClick={(e: MouseEvent) => follow(e.metaKey || e.ctrlKey)}
      onAuxClick={(e: MouseEvent) => e.button === 1 && follow(true)}
      onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && follow(false)}
    >
      {children}
    </div>
  )
}
