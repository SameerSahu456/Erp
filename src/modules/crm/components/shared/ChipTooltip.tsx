import type { ReactNode } from "react"

import { CellTooltip } from "./CellTooltip"

// Styled hover tooltip for a filter chip (replaces the native `title=`): the filter's
// name alone when nothing is selected, "Name: value" once something is — the chip
// itself truncates, so this is where the full selection reads.
export function ChipTooltip({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children: ReactNode
}) {
  return (
    <CellTooltip text={value ? `${label}: ${value}` : label} className="w-full">
      {children}
    </CellTooltip>
  )
}
