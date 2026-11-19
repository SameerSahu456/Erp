import { Download } from "lucide-react"

import { ListPageShell } from "@/components/page-shells"
import { Button } from "@/components/ui/button"

import { useStageChecklistReportView } from "../../hooks/reports/useStageChecklistReportView"
import { STAGE_CHECKLIST_REPORT_STRINGS as S } from "./stage-checklist-report.strings"
import { StageChecklistActiveChips } from "./StageChecklistActiveChips"
import { StageChecklistGrid } from "./StageChecklistGrid"

/** Stage Checklist report — thin shell over useStageChecklistReportView. */
export function StageChecklistReportBody() {
  const view = useStageChecklistReportView()
  const { mode, setViewOverride, onExport, exporting, report } = view

  return (
    <ListPageShell
      title={S.page.title}
      subtitle={S.page.subtitle}
      actions={
        <div className="flex items-center gap-2">
          {/* Grid ⇄ Summary view toggle — a view control, not a filter, so it
              lives with the page actions rather than in the Filters popover. */}
          <Button
            variant="outline"
            onClick={() => setViewOverride(mode === "grid" ? "summary" : "grid")}
          >
            {mode === "grid" ? S.actions.toSummary : S.actions.toGrid}
          </Button>
          <Button onClick={onExport} disabled={exporting || report.isLoading}>
            <Download className="size-4" data-icon="inline-start" />
            {exporting ? S.actions.exporting : S.actions.export}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <StageChecklistActiveChips view={view} />
        <StageChecklistGrid view={view} />
      </div>
    </ListPageShell>
  )
}
