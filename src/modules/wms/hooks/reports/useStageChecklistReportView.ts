import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"

import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import {
  makeStaticAsyncOptions,
  type AsyncSelectOption,
} from "@/components/ui/async-select"
import { todayDateParam } from "@shared/lib/date"
import { useAllCategoriesShort, type CategoryShort } from "@modules/ims"

import {
  exportStageChecklistReport,
  type StageChecklistReportParams,
} from "../../api/reports"
import { useWarehouseScope } from "../../context/warehouse-scope"
import { errMsg } from "../../errorMessage"
import { useStageChecklistReport } from "./useStageChecklistReport"
import { STAGE_CHECKLIST_REPORT_STRINGS as S } from "../../components/reports/stage-checklist-report.strings"
import {
  defaultViewMode,
  useStageChecklistColumns,
  type ReportViewMode,
} from "../../components/reports/useStageChecklistColumns"
import {
  INITIAL,
  STAGES,
  singleStageLabel,
} from "../../components/reports/stage-checklist-report-helpers"
import {
  buildActiveChips,
  dateChipLabel,
  resultChipLabel,
  type ActiveChip,
} from "./stage-checklist-report-view-helpers"
import { saveBlob } from '@/shared/lib/saveBlob'

export type { ActiveChip }

/** All state for the Stage Checklist report page. */
export function useStageChecklistReportView() {
  const [filters, setFilters] = useState<StageChecklistReportParams>(INITIAL)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  // null = follow the automatic default; a value = the user overrode it.
  const [viewOverride, setViewOverride] = useState<ReportViewMode | null>(null)
  const [exporting, setExporting] = useState(false)
  // AsyncSelect keeps the label on the value so the trigger still renders when
  // the picked row is not on the currently loaded page.
  const [poOption, setPoOption] = useState<AsyncSelectOption | null>(null)
  const [partOption, setPartOption] = useState<AsyncSelectOption | null>(null)
  const [engineerOption, setEngineerOption] =
    useState<AsyncSelectOption | null>(null)
  const [categoryOption, setCategoryOption] =
    useState<AsyncSelectOption | null>(null)

  const categories = useAllCategoriesShort({ isActive: true })
  // §16.11: AsyncSelect over the already-fetched categories, no extra request.
  const useCategoryOptions = useMemo(
    () =>
      makeStaticAsyncOptions<CategoryShort>(categories.data ?? [], (c) => c.name),
    [categories.data],
  )

  // Navbar warehouse scope; the backend also limits to the user's own assignments.
  const { selectedWarehouseIds } = useWarehouseScope()
  const scopedFilters = useMemo(
    () => ({
      ...filters,
      warehouse_ids: selectedWarehouseIds.length
        ? selectedWarehouseIds
        : undefined,
    }),
    [filters, selectedWarehouseIds],
  )

  const report = useStageChecklistReport(scopedFilters)

  const autoMode = defaultViewMode(
    Boolean(filters.category_id),
    report.data?.columns.length ?? 0,
  )
  const mode = viewOverride ?? autoMode
  const grid = useStageChecklistColumns(report.data, mode)

  // Any filter change resets to page 1 — otherwise a narrowed result set lands
  // on an empty page 3 and reads as "no data".
  const update = (patch: Partial<StageChecklistReportParams>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))

  const resetAll = useCallback(() => {
    setPoOption(null)
    setPartOption(null)
    setEngineerOption(null)
    setCategoryOption(null)
    setDateRange(undefined)
    setFilters(INITIAL)
  }, [])

  // §1.1-K: a warehouse change resets the whole view (render-phase, not an effect).
  const warehouseKey = selectedWarehouseIds.join(",")
  const [lastWarehouseKey, setLastWarehouseKey] = useState(warehouseKey)
  if (lastWarehouseKey !== warehouseKey) {
    setLastWarehouseKey(warehouseKey)
    resetAll()
  }

  const onExport = async () => {
    setExporting(true)
    try {
      const blob = await exportStageChecklistReport(scopedFilters)
      saveBlob(blob, `stage-checklist-${todayDateParam()}.csv`)
    } catch (err) {
      // Surfaces REPORT_EXPORT_TOO_LARGE verbatim — it names the fix.
      toast.error(errMsg(err, S.errors.exportFailed))
    } finally {
      setExporting(false)
    }
  }

  // Rows but no checklist columns is a DIFFERENT situation from no rows.
  const noChecklistsYet =
    (report.data?.rows.length ?? 0) > 0 && grid.checklistColumnCount === 0

  const activeChips = buildActiveChips({
    category: categoryOption,
    po: poOption,
    part: partOption,
    engineer: engineerOption,
    stage: singleStageLabel(filters.stage),
    result: resultChipLabel(filters.result),
    date: dateChipLabel(dateRange),
    onRemove: {
      category: () => {
        setCategoryOption(null)
        update({ category_id: undefined })
      },
      po: () => {
        setPoOption(null)
        update({ po_id: undefined })
      },
      part: () => {
        setPartOption(null)
        update({ part_id: undefined })
      },
      engineer: () => {
        setEngineerOption(null)
        update({ engineer_id: undefined })
      },
      stage: () => update({ stage: STAGES }),
      result: () => update({ result: undefined }),
      date: () => {
        setDateRange(undefined)
        update({ from_date: undefined, to_date: undefined })
      },
    },
  })

  return {
    filters,
    setFilters,
    update,
    resetAll,
    dateRange,
    setDateRange,
    mode,
    setViewOverride,
    exporting,
    onExport,
    report,
    grid,
    noChecklistsYet,
    activeChips,
    useCategoryOptions,
    categoryOption,
    setCategoryOption,
    poOption,
    setPoOption,
    partOption,
    setPartOption,
    engineerOption,
    setEngineerOption,
  }
}

export type StageChecklistReportView = ReturnType<typeof useStageChecklistReportView>
