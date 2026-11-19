import { useCallback, useMemo } from "react"

import { PageHeader } from "@/components/page-shells"

import type { FacetValue, MultiFilterKey } from "../../data/insights/records"

import { InsightPeriodControl } from "../../components/dashboard/insights/InsightPeriodControl"
import { monthTokensForWindow } from "../../data/insights/month-facet"
import { InsightScopeToggle } from "../../components/dashboard/insights/InsightScopeToggle"
import { InsightsToolbar } from "../../components/dashboard/insights/InsightsToolbar"
import { InsightViewNotice } from "../../components/dashboard/insights/InsightViewNotice"
import { INSIGHTS_STRINGS } from "../../components/dashboard/insights/insights.strings"
import {
  DashboardSectionView,
  type DashboardCtx,
} from "../../components/dashboard/insights/DashboardSectionView"
import {
  CRM_DASHBOARD_LAYOUT,
  CRM_EXTRA_WIDGET_KINDS,
} from "../../components/dashboard/insights/insights.registry"
import {
  toAccountMovementParams,
  toCategoryPeriodComparisonParams,
  toBySourceParams,
  toInactiveAccountsParams,
  toNewAccountsParams,
  isGrowthPeriodCoerced,
  toRevenueParams,
  toGrowthParams,
  toRevenueByCategoryOemParams,
  toSalesFunnelParams,
  toSalesTeamParams,
  toTopOrdersParams,
} from "../../hooks/dashboard/insight-query-params"
import { useInsightRecords } from "../../hooks/dashboard/useInsightRecords"
import { useInsightScope } from "../../hooks/dashboard/useInsightScope"
import { useInsightView } from "../../hooks/dashboard/useInsightView"
import { useFeatures } from "@shared/features"

// CRM dashboard — the widget-driven insight board. Composition only: the view
// state (period / range / facets) lives in `useInsightView`, the record
// derivation in `useInsightRecords`.
//
// This replaced the previous KPI / chart / activity dashboard. Those components
// (DashboardKpis, DashboardDistributionCharts, DashboardTrendCharts,
// DashboardTasksAccounts, DashboardActivityLists, DashboardClosingTable) and
// their `useCrmDashboard` hook are intentionally LEFT IN THE REPO, unrouted, so
// they can be folded back in as widgets land — see comprint-erp-docs/modules/crm/dashboard/CRM_INSIGHTS_WIDGETS_PLAN.md.
//
// Both widgets are LIVE — Sales Team on `/crm/dashboard/hierarchy_wise_report`,
// Revenue by Month on `/crm/dashboard/revenue`. The reference's 15-persona role
// switcher is not ported: scope comes from the caller's own RBAC, which both
// endpoints resolve server-side.
//
// What IS ported is the reference's dual-view toggle. Team View keeps that
// server-resolved scope (self + reports) by sending no `user_ids`; My View
// narrows both endpoints to the logged-in user. It renders only for roles that
// have a team — see `useInsightScope`.
//
// `useInsightRecords` survives only for the toolbar's facet FIELDS; the seeded
// records no longer feed a widget on this page.
//
// NOTE: the two endpoints read `period` differently — Sales Team as a rolling
// window (monthly = last 30 days), Revenue as a bucket SIZE over the year to
// date. One toolbar setting, two ranges. The Revenue widget prints the server's
// real window so the pair can't silently disagree; see comprint-erp-docs/modules/crm/dashboard/CRM_REVENUE_API_PLAN.md.

function CrmDashboard() {
  const features = useFeatures()
  const view = useInsightView()
  const { showToggle, scope, currentUserId, hideOwnerFacet } = useInsightScope(view.scope)
  const { fields } = useInsightRecords(view)

  // My View is already pinned to one rep — a Rep facet on top of it could only
  // narrow the board to nothing.
  //
  // `month` is offered here since 2026-10-08: the Financial year dropdown puts
  // the board on an FY's date range, and the month facet is how the user then
  // narrows it to the months they want. Its options are the window's months —
  // the same one line the detail page uses.
  const facetFields = useMemo(
    () => fields.filter((f) => !hideOwnerFacet || f !== "owner"),
    [fields, hideOwnerFacet],
  )
  const monthOptions = useMemo(
    () => monthTokensForWindow(view.period, view.from, view.to),
    [view.period, view.from, view.to],
  )

  // The toolbar's facets ARE the query — a filter change refetches rather than
  // re-slicing a cached page (§16.7).
  const query = useMemo(() => ({ ...view, scope, currentUserId }), [view, scope, currentUserId])
  const salesTeamParams = useMemo(() => toSalesTeamParams(query), [query])
  const revenueParams = useMemo(() => toRevenueParams(query), [query])
  // Shared body for every Revenue Insights tile; each supplies its own
  // `report_type`, so the tiles cannot disagree with each other or with the
  // two widgets above them.
  const bySourceParams = useMemo(
    () => toBySourceParams({ ...query, reportType: "account" as const }),
    [query],
  )
  // The Top Orders tile's slice — same shared body, so its preview agrees with
  // the full view the card drills into.
  const topOrdersParams = useMemo(() => toTopOrdersParams(query), [query])
  // The Sales Funnel tile's slice — same shared body again, so its conversion
  // numbers describe the same window and facets the tiles around it do.
  const salesFunnelParams = useMemo(() => toSalesFunnelParams(query), [query])
  // The Growth tile's slice. Its own mapper because the endpoint takes a
  // NARROWER period (no `custom`) and none of the date/month params — see
  // `toGrowthParams`. `coerced` drives the tile's note when the board sits on
  // a custom range the endpoint cannot answer.
  const growthParams = useMemo(() => toGrowthParams(query), [query])
  const growthPeriodCoerced = isGrowthPeriodCoerced(view.period)
  // The Account Movement tile reuses the Growth window pair, so the two tiles
  // always agree on "this period vs last". Widget mode — no `movement` / `page`.
  const accountMovementParams = useMemo(() => toAccountMovementParams(query), [query])
  // The New Accounts tile — same window pair. Backend default `limit = 5`
  // covers the dashboard tile; override here only if a layout change ever
  // asks for more.
  const newAccountsParams = useMemo(() => toNewAccountsParams(query), [query])
  // The Inactive Accounts tile — same window (presets are a rolling day
  // window ending today), account-level facets + scope only.
  const inactiveAccountsParams = useMemo(() => toInactiveAccountsParams(query), [query])
  // The Category × OEM pivot widget's slice — same shared body, so the
  // pivot's grand total and its neighbours can never disagree about what a
  // filter means. `account_id` is deliberately absent here (dashboard =
  // caller-scoped, not per-account).
  const categoryOemParams = useMemo(
    () => toRevenueByCategoryOemParams(query),
    [query],
  )
  // Category — Period Comparison: the shared body minus `months` (its columns
  // ARE periods — see `toCategoryPeriodComparisonParams`).
  const categoryPeriodComparisonParams = useMemo(() => toCategoryPeriodComparisonParams(query), [query])

  // Everything the layout's widgets need, built once. The layout itself is
  // pure data and must not reach for hooks — this is what feeds it.
  // Add one value to a board facet without leaving the board. Re-adding a value
  // already selected is a no-op rather than a duplicate chip.
  const addFacet = useCallback(
    (facet: MultiFilterKey, value: FacetValue) => {
      const current = view.filters[facet] ?? []
      if (current.some((v) => v.id === value.id)) return
      view.setFilters({ ...view.filters, [facet]: [...current, value] })
    },
    [view],
  )

  const ctx: DashboardCtx = useMemo(
    () => ({
      salesTeamParams,
      revenueParams,
      bySourceParams,
      categoryOemParams,
      categoryPeriodComparisonParams,
      topOrdersParams,
      salesFunnelParams,
      growthParams,
      growthPeriodCoerced,
      accountMovementParams,
      newAccountsParams,
      inactiveAccountsParams,
      view: { ...view, scope },
      addFacet,
    }),
    [
      salesTeamParams,
      revenueParams,
      bySourceParams,
      categoryOemParams,
      categoryPeriodComparisonParams,
      topOrdersParams,
      salesFunnelParams,
      growthParams,
      growthPeriodCoerced,
      accountMovementParams,
      newAccountsParams,
      inactiveAccountsParams,
      view,
      scope,
      addFacet,
    ],
  )


  // The extra widgets ride the `crm_extras` feature switch.
  const layout = features.crm_extras
    ? CRM_DASHBOARD_LAYOUT
    : CRM_DASHBOARD_LAYOUT.map((section) => ({
        ...section,
        widgets: section.widgets.filter((w) => !CRM_EXTRA_WIDGET_KINDS.has(w.kind)),
      }))
  return (
    <div className="space-y-6">
      <PageHeader
        title={INSIGHTS_STRINGS.page.title}
        // subtitle={INSIGHTS_STRINGS.page.subtitle}
        // Scope and period sit in the HEADER, above; the bar below holds only
        // filters. They answer different questions — "whose board, over what
        // window?" frames the board, where a facet narrows it — and keeping
        // them apart is also what stops the facet row from wrapping once a
        // custom range adds two more controls to it.
        actions={
          showToggle ? (
            <InsightScopeToggle scope={scope} onScopeChange={view.setScope} />
          ) : undefined
        }
        // The subtitle sits flush at the header's bottom edge (PageHeader only
        // adds mb-0.5), so the page-root gap alone leaves the toolbar reading
        // as attached to it.
        className="mb-1.5"
      />

      {/* Renders nothing unless the URL carried something unsendable that the
          parser repaired. Above the toolbar so the explanation sits with the
          controls whose values were changed. */}
      <InsightViewNotice repairs={view.repairs} />

      <InsightsToolbar
        filters={view.filters}
        onChange={view.setFilters}
        fields={facetFields}
        monthOptions={monthOptions}
        // Period (and its custom date range) lives IN the filter bar so the
        // whole slice — facets + window — reads as one control group.
        period={
          <InsightPeriodControl
            period={view.period}
            onPeriodChange={view.setPeriod}
            from={view.from}
            to={view.to}
            onRangeChange={view.setRange}
            onCustomRange={view.setCustomRange}
          />
        }
      />

      {/* LAYOUT-DRIVEN — `CRM_DASHBOARD_LAYOUT` in insights.registry is the
          whole contract for this page. Hiding a widget is commenting out its
          entry there; hiding a band is commenting out the section. This page
          no longer knows what any section contains.

          The hero band runs a 5-column track so it reads 60/40 (Sales Team 3/5,
          Revenue 2/5); the insight bands run 6 so a span=3 tile is half width
          and matches the detail page. Both come from `section.columns`.

          Drill-through carries the active slice — including the My/Team scope —
          so the inner view opens on what the user was looking at. */}
      {layout.map((section) => (
        <DashboardSectionView key={section.id} section={section} ctx={ctx} />
      ))}
    </div>
  )
}

export default CrmDashboard
