import { createElement } from "react"

import type { CellFormatter } from "@/components/common/tables/BusinessMetricsTable"
import {
  StatusBadge,
  type StatusBadgeVariant,
} from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { PAGINATION } from "@shared/constants/pagination"
import { formatIST_date } from "@shared/lib/date"
import { usePartsInfinite, type Part } from "@modules/ims"
import type { PurchaseOrderListItem } from "@modules/procurement"
import { useUserOptions, type UserListItem } from "@modules/users"

import type { ReportStage, StageChecklistReportParams } from "../../api/reports"
import { STAGE_CHECKLIST_REPORT_STRINGS as S } from "./stage-checklist-report.strings"

export const STAGES: ReportStage[] = ["inspection", "repair"]
export const INITIAL: StageChecklistReportParams = {
  stage: STAGES,
  page: 1,
  page_size: PAGINATION.DEFAULT_PAGE_SIZE,
}
// Select has no empty-string item, so "all" needs a sentinel value.
export const ALL = "__all__"

// AsyncSelect calls `useOptions` as a hook, so each source needs a named hook.
export function usePartPickerOptions(search: string) {
  return usePartsInfinite(search)
}

export function useEngineerPickerOptions(search: string, opts?: { enabled?: boolean }) {
  return useUserOptions(search, { is_active: true }, opts)
}

export function poLabel(po: PurchaseOrderListItem): string {
  return po.supplier?.name ? `${po.po_number} · ${po.supplier.name}` : po.po_number
}

export function partLabel(part: Part): string {
  return part.part_number ? `${part.name} · ${part.part_number}` : part.name
}

export function engineerLabel(user: UserListItem): string {
  return `${user.first_name} ${user.last_name ?? ""}`.trim() || user.email
}

// Result / answer → StatusBadge (§0.8); covers both lowercase and title-case values.
export const RESULT_META: Record<string, { label: string; variant: StatusBadgeVariant }> = {
  pass: { label: S.filters.resultPass, variant: "success" },
  fail: { label: S.filters.resultFail, variant: "error" },
  na: { label: S.filters.resultNa, variant: "neutral" },
  "n/a": { label: S.filters.resultNa, variant: "neutral" },
}
// Stage enum → human label (§0.18 — never show the raw `inspection`/`repair`).
const STAGE_LABELS: Record<string, string> = {
  inspection: S.filters.inspection,
  repair: S.filters.repair,
}

/** The single-stage filter's label, or null when both stages are shown. */
export function singleStageLabel(stage: ReportStage[] | undefined): string | null {
  if (stage?.length !== 1) return null
  return stage[0] === "inspection" ? S.filters.inspection : S.filters.repair
}

/** The em-dash shown for any missing value (§0.7). */
const dash = createElement(
  Typography,
  { variant: "body", tone: "muted", asChild: true },
  createElement("span", null, "—"),
)

/** Report cell rendering: IST dates, enum labels (§0.18), result badges (§0.8),
 *  em-dash for empty (§0.7). */
export const cellFormatter: CellFormatter = (value, key) => {
  if (key === "completed_at")
    return { display: value ? formatIST_date(String(value)) : dash }
  const str = value == null ? "" : String(value).trim()
  if (str === "") return { display: dash }
  if (key === "stage" || key === "checklist_stage")
    return { display: STAGE_LABELS[str.toLowerCase()] ?? str }
  const meta = RESULT_META[str.toLowerCase()]
  if (meta)
    return { display: createElement(StatusBadge, { variant: meta.variant, children: meta.label }) }
  return null
}
