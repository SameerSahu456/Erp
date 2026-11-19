import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { cn } from "@/lib/utils"

import { dealStageLabel } from "../../constants/deal-stages"
import { DEALS_STRINGS } from "./deals.strings"

interface DealStageProgressCardProps {
  isClosedLost: boolean
  lostReason: { reason: string; notes: string } | null
  currentStageIndex: number
  pipelineStages: readonly string[]
}

export function DealStageProgressCard({
  isClosedLost,
  lostReason,
  currentStageIndex,
  pipelineStages,
}: DealStageProgressCardProps) {
  return (
    <Card size="sm" className="data-[size=sm]:py-3 data-[size=sm]:gap-2">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {DEALS_STRINGS.detail.stageProgress.title}
          </p>
          {!isClosedLost && (
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
              {Math.max(currentStageIndex + 1, 1)} / {pipelineStages.length}
            </span>
          )}
        </div>
        {isClosedLost ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusBadge variant="error">{DEALS_STRINGS.detail.stageProgress.closedLost}</StatusBadge>
              {!lostReason && (
                <span className="text-sm text-muted-foreground">{DEALS_STRINGS.detail.stageProgress.closedLostMessage}</span>
              )}
            </div>
            {lostReason && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 space-y-1.5">
                <p className="text-sm break-words">
                  <span className="font-medium text-foreground">{DEALS_STRINGS.detail.stageProgress.lostReasonLabel}</span>{" "}
                  <span className="text-muted-foreground">{lostReason.reason}</span>
                </p>
                {lostReason.notes && (
                  <p className="text-sm break-words">
                    <span className="font-medium text-foreground">{DEALS_STRINGS.detail.stageProgress.notesLabel}</span>{" "}
                    <span className="text-muted-foreground">{lostReason.notes}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-stretch gap-1">
            {pipelineStages.map((stage, index) => {
              const isActive = index === currentStageIndex
              const isCompleted = index < currentStageIndex
              return (
                <div key={stage} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "h-[3px] w-full rounded-full transition-all",
                      isCompleted && "bg-status-success-text",
                      isActive && "bg-status-success-text shadow-[0_0_0_2px_color-mix(in_srgb,var(--success)_18%,transparent)]",
                      !isCompleted && !isActive && "bg-muted"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-ui leading-tight",
                      isActive
                        ? "font-semibold text-status-success-text"
                        : isCompleted
                          ? "text-foreground/80"
                          : "text-muted-foreground"
                    )}
                  >
                    {dealStageLabel(stage)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
