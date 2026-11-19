import { EMPTY_VALUE } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"

import type { RentalUnitSwap } from "../../api/swaps"
import { swapStatusLabel } from "../../constants/swaps"
import { SWAPS_STRINGS as S } from "./swaps.strings"

export const SWAP_COLUMNS = [
  { key: "reason", label: S.list.columns.reason, width: "40%" },
  { key: "pairs", label: S.list.columns.pairs, width: "12%" },
  { key: "adjustment", label: S.list.columns.adjustment, width: "12%" },
  { key: "status", label: S.list.columns.status, width: "18%" },
  { key: "raised", label: S.list.columns.raised, width: "18%" },
]

export const SWAP_TABS = [
  { id: "pending", label: S.list.tabs.pending, status: ["pending"] },
  { id: "approved", label: S.list.tabs.approved, status: ["approved"] },
  { id: "rejected", label: S.list.tabs.rejected, status: ["rejected"] },
  { id: "all", label: S.list.tabs.all, status: undefined },
] as const

export function toSwapRow(s: RentalUnitSwap): Record<string, unknown> {
  return {
    id: s.id,
    reason: s.reason,
    pairs: S.list.pairs(s.pairs.length),
    adjustment: s.billing_adjustment_id ? S.list.adjustmentYes : EMPTY_VALUE,
    status: swapStatusLabel(s.status),
    raised: formatIST_date(s.created_at),
    _status: s.status,
  }
}
