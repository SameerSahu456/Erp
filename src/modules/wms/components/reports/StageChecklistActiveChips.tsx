import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { TruncatedText } from "@/components/common/display/TruncatedText"

import type { StageChecklistReportView } from "../../hooks/reports/useStageChecklistReportView"
import { STAGE_CHECKLIST_REPORT_STRINGS as S } from "./stage-checklist-report.strings"

/** Result count + active-filter chips (§13 / §1): the user always sees what's
 *  narrowing the view and can drop one filter or all. */
export function StageChecklistActiveChips({
  view,
}: {
  view: StageChecklistReportView
}) {
  const { activeChips, report, resetAll } = view
  if (!(activeChips.length > 0 || !report.isLoading)) return null
  return (
    <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1.5">
      <Typography variant="helper" tone="muted" className="shrink-0 tabular-nums">
        {S.summary.resultCount(report.data?.total ?? 0)}
      </Typography>
      {activeChips.length > 0 && (
        <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
      )}
      {activeChips.map((chip, i) => (
        <Typography key={i} variant="caption" tone="default" asChild>
          <span className="inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-border bg-secondary/60 pl-2 pr-1">
            <TruncatedText value={chip.label} className="max-w-[200px]" />
            <button
              type="button"
              onClick={chip.onRemove}
              aria-label={S.filters.removeFilter(chip.label)}
              className="grid size-4 shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        </Typography>
      ))}
      {activeChips.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetAll}
          className="h-6 px-2 text-muted-foreground hover:text-foreground"
        >
          {S.filters.clearAll}
        </Button>
      )}
    </div>
  )
}
