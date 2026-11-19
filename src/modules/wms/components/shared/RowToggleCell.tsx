import { ChevronRight } from "lucide-react"

import { TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"

/** Chevron cell that expands / collapses a table row's detail row. */
export function RowToggleCell({
  open,
  onToggle,
  expandLabel,
  collapseLabel,
}: {
  open: boolean
  onToggle: () => void
  expandLabel: string
  collapseLabel: string
}) {
  return (
    <TableCell className="w-8 px-2">
      <button
        type="button"
        onClick={(e) => {
          // The row may toggle on click too — don't fire twice.
          e.stopPropagation()
          onToggle()
        }}
        aria-expanded={open}
        aria-label={open ? collapseLabel : expandLabel}
        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight
          className={cn("size-4 transition-transform", open && "rotate-90")}
        />
      </button>
    </TableCell>
  )
}
