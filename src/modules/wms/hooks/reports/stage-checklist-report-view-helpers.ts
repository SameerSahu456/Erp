import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import type { AsyncSelectOption } from "@/components/ui/async-select"
import { formatIST_date } from "@shared/lib/date"

import { STAGE_CHECKLIST_REPORT_STRINGS as S } from "../../components/reports/stage-checklist-report.strings"
import { RESULT_META } from "../../components/reports/stage-checklist-report-helpers"

export type ActiveChip = { label: string; onRemove: () => void }

/** Readable label for the first picked result, or null when none. */
export function resultChipLabel(result: readonly string[] | null | undefined): string | null {
  if (!result?.[0]) return null
  return RESULT_META[result[0].toLowerCase()]?.label ?? result[0]
}

/** "from – to" with "…" for an open end, or null when no range is set. */
export function dateChipLabel(range: DateRange | undefined): string | null {
  if (!range?.from && !range?.to) return null
  const from = range?.from ? formatIST_date(range.from.toISOString()) : "…"
  const to = range?.to ? formatIST_date(range.to.toISOString()) : "…"
  return `${from} – ${to}`
}

type ChipKey = "category" | "po" | "part" | "engineer" | "stage" | "result" | "date"

interface ChipInput {
  category: AsyncSelectOption | null
  po: AsyncSelectOption | null
  part: AsyncSelectOption | null
  engineer: AsyncSelectOption | null
  stage: string | null
  result: string | null
  date: string | null
  onRemove: Record<ChipKey, () => void>
}

/** Active filters as removable chips with readable labels, not ids (§13). */
export function buildActiveChips(i: ChipInput): ActiveChip[] {
  const r = i.onRemove
  return [
    i.category && { label: `${S.filters.category}: ${i.category.label}`, onRemove: r.category },
    i.po && { label: `${S.filters.po}: ${i.po.label}`, onRemove: r.po },
    i.part && { label: `${S.filters.part}: ${i.part.label}`, onRemove: r.part },
    i.engineer && { label: `${S.filters.engineer}: ${i.engineer.label}`, onRemove: r.engineer },
    i.stage && { label: `${S.filters.stage}: ${i.stage}`, onRemove: r.stage },
    i.result && { label: `${S.filters.result}: ${i.result}`, onRemove: r.result },
    i.date && { label: `${S.filters.dateRange}: ${i.date}`, onRemove: r.date },
  ].filter(Boolean) as ActiveChip[]
}
