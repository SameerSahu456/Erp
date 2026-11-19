import { formatINRCompact } from "@/lib/currency"

import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

export const RET_S = PURCHASE_ORDERS_STRINGS.detail.returns

export const DETAIL_S = PURCHASE_ORDERS_STRINGS.detail

export const DASH = "—"

export function money(v: string | null | undefined): string {
  if (v === null || v === undefined) return DASH
  // Exact 2-decimal figures (not whole-rupee rounded) — the detail page shows
  // real amounts the user reconciles, matching the version trail + PDF.
  return formatINRCompact(Number(v), { decimals: true })
}

/** A line's tax rate for display; a line saved without tax shows a dash. */
export function taxPercent(rate: string | null | undefined): string {
  return rate == null ? DASH : `${Number(rate)}%`
}

export function pct(received: number, ordered: number): number {
  if (ordered <= 0) return 0
  return Math.min(100, Math.round((received / ordered) * 100))
}
