import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { PageHeader } from "@/components/page-shells"

import { InsightPeriodControl } from "../../components/dashboard/insights/InsightPeriodControl"
import { InsightsToolbar } from "../../components/dashboard/insights/InsightsToolbar"
import { InsightViewNotice } from "../../components/dashboard/insights/InsightViewNotice"
import {
  INSIGHT_TILES_REPORT_TYPE,
  INSIGHTS,
  isMetricKey,
  type InsightFilterField,
} from "../../components/dashboard/insights/insights.registry"
import {
  CRM_DASHBOARD_PATH,
  insightDashboardHref,
} from "../../components/dashboard/insights/insights.routes"
import { INSIGHTS_STRINGS } from "../../components/dashboard/insights/insights.strings"
import {
  toAvgOrderValueByCategoryParams,
  toBySourceParams,
  toInsightSummaryTilesParams,
  toPeriodBreakdownParams,
  toRevenueByCategoryOemParams,
  toRevenueParams,
  isGrowthPeriodCoerced,
  toAccountMovementParams,
  toInactiveAccountsParams,
  toNewAccountsParams,
  toGrowthParams,
  toSalesFunnelParams,
  toSalesTeamParams,
  toSummaryParams,
  toTopOrdersParams,
} from "../../hooks/dashboard/insight-query-params"
import { monthTokensForWindow } from "../../data/insights/month-facet"
import { METRIC_VIEWS } from "../../components/dashboard/insights/views"
import { useInsightPaging } from "../../hooks/dashboard/useInsightPaging"
import { useInsightRecords } from "../../hooks/dashboard/useInsightRecords"
import { useInsightScope } from "../../hooks/dashboard/useInsightScope"
import { useInsightView } from "../../hooks/dashboard/useInsightView"
import { InsightScopeToggle } from "../../components/dashboard/insights/InsightScopeToggle"

// Drill-through page for a dashboard insight — `/crm/insights/:metric`.
//
// Composition only. The view state (period / range / facets) lives in
// `useInsightView`, the record derivation in `useInsightRecords`, and WHICH
// cells render is declared per metric in `insights.registry.ts` — this file
// just wires them together.

function CrmInsightDetailPage() {
  const { metric = "" } = useParams()
  const navigate = useNavigate()
  const view = useInsightView()
  const paging = useInsightPaging()
  // The revenue series pages on its OWN params. The sales-team inner view
  // renders the leaderboard and the trend together — one shared `?page` would
  // move both at once.
  const revenuePaging = useInsightPaging("revenue")
  // The AOV trend cell pages on its own params, separate from `revenuePaging`,
  // so the two never move together if they ever share a page.
  const aovPaging = useInsightPaging("aov")
  // The AOV-by-category table sits directly under that trend on the same view,
  // so it needs a THIRD handle — sharing `aovPaging` would page both at once.
  const aovByCategoryPaging = useInsightPaging("aov-by-category")
  const { showToggle, scope, currentUserId, hideOwnerFacet } = useInsightScope(view.scope)
  const { records, fields } = useInsightRecords(view)

  // The Month facet's options — every month the CURRENT window covers, so a
  // two-year custom range offers two years of months rather than this year's.
  // Derived from the view, not from the records: the records are still seeded
  // (see `useInsightRecords`), and the window is what the API actually filters
  // by.
  const monthOptions = useMemo(
    () => monthTokensForWindow(view.period, view.from, view.to),
    [view.period, view.from, view.to],
  )

  // One paging handle per paged table, each on its own URL param. Called
  // unconditionally here because hooks cannot live inside the renderer's
  // `switch`. They run even for `monthly-revenue`, which renders none of these
  // cells — harmless, they only read `useSearchParams`.
  const accountsPaging = useInsightPaging("accounts")
  const categoryPaging = useInsightPaging("category")
  const oemPaging = useInsightPaging("oem")
  const conditionPaging = useInsightPaging("condition")
  const accountTypePaging = useInsightPaging("account-type")
  const topProductsPaging = useInsightPaging("top-products")
  // The full-width Top Orders line-item table pages on its own URL param, so it
  // never moves in lockstep with the breakdown tables rendered below it.
  const topOrdersPaging = useInsightPaging("top-orders")
  // The Sales Funnel table's own pager, on its own URL params like every other
  // paged cell — so paging it never moves the breakdowns rendered below it.
  const salesFunnelPaging = useInsightPaging("sales-funnel")
  // The period-wise breakdown table's own pager. Like the funnel's, it slices a
  // complete response rather than refetching — the endpoint has no `page` — but
  // it still needs its own URL param so paging the buckets never moves the
  // breakdowns below it.
  const periodBreakdownPaging = useInsightPaging("period-breakdown")
  // The Growth page reads that same breakdown twice — the compact bucket+change
  // table and the Growth Ledger below it. One pager each, so paging the ledger
  // never moves the table above it.
  const periodDeltaPaging = useInsightPaging("period-delta")
  const growthLedgerPaging = useInsightPaging("growth-ledger")
  // The condition-mix cross-tab's own pager — separate from the breakdown's so
  // the two tables on this page page independently.
  const conditionMixPaging = useInsightPaging("condition-mix")
  // The vertical-mix cross-tab's own pager — separate again, so none of the
  // three tables on a page move each other.
  const verticalMixPaging = useInsightPaging("vertical-mix")
  // The Category × Brand pivot pages its CATEGORY axis on its own param — the
  // same key the dashboard card uses, so it never collides with the by-source
  // tables on this page.
  const categoryOemMixPaging = useInsightPaging("category-oem-mix")

  // The three funnel-trend tiles. They render in one row and each pages its own
  // series, so they need three separate indices — a shared key would page all
  // three at once, exactly the trap the leaderboard/trend split already avoids.
  const funnelLeadsPaging = useInsightPaging("funnel-leads")
  const funnelDealsPaging = useInsightPaging("funnel-deals")
  const funnelOrdersPaging = useInsightPaging("funnel-orders")
  // The All Accounts — Movement table's own pager. The other account-movement
  // cells are scalar (widget mode); only this one pages, and on its own key so
  // it never moves the breakdowns rendered below it.
  const accountMovementPaging = useInsightPaging("account-movement")
  // The two seeded series on the New Accounts page — rows in hand, own keys.
  const newAccountsByPeriodPaging = useInsightPaging("new-accounts-by-period")
  const newVsRepeatPaging = useInsightPaging("new-vs-repeat")
  const newAccountsListPaging = useInsightPaging("new-accounts-list")
  const inactiveWinBackPaging = useInsightPaging("inactive-accounts-win-back")
  const inactiveByPeriodPaging = useInsightPaging("inactive-accounts-by-period")

  // The live cells run these queries; the seeded cells read `records`.
  //
  // The scope arrives in the URL from the dashboard's drill-through, so My View
  // stays My View through the drill-in: every endpoint gets `user_ids` pinned to
  // the logged-in user here exactly as it does on the board.
  //
  // The revenue series is deliberately NOT given `paging`: it renders the whole
  // series (`useRevenue` asks for every bucket), and `page`/`pageSize` in the
  // URL belong to the leaderboard alone.
  const query = useMemo(() => ({ ...view, scope, currentUserId }), [view, scope, currentUserId])
  const salesTeamParams = useMemo(() => toSalesTeamParams(query), [query])
  const revenueParams = useMemo(() => toRevenueParams(query), [query])
  const summaryParams = useMemo(() => toSummaryParams(query), [query])
  // The Top Orders slice — same shared body as every other widget, so it agrees
  // with the breakdowns beside it. No `search` from this page (no search box).
  const topOrdersParams = useMemo(() => toTopOrdersParams(query), [query])
  // The Sales Funnel conversion slice. `page` / `page_size` are deliberately NOT
  // in here — the endpoint has neither, and the pager slices the response.
  const salesFunnelParams = useMemo(() => toSalesFunnelParams(query), [query])
  // The period-wise breakdown slice. Same shared body as the KPI strip and the
  // hero series on this page, which is what makes `Σ row.revenue` reconcile
  // with both. No `page` / `page_size` — the endpoint has neither.
  const periodBreakdownParams = useMemo(() => toPeriodBreakdownParams(query), [query])
  // The Category × Brand pivot slice — same shared body as the by-source
  // tables, so the matrix reconciles with the Category / OEM rankings above it.
  const categoryOemMixParams = useMemo(() => toRevenueByCategoryOemParams(query), [query])
  // The Growth slice. Its own mapper: the endpoint's period is narrower than
  // the board's and it accepts no month/date params — see `toGrowthParams`.
  const growthParams = useMemo(() => toGrowthParams(query), [query])
  // The Account Movement slice. Shares the Growth window pair, so the four
  // summary tiles + two bucket cards on this page always agree with the
  // Growth hero on what "this period vs last" means. Widget mode — no
  // `movement` / `page`.
  const accountMovementParams = useMemo(() => toAccountMovementParams(query), [query])
  // The New Accounts ranked list — same window pair as Growth / Account
  // Movement, so "this period" means the same thing on the page as on the
  // dashboard tile.
  const newAccountsParams = useMemo(() => toNewAccountsParams(query), [query])
  // Account-level facets only — the endpoint takes no product facets.
  const inactiveAccountsParams = useMemo(() => toInactiveAccountsParams(query), [query])

  // The 4-tile KPI strip's slice. Which `report_type` (if any) this page fetches
  // is registry data — a page with no bundle gets `undefined` and the cell
  // renders nothing, so this never fires a request without a `report_type`.
  const tilesReportType = isMetricKey(metric) ? INSIGHT_TILES_REPORT_TYPE[metric] : undefined
  const insightTiles = useMemo(
    () =>
      tilesReportType
        ? toInsightSummaryTilesParams({ ...query, reportType: tilesReportType })
        : undefined,
    [query, tilesReportType],
  )

  // All breakdowns share the query body and differ only by `report_type`,
  // so they cannot disagree with each other or with the leaderboard.
  const bySource = useMemo(
    () => ({
      account: toBySourceParams({ ...query, reportType: "account" as const }),
      category: toBySourceParams({ ...query, reportType: "category" as const }),
      oem: toBySourceParams({ ...query, reportType: "oem" as const }),
      condition: toBySourceParams({ ...query, reportType: "condition" as const }),
      accountType: toBySourceParams({ ...query, reportType: "account_type_wise" as const }),
      topProducts: toBySourceParams({ ...query, reportType: "top_products" as const }),
      paging: {
        account: accountsPaging,
        category: categoryPaging,
        oem: oemPaging,
        condition: conditionPaging,
        accountType: accountTypePaging,
        topProducts: topProductsPaging,
      },
    }),
    [
      query,
      accountsPaging,
      categoryPaging,
      oemPaging,
      conditionPaging,
      accountTypePaging,
      topProductsPaging,
    ],
  )

  // Same shared body as `bySource.category` above, minus `report_type` — so the
  // AOV ranking and the value-closed ranking always read the same slice.
  const aovByCategory = useMemo(
    () => ({
      params: toAvgOrderValueByCategoryParams(query),
      paging: aovByCategoryPaging,
    }),
    [query, aovByCategoryPaging],
  )

  const funnelPaging = useMemo(
    () => ({
      leads: funnelLeadsPaging,
      deals: funnelDealsPaging,
      orders: funnelOrdersPaging,
    }),
    [funnelLeadsPaging, funnelDealsPaging, funnelOrdersPaging],
  )

  const meta = isMetricKey(metric) ? INSIGHTS[metric] : undefined
  const View = isMetricKey(metric) ? METRIC_VIEWS[metric] : undefined

  if (!meta || !View) {
    return (
      <PageHeader
        title={INSIGHTS_STRINGS.detail.notFoundTitle}
        subtitle={INSIGHTS_STRINGS.detail.notFoundSubtitle(metric)}
        backHref={CRM_DASHBOARD_PATH}
        // See the note on the main header below — the arrow must GO to the
        // dashboard, and an unknown metric is exactly the case reached by an
        // edited URL, where history-back is furthest from the dashboard.
        onBack={() => navigate(CRM_DASHBOARD_PATH)}
      />
    )
  }

  // Most pages carry a fixed name; the ones whose name IS the bucket size
  // ("Revenue by Month", "Growth This Month") declare a function of the period
  // instead, so the header follows the toolbar exactly as every cell under it
  // already does. See the note on `InsightMeta.title`.
  const pageTitle: string =
    typeof meta.title === "function" ? meta.title(view.period) : meta.title

  // Facets come from the metric's registry entry; `owner` — the "Rep" filter —
  // only makes sense when the scope holds more than one rep. In My View it
  // holds exactly one (the logged-in user), so it is dropped there too.
  // De-duplicated: a registry entry that already names `owner` must not
  // render the Rep facet twice.
  const filterFields: InsightFilterField[] = [
    ...new Set<InsightFilterField>(
      fields.includes("owner") && !hideOwnerFacet ? [...meta.filters, "owner"] : meta.filters,
    ),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        // subtitle={meta.why}
        // NO `onBack` here on purpose. Without it PageHeader uses its default,
        // `useNavigateBack(backHref)` → `navigate(-1)` in any real session, so
        // Back is a genuine history pop: the browser restores the board's URL
        // verbatim — every facet the user had picked — and its scroll position.
        //
        // An explicit `onBack={() => navigate(backHref)}` was tried and reverted.
        // It made `backHref` load-bearing, and `insightDashboardHref` rebuilds
        // that url with `filters: undefined` — so every facet was dropped on the
        // way back, and the fresh push reset scroll to the top. Rebuilding cannot
        // be fixed in place either: a drill-in merges its own clicked value into
        // the same facet bag under a dynamic key (`tile.facet` / `account` /
        // `owner`), so afterwards nothing tells the user's filters apart from the
        // drill-in's. The history entry is the only faithful record of the board.
        //
        // The trade-off this accepts: one step of history is whatever the user
        // did last, so Back can land somewhere other than the dashboard when
        // they arrived by an edited url or hopped between two metric pages.
        // `backHref` still covers the no-history case.
        backHref={insightDashboardHref({ ...view, scope })}
        // Identical slot to the dashboard's header — scope above, period in
        // the filter bar. Crossing a drill-through must not move a control.
        actions={
          showToggle ? (
            <InsightScopeToggle scope={scope} onScopeChange={view.setScope} />
          ) : undefined
        }
        // The subtitle sits flush at the header's bottom edge (PageHeader only
        // adds mb-0.5), so the page-root gap alone leaves the filter bar
        // reading as attached to it.
        className="mb-1.5"
      />

      {/* Renders nothing unless the URL carried something unsendable that the
          parser repaired. A drill-through inherits the board's params, so a bad
          link lands here just as readily as on the dashboard. */}
      <InsightViewNotice repairs={view.repairs} />

      {/* Filters only — this bar holds nothing but facets, on both pages. The
          inner view carries more of them (the metric's registry set, plus Rep),
          so sharing the row with the period control is what pushed Rep onto a
          second line once a custom range appeared. */}
      <InsightsToolbar
        filters={view.filters}
        onChange={view.setFilters}
        fields={filterFields}
        monthOptions={monthOptions}
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

      {/* The metric's OWN view component — see `views/index.ts`. The page no
          longer knows which cells a metric contains; the view reads that from
          the registry. Adding a metric touches the registry and one view file,
          never this page.

          The view always renders. Gating it on `records.length` — the SEEDED
          rows — used to blank the whole page: picking a rep sets `owner` to a
          real user, no seeded record carries that owner, and the zero-record
          branch unmounted the live Sales Team cell before it could fetch. Each
          cell owns its own empty state, so a seeded cell going empty can never
          take a live one down with it. */}
      <View
        records={records}
        period={view.period}
        filters={view.filters}
        onFilters={view.setFilters}
        salesTeam={{ params: salesTeamParams, paging }}
        revenueParams={revenueParams}
        summaryParams={summaryParams}
        revenuePaging={revenuePaging}
        aovPaging={aovPaging}
        aovByCategory={aovByCategory}
        funnelPaging={funnelPaging}
        bySource={bySource}
        topOrders={{ params: topOrdersParams, paging: topOrdersPaging }}
        salesFunnel={{ params: salesFunnelParams, paging: salesFunnelPaging }}
        periodBreakdown={{ params: periodBreakdownParams, paging: periodBreakdownPaging }}
        periodDelta={{ params: periodBreakdownParams, paging: periodDeltaPaging }}
        growthLedger={{ params: periodBreakdownParams, paging: growthLedgerPaging }}
        conditionMix={{ params: periodBreakdownParams, paging: conditionMixPaging }}
        verticalMix={{ params: periodBreakdownParams, paging: verticalMixPaging }}
        categoryOemMix={{ params: categoryOemMixParams, paging: categoryOemMixPaging }}
        growth={{ params: growthParams, coerced: isGrowthPeriodCoerced(view.period) }}
        accountMovement={{ params: accountMovementParams, paging: accountMovementPaging }}
        newAccounts={{
          params: newAccountsParams,
          listPaging: newAccountsListPaging,
          byPeriodPaging: newAccountsByPeriodPaging,
          newVsRepeatPaging,
        }}
        inactiveAccounts={{
          params: inactiveAccountsParams,
          winBackPaging: inactiveWinBackPaging,
          byPeriodPaging: inactiveByPeriodPaging,
        }}
        insightTiles={insightTiles}
      />
    </div>
  )
}

export default CrmInsightDetailPage
