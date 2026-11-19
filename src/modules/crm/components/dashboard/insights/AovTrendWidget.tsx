import type { RevenueParams } from '../../../api/dashboard'
import type { InsightPaging } from '../../../hooks/dashboard/useInsightPaging'
import { INSIGHTS_STRINGS } from './insights.strings'
import type { Span } from './InsightWidget'
import { RevenueTrendWidget } from './RevenueTrendWidget'

// Average Order Value per period on the CRM dashboard — live on
// `GET /crm/dashboard/revenue` with `metric: 'avg_order_value'`.
//
// The dashboard's framing of the shared live series: its own title/why copy and
// the Details link. The series itself — query, states, window footnote,
// PAGINATION — lives in `RevenueTrendWidget`, the SAME component the Revenue
// Trend cell, the funnel tiles and the Revenue hero render, so none can drift.
//
// Each bucket's `revenue` field carries the AOV (backend `_to_aov_bucket`), so
// `value="revenue"` (the widget default) formats it as currency.
//
// PAGINATION: server-paged on its OWN URL params (§16.7), exactly like the
// Account / Category / OEM / Condition tiles beside it — the footer's pager
// fires `onPageChange` to refetch rather than slicing a cached series. The
// paging handle is built by the caller (`useInsightPaging` is a hook and can't
// run inside the layout `.map`), same reason the by-source tiles own theirs.

const S = INSIGHTS_STRINGS.avgOrderValue

interface AovTrendWidgetProps {
  /** Page-level slice — period, range and the toolbar facets. `metric` is
   *  overridden here, so the caller passes the same `revenueParams` as every
   *  other trend widget. */
  params: RevenueParams
  span?: Span
  detailHref: string
  /** This tile's own server-pagination handle (its own URL params). */
  paging: InsightPaging
}

export function AovTrendWidget({ params, span = 6, detailHref, paging }: AovTrendWidgetProps) {
  return (
    <RevenueTrendWidget
      params={{ ...params, metric: 'avg_order_value' }}
      title={S.title}
      why={S.why}
      span={span}
      detailHref={detailHref}
      paging={paging}
      // Details button — REMOVED (product call): the whole card already drills
      // through on click; the header link was redundant chrome.
    />
  )
}
