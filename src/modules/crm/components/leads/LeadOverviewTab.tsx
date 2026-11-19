import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { Lead } from "../../types"
import { LeadInfoCard } from "./LeadInfoCard"
import { LEADS_STRINGS as S } from "./leads.strings"
import { LeadStageProgressCard } from "./LeadStageProgressCard"

interface LeadOverviewTabProps {
  lead: Lead
  stage: {
    isLost: boolean
    isRejected: boolean
    lostReason: { reason: string; notes: string } | null
    rejectedByName: string | null
    currentStageIndex: number
    pipelineStages: readonly string[]
  }
  assignedToName: string | null
  presalesManagerName: string | null
}

export function LeadOverviewTab({
  lead,
  stage,
  assignedToName,
  presalesManagerName,
}: LeadOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Categories */}
      {lead.categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-ui text-muted-foreground">{S.detail.overview.categoriesLabel}</span>
          {lead.categories.map((cat) => (
            <Badge key={cat} variant="secondary">{cat}</Badge>
          ))}
        </div>
      )}

      {/* OEMs */}
      {(lead.oems?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-ui text-muted-foreground">{S.detail.overview.oemsLabel}</span>
          {lead.oems!.map((oem) => (
            <Badge key={oem} variant="secondary">{oem}</Badge>
          ))}
        </div>
      )}

      {/* Stage Progress — below categories */}
      <LeadStageProgressCard
        lead={lead}
        isLost={stage.isLost}
        isRejected={stage.isRejected}
        lostReason={stage.lostReason}
        rejectedByName={stage.rejectedByName}
        currentStageIndex={stage.currentStageIndex}
        pipelineStages={stage.pipelineStages}
      />

      {/* Lead Info Card */}
      <LeadInfoCard
        lead={lead}
        assignedToName={assignedToName}
        presalesManagerName={presalesManagerName}
      />

      {/* Description Card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>{S.detail.overview.descriptionTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {lead.description ? (
            <div
              className="rte-content -mr-1 max-h-60 overflow-y-auto pr-1 text-sm leading-relaxed text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: lead.description }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>

      {/* Quick-notes card removed — that data was sourced from the
          structured `lead.notes` JSON which is no longer populated by
          the form. The Notes tab (NotesSection) is the source of truth. */}
    </div>
  )
}
