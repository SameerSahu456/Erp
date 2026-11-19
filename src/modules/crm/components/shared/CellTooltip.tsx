import type { CSSProperties, ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface CellTooltipProps {
  /** Tooltip body — usually the full, un-ellipsized value. */
  text: ReactNode
  children: ReactNode
  /** Classes for the trigger wrapper (carry `truncate` / `max-w-*` here). */
  className?: string
  style?: CSSProperties
}

// Column-header label with the full text on hover — the same styled tooltip the
// data table uses for `headerHelp`, so a header that ellipsises in a narrow tab
// is still readable.
export function HeadTooltip({ label }: { label: string }) {
  return (
    <CellTooltip text={label} className="truncate">
      {label}
    </CellTooltip>
  )
}

// Styled hover tooltip for table cells — the CRM replacement for the native
// `title=` attribute, so every column shows the same tooltip as the data
// table's plain-text cells (`renderCellContent`). The wrapper is a block
// span so a `truncate` / `max-w-*` class on it keeps the ellipsis behaviour.
export function CellTooltip({ text, children, className, style }: CellTooltipProps) {
  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger render={<span className={cn("block min-w-0", className)} style={style} />}>
          {children}
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
