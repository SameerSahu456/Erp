import { createContext, useContext, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Filter, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

interface CrmFilterAsideProps {
  open: boolean
  activeFilterCount: number
  onClose?: () => void
  /** Where the pinned sidebar sticks (Tailwind `top-*`). Default sits 1rem under the
   *  56px global header; pages with a second sticky bar (record detail tabs) pass a
   *  larger offset. Never the literal `top-14` (see the note below). */
  stickyTop?: string
  /** Matching max height so the panel never exceeds the visible area. */
  maxHeight?: string
  /** The filter controls — a module-specific panel or inline <Select>s. */
  children: ReactNode
}

// Where `CrmFilterAsideClearAll` renders: the aside's own footer, which sits OUTSIDE
// the scrolling controls. Pages keep placing the Clear all button as the last child
// of their panel; it is portalled down to the footer, so nothing scrolls under it.
const FooterTargetContext = createContext<HTMLElement | null>(null)

// Pinned filter sidebar shared by every CRM list filter aside — leads, deals,
// rejected-leads, accounts, contacts, quotes, sales orders.
//
// It stays in view while the page scrolls: the wrapper is `sticky` just under the
// global header (3.5rem) with a 1rem gap, and the panel is capped to the visible
// height — the "Filters" heading stays put and only the controls scroll inside.
// Notes (see CRM_FILTER_ASIDE_STICKY_PLAN.md in the docs repo):
//  * sticky goes on the wrapper itself — it is the one `overflow-hidden` element
//    (needed for the width animation), so a sticky *child* would pin to it instead
//    of the window;
//  * `self-start` so a flex row does not stretch it to full row height;
//  * `top-[4.5rem]`, never the literal `top-14` (comprint.css restyles
//    `.sticky.top-14` as entity-header chrome).
export function CrmFilterAside({
  open,
  activeFilterCount,
  onClose,
  stickyTop = "top-[4.5rem]",
  maxHeight = "max-h-[max(16rem,calc(100dvh-5.5rem))]",
  children,
}: CrmFilterAsideProps) {
  const [footerEl, setFooterEl] = useState<HTMLDivElement | null>(null)
  return (
    <div
      className={cn(
        "sticky z-10 shrink-0 self-start overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none",
        stickyTop,
        // Closed: collapse the height too. The panel inside is up to a viewport tall,
        // and a width-only collapse left that height in the flex row, pushing a blank
        // band under short lists.
        open ? "mr-3 w-64 opacity-100" : "h-0 w-0 opacity-0",
      )}
      inert={!open}
    >
      <aside className={cn("flex w-64 shrink-0 flex-col rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.04)]", maxHeight)}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <h3 className="text-[13px] font-semibold tracking-tight">
              {CRM_SHARED_STRINGS.filterAside.heading}
            </h3>
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="h-[18px] min-w-[18px] justify-center px-1.5 text-[10px]"
              >
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={onClose}
            aria-label={CRM_SHARED_STRINGS.filterAside.close}
          >
            <X className="size-3.5" />
          </button>
        </div>
        {/* Only the controls scroll, and the scrollbar is hidden outright (it would
            otherwise take width and make the inputs narrower than the header).
            Scroll chaining is left on: once the controls hit their top or bottom,
            the same wheel / swipe scrolls the PAGE, so nobody has to leave the
            sidebar to move on. The side padding keeps focus rings from being clipped. */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FooterTargetContext.Provider value={footerEl}>{children}</FooterTargetContext.Provider>
        </div>
        {/* Footer for the pinned "Clear all" — empty (so hidden) when no filter is active. */}
        <div
          ref={setFooterEl}
          className="shrink-0 border-t border-border bg-card px-5 py-3 empty:hidden"
        />
      </aside>
    </div>
  )
}

/** "Clear all" for a filter aside, pinned in the aside's footer (below the scrolling
 *  controls) so it stays reachable however many filters the panel has. Render it
 *  anywhere inside the aside's children, only when a filter is active. */
export function CrmFilterAsideClearAll({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  const footerEl = useContext(FooterTargetContext)
  if (!footerEl) return null
  return createPortal(
    <Button variant="outline" size="sm" onClick={onClick} className="w-full">
      <X className="mr-1.5 size-3.5" />
      {children}
    </Button>,
    footerEl,
  )
}
