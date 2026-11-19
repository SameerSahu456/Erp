import { Info, Layers, SearchX } from "lucide-react"

import { BusinessMetricsTable } from "@/components/common/tables/BusinessMetricsTable"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import { FiltersPopover } from "@/components/common/forms/FiltersPopover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PAGINATION } from "@shared/constants/pagination"

import { WMS_LIST_MAX_CELL_CHARS } from "../../constants"
import type { StageChecklistReportView } from "../../hooks/reports/useStageChecklistReportView"
import { STAGE_CHECKLIST_REPORT_STRINGS as S } from "./stage-checklist-report.strings"
import { cellFormatter } from "./stage-checklist-report-helpers"
import { StageChecklistFilterControls } from "./StageChecklistFilterControls"

/** Empty slot: a load error must not look like "no results" (§12); hidden while loading or with rows. */
function ReportEmptyNode({ view }: { view: StageChecklistReportView }) {
  const { report, resetAll } = view
  if (report.isError)
    return <LoadErrorState error={report.error} fallback={S.errors.loadFailed} />
  return (
    <EmptyState
      icon={SearchX}
      title={S.empty.title}
      description={S.empty.hint}
      action={{ label: S.filters.clear, onClick: resetAll }}
    />
  )
}

/** The view hints (summary / no checklists yet) and the report grid itself. */
export function StageChecklistGrid({ view }: { view: StageChecklistReportView }) {
  const { report, grid, filters, setFilters, activeChips, resetAll, mode } = view
  const showEmpty = !(report.isLoading || (report.data?.rows.length ?? 0) > 0)

  // `value` stays set while any filter is active so clear-filters detection still works.
  const filtersToolbarEntry = {
    key: "report-filters",
    label: S.filters.filters,
    value: activeChips.length > 0 ? "active" : "",
    options: [],
    render: () => (
      <FiltersPopover activeCount={activeChips.length} onClear={resetAll}>
        <StageChecklistFilterControls view={view} />
      </FiltersPopover>
    ),
  }

  return (
    <>
      {mode === "summary" && !filters.category_id && (
        <Alert className="border-info/30 bg-info-soft">
          <Info className="text-info" />
          <AlertTitle>{S.hints.summaryTitle}</AlertTitle>
          <AlertDescription>
            {S.hints.summaryBecauseMultiCategory}
          </AlertDescription>
        </Alert>
      )}

      {view.noChecklistsYet && (
        <Alert className="border-info/30 bg-info-soft">
          <Layers className="text-info" />
          <AlertTitle>{S.hints.noChecklistsTitle}</AlertTitle>
          <AlertDescription>{S.hints.noChecklistsYet}</AlertDescription>
        </Alert>
      )}

      <div className="bmt-search-md">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          cellFormatter={cellFormatter}
          tabs={[
            {
              id: "devices",
              label: S.table.tabLabel,
              columns: grid.columns,
              data: grid.data,
            },
          ]}
          emptyNode={showEmpty ? <ReportEmptyNode view={view} /> : undefined}
          onClearFilters={resetAll}
          toolbarFilters={[filtersToolbarEntry]}
          onToolbarFilterChange={() => {}}
          serverPagination={{
            page: filters.page ?? 1,
            pageSize: filters.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
            total: report.data?.total ?? 0,
            isFetching: report.isFetching,
            onPageChange: (page) => setFilters((p) => ({ ...p, page })),
            onPageSizeChange: (size) =>
              setFilters((p) => ({ ...p, page_size: size, page: 1 })),
          }}
        />
      </div>
    </>
  )
}
