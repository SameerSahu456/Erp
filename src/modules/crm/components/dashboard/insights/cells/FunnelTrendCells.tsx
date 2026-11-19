import type { RevenueParams } from '../../../../api/dashboard'
import type { InsightPaging } from '../../../../hooks/dashboard/useInsightPaging'
import { INSIGHTS_STRINGS } from '../insights.strings'
import type { Span } from '../InsightWidget'
import { RevenueTrendWidget } from '../RevenueTrendWidget'

// Leads → Deals Closed → SO Closed Value: the three funnel stages over time,
// each span=2 so they tile one row. Rendered on both metric bodies, so the
// whole funnel is visible from either drill-down.
//
// All three are LIVE on `GET /crm/dashboard/revenue` — one endpoint, three
// `metric` values. They go through the same `RevenueTrendWidget` as the Revenue
// Trend cell, so the funnel and the revenue series can never disagree about
// what a filter, a period or a bucket means. That shared widget is the whole
// reason these are not three bespoke fetches.
//
// Each takes the page's `params` untouched apart from `metric`, so every
// toolbar facet (period, range, users, type, conditions, categories, OEMs,
// accounts) narrows all three exactly as it narrows Revenue Trend, and a filter
// change re-queries server-side rather than re-bucketing a cached series
// (§16.7). `useRevenue` keys on the full params object, so the three live in
// separate cache entries and cannot clobber each other.
//
// Caveat worth knowing when reading these side by side: the backend IGNORES
// `conditions` / `category_ids` / `oem_ids` on the lead series and
// `conditions` / `oem_ids` on the deal series, because leads and deals carry no
// product columns. Those facets therefore move the SO tile without moving the
// two above it. That is the endpoint's contract, not a bug here — see the
// `RevenueMetric` docs in `api/dashboard.ts`.
//
// PAGING: each tile server-pages on its OWN URL params (§16.7) — `funnelLeads*`
// / `funnelDeals*` / `funnelOrders*`, built in `CrmInsightDetailPage`. Three
// separate handles, not one: the tiles sit side by side, so a shared `?page`
// would move all three at once. Without paging these rendered the whole series
// (`useRevenue` asks for 100 buckets), which is ~32 rows per tile on `weekly`
// and climbing, and silently truncates a `custom` range beyond 100 months.

const S = INSIGHTS_STRINGS.trends

interface FunnelTrendCellsProps {
  /** Page-level slice — period, range and the toolbar facets. Shared verbatim
   *  with the Revenue Trend cell. */
  params: RevenueParams
  /** One pager per tile, each on its own URL param. */
  paging: FunnelPaging
  /** Width of EACH of the three tiles (grid columns of 6). Defaults to 2 —
   *  the funnel on its own row. `monthly-revenue` passes 1 so the trio shares
   *  one line with the half-width Revenue by Month hero (3 + 1 + 1 + 1). */
  tileSpan?: Span
}

/** The three funnel tiles' paging handles — built once in the page, since hooks
 *  cannot be called inside the renderer's `switch`. Mirrors `BySourceCells`. */
export interface FunnelPaging {
  leads: InsightPaging
  deals: InsightPaging
  orders: InsightPaging
}

export function FunnelTrendCells({ params, paging, tileSpan = 2 }: FunnelTrendCellsProps) {
  return (
    <>
      {/* Counts, not money: every `closed_leads` bucket carries `revenue: 0`. */}
      <RevenueTrendWidget
        params={{ ...params, metric: 'closed_leads' }}
        title={S.leads}
        why={S.leadsWhy}
        span={tileSpan}
        accent="sky"
        value="count"
        paging={paging.leads}
      />
      <RevenueTrendWidget
        params={{ ...params, metric: 'closed_deals' }}
        title={S.dealsClosed}
        why={S.dealsClosedWhy}
        span={tileSpan}
        accent="teal"
        value="count"
        paging={paging.deals}
      />
      {/* The same series the Revenue Trend cell plots — `closed_orders` value. */}
      <RevenueTrendWidget
        params={{ ...params, metric: 'closed_orders' }}
        title={S.soClosedValue}
        why={S.soClosedValueWhy}
        span={tileSpan}
        accent="violet"
        value="revenue"
        paging={paging.orders}
      />
    </>
  )
}
