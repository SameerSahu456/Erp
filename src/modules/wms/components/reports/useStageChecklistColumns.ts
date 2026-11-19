import { useMemo } from "react"

import type { ColumnDef } from "@/components/common/tables/BusinessMetricsTable"

import type { ChecklistReportResponse } from "../../api/reports"
import { STAGE_CHECKLIST_REPORT_STRINGS as S } from "./stage-checklist-report.strings"

export type ReportViewMode = "grid" | "summary"

/** Above this many checklist columns the grid stops being readable, so the
 *  summary view is offered as the default. The user can still switch. */
export const WIDE_GRID_THRESHOLD = 25

// Fixed identity columns (spec §3). Everything to the right of these is
// driven by the response's `columns`, which is runtime data.
const IDENTITY_COLUMNS: ColumnDef[] = [
  { key: "part_name", label: S.columns.partName },
  { key: "part_number", label: S.columns.partCode },
  { key: "category_name", label: S.columns.category, filterable: true },
  { key: "variant_name", label: S.columns.variant },
  { key: "internal_serial", label: S.columns.deviceId },
  { key: "manufacturer_serial", label: S.columns.mfgSerial },
  { key: "stage", label: S.columns.stage, filterable: true },
  { key: "engineer_name", label: S.columns.engineer },
  { key: "completed_at", label: S.columns.date },
  { key: "result", label: S.columns.result, filterable: true },
  {
    key: "checklist_stage",
    label: S.columns.checklistFrom,
    filterable: true,
    headerHelp: S.columns.checklistFromHelp,
  },
  {
    key: "cycles",
    label: S.columns.cycles,
    align: "right",
    headerHelp: S.columns.cyclesHelp,
  },
]

const SUMMARY_COLUMNS: ColumnDef[] = [
  { key: "__checks", label: S.columns.checks },
  {
    key: "__failed",
    label: S.columns.failed,
    headerHelp: S.columns.failedHelp,
  },
]

export interface StageChecklistGrid {
  columns: ColumnDef[]
  data: Record<string, unknown>[]
  /** How many dynamic checklist columns exist, so the page can explain why it
   *  defaulted to the summary view. */
  checklistColumnCount: number
}

export function useStageChecklistColumns(
  response: ChecklistReportResponse | undefined,
  mode: ReportViewMode,
): StageChecklistGrid {
  return useMemo(() => {
    if (!response) {
      return {
        columns: IDENTITY_COLUMNS,
        data: [],
        checklistColumnCount: 0,
      }
    }

    const dynamicColumns: ColumnDef[] = response.columns.map((c) => ({
      key: c.key,
      label: c.label,
      // Only pass/fail columns get a filter dropdown — a free-text
      // informational answer would produce a useless option list.
      filterable: c.evaluation_mode === "pass_fail_na",
      filterOptions:
        c.evaluation_mode === "pass_fail_na"
          ? ["Pass", "Fail", "N/A"]
          : undefined,
      // ⓘ tooltip: the category (multi-category view) and the item's instruction.
      headerHelp: [c.category_name, c.instruction].filter(Boolean).join(" · ") || undefined,
    }))

    const columns =
      mode === "summary"
        ? [...IDENTITY_COLUMNS, ...SUMMARY_COLUMNS]
        : [...IDENTITY_COLUMNS, ...dynamicColumns]

    const data = response.rows.map((row) => {
      const answers = row.answers ?? {}
      const flat: Record<string, unknown> = {
        part_name: row.part_name,
        part_number: row.part_number,
        category_name: row.category_name,
        variant_name: row.variant_name,
        internal_serial: row.internal_serial,
        manufacturer_serial: row.manufacturer_serial,
        stage: row.stage,
        engineer_name: row.engineer_name,
        completed_at: row.completed_at,
        result: row.result,
        checklist_stage: row.checklist_stage,
        cycles: row.cycles,
        __checks: summarise(answers),
        __failed: (row.failed_labels ?? []).join(" | "),
      }
      // Copy answers by the column keys the SERVER emitted. A key absent from
      // this row was never asked of that device, so the cell must stay blank —
      // defaulting it to "N/A" would claim the question was asked and marked
      // not-applicable, which is a different fact.
      for (const col of response.columns) {
        if (col.key in answers) flat[col.key] = answers[col.key]
      }
      return flat
    })

    return { columns, data, checklistColumnCount: response.columns.length }
  }, [response, mode])
}

function summarise(answers: Record<string, string>): string {
  const values = Object.values(answers)
  const pass = values.filter((v) => v === "Pass").length
  const fail = values.filter((v) => v === "Fail").length
  if (pass === 0 && fail === 0) return "—"
  return `${pass} pass / ${fail} fail`
}

/** The default view for a given result set: summary when no category filter is
 *  applied (columns are namespaced and the union is wide) or when the grid is
 *  simply too wide to scan. Spec D11. */
export function defaultViewMode(
  hasCategoryFilter: boolean,
  checklistColumnCount: number,
): ReportViewMode {
  if (!hasCategoryFilter) return "summary"
  return checklistColumnCount > WIDE_GRID_THRESHOLD ? "summary" : "grid"
}
