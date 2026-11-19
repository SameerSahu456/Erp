import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { useDealDetail } from "../../hooks/deals/useDealDetail"
import { DealInfoCard } from "./DealInfoCard"
import { DealStageProgressCard } from "./DealStageProgressCard"
import { DEALS_STRINGS } from "./deals.strings"

type Detail = ReturnType<typeof useDealDetail>

interface DealOverviewTabProps {
  deal: NonNullable<Detail["deal"]>
  detail: Detail
}

export function DealOverviewTab({ deal, detail }: DealOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Categories */}
      {deal.categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-ui text-muted-foreground">{DEALS_STRINGS.detail.overview.categoriesLabel}</span>
          {deal.categories.map((cat) => (
            <Badge key={cat} variant="secondary">{cat}</Badge>
          ))}
        </div>
      )}

      {/* OEMs */}
      {(deal.oems?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-ui text-muted-foreground">{DEALS_STRINGS.detail.overview.oemsLabel}</span>
          {deal.oems!.map((oem) => (
            <Badge key={oem} variant="secondary">{oem}</Badge>
          ))}
        </div>
      )}

      {/* Stage Progress — below categories */}
      <DealStageProgressCard
        isClosedLost={detail.isClosedLost}
        lostReason={detail.lostReason}
        currentStageIndex={detail.currentStageIndex}
        pipelineStages={detail.pipelineStages}
      />

      {/* Deal Info Card */}
      <DealInfoCard
        deal={deal}
        contactSpoc={detail.contactSpoc}
        activeStage={detail.activeStage}
        displayValue={detail.displayValue}
      />

      {/* Description Card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>{DEALS_STRINGS.detail.overview.descriptionTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {deal.description ? (
            <div
              className="rte-content -mr-1 max-h-60 overflow-y-auto pr-1 text-sm leading-relaxed text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: deal.description }}
            />
          ) : (
            <p className="text-sm text-muted-foreground/70 italic">
              {DEALS_STRINGS.detail.overview.descriptionEmpty}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes Card — sources from deals.notes (separate from the Notes
          activity tab). Hidden when empty so the layout doesn't get a
          ghost card on every deal. */}
      {deal.notes && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{DEALS_STRINGS.detail.overview.notesTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {deal.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
