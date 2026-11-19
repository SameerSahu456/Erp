import { memo } from "react"

import { Badge } from "@/components/ui/badge"
import { Typography } from "@/components/ui/typography"
import { formatINRShort } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { formatClosureCountdown } from "@shared/lib/date"

import { dealValueToNumber, type DealListItem } from "../../api"
import { CellTooltip } from "../shared/CellTooltip"
import { CardTypeRow } from "../shared/CardTypeRow"
import { isClosedStage, priorityVariant } from "../../lib/stage-styles"
import { accountLabel, ownerLabel } from "../../hooks/deals/useDealsBoard"

export const DealCard = memo(function DealCard({
  deal,
  onOpen,
}: {
  deal: DealListItem
  onOpen: (id: string) => void
}) {
  const owner = ownerLabel(deal)
  // Hide the closure countdown once the deal is Closed Won / Closed Lost —
  // the outcome is settled, so a forward-looking date is meaningless.
  const closure = isClosedStage(deal.stage) ? null : formatClosureCountdown(deal.estimated_closure_date)
  return (
    <div
      className="cpt-kcard cursor-pointer pb-[6px]!"
      onClick={() => onOpen(deal.id)}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="mt-[2px] min-w-0 flex-1">
          <CellTooltip text={accountLabel(deal)}>
            <Typography variant="card-title" truncate>
              {accountLabel(deal)}
            </Typography>
          </CellTooltip>
          <CellTooltip text={deal.contact_details?.name ?? "—"}>
            <Typography variant="card-meta" truncate className="mt-0.5">
              {deal.contact_details?.name ?? "—"}
            </Typography>
          </CellTooltip>
          {/* <Typography variant="card-meta" truncate className="mt-0.5">
            {deal.title}
          </Typography> */}
        </div>
        <Badge
          variant={priorityVariant(deal.priority)}
          title={deal.priority}
          aria-label={`Priority: ${deal.priority}`}
          className="size-6 shrink-0 justify-center p-0 text-[10px] leading-none"
        >
          {deal.priority.charAt(0)}
        </Badge>
      </div>
      <CardTypeRow className="mt-[3px]" type={deal.channel_type} orderTypes={deal.tags ?? []} />

      <Typography variant="card-meta" tone="default" className="mt-1 block text-right font-normal leading-normal tabular-nums">
        {formatINRShort(dealValueToNumber(deal.value))}
      </Typography>

      <div className="mt-1 flex items-center gap-1.5 border-t border-border/60 pt-[3px] text-[11px] text-muted-foreground">
        <CellTooltip text={owner} className="max-w-[50%] truncate">{owner}</CellTooltip>
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
