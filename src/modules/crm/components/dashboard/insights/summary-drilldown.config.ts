import type { RecordMetric, RecordType } from '../../../api/dashboard'
import type { SummaryTileKey } from './InsightSummaryCard'

// Which `(type, metric)` on `GET /crm/dashboard/records` backs each summary
// tile's drill-down. ONE dedicated endpoint replaces the old per-tile mapping
// onto `/crm/leads` · `/crm/sales-orders` · `/crm/quotes` (and its client-side
// quote↔SO intersection): the backend now computes every tile's row set behind
// the same WHERE clause the tile counted, so `header.total_count` reconciles
// with the tile face value and there is no drift left to caveat.
//
// Ratio tiles open their NUMERATOR (`metric: 'won'`) — the converted quotes for
// Quote→SO Win, the lead-sourced orders for Lead→Order Rate — matching the
// figure the rate is "of".
//
// `lead-order-time` is deliberately absent: it samples SOs joined to a lead via
// `orderable_id`, whose sample is empty on real data (orders descend from deals
// / accounts), so a modal would open on nothing. The tile stays inert.

export interface RecordsDrilldown {
  type: RecordType
  metric: RecordMetric
}

export const SUMMARY_DRILLDOWN: Partial<Record<SummaryTileKey, RecordsDrilldown>> = {
  // 1. LEADS — the top-of-funnel lead list, one row per lead created in the
  //    window. `summary.leads` is that same count (backend, 2026-07-28: the
  //    tile went back to counting LEADS after a spell counting lead-sourced
  //    ORDERS, which left it reading 0 under a card labelled "top of funnel"),
  //    so panel rows == tile face value. The order count it used to show is
  //    still reachable via the LEAD → ORDER RATE tile below.
  leads: { type: 'lead', metric: 'total' },
  // 2. DEALS CLOSED — one row per closed order on a deal with no lead lineage
  //    (`orderable_type='deal' AND lead_id IS NULL`), matching the tile's gate.
  'deals-closed': { type: 'deal', metric: 'total' },
  // 3. QUOTES DONE — quote rows behind the QUOTES DONE tile (`Draft` +
  //    `Submitted`; superseded `Amend` versions and `Rejected` quotes are
  //    excluded from both tile and panel).
  'quotes-done': { type: 'quote', metric: 'total' },
  // 4. SO CLOSED VALUE — every closed order, any origin. One row per SO.
  'so-closed-value': { type: 'sales_order', metric: 'total' },
  // 5. QUOTE → SO WIN RATE — numerator: quotes converted to an SO.
  'win-rate': { type: 'quote', metric: 'won' },
  // 6. DEAL → ORDER RATE — numerator: deals that produced an order. Same set
  //    as the DEALS tile's closed half, which is the figure the rate is "of".
  'deal-order-rate': { type: 'deal', metric: 'won' },
  // 7. LEAD → ORDER RATE — numerator: SOs sourced from a lead.
  'lead-order-rate': { type: 'lead', metric: 'won' },
  // 8. DEALS — what the DEALS ratio tile opens. The tile shows closed/total but
  //    drills into the CLOSED side, the figure it leads with: `deal:won`
  //    returns 9 rows against `summary.deals_closed` = 9 (verified live, yearly
  //    window), so the panel reconciles with the tile.
  'deals-won': { type: 'deal', metric: 'won' },
  // 9. LEADS — what the LEADS ratio tile opens: the won side, `lead:won`.
  //
  //    KNOWN MISMATCH, accepted deliberately: `lead:won` returns the ORDERS
  //    sourced from leads (`LeadOrderItem` rows), so its count is
  //    `lead_to_order_rate.numerator` — 29 on the yearly window — while the
  //    tile's green figure is `closed_leads` = 149, the count of LEADS that
  //    reached closed_won. A lead with two orders is 1 in the tile and 2 in the
  //    panel, and a lead closed without an order is in the tile only.
  //
  //    The lead-for-lead equivalent would be `lead:total` + `stage=closed_won`,
  //    which the endpoint cannot serve today: `stage` lives on `RecordsQuery`
  //    and reaches `records_leads.py`, but is never declared in the signature
  //    at `api/v1/dashboard/revenue_report/records.py:41`, so FastAPI drops it.
  //    Swap this entry to `{ type: 'lead', metric: 'total', stage:
  //    ['closed_won'] }` once that param is declared, and the panel will
  //    reconcile with the tile face value.
  'leads-won': { type: 'lead', metric: 'won' },
  // 10. LEAD → ORDER TIME — intentionally absent (empty sample on real data).

  // `deals-closed` above maps to `deal:total`, but `RecordsDealsService`
  // ignores `metric` and always applies the closed-order gate — so that key
  // returns the CLOSED orders (9), not every deal in the window
  // (`summary.total_deals` = 99). It is kept only so existing
  // `/records/deals-closed` links keep resolving; the DEALS tile itself points
  // at `deals-won`.
}

/** Tiles with no config stay inert — no dead affordance. */
export const isDrillable = (tile: SummaryTileKey) => tile in SUMMARY_DRILLDOWN

// Facets the Records page can OFFER for a tile — only those the backend really
// applies to that row shape, so a visible pill is never a dead control
// (CP-756 #4: Condition / Category / OEM arrived on the URL and narrowed the
// list invisibly). Channel Type applies to every shape.
//   sales_order / deal      — condition, category, OEM
//   lead (won = by orders)  — condition, category, OEM
//   lead (total)            — category, OEM (a lead carries no condition)
//   quote                   — category (quote lines carry no OEM or condition)
const PRODUCT_FACETS = ['vertical', 'condition', 'category', 'oem'] as const
const LEAD_TOTAL_FACETS = ['vertical', 'category', 'oem'] as const
const QUOTE_FACETS = ['vertical', 'category'] as const
const FALLBACK_FACETS = ['vertical'] as const

export function recordsExtraFacets(tile: string) {
  const cfg = SUMMARY_DRILLDOWN[tile as SummaryTileKey]
  if (!cfg) return FALLBACK_FACETS
  if (cfg.type === 'quote') return QUOTE_FACETS
  if (cfg.type === 'lead' && cfg.metric !== 'won') return LEAD_TOTAL_FACETS
  return PRODUCT_FACETS
}
