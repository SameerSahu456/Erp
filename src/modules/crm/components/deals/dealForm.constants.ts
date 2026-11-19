import type { DealChannelType, DealPriority } from "../../api"
import { LEAD_SOURCES } from "../leads/leadForm.constants"

export const PRIORITIES: readonly DealPriority[] = ["High", "Medium", "Low"]
// Deal sources are kept identical to lead sources — a deal commonly inherits
// its source from the lead it was converted from, so the two option lists must
// stay in lock-step. Re-exported from the single LEAD_SOURCES source of truth
// rather than duplicated, so editing one updates both. The Source field stays
// free text (a deal may carry any value over from its lead), so the form
// unions this list with the current value rather than constraining to it.
export const DEAL_SOURCES = LEAD_SOURCES
export const CHANNEL_TYPES: readonly DealChannelType[] = [
  "End Customer",
  "Channel Partner",
  "Cloud / Data Center",
  "End User",
]
export const CHANNEL_TYPE_SET = new Set<string>(CHANNEL_TYPES)
export function isDealChannelType(value: unknown): value is DealChannelType {
  return typeof value === "string" && CHANNEL_TYPE_SET.has(value)
}
