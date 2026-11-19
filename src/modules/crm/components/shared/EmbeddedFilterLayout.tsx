import type { ReactNode } from "react"

import { CrmFilterAside } from "./CrmFilterAside"

interface EmbeddedFilterLayoutProps {
  open: boolean
  onClose: () => void
  /** How many sidebar filters are applied (the badge on the sidebar heading). */
  activeFilterCount: number
  /** The sidebar controls — a `CrmListFilterPanel`. */
  aside: ReactNode
  /** The tab content: toolbar + table. */
  children: ReactNode
}

// The list pages' "sidebar beside the table" frame, for the embedded tabs on the
// Account / Lead / Deal detail pages (Deals, Quotes, Sales Orders). The tab keeps
// its own open/closed state and passes the toggle to `EmbeddedListToolbar`.
export function EmbeddedFilterLayout({
  open,
  onClose,
  activeFilterCount,
  aside,
  children,
}: EmbeddedFilterLayoutProps) {
  return (
    <div className="flex items-start">
      <CrmFilterAside
        open={open}
        activeFilterCount={activeFilterCount}
        onClose={onClose}
        // Clears the sticky record header (global 3.5rem + entity header) on the detail pages.
        stickyTop="top-[9.5rem]"
        maxHeight="max-h-[max(16rem,calc(100dvh-11rem))]"
      >
        {aside}
      </CrmFilterAside>
      {/* Same as the Accounts index: the sidebar card beside a solid card holding the
          toolbar + table (the tab itself draws no outer card — see `bare`). */}
      <div className="min-w-0 flex-1 space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        {children}
      </div>
    </div>
  )
}
