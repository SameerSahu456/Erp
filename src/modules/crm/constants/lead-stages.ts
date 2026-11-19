import type { Lead } from "../types"

type LeadStage = Lead["stage"]

// Domain label map (Coding-guideline §16.12 bucket 2): the single source for
// how a lead `stage` value is shown to the user. Today the label equals the
// wire value, but routing display through this map means any future copy
// change lives in one place and can't drift across the kanban columns, the KPI
// cards, the list-table badge, the detail header, and the filter dropdown.
//
// The StatusBadge tone (`LEAD_STAGE_VARIANT`) and the kanban accent colour
// (`LEAD_STAGE_COLOR`) already live in `../lib/stage-styles.ts` (shared with
// deals) — this file is purely the display-label half of the mapping.
export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  New: "New",
  Contacted: "Contacted",
  Qualified: "Qualified",
  Procurement: "Procurement",
  Cold: "Cold",
  Proposal: "Proposal",
  Negotiation: "Negotiation",
  "Closed Won": "Closed Won",
  "Closed Lost": "Closed Lost",
  Rejected: "Rejected",
}

// Display label for a stage value, tolerant of an unknown wire value (falls
// back to the raw string so the UI never renders blank).
export function leadStageLabel(stage: string): string {
  return LEAD_STAGE_LABELS[stage as LeadStage] ?? stage
}
