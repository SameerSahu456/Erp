import { cn } from "@/lib/utils"

import { CellTooltip } from "./CellTooltip"

// Order-type pill tints — semantic tokens only. Unknown tags fall back to the
// neutral pill so a new order type never renders unstyled.
const ORDER_TYPE_PILL: Record<string, string> = {
  New: "bg-success-soft text-success",
  Refurb: "bg-info-soft text-info",
  Rental: "bg-violet-soft text-violet",
}
const NEUTRAL_PILL = "bg-secondary/70 text-accent-foreground"

const PILL_BASE = "inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-snug"

// Kanban card row: the lead/deal type as a neutral pill on the left, the order
// type(s) as tinted pills on the right. Renders nothing when both are empty.
export function CardTypeRow({
  type,
  orderTypes,
  className,
}: {
  type?: string | null
  orderTypes: readonly string[]
  className?: string
}) {
  if (!type && orderTypes.length === 0) return null
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      {type ? (
        <CellTooltip text={type} className="min-w-0 shrink">
          <span className={cn(PILL_BASE, NEUTRAL_PILL)}>{type}</span>
        </CellTooltip>
      ) : (
        <span />
      )}
      {orderTypes.length > 0 && (
        <div className="flex min-w-0 flex-wrap justify-end gap-1">
          {orderTypes.map((tag) => (
            <CellTooltip key={tag} text={tag} className="min-w-0 max-w-full">
              <span className={cn(PILL_BASE, ORDER_TYPE_PILL[tag] ?? NEUTRAL_PILL)}>{tag}</span>
            </CellTooltip>
          ))}
        </div>
      )}
    </div>
  )
}
