import { AsyncSelect } from "@/components/ui/async-select"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangePicker } from "@/components/common/pickers/DateRangePicker"
import { toDateParam } from "@shared/lib/date"
import type { CategoryShort, Part } from "@modules/ims"
import {
  usePurchaseOrderOptions,
  type PurchaseOrderListItem,
} from "@modules/procurement"
import type { UserListItem } from "@modules/users"
import { partOptionDescription } from '@modules/ims'

import type { ReportStage } from "../../api/reports"
import type { StageChecklistReportView } from "../../hooks/reports/useStageChecklistReportView"
import { STAGE_CHECKLIST_REPORT_STRINGS as S } from "./stage-checklist-report.strings"
import {
  ALL,
  STAGES,
  engineerLabel,
  partLabel,
  poLabel,
  singleStageLabel,
  useEngineerPickerOptions,
  usePartPickerOptions,
} from "./stage-checklist-report-helpers"

// Result filter value → its label (PAGE-UI §7.2 — never the raw value).
const RESULT_FILTER_LABELS: Record<string, string> = {
  pass: S.filters.resultPass,
  fail: S.filters.resultFail,
  na: S.filters.resultNa,
}

/** The record pickers — Category (full width), PO, Part, Engineer. */
function RecordPickers({ view }: { view: StageChecklistReportView }) {
  const { update } = view
  return (
    <>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="scr-category">{S.filters.category}</Label>
        {/* API-backed list → AsyncSelect (§16.11 / §7.2 shows the name). */}
        <AsyncSelect<CategoryShort>
          id="scr-category"
          value={view.categoryOption}
          onValueChange={(next) => {
            view.setCategoryOption(next)
            update({ category_id: next?.id })
          }}
          useOptions={view.useCategoryOptions}
          toLabel={(c) => c.name}
          allOption={S.filters.allCategories}
          placeholder={S.filters.allCategories}
          searchPlaceholder={S.filters.searchCategory}
          searchable
          clearable
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{S.filters.po}</Label>
        <AsyncSelect<PurchaseOrderListItem>
          value={view.poOption}
          onValueChange={(next) => {
            view.setPoOption(next)
            update({ po_id: next?.id })
          }}
          useOptions={usePurchaseOrderOptions}
          toLabel={poLabel}
          allOption={S.filters.allPos}
          placeholder={S.filters.allPos}
          searchPlaceholder={S.filters.searchPo}
          searchable
          clearable
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{S.filters.part}</Label>
        <AsyncSelect<Part>
          value={view.partOption}
          onValueChange={(next) => {
            view.setPartOption(next)
            update({ part_id: next?.id })
          }}
          useOptions={usePartPickerOptions}
          toLabel={partLabel}
          getDescription={partOptionDescription}
          allOption={S.filters.allParts}
          placeholder={S.filters.allParts}
          searchPlaceholder={S.filters.searchPart}
          searchable
          clearable
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{S.filters.engineer}</Label>
        <AsyncSelect<UserListItem>
          value={view.engineerOption}
          onValueChange={(next) => {
            view.setEngineerOption(next)
            update({ engineer_id: next?.id })
          }}
          useOptions={useEngineerPickerOptions}
          toLabel={engineerLabel}
          allOption={S.filters.allEngineers}
          placeholder={S.filters.allEngineers}
          searchPlaceholder={S.filters.searchEngineer}
          searchable
          clearable
        />
      </div>
    </>
  )
}

/** Filter controls inside the FiltersPopover grid; Category spans full width (§7.2). */
export function StageChecklistFilterControls({
  view,
}: {
  view: StageChecklistReportView
}) {
  const { filters, update, dateRange } = view
  return (
    <>
      <RecordPickers view={view} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="scr-stage">{S.filters.stage}</Label>
        <Select
          value={filters.stage?.length === 1 ? filters.stage[0] : ALL}
          onValueChange={(v) =>
            update({ stage: v === ALL ? STAGES : [v as ReportStage] })
          }
        >
          <SelectTrigger id="scr-stage" className="w-full">
            {/* Show the stage label, not the raw value (PAGE-UI §7.2). */}
            <SelectValue placeholder={S.filters.allStages}>
              {singleStageLabel(filters.stage) ?? S.filters.allStages}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{S.filters.allStages}</SelectItem>
            <SelectItem value="inspection">{S.filters.inspection}</SelectItem>
            <SelectItem value="repair">{S.filters.repair}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="scr-result">{S.filters.result}</Label>
        <Select
          value={filters.result?.[0] ?? ALL}
          onValueChange={(v) =>
            update({ result: v === ALL ? undefined : [v as string] })
          }
        >
          <SelectTrigger id="scr-result" className="w-full">
            {/* Show the result label, not the raw value (PAGE-UI §7.2). */}
            <SelectValue placeholder={S.filters.allResults}>
              {RESULT_FILTER_LABELS[filters.result?.[0] ?? ""] ?? S.filters.allResults}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{S.filters.allResults}</SelectItem>
            <SelectItem value="pass">{S.filters.resultPass}</SelectItem>
            <SelectItem value="fail">{S.filters.resultFail}</SelectItem>
            <SelectItem value="na">{S.filters.resultNa}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="scr-dates">{S.filters.dateRange}</Label>
        <DateRangePicker
          id="scr-dates"
          value={dateRange}
          placeholder={S.filters.dateRangePlaceholder}
          onChange={(next) => {
            view.setDateRange(next)
            update({
              from_date: next?.from ? toDateParam(next.from) : undefined,
              to_date: next?.to ? toDateParam(next.to) : undefined,
            })
          }}
          clearable
        />
      </div>
    </>
  )
}
