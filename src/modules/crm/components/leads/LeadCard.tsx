import { memo } from "react"

import { Badge } from "@/components/ui/badge"
import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { formatClosureCountdown } from "@shared/lib/date"

import type { Lead } from "../../types"
import { CellTooltip } from "../shared/CellTooltip"
import { CardTypeRow } from "../shared/CardTypeRow"
import { isClosedStage, priorityVariant } from "../../lib/stage-styles"

export const LeadCard = memo(function LeadCard({
  lead,
  onOpen,
}: {
  lead: Lead
  onOpen: (id: string) => void
}) {
  // Show the lead's owner (assigned_to user) on the card. The list endpoint
  // ships `{id, name}` for the assigned user so we can render the name
  // directly — no per-card /users lookup needed.
  const ownerLabel = lead.owner
  // Hide the closure countdown once the lead is Closed Won / Closed Lost —
  // the outcome is settled, so a forward-looking date is meaningless.
  const closure = isClosedStage(lead.stage) ? null : formatClosureCountdown(lead.closureDate)
  return (
    <div
      className="cpt-kcard cursor-pointer pb-[6px]!"
      onClick={() => onOpen(lead.id)}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="mt-[2px] min-w-0 flex-1">
          <CellTooltip text={lead.company}>
            <Typography variant="card-title" truncate className="uppercase">
              {lead.company}
            </Typography>
          </CellTooltip>
          <CellTooltip text={lead.name}>
            <Typography variant="card-meta" truncate className="mt-0.5">
              {lead.name}
            </Typography>
          </CellTooltip>
        </div>
        <Badge
          variant={priorityVariant(lead.priority)}
          title={lead.priority}
          aria-label={`Priority: ${lead.priority}`}
          className="size-6 shrink-0 justify-center p-0 text-[10px] leading-none"
        >
          {lead.priority.charAt(0)}
        </Badge>
      </div>

      <CardTypeRow className="mt-[3px]" type={lead.customerType} orderTypes={lead.tags ?? []} />

      <Typography variant="card-meta" tone="default" className="mt-1 block text-right font-normal leading-normal tabular-nums">
        {formatINRShort(lead.value ?? 0)}
      </Typography>

      <div className="mt-1 flex items-center gap-1.5 border-t border-border/60 pt-[3px] text-[11px] text-muted-foreground">
        <CellTooltip text={ownerLabel} className="max-w-[50%] truncate">{ownerLabel}</CellTooltip>
        {closure && (
          <Typography
            variant="caption"
            className={cn(
              "ml-auto shrink-0 font-medium tabular-nums",
              closure.isOverdue ? "text-destructive" : "text-success",
            )}
          >
            {closure.text}
          </Typography>
        )}
      </div>
    </div>
  )
})
