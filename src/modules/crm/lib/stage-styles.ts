// Shared CRM stage/priority styling. Lead and Deal pages used to copy
// these maps locally — keep them here so adding a stage doesn't require
// hunting down two definitions.

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { DealStage } from "@/modules/crm/api"
import type { Lead } from "@/modules/crm/types"

type LeadStage = Lead["stage"]

export const LEAD_STAGE_VARIANT: Record<LeadStage, StatusBadgeVariant> = {
  New: "info",
  Contacted: "neutral",
  Qualified: "success",
  Procurement: "info",
  Cold: "neutral",
  Proposal: "warning",
  Negotiation: "info",
  "Closed Won": "success",
  "Closed Lost": "error",
  Rejected: "error",
}

export const LEAD_STAGE_COLOR: Record<LeadStage, string> = {
  New: "var(--info)",
  Contacted: "var(--violet)",
  Qualified: "var(--success)",
  Procurement: "var(--info)",
  Cold: "var(--muted-foreground)",
  Proposal: "var(--warning)",
  Negotiation: "var(--violet)",
  "Closed Won": "var(--success)",
  "Closed Lost": "var(--destructive)",
  Rejected: "var(--destructive)",
}

export const DEAL_STAGE_VARIANT: Record<DealStage, StatusBadgeVariant> = {
  New: "info",
  Procurement: "info",
  Cold: "neutral",
  Proposal: "warning",
  Negotiation: "info",
  "Closed Won": "success",
  "Closed Lost": "error",
}

export const DEAL_STAGE_COLOR: Record<DealStage, string> = {
  New: "var(--info)",
  Procurement: "var(--info)",
  Cold: "var(--muted-foreground)",
  Proposal: "var(--warning)",
  Negotiation: "var(--violet)",
  "Closed Won": "var(--success)",
  "Closed Lost": "var(--destructive)",
}

// Terminal stages — a lead/deal here has already reached its outcome, so a
// forward-looking "closure countdown" no longer makes sense. The list table
// and kanban cards use this to hide the closure date once a card is closed.
export function isClosedStage(stage: string | null | undefined): boolean {
  return stage === "Closed Won" || stage === "Closed Lost"
}

export type PriorityBadgeVariant = "destructive" | "warning" | "secondary"

export function priorityVariant(priority: string): PriorityBadgeVariant {
  if (priority === "High") return "destructive"
  if (priority === "Medium") return "warning"
  return "secondary"
}
