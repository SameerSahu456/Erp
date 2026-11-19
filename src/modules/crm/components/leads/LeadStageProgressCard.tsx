import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { cn } from "@/lib/utils"
import { formatIST_date } from "@shared/lib/date"

import type { Lead } from "../../types"
import { leadStageLabel } from "../../constants/lead-stages"
import { LEADS_STRINGS as S } from "./leads.strings"

const formatDate = (dateStr: string) => formatIST_date(dateStr)

interface LeadStageProgressCardProps {
  lead: Lead
  isLost: boolean
  isRejected: boolean
  lostReason: { reason: string; notes: string } | null
  rejectedByName: string | null
  currentStageIndex: number
  pipelineStages: readonly string[]
}

export function LeadStageProgressCard({
  lead,
  isLost,
  isRejected,
  lostReason,
  rejectedByName,
  currentStageIndex,
  pipelineStages,
}: LeadStageProgressCardProps) {
  return (
    <Card size="sm" className="data-[size=sm]:py-3 data-[size=sm]:gap-2">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {S.detail.stageProgress.title}
          </p>
          {!isLost && !isRejected && (
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
              {Math.max(currentStageIndex + 1, 1)} / {pipelineStages.length}
            </span>
          )}
        </div>
        {isLost ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusBadge variant="error">{S.detail.stageProgress.closedLost}</StatusBadge>
              {!lostReason && (
                <span className="text-sm text-muted-foreground">{S.detail.stageProgress.markedLost}</span>
              )}
            </div>
            {lostReason && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 space-y-1.5">
                <p className="text-sm break-words">
                  <span className="font-medium text-foreground">{S.detail.stageProgress.lostReasonLabel}</span>{" "}
                  <span className="text-muted-foreground">{lostReason.reason}</span>
                </p>
                {lostReason.notes && (
                  <p className="text-sm break-words">
                    <span className="font-medium text-foreground">{S.detail.stageProgress.notesLabel}</span>{" "}
                    <span className="text-muted-foreground">{lostReason.notes}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
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
                      {leadStageLabel(stage)}
                    </span>
                  </div>
                )
              })}
            </div>
            {isRejected && (
              <div className="flex items-center gap-2">
                <StatusBadge variant="error">{S.detail.stageProgress.rejected}</StatusBadge>
                <span className="text-sm text-muted-foreground">{S.detail.stageProgress.rejectedMessage}</span>
              </div>
            )}
            {isRejected && lead.rejectionReason && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 space-y-1.5">
                <p className="text-sm break-words">
                  <span className="font-medium text-foreground">{S.detail.stageProgress.reasonLabel}</span>{" "}
                  <span className="text-muted-foreground">{lead.rejectionReason}</span>
                </p>
                {lead.rejectionNotes && (
                  <p className="text-sm break-words">
                    <span className="font-medium text-foreground">{S.detail.stageProgress.notesLabel}</span>{" "}
                    <span className="text-muted-foreground">{lead.rejectionNotes}</span>
                  </p>
                )}
                {lead.rejectedBy && lead.rejectedAt && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-destructive/10">
                    {S.detail.stageProgress.rejectedByOn(
                      rejectedByName ?? S.detail.stageProgress.unknownUser,
                      formatDate(lead.rejectedAt),
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
