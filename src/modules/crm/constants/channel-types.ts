// Channel types for CRM pipeline (lead / deal / downstream SO filters).
//
// Values match the backend's `LEAD_CHANNEL_TYPES` enum exactly so a
// multi-select from this list serializes straight to `?channel_type=…` on
// the Sales Orders list endpoint (`list_sales_orders` validates it against
// the same tuple server-side).
//
// §16.12 — label map goes with the enum, not inline in the component. Labels
// happen to match values today (every channel is a simple phrase, no
// casing/trimming) but the map keeps the door open for localisation /
// shorter aside copy without touching call-sites.

import type { DealChannelType } from "../api/deals"

export type ChannelType = DealChannelType

export const CHANNEL_TYPES: readonly ChannelType[] = [
  "End Customer",
  "Channel Partner",
  "Cloud / Data Center",
  "End User",
] as const

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  "End Customer": "End Customer",
  "Channel Partner": "Channel Partner",
  "Cloud / Data Center": "Cloud / Data Center",
  "End User": "End User",
}
