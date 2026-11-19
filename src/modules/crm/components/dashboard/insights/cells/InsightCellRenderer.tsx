import type {
  AccountMovementParams,
  AvgOrderValueByCategoryParams,
  InactiveAccountsParams,
  NewAccountsParams,
  InsightSummaryTilesParams,
  PeriodBreakdownParams,
  RevenueByCategoryOemParams,
  RevenueBySourceParams,
  RevenueParams,
  GrowthParams,
  SalesFunnelParams,
  VerticalMixByPeriodParams,
  SalesTeamRevenueParams,
  SummaryParams,
  TopOrdersParams,
} from '../../../../api/dashboard'
import type { InsightPaging } from '../../../../hooks/dashboard/useInsightPaging'
import { NULL_BUCKET_ID } from '../insights.facets'
import {
  type FacetValue,
  type MultiFilterKey,
  type Period,
  type RevFilters,
  type RevRecord,
} from '../../../../data/insights/records'
import type { InsightCell } from '../insights.registry'
import { spanClass, type Span } from '../InsightWidget'
import { INSIGHTS_STRINGS } from '../insights.strings'
import { InsightSummaryCard } from '../InsightSummaryCard'
import { RevenueTrendWidget } from '../RevenueTrendWidget'
import { CategoryOemMixWidget } from '../CategoryOemMixWidget'
import { FunnelTrendCells, type FunnelPaging } from './FunnelTrendCells'
import { ACCOUNT_TYPE_ACCENT, CONDITION_ACCENT } from './rank-columns'
import { RevenueShareDonut } from './RevenueShareDonut'
import { RevenueBySourceTable } from './RevenueBySourceTable'
import { AovByCategoryTable } from './AovByCategoryTable'
import { ConditionMixByPeriod } from './ConditionMixByPeriod'
import { AccountMovementTile } from './AccountMovementTile'
import { AccountMovementTilesStrip } from './AccountMovementTilesStrip'
import { AccountMovementMixDonut } from './AccountMovementMixDonut'
import { AccountMovementAllTable } from './AccountMovementAllTable'
import { NewAccountsByPeriodList } from './NewAccountsByPeriodList'
import { InactiveAccountsByPeriod } from './InactiveAccountsByPeriod'
import { InactiveAccountsCategoryOemPivot } from './InactiveAccountsCategoryOemPivot'
import { InactiveAccountsWinBackTable } from './InactiveAccountsWinBackTable'
import { NewAccountsByVerticalDonut } from './NewAccountsByVerticalDonut'
import { NewAccountsTable } from './NewAccountsTable'
import { NewVsRepeatRevenueTable } from './NewVsRepeatRevenueTable'
import { NewAccountsCategoryOemPivot } from './NewAccountsCategoryOemPivot'
import { GrowthTile } from './GrowthTile'
import { VerticalMixByPeriod } from './VerticalMixByPeriod'
import { SalesFunnelCard } from './SalesFunnelCard'
import { TopOrdersTable } from './TopOrdersTable'
import { InsightTilesStrip } from './RevenueCells'
import { GrowthDeltaList } from './GrowthDeltaList'
import { PeriodicBreakdown } from './PeriodicBreakdown'
import { SalesLeaderboard } from './SalesLeaderboard'

/** The three by-source breakdowns' query params + their own paging handles.
 *  Built in `CrmInsightDetailPage`: hooks cannot be called inside a `switch`,
 *  so `useInsightPaging('accounts')` and friends run unconditionally there and
 *  are threaded down — exactly as `salesTeam.paging` already is. */
export interface BySourceCells {
  account: RevenueBySourceParams
  category: RevenueBySourceParams
  oem: RevenueBySourceParams
  /** Same endpoint, `report_type: 'condition'`. */
  condition: RevenueBySourceParams
  accountType: RevenueBySourceParams
  /** Same endpoint, `report_type: 'top_products'`. */
  topProducts: RevenueBySourceParams
  paging: {
    account: InsightPaging
    category: InsightPaging
    oem: InsightPaging
    condition: InsightPaging
    accountType: InsightPaging
    topProducts: InsightPaging
  }
}

// Maps a registry `InsightCell` to its component. Every inner view is composed
// from these, so widgets share the cells they have in common and declare only
// their extras — see `insights.registry.ts`.
//
// Adding a cell = a key in the registry's `InsightCell` union + a case here.

const S_BRK = INSIGHTS_STRINGS.breakdowns
const S_TREND = INSIGHTS_STRINGS.trends
const S_REV = INSIGHTS_STRINGS.revenueDetail
const S_TOP = INSIGHTS_STRINGS.topOrders
const S_FUNNEL = INSIGHTS_STRINGS.salesFunnel

export interface InsightCellProps {
  cell: InsightCell
  /** Per-VIEW overrides from the registry's cell spec. Undefined means "use
   *  this cell's own default" — the value below each `??`. */
  span?: Span
  title?: string
  why?: string
  /** Seeded demo rows + the raw period. NOT consumed by any cell any more —
   *  the last seeded cell (the month-by-month table) went live as
   *  `period-breakdown`. They stay on the props because the view context still
   *  carries them for the toolbar's facet options, and dropping them here would
   *  make every view's `{...ctx}` spread stop type-checking against this. */
  records: RevRecord[]
  period: Period
  filters: RevFilters
  onFilters: (f: RevFilters) => void
  /** The live dashboard queries for this slice — the Sales Team and revenue
   *  cells run them. The remaining cells are still seeded and read `records`. */
  salesTeam: { params: SalesTeamRevenueParams; paging: InsightPaging }
  revenueParams: RevenueParams
  summaryParams: SummaryParams
  /** The revenue series' OWN pager — its own URL params, so paging the trend
   *  cannot move the leaderboard rendered beside it. */
  revenuePaging: InsightPaging
  /** The AOV trend cell's OWN pager — separate from `revenuePaging` so, if the
   *  two ever share a page, paging one never moves the other. */
  aovPaging: InsightPaging
  /** The AOV-by-category table — its own endpoint and its own pager. It renders
   *  directly under the AOV trend on the `avg-order-value` view, so sharing
   *  `aovPaging` would page the two in lockstep. */
  aovByCategory: { params: AvgOrderValueByCategoryParams; paging: InsightPaging }
  /** One pager per funnel tile — same reasoning as `revenuePaging`, times three
   *  (the tiles sit side by side and must page independently). */
  funnelPaging: FunnelPaging
  bySource: BySourceCells
  /** The Top Orders line-item table — its own endpoint + pager. */
  topOrders: { params: TopOrdersParams; paging: InsightPaging }
  /** The Sales Funnel conversion table — its own endpoint + its own pager. The
   *  pager slices the response rather than refetching (the endpoint returns its
   *  whole result set); see `SalesFunnelCard`. */
  salesFunnel: { params: SalesFunnelParams; paging: InsightPaging }
  /** The period-wise breakdown table — its own endpoint + its own pager, which
   *  slices the response for the same reason as `salesFunnel`. */
  periodBreakdown: { params: PeriodBreakdownParams; paging: InsightPaging }
  /** The Growth page's compact read of that same slice (bucket + change) — its
   *  own pager so it never pages in lockstep with the ledger under it. */
  periodDelta: { params: PeriodBreakdownParams; paging: InsightPaging }
  /** The Growth Ledger — the same slice again with the money columns. Own pager
   *  for the same reason. */
  growthLedger: { params: PeriodBreakdownParams; paging: InsightPaging }
  /** The condition-mix cross-tab — same slice as `periodBreakdown`, its own
   *  pager so the two tables on the page move independently. */
  conditionMix: { params: PeriodBreakdownParams; paging: InsightPaging }
  /** The vertical-mix cross-tab — same slice again, its own pager. */
  verticalMix: { params: VerticalMixByPeriodParams; paging: InsightPaging }
  /** The Category × Brand pivot — its own endpoint + its own pager. */
  categoryOemMix: { params: RevenueByCategoryOemParams; paging: InsightPaging }
  /** The Growth stat's slice — scalar, so no pager. */
  growth: { params: GrowthParams; coerced: boolean }
  /** The Account Movement slice — reused across the four widget-mode
   *  account-movement cells (tiles strip + top-growing + top-declining +
   *  mix donut). All read the SAME widget-mode response via a shared
   *  TanStack Query key, so one network request per page covers them.
   *  `paging` belongs to the All Accounts table alone — the one cell that
   *  runs its own `movement=all` drill-down request, page by page. Built in
   *  `CrmInsightDetailPage` (hooks cannot run inside the `switch`). */
  accountMovement: { params: AccountMovementParams; paging?: InsightPaging }
  /** The New Accounts slice — live params for the ranked list + the two
   *  pagers of the seeded series cells. Optional: only the new-accounts page
   *  builds it; a composition that lists those cells without it renders
   *  nothing rather than firing an unscoped request. */
  newAccounts?: {
    params: NewAccountsParams
    /** The ranked list's server pager (`movement`-style drill-down mode). */
    listPaging: InsightPaging
    /** The two series cells page rows already in hand — their own keys. */
    byPeriodPaging: InsightPaging
    newVsRepeatPaging: InsightPaging
  }
  /** The 4-tile KPI strip's slice, or undefined on a page with no bundle.
   *  Which pages have one is declared by `INSIGHT_TILES_REPORT_TYPE` in the
   *  registry — the same file that decides which pages list the cell, so the
   *  two cannot drift. Undefined + a `revenue-kpis` cell means the registry
   *  lists the cell without a bundle; the case below renders nothing rather
   *  than firing a request with no `report_type`. */
  /** The Inactive Accounts page's tables. */
  inactiveAccounts?: {
    params: InactiveAccountsParams
    winBackPaging: InsightPaging
    byPeriodPaging: InsightPaging
  }
  insightTiles?: InsightSummaryTilesParams
}

export function InsightCellRenderer({
  cell,
  span,
  title,
  why,
  filters,
  onFilters,
  salesTeam,
  revenueParams,
  summaryParams,
  revenuePaging,
  aovPaging,
  aovByCategory,
  funnelPaging,
  bySource,
  topOrders,
  salesFunnel,
  periodBreakdown,
  periodDelta,
  growthLedger,
  conditionMix,
  verticalMix,
  categoryOemMix,
  growth,
  accountMovement,
  newAccounts,
  inactiveAccounts,
  insightTiles,
}: InsightCellProps) {
  // Merge a clicked value into its facet, so successive row clicks compose
  // into a multi-filter rather than replacing each other.
  //
  // Takes a full FacetValue: the live breakdown rows carry a REAL entity id in
  // `extra_metadata`, so a click filters by `account_ids=<uuid>` rather than by
  // display name. Every breakdown that supports a row click now sends a real
  // entity id (`data/insights/filters.ts`).
  const add = (key: MultiFilterKey, value: FacetValue) => {
    const cur = filters[key] ?? []
    if (cur.some((v) => v.id === value.id)) return
    onFilters({ ...filters, [key]: [...cur, value] })
  }

  switch (cell) {
    // Deliberate blank space in the grid — renders nothing visible. Hidden on
    // mobile (single column), where an empty cell would just be a dead gap.
    case 'spacer':
      return <div aria-hidden className={`hidden lg:block ${spanClass(span ?? 6)}`} />

    case 'summary':
      return (
        <InsightSummaryCard
          params={summaryParams}
          filtered={Object.keys(filters).length > 0}
        />
      )

    case 'sales-leaderboard':
      return (
        <SalesLeaderboard
          params={salesTeam.params}
          paging={salesTeam.paging}
          onRefine={(owner: FacetValue) => onFilters({ ...filters, owner: [owner] })}
        />
      )

    // Both revenue cells plot the SAME live series off `/crm/dashboard/revenue`
    // — only their copy differs. Keeping them on one widget is what stops the
    // dashboard tile and the hero it drills into from disagreeing.
    case 'revenue-trend':
      return (
        <RevenueTrendWidget
          params={revenueParams}
          title={S_TREND.revenueTrend}
          why={S_TREND.revenueTrendWhy}
          span={span ?? 6}
          paging={revenuePaging}
        />
      )

    // Average Order Value over time — the SAME live series & widget as the
    // Revenue Trend cell, dispatched by `metric: 'avg_order_value'`. Each
    // bucket's `revenue` field carries the AOV, so it renders as currency.
    case 'aov-trend':
      return (
        <RevenueTrendWidget
          params={{ ...revenueParams, metric: 'avg_order_value' }}
          title={S_TREND.aovByPeriod}
          why={S_TREND.aovByPeriodWhy}
          span={span ?? 6}
          paging={aovPaging}
        />
      )

    // The breakdown behind the curve above: AOV per IMS category, ranked and
    // server-paginated. Its own endpoint, so it does NOT go through
    // `RevenueBySourceTable` — see `AovByCategoryTable`. Clicking a row adds the
    // same `category` facet the by-source category cell adds, except the id
    // comes off a typed `category_details` rather than an `extra_metadata` cast.
    case 'aov-by-category':
      return (
        <AovByCategoryTable
          title={title ?? S_BRK.aovByCategory}
          why={why ?? S_BRK.aovByCategoryWhy}
          span={span ?? 6}
          params={aovByCategory.params}
          paging={aovByCategory.paging}
          onRowClick={(r) =>
            add('category', {
              id: r.category_details.id,
              label: r.category_details.name,
            })
          }
        />
      )

    // The 4-tile KPI strip, live off `/crm/dashboard/insights/summary-tiles`.
    // ONE cell, four bundles: `report_type` comes from the page (see
    // `insightTiles`), so the same cell reads Total/Peak Month on
    // monthly-revenue and Total/Top Account on account-revenue.
    case 'revenue-kpis':
      return insightTiles ? <InsightTilesStrip params={insightTiles} /> : null

    case 'revenue-hero':
      return (
        <RevenueTrendWidget
          params={revenueParams}
          title={(bucketPeriod) => S_REV.heroTitle[bucketPeriod]}
          why={S_REV.heroWhy}
          span={span ?? 6}
          paging={revenuePaging}
          breakdown
        />
      )

    // Row-per-bucket revenue table, LIVE and period-adaptive — the server picks
    // the bucket unit from `period` and the cell reads it back off the response.
    // A month row composes into the board's `month` facet on click; other bucket
    // units have no facet to drill into, so `onRefineMonth` goes unused there
    // (the cell decides, from `bucket_unit`).
    case 'period-breakdown':
      return (
        <PeriodicBreakdown
          span={span ?? 6}
          params={periodBreakdown.params}
          paging={periodBreakdown.paging}
          onRefineMonth={(month) => add('month', month)}
        />
      )

    // The same slice as the ledger below (one response serves both), rendered
    // as a trend LIST: bucket label + the bare percentage, no column headers.
    // See `GrowthDeltaList`.
    case 'period-delta':
      return (
        <GrowthDeltaList
          span={span ?? 3}
          title={title}
          why={why}
          params={periodDelta.params}
          paging={periodDelta.paging}
        />
      )

    // The Growth Ledger — the same rows with revenue, the rupee delta, the
    // percent change, orders and share.
    //
    // No `onRefineMonth` here, unlike `period-breakdown` above: this cell lives
    // on the Growth view, whose `filters` deliberately omit `month` (the growth
    // endpoint takes no `months`). The toolbar only renders chips for the facets
    // a view DECLARES, so a month set from a row click would narrow this table
    // while staying invisible and unclearable. Inert rows beat a filter the user
    // cannot see or undo.
    case 'growth-ledger':
      return (
        <PeriodicBreakdown
          variant="ledger"
          span={span ?? 6}
          title={title}
          why={why}
          params={growthLedger.params}
          paging={growthLedger.paging}
        />
      )

    case 'funnel-trends':
      // A `span` override applies PER TILE (three tiles render from this one
      // cell) — monthly-revenue passes 1 so the funnel row shares a line with
      // its half-width hero.
      return <FunnelTrendCells params={revenueParams} paging={funnelPaging} tileSpan={span} />

    // The three breakdowns below are ONE endpoint with three `report_type`s —
    // see `RevenueBySourceTable`. Each pages independently (its own URL param),
    // so paging Accounts cannot move Category or the leaderboard.
    case 'accounts':
      return (
        <RevenueBySourceTable
          title={title ?? S_BRK.accounts}
          why={why ?? S_BRK.accountsWhy}
          span={span ?? 6}
          params={bySource.account}
          paging={bySource.paging.account}
          onRowClick={(r) =>
            add('account', {
              id: (r.extra_metadata as { account_id: string }).account_id,
              label: r.name,
            })
          }
        />
      )

    case 'category':
      return (
        <RevenueBySourceTable
          title={title ?? S_BRK.category}
          why={why ?? S_BRK.categoryWhy}
          span={span ?? 3}
          params={bySource.category}
          paging={bySource.paging.category}
          onRowClick={(r) =>
            add('category', {
              id: (r.extra_metadata as { category_id: string }).category_id,
              label: r.name,
            })
          }
        />
      )

    case 'oem':
      return (
        <RevenueBySourceTable
          title={title ?? S_BRK.oem}
          why={why ?? S_BRK.oemWhy}
          span={span ?? 3}
          params={bySource.oem}
          paging={bySource.paging.oem}
          onRowClick={(r) => {
            // The "No OEM" bucket has no id to filter on.
            const oemId = (r.extra_metadata as { oem_id: string | null }).oem_id
            if (oemId) add('oem', { id: oemId, label: r.name })
          }}
        />
      )

    case 'condition':
      return (
        <RevenueShareDonut
          title={title ?? S_BRK.condition}
          why={why ?? S_BRK.conditionWhy}
          span={span ?? 3}
          params={bySource.condition}
          paging={bySource.paging.condition}
          metaField="condition"
          accents={CONDITION_ACCENT}
          // The slice carries the condition ENUM as its id, so the filter sends
          // `conditions=new` rather than the display label it used to seed.
          // The "No Condition" slice has a NULL enum — it filters by the
          // sentinel instead, the same value the Condition dropdown sends, so
          // both routes into that bucket produce one identical query.
          nullId={NULL_BUCKET_ID.condition}
          onSliceClick={(v) => add('condition', v)}
        />
      )

    case 'account-type':
      return (
        <RevenueShareDonut
          title={title ?? S_BRK.accountType}
          why={why ?? S_BRK.accountTypeWhy}
          span={span ?? 3}
          params={bySource.accountType}
          paging={bySource.paging.accountType}
          metaField="account_type"
          accents={ACCOUNT_TYPE_ACCENT}
          // `id === label` here (the API's account_type IS its display name),
          // so the facet chip and the query value are the same string.
          onSliceClick={(v) => add('vertical', v)}
        />
      )

    // Same component, paging and endpoint as the account breakdown above —
    // only `report_type` differs (`top_products`).
    case 'top-products':
      return (
        <RevenueBySourceTable
          title={title ?? S_BRK.topProducts}
          why={why ?? S_BRK.topProductsWhy}
          span={span ?? 3}
          params={bySource.topProducts}
          paging={bySource.paging.topProducts}
          // Deliberately no `onRowClick`: there is no product facet to drill
          // into, and this result set can contain the freeform "Other" bucket,
          // whose `extra_metadata` carries no part id to filter on.
        />
      )

    // The full-width, server-paginated ranked line items — its own endpoint,
    // so its own component and pager rather than a `top-products` variant.
    case 'top-orders':
      return (
        <TopOrdersTable
          title={title ?? S_TOP.title}
          why={why ?? S_TOP.why}
          span={span ?? 6}
          params={topOrders.params}
          paging={topOrders.paging}
          // Click a line → add its account to the board's account facet (same
          // compose-don't-replace behaviour as the by-source breakdown rows).
          onRowClick={(r) =>
            add('account', { id: r.account_details.id, label: r.account_details.name })
          }
        />
      )

    // Lead & deal conversion — its own endpoint. No `detailHref`: this cell only
    // renders on the page a tile would drill INTO, so a drill-through here would
    // navigate to the page the user is already on.
    // The Category × Brand pivot. Same component as the dashboard card; no
    // `detailHref` — this is the page that card drills INTO. The winner tiles
    // narrow THIS page's filters, like the by-source rows beside it.
    case 'category-oem-mix':
      return (
        <CategoryOemMixWidget
          span={span ?? 6}
          params={categoryOemMix.params}
          paging={categoryOemMix.paging}
          onDrillIn={(facet, value) => add(facet, value)}
        />
      )

    // Stacked condition mix over time. Reuses the SAME `periodBreakdown.params`
    // the breakdown table above it uses — one source of truth for the slice, so
    // the chart and the table can never describe different windows.
    case 'condition-mix-by-period':
      return (
        <ConditionMixByPeriod
          title={title}
          why={why}
          span={span ?? 6}
          params={conditionMix.params}
          paging={conditionMix.paging}
        />
      )

    // The same cross-tab over the account-type dimension. Same
    // `periodBreakdownParams` slice, its own pager.
    case 'vertical-mix-by-period':
      return (
        <VerticalMixByPeriod
          title={title}
          why={why}
          span={span ?? 6}
          params={verticalMix.params}
          paging={verticalMix.paging}
        />
      )

    // The scalar current-vs-previous stat. Same component as the board tile;
    // no `detailHref` here — this cell only renders on the page a tile drills
    // INTO, so a drill-through would navigate to the page already open.
    case 'growth-hero':
      return (
        <GrowthTile
          title={title}
          why={why}
          span={span ?? 3}
          params={growth.params}
          periodCoerced={growth.coerced}
        />
      )

    // Account Movement — 4-tile summary strip on the insights page. Reads
    // `summary` from the shared widget-mode response (TanStack Query dedupes
    // the fetch with the two bucket cards beside it).
    case 'account-movement-tiles':
      return <AccountMovementTilesStrip params={accountMovement.params} />

    // Account Movement — top growing / top declining standalone cards. SAME
    // component the dashboard tile uses; this cell only changes the span.
    // No `detailHref` — the user is already on the drill-down page.
    case 'account-movement-growing':
      return (
        <AccountMovementTile
          params={accountMovement.params}
          bucket="growing"
          span={span ?? 3}
          title={title ?? INSIGHTS_STRINGS.accountMovement.sectionGrowingTitle}
          why={why}
        />
      )
    case 'account-movement-declining':
      return (
        <AccountMovementTile
          params={accountMovement.params}
          bucket="declining"
          span={span ?? 3}
          title={title ?? INSIGHTS_STRINGS.accountMovement.sectionDecliningTitle}
          why={why}
        />
      )

    // Account Movement — the five-status count donut. Same widget-mode
    // response as the three cells above; no extra request.
    case 'account-movement-mix':
      return (
        <AccountMovementMixDonut
          params={accountMovement.params}
          span={span ?? 2}
          title={title}
          why={why}
        />
      )

    // Account Movement — every classified account, server-paginated. Needs
    // the page's paging handle; a composition that lists the cell without one
    // renders nothing rather than firing an unpaged request.
    case 'account-movement-all':
      return accountMovement.paging ? (
        <AccountMovementAllTable
          params={accountMovement.params}
          paging={accountMovement.paging}
          span={span ?? 6}
          title={title}
          why={why}
        />
      ) : null

    // ── New Accounts page ────────────────────────────────────────────────
    // One live cell (the ranked list) and four seeded ones; see each cell's
    // header for the endpoint it is waiting on.
    // By Period + New vs Repeat read ONE `/insights/new-accounts-by-period`
    // response off the shared `periodBreakdown.params` (same window, bucket
    // unit and facets as every other cell on the page).
    case 'new-accounts-by-period':
      return (
        <NewAccountsByPeriodList
          params={periodBreakdown.params}
          span={span ?? 4}
          title={title}
          why={why}
          paging={newAccounts?.byPeriodPaging}
        />
      )
    // By Vertical reads `summary.by_account_type` off the dashboard tile's
    // widget-mode `/new-accounts` response (same params → shared key).
    case 'new-accounts-by-vertical':
      return newAccounts ? (
        <NewAccountsByVerticalDonut
          params={newAccounts.params}
          span={span ?? 2}
          title={title}
          why={why}
        />
      ) : null
    // Inactive Accounts — the dormant list, read as a win-back plan, off
    // `/dashboard/inactive-accounts` in drill-down mode.
    case 'inactive-accounts-win-back':
      return inactiveAccounts ? (
        <InactiveAccountsWinBackTable
          params={inactiveAccounts.params}
          paging={inactiveAccounts.winBackPaging}
          span={span ?? 6}
          title={title}
          why={why}
        />
      ) : null
    // Per-bucket active vs inactive buyers — the SAME `periodBreakdown.params`
    // slice every other by-period cell uses, its own pager.
    case 'inactive-accounts-by-period':
      return inactiveAccounts ? (
        <InactiveAccountsByPeriod
          params={periodBreakdown.params}
          paging={inactiveAccounts.byPeriodPaging}
          span={span ?? 6}
          title={title}
          why={why}
        />
      ) : null

    case 'new-accounts-list':
      return newAccounts ? (
        <NewAccountsTable
          params={newAccounts.params}
          paging={newAccounts.listPaging}
          span={span ?? 6}
          title={title}
          why={why}
        />
      ) : null
    case 'new-vs-repeat-revenue':
      return (
        <NewVsRepeatRevenueTable
          params={periodBreakdown.params}
          span={span ?? 3}
          title={title}
          why={why}
          paging={newAccounts?.newVsRepeatPaging}
        />
      )
    // The Category × Brand pivot with `cohort=new_accounts` — same params
    // and pager as the dashboard pivot, plus the cohort flag.
    case 'new-accounts-category-oem':
      return (
        <NewAccountsCategoryOemPivot
          params={categoryOemMix.params}
          paging={categoryOemMix.paging}
          span={span ?? 6}
          title={title}
          why={why}
        />
      )

    // The Category × Brand pivot with `cohort=inactive_accounts` — the dormant
    // accounts' PAST orders. Same params and pager as the dashboard pivot.
    case 'inactive-accounts-category-oem':
      return (
        <InactiveAccountsCategoryOemPivot
          params={categoryOemMix.params}
          paging={categoryOemMix.paging}
          span={span ?? 6}
          title={title}
          why={why}
        />
      )

    case 'sales-funnel':
      return (
        <SalesFunnelCard
          title={title ?? S_FUNNEL.title}
          why={why ?? S_FUNNEL.why}
          span={span ?? 6}
          params={salesFunnel.params}
          paging={salesFunnel.paging}
        />
      )
  }
}
