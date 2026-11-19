import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import type { ChartAccent } from "@/components/common/display/chartTheme"

export const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v)

export const fmtShort = (v: number) => {
  if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
  return String(v)
}

export const STAGE_ACCENTS: Record<string, ChartAccent> = {
  New: "indigo",
  Procurement: "violet",
  Cold: "slate",
  Proposal: "amber",
  Negotiation: "info",
  "Closed Won": "emerald",
  "Closed Lost": "danger",
}

export const PIE_ACCENTS: ChartAccent[] = [
  "indigo",
  "violet",
  "pink",
  "amber",
  "info",
  "emerald",
  "teal",
  "danger",
  "slate",
  "rose",
]

export const dealStageVariant: Record<string, StatusBadgeVariant> = {
  New: "info",
  Procurement: "info",
  Cold: "neutral",
  Proposal: "warning",
  Negotiation: "info",
  "Closed Won": "success",
  "Closed Lost": "error",
}

export const taskPriorityVariant: Record<string, StatusBadgeVariant> = {
  Urgent: "error",
  High: "warning",
  Medium: "info",
  Low: "neutral",
}
