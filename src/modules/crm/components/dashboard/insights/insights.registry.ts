// Registry of insight metrics — the single hash that defines, per widget:
//   • its title / why copy,
//   • WHICH cells its inner (detail) view renders, and in what order,
//   • WHICH filter facets its filter bar exposes.
//
// Most inner views share the same tail of breakdown cells (accounts, category,
// OEM, condition, top products) and differ only in their hero. Rather than
// hand-assembling each body, a metric declares its cells here and the detail
// page renders them generically. Adding the next widget = one entry here + (if
// it needs one) a new hero cell in the renderer. No page surgery.
//
// NOTE on `filters`: the reference had this exact field and then IGNORED it —
// the page rendered the full facet set for every metric regardless. We keep the
// field but actually honour it, so it can't drift into a lie. The default set
// below matches what the reference really renders (`ALL_RECORD_FILTERS`), with
// `owner` appended at runtime only when the scope holds more than one rep.

import type { DashboardPeriod, InsightTilesReportType } from '../../../api/dashboard'
import { INSIGHTS_STRINGS } from './insights.strings'

export const METRIC_KEYS = [
  'sales-team',
  'monthly-revenue',
  'account-revenue',
  // Category and OEM share ONE page: they answer the same question ("what did
  // we close, sliced by product") and reading them side by side is the point.
  'category-oem',
  'condition-revenue',
  'account-type-revenue',
  // Average Order Value — its own drill-down page (Summary + AOV-by-Period),
  // reached from the Performance & Pipeline tile on the dashboard.
  'avg-order-value',
  // Top Orders — its own drill-down page (Summary + full-width paginated
  // top-orders table + funnel/revenue + the shared breakdown tail), reached
  // from the Performance & Pipeline tile.
  'top-orders',
  // Sales Funnel — lead & deal conversion. Its own endpoint
  // (`/crm/dashboard/sales-funnel`), its own hero cell, its own page, reached
  // from the Performance & Pipeline tile.
  'sales-funnel',
  // Growth — this period's revenue vs the previous FULL one. Its own endpoint
  // (`/crm/dashboard/growth`), its own scalar hero cell, its own page, reached
  // from the Growth tile at the end of Revenue Insights.
  'growth',
  // Account Movement — top growing + top declining accounts between the same
  // window pair as Growth. Its own endpoint
  // (`/crm/dashboard/account-movement`), its own tile, and (Phase 2 of this
  // feature) its own drill-down page.
  'account-movement',
  // New Accounts — this window's first-time buyers. `/crm/dashboard/new-accounts`
  // backs the tile, the ranked list and the by-vertical split;
  // `/insights/new-accounts-by-period` the two per-bucket series; the
  // Category × Brand pivot takes `cohort=new_accounts`. See
  // `comprint-erp-docs/modules/crm/dashboard/new-accounts-insight-plan.md`.
  'new-accounts',
  // Inactive Accounts — buyers with no order in the window. The board tile's
  // `/crm/dashboard/inactive-accounts` backs the ranked list AND the win-back
  // plan; the pivot / condition / top-products cells are the shared ones. See
  // `INACTIVE_ACCOUNTS_INSIGHT_PLAN.md` (repo root) for the API gaps.
  'inactive-accounts',
] as const
export type MetricKey = (typeof METRIC_KEYS)[number]

/** Every cell an inner view can render. Add a key here + a case in the
 *  detail page's `renderCell` to introduce a new one. */
export type InsightCell =
  // shared header — every inner view opens with the Summary strip
  | 'summary'
  // heroes — specific to one metric
  | 'sales-leaderboard'
  | 'revenue-kpis'
  | 'revenue-hero'
  // The scalar current-vs-previous stat. Same component as the board tile.
  | 'growth-hero'
  // Cross-tab: one row per bucket, one column per condition. A table, on the
  // shared ranking-table chrome — see `cells/ConditionMixByPeriod.tsx`.
  | 'condition-mix-by-period'
  // The same cross-tab over the ACCOUNT-TYPE dimension — see
  // `cells/VerticalMixByPeriod.tsx`.
  | 'vertical-mix-by-period'
  // Row-per-bucket revenue table. NOT 'monthly-' any more: the bucket unit
  // follows the selected period (week / month / quarter / year), so the cell
  // renames with it.
  | 'period-breakdown'
  // Same endpoint as `period-breakdown`, read as a trend LIST rather than a
  // table: bucket label + the bare percentage, no column headers — "Month-on-
  // Month Growth %". See `cells/GrowthDeltaList.tsx`. Its own key because the
  // two sit on one page (the Growth view renders this above the ledger).
  | 'period-delta'
  // The same table again with the money columns AND the rupee delta, titled
  // "Growth Ledger". Own key for the same reason, plus its own pager — the two
  // tables share a page and must page independently (§16.7).
  | 'growth-ledger'
  | 'revenue-trend'
  // Same live series & component as `revenue-trend`, `metric: 'avg_order_value'`.
  | 'aov-trend'
  // Ranked, server-paginated AOV per IMS category — its OWN endpoint
  // (`/dashboard/insights/avg-order-value/by-category`), not a by-source
  // report type. See `cells/AovByCategoryTable.tsx`.
  | 'aov-by-category'
  // shared — reused across metrics
  | 'funnel-trends'
  | 'accounts'
  | 'category'
  | 'oem'
  // The Category × Brand pivot — the same `CategoryOemMixWidget` the dashboard
  // renders, on the page its card drills into. Own endpoint
  // (`/revenue-by-category-oem`), own pager (the category axis).
  | 'category-oem-mix'
  | 'condition'
  | 'account-type'
  | 'top-products'
  // The full-width, server-paginated Top Orders table (ranked SO line items).
  // Its own endpoint, so it is not a `top-products` variant.
  | 'top-orders'
  // Account Movement cells (Phase 2 of the account-movement feature).
  // All three read the SAME widget-mode `/dashboard/account-movement`
  // response — TanStack Query dedupes the key so one network request
  // serves the whole insights page.
  //   * `account-movement-tiles`   — 4 top summary tiles (growing count,
  //                                   declining count, net movement, biggest
  //                                   mover). Reads `summary`.
  //   * `account-movement-growing` — standalone top-growing ranking card
  //                                   (same component as the dashboard tile,
  //                                   rendered at insights-page span).
  //   * `account-movement-declining` — same for top declining.
  //   * `account-movement-mix`     — count donut of the five statuses
  //                                   (growing / declining / lapsed / flat /
  //                                   new). Reads `summary`, same response.
  //   * `account-movement-all`     — the paginated All Accounts table. Its
  //                                   OWN request (`movement=all`, page by
  //                                   page): the widget response only carries
  //                                   the top-N of each bucket.
  | 'account-movement-tiles'
  | 'account-movement-growing'
  | 'account-movement-declining'
  | 'account-movement-mix'
  | 'account-movement-all'
  // New Accounts cells (the `/crm/insights/new-accounts` page). Three
  // responses serve the five: `/new-accounts` (list in drill-down mode; the
  // by-vertical split off the tile's widget-mode response), one shared
  // `/insights/new-accounts-by-period` (by period + new vs repeat), and the
  // Category × Brand pivot with `cohort=new_accounts`.
  | 'new-accounts-by-period'
  | 'new-accounts-by-vertical'
  | 'new-accounts-list'
  | 'new-vs-repeat-revenue'
  | 'new-accounts-category-oem'
  // Inactive Accounts cells (the `/crm/insights/inactive-accounts` page). The
  // win-back plan is THE list of dormant accounts — `/dashboard/inactive-accounts`
  // in drill-down mode, titled with the window. See
  // `INACTIVE_ACCOUNTS_INSIGHT_PLAN.md` for the columns the endpoint lacks.
  | 'inactive-accounts-win-back'
  // Active vs inactive buyers per bucket — `/insights/inactive-accounts-by-period`.
  | 'inactive-accounts-by-period'
  // The Category × Brand pivot over the inactive cohort's PAST orders —
  // `/revenue/by-category-oem` with `cohort=inactive_accounts`.
  | 'inactive-accounts-category-oem'
  // Lead & deal CONVERSION (total / converted / rate) off
  // `/crm/dashboard/sales-funnel`. NOT a `funnel-trends` variant: that cell is a
  // time series off `/revenue`. Different question, different endpoint.
  | 'sales-funnel'
  // Renders NOTHING — an invisible grid cell for deliberate blank space.
  // `{ cell: 'spacer', span: N }`: span 3 leaves the rest of a half-filled
  // row empty; span 6 skips a whole row. Hidden on mobile (single column).
  | 'spacer'

/** Filter facets a detail page can expose. `owner` is added at runtime. */
export type InsightFilterField =
  | 'vertical'
  | 'condition'
  | 'category'
  | 'oem'
  | 'month'
  | 'account'
  | 'owner'

/** What the reference actually renders for every metric. */
const DEFAULT_FILTERS: InsightFilterField[] = [
  'vertical',
  'condition',
  'category',
  'oem',
  'month',
  'account',
]

/** The breakdown tail every metric ends with.
 *
 *  The account cell carries an explicit title here: as a SUPPORTING cell it is
 *  "Top Accounts" (a top-N ranking beside other splits), while the dashboard
 *  tile and the account-revenue page — where the account split IS the subject —
 *  both read "Revenue by Account", so drilling in never renames the thing you
 *  clicked. See `InsightCellSpec` below. */
// const SHARED_TAIL: InsightCellSpec[] = ['accounts', 'category', 'oem', 'condition', 'top-products']
const SHARED_TAIL: InsightCellSpec[] = [
  { cell: 'accounts', title: INSIGHTS_STRINGS.breakdowns.accountsDetail },
  'category',
  'oem',
  'condition',
  'top-products'
]

/** The same tail MINUS the account breakdown, for `account-revenue` — that view
 *  already renders accounts full-width as its own hero. Spreading the full tail
 *  there rendered the cell twice (duplicate React keys, two account tables on
 *  one page). */
const SHARED_TAIL_NO_ACCOUNTS: InsightCellSpec[] = ['category', 'oem', 'condition', 'top-products']

/** A cell in a metric's view. Either the bare key, or the key plus overrides
 *  for THIS view.
 *
 *  Both overrides exist because a breakdown reads differently depending on
 *  where it sits. The account breakdown is "Revenue by Account" on the
 *  dashboard tile and on its own full-width `account-revenue` page — in both,
 *  the account split IS the subject, and keeping one name means drilling from
 *  the tile into the page never renames what you clicked. It is "Top Accounts"
 *  as a supporting cell on every OTHER metric's page, where it is one ranking
 *  beside several other splits. Same data, different question, different name
 *  and width. Hardcoding either in the cell renderer forces every view to
 *  share one. */
export type InsightCellSpec =
  | InsightCell
  | {
      cell: InsightCell
      /** Grid span in THIS view. Falls back to the cell's own default. */
      span?: Span
      /** Heading in THIS view. Falls back to the cell's own default. */
      title?: string
      /** Sub-copy in THIS view. Falls back to the cell's own default. */
      why?: string
    }

/** Normalise a spec so callers never branch on the union. */
export const cellSpec = (spec: InsightCellSpec) =>
  typeof spec === 'string' ? { cell: spec } : spec

export interface InsightMeta {
  key: MetricKey
  /** A plain string for the period-NEUTRAL pages, or a function of the
   *  toolbar's period for the pages whose name IS the bucket size ("Revenue by
   *  Month" / "Growth This Month"). Same shape as `RevenueTrendWidget`'s
   *  `title` prop, for the same reason: the header must not keep saying "by
   *  Month" once the board is bucketing weeks.
   *
   *  Unlike the CELLS, this resolves off the toolbar rather than off a
   *  response — the page header owns no query, and the maps below already
   *  encode the server's bucketing rule for every period (`custom` buckets
   *  monthly, so it reads "by Month"). The only divergence is the in-flight
   *  moment, where the title names the period the user just picked. */
  title: string | ((period: DashboardPeriod) => string)
  /** Surfaced in the widget's info tooltip and the detail page's subtitle. */
  why: string
  cells: InsightCellSpec[]
  filters: InsightFilterField[]
}

const funnel_revenue_together: InsightCellSpec[] = [
  // `revenue-hero` now renders as the wider breakdown table (Leads / Deals /
  // Lead ₹ / Deal ₹ / Account ₹ / Total per bucket), so it fills the full row
  // on its own — span bumped from 3 to 6.
  { cell: 'revenue-hero', span: 6 },
  // ── COMMENTED OUT: `funnel-trends` (Leads / Deals Closed / SO Closed
  // Value tiles) — the three per-bucket counts + closed-value now sit inside
  // the `revenue-hero` breakdown table above, so the trio next to it was
  // duplicate reads of the same series. Restore this line if the standalone
  // trend cards need to come back.
  // { cell: 'funnel-trends', span: 3 },
]

/** Toolbar period → the bucket unit the Growth endpoint actually compares.
 *
 *  `INSIGHTS_STRINGS.growth.title` is keyed by unit (the tile reads the unit
 *  off its own response); the page header only has the toolbar's period, so it
 *  needs this bridge. `custom` maps to `month` because `toGrowthParams` coerces
 *  it there — the endpoint's `GrowthPeriod` has no `custom` member. */
const GROWTH_TITLE_UNIT = {
  weekly: 'week',
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
  custom: 'month',
} as const satisfies Record<DashboardPeriod, keyof typeof INSIGHTS_STRINGS.growth.title>

/** Which `report_type` the `revenue-kpis` cell fetches on each page.
 *
 *  `GET /crm/dashboard/insights/summary-tiles` is ONE endpoint with four tile
 *  bundles, and the bundle is a property of the PAGE, not of the cell — so the
 *  mapping lives here, beside the `cells` lists that decide which pages carry
 *  the strip at all. A page listing `revenue-kpis` without an entry here has no
 *  bundle to fetch, so the cell renders nothing — check both lists when adding
 *  the strip to a fifth page. Values are typed as the BACKEND enum, so a typo
 *  in a report type fails to typecheck rather than 422-ing at runtime.
 *
 *  Still PARTIAL, for exactly one page: `sales-team` has no bundle. Its
 *  header is the 7-tile Summary strip, which already answers the leads /
 *  quotes / win-rate question a KPI strip would; a second strip beneath it
 *  would restate the same figures in a different shape. Every other metric
 *  key maps, so the `Partial<>` is load-bearing rather than leftover. */
export const INSIGHT_TILES_REPORT_TYPE: Partial<Record<MetricKey, InsightTilesReportType>> = {
  'monthly-revenue': 'revenue_by_month',
  'account-revenue': 'revenue_by_account',
  'category-oem': 'category_oem',
  // The page is "Channel vs End Customer"; the backend aggregates by
  // `accounts.account_type`, hence the name mismatch. Same slice.
  'account-type-revenue': 'account_type_wise',
  // Names below match the backend enum verbatim — a typo fails to typecheck
  // against `InsightTilesReportType` rather than 422-ing at runtime.
  'condition-revenue': 'condition',
  growth: 'growth',
  'sales-funnel': 'sales_funnel',
  'top-orders': 'top_orders',
  'avg-order-value': 'avg_order_value',
  'new-accounts': 'new_accounts',
  'inactive-accounts': 'inactive_accounts',
}

/** Is this string a real tile bundle? Guards the `:reportType` route param on
 *  the tile drill-down page, which reaches the API — §11.1 forbids sending a
 *  URL value the client can already prove the server will reject. Derived from
 *  the map above so a fifth bundle cannot be added without this following. */
const TILES_REPORT_TYPES = new Set<string>(Object.values(INSIGHT_TILES_REPORT_TYPE))

export const isTilesReportType = (value: string): value is InsightTilesReportType =>
  TILES_REPORT_TYPES.has(value)

// Typed, NOT `any`. It was loosened to `any` while six entries were commented
// out, and that is precisely what let the page set rot silently: with `any`, a
// missing key is a runtime `undefined` on `INSIGHTS[metric].cells`, so six
// dead detail pages typechecked clean. Restored so removing an entry fails the
// build instead of the browser.
export const INSIGHTS: Record<MetricKey, InsightMeta> = {
  'sales-team': {
    key: 'sales-team',
    title: INSIGHTS_STRINGS.salesTeam.title,
    why: INSIGHTS_STRINGS.salesTeam.why,
    // cells: ['summary', 'sales-leaderboard', 'revenue-trend', 'funnel-trends', ...SHARED_TAIL],
    cells: ['summary', 'sales-leaderboard',...funnel_revenue_together, ...SHARED_TAIL],
    filters: DEFAULT_FILTERS,
  },
  'monthly-revenue': {
    key: 'monthly-revenue',
    // A FUNCTION of the period, not `.monthly` and not the whole map.
    //
    // `revenueByMonth.title` is keyed by bucket unit (weekly / monthly / …) so
    // the dashboard WIDGET can rename itself from the response's `period.type`.
    // Pinning the page to `.monthly` meant the card said "Revenue by Week" and
    // the page you drilled into from it still said "Revenue by Month", while
    // every cell below the header — the bucket table, the hero series — had
    // already renamed itself. Handing the raw MAP to `<PageHeader title>` is
    // not the fix either: that puts a plain object where React expects a child
    // and crashes the page into its ErrorBoundary. Hence the lookup.
    title: (period: DashboardPeriod) => INSIGHTS_STRINGS.revenueByMonth.title[period],
    why: INSIGHTS_STRINGS.revenueByMonth.why,
    // Hero + funnel share ONE line as FOUR EQUAL tiles covering the full row:
    // Revenue by Month, Leads, Deals Closed, SO Closed Value at a quarter each
    // (4 × 1.5 = 6). The funnel-trends `span` is PER TILE — see
    // `FunnelTrendCells.tileSpan`.
    cells: [
      'summary',
      // Secondary summary — the 4-tile KPI strip (Total / Peak Month / Avg per
      // Month / Months Active) under the main summary card. LIVE off
      // `/crm/dashboard/insights/summary-tiles` with `report_type:
      // revenue_by_month` (see `INSIGHT_TILES_REPORT_TYPE`), on the same
      // filter body as the summary strip above it — so the two agree.
      'revenue-kpis',
      // The bucket table this page is named for — LIVE off
      // `/crm/dashboard/insights/period-wise-breakdown`, on the same filter body
      // as the KPI strip above it, so `Σ revenue` reconciles with those tiles
      // and with the hero series. Full width: four numeric columns plus a share
      // bar do not read at half.
      { cell: 'period-breakdown', span: 6 },
      ...funnel_revenue_together,
      ...SHARED_TAIL,
    ],
    filters: DEFAULT_FILTERS,
  },
  'account-revenue': {
    key: 'account-revenue',
    title: INSIGHTS_STRINGS.breakdowns.accounts,
    why: INSIGHTS_STRINGS.breakdowns.accountsWhy,
    cells: [
      // Full width, and titled the SAME as the dashboard tile that drills in
      // here — on this page the account split is the subject, so it keeps the
      // name the user clicked rather than being renamed mid-journey.
      //
      // The tail is the no-accounts variant on purpose: spreading the full
      // SHARED_TAIL re-added this same cell below, rendering two account tables
      // with duplicate React keys.
      'summary',
      // Total / Accounts / Top Account / Top-3 Share — `report_type:
      // revenue_by_account`. Concentration is the question this page answers,
      // so the share tile belongs above the table, not buried under it.
      'revenue-kpis',
      { cell: 'accounts', span: 6, title: INSIGHTS_STRINGS.breakdowns.accounts },
      ...funnel_revenue_together,
      ...SHARED_TAIL_NO_ACCOUNTS,
    ],
    filters: DEFAULT_FILTERS,
  },
  'category-oem': {
    key: 'category-oem',
    title: INSIGHTS_STRINGS.breakdowns.categoryOem,
    why: INSIGHTS_STRINGS.breakdowns.categoryOemWhy,
    cells: [
      'summary',
      // Total / Top Category / Top OEM / Categories — `report_type:
      // category_oem`. One strip for both splits, matching the page.
      'revenue-kpis',
      { cell: 'category-oem-mix', span: 6 },
      // Half each — reading them side by side is why they share a page.
      { cell: 'category', span: 3 },
      { cell: 'oem', span: 3 },
      // The Category × Brand pivot, full width — the dashboard card that drills
      // into this page, so the matrix is here too.
      ...funnel_revenue_together,
      { cell: 'accounts', title: INSIGHTS_STRINGS.breakdowns.accountsDetail },
      { cell: 'condition', span: 6 },
      { cell: 'top-products', span: 6 },
    ],
    filters: DEFAULT_FILTERS,
  },
  'condition-revenue': {
    key: 'condition-revenue',
    title: INSIGHTS_STRINGS.breakdowns.condition,
    why: INSIGHTS_STRINGS.breakdowns.conditionWhy,
    cells: [
      'summary',
      // Total / New / Refurb + Pull / Avg Order — `report_type: condition`, on
      // the same filter body as the summary strip above and the donut below, so
      // the three agree on what a condition filter means.
      'revenue-kpis',
      { cell: 'condition', span: 3 },
      // Was a `spacer` — a deliberately blank full-width row sitting exactly
      // where this widget belongs, so this is a replacement rather than an
      // insertion and the page gains a cell without gaining a gap.
      { cell: 'condition-mix-by-period', span: 6 },
      ...funnel_revenue_together,
      { cell: 'accounts', title: INSIGHTS_STRINGS.breakdowns.accountsDetail },
      { cell: 'category', span: 3 },
      { cell: 'oem', span: 3 },
      { cell: 'top-products', span: 6 },
      
      
    ],
    filters: DEFAULT_FILTERS,
  },
  'account-type-revenue': {
    key: 'account-type-revenue',
    title: INSIGHTS_STRINGS.breakdowns.accountType,
    why: INSIGHTS_STRINGS.breakdowns.accountTypeWhy,
    cells: [
      // Every insight page opens with the Summary strip. This one used to be the
      // exception — "the split IS the question it answers" — but the exception
      // cost the page its leads / quotes / win-rate header while every sibling
      // page kept one, so the same filter slice read differently depending on
      // which tab you were on.
      'summary',
      // Total / End Customer / Channel Partner / Leading — `report_type:
      // account_type_wise`.
      'revenue-kpis',
      { cell: 'account-type', span: 3 },
      // Was a `spacer` — "deliberate blank space, a full empty row under the
      // half-width hero", i.e. room reserved for exactly this widget. Replacing
      // it puts the mix where it was asked for (before the funnel/revenue pair)
      // without the page gaining a blank row.
      { cell: 'vertical-mix-by-period', span: 6 },
      ...funnel_revenue_together,
      { cell: 'accounts', title: INSIGHTS_STRINGS.breakdowns.accountsDetail },
      { cell: 'category', span: 3 },
      { cell: 'oem', span: 3 },
      { cell: 'condition', span: 3 },
      { cell: 'top-products', span: 3 },
    ],
    filters: DEFAULT_FILTERS,
  },
  'avg-order-value': {
    key: 'avg-order-value',
    title: INSIGHTS_STRINGS.avgOrderValue.title,
    why: INSIGHTS_STRINGS.avgOrderValue.why,
    // Summary strip, then the AOV series full-width, then the per-category
    // ranking beneath it. The AOV trend reuses `RevenueTrendWidget` (same
    // component as Revenue Trend) with `metric: 'avg_order_value'`; see the
    // `aov-trend` case in the renderer. `aov-by-category` is a separate
    // endpoint answering "which categories carry the biggest tickets" — the
    // breakdown behind the curve directly above it.
    cells: [
      'summary',
      // AOV / Orders / Peak Period / Total Value — `report_type:
      // avg_order_value`. Peak is absent at `yearly` (one bucket, nothing to
      // compare), so the strip is three tiles wide there; the renderer keys
      // faces by tile key and never assumes a count.
      // STRICTLY-Approved universe, matching both widgets
      // below it; its Total Value therefore reads lower than the Revenue by
      // Month page's for the same window, and the tiles say so.
      'revenue-kpis',
      { cell: 'aov-trend', span: 6 },
      { cell: 'aov-by-category', span: 6 },
    ],
    filters: DEFAULT_FILTERS,
  },
  'top-orders': {
    key: 'top-orders',
    title: INSIGHTS_STRINGS.topOrders.title,
    why: INSIGHTS_STRINGS.topOrders.why,
    // Summary strip, then the ranked line items full-width as the hero, then
    // the shared revenue-hero + funnel line and the standard breakdown tail —
    // the exact body the tile drills into.
    //
    // SHARED_TAIL is inlined here so `top-products` can render full-width. At
    // its default span=3 the card grew to ~100 rows at page-size 100 while the
    // 2-4 slice Condition donut beside it stayed short, leaving the pager
    // sitting far below its neighbour — the "goes below" bug. `condition` is
    // promoted alongside for the same reason `category-oem` does it: keeping
    // one at span=3 alone in a row is the awkward middle ground.
    cells: [
      'summary',
      // Total Value / Orders / Biggest Order / Avg Order — `report_type:
      // top_orders`. Reads the same totals the table below paginates.
      'revenue-kpis',
      { cell: 'top-orders', span: 6 },
      ...funnel_revenue_together,
      { cell: 'accounts', title: INSIGHTS_STRINGS.breakdowns.accountsDetail },
      'category',
      'oem',
      { cell: 'condition', span: 6 },
      { cell: 'top-products', span: 6 },
    ],
    filters: DEFAULT_FILTERS,
  },
  'sales-funnel': {
    key: 'sales-funnel',
    title: INSIGHTS_STRINGS.salesFunnel.title,
    why: INSIGHTS_STRINGS.salesFunnel.why,
    // Summary strip, then the conversion card full-width as the hero, then the
    // shared revenue-hero + funnel-trends line and the standard breakdown tail —
    // the exact body the Performance & Pipeline tile drills into.
    //
    // The `funnel-trends` tiles sitting below the hero are deliberate, not a
    // duplicate: they show leads / deals / SO value OVER TIME off `/revenue`,
    // where the hero shows how many of this window's leads and deals actually
    // converted. Ratio above, trend below.
    cells: [
      'summary',
      // Leads / Orders / Lead → Order / Closed Value — `report_type:
      // sales_funnel`. Leads and the rate come from the funnel's own query, so
      // they equal the conversion card directly below.
      'revenue-kpis',
      { cell: 'sales-funnel', span: 6 },
      ...funnel_revenue_together,
      ...SHARED_TAIL,
    ],
    filters: DEFAULT_FILTERS,
  },
  growth: {
    key: 'growth',
    // Period-keyed like `monthly-revenue` above, and for the same reason: the
    // Growth hero already reads its unit off the response, so a frozen "Growth
    // This Month" header sat over "Growth This Quarter". `growth.title` is
    // keyed by BUCKET UNIT, not by the toolbar's period, so the lookup goes
    // through `GROWTH_TITLE_UNIT` — which also encodes the coercion in
    // `toGrowthParams`: this endpoint has no `custom`, so a custom range is
    // fetched (and titled) as monthly. See `isGrowthPeriodCoerced`.
    title: (period: DashboardPeriod) => INSIGHTS_STRINGS.growth.title[GROWTH_TITLE_UNIT[period]],
    why: INSIGHTS_STRINGS.growth.why,
    // Opens with the Summary strip, then the period-wise breakdown TWICE — the
    // same endpoint read two ways, which is the whole page:
    //
    //   1. `period-delta` — "Month-on-Month Growth %": a trend list of bucket +
    //      percentage, no headers. "Did we grow, every period", with no revenue
    //      figures competing for the eye.
    //   2. `growth-ledger` — the same rows as Month / Revenue / Δ Value / MoM %.
    //      The percentage alone hides that +200% on a ₹5k bucket is ₹10k, so the
    //      money sits beside it. No Orders / Share column: this table is about
    //      the MOVE, and both live on the Monthly Breakdown already.
    //
    // There is no bespoke ledger endpoint or MoM bar chart: the growth endpoint
    // is SCALAR (two windows, no series), and period-wise-breakdown already
    // returns a row per bucket with `delta` / `delta_pct` / `direction` on it.
    cells: [
      'summary',
      // Revenue / Growth % / Δ vs Prev / Best Month — `report_type: growth`.
      // The first three are the Growth hero's own numbers; Best Month is the
      // biggest jump in the ledger below, so the strip summarises the page
      // rather than restating one half of it.
      'revenue-kpis',
      // Half width — two columns do not need six, and the spacer keeps the
      // ledger below it on its own full-width row.
      { cell: 'period-delta', span: 6 },
      // { cell: 'spacer', span: 3 },
      { cell: 'growth-ledger', span: 6 },
      { cell: 'revenue-trend', span: 3 },
      ...funnel_revenue_together,
      ...SHARED_TAIL,
    ],
    // No 'month': `/crm/dashboard/growth` takes no `months` param, so the facet
    // would be a control that provably does nothing to this page's hero. The
    // rest all narrow BOTH windows identically.
    filters: ['vertical', 'condition', 'category', 'oem', 'account'],
  },
  'account-movement': {
    key: 'account-movement',
    // The dashboard splits this into two half-row widgets (Growing / Declining)
    // via `AccountMovementTile`'s `bucket` prop; the drill-down page title
    // folds them back into one header, so it uses the combined phrasing —
    // the page's own section headings differentiate.
    title: INSIGHTS_STRINGS.accountMovement.pageTitle,
    why: INSIGHTS_STRINGS.accountMovement.whyGrowing,
    // Phase 2 composition — summary strip, the 4-tile account-movement strip,
    // the two bucket cards side by side, the Movement Mix donut + the
    // paginated All-Accounts table, then the shared breakdown tail. The
    // Growing-vs-Declining Cohort Revenue trend (needs new backend) stays a
    // follow-up cell.
    cells: [
      'summary',
      // Full-width 4-tile strip — the strip owns its own grid span
      // (`lg:col-span-12`), same as `revenue-kpis`.
      'account-movement-tiles',
      { cell: 'account-movement-growing', span: 3 },
      { cell: 'account-movement-declining', span: 3 },
      // The reference pairs the donut (span 2) with the cohort trend (span
      // 4) and gives the All Accounts table the full row below. The cohort
      // chart needs new backend; its slot is held by a spacer so the table
      // keeps the full-width, eight-column shape of the reference.
      { cell: 'account-movement-mix', span: 2 },
      { cell: 'spacer', span: 4 },
      { cell: 'account-movement-all', span: 6 },
      // Revenue widget — full-width breakdown table (Leads / Deals / Lead ₹
      // / Deal ₹ / Account ₹ / Total per bucket). Same shared body as every
      // other cell on the page, so numbers reconcile with the tiles above
      // and the breakdowns below.
      ...funnel_revenue_together,
      // Shared tail — Accounts / Category / OEM / Condition / Top Products
      // ranking tables, in that order.
      ...SHARED_TAIL,
    ],
    // The full default set. `month` used to be left off with Growth's
    // reasoning, but `/dashboard/account-movement` has taken `start` / `end`
    // / `months` since the 2026-10-08 window change (BACKEND_CHANGES_FLOW.md
    // §3.6), so the facet now narrows both windows like every other filter.
    // `owner` (Rep) is appended by the page for a multi-rep scope, exactly
    // as on the revenue pages — never listed here, or it renders twice.
    filters: DEFAULT_FILTERS,
  },
  'new-accounts': {
    key: 'new-accounts',
    title: INSIGHTS_STRINGS.newAccounts.title,
    why: INSIGHTS_STRINGS.newAccounts.pageWhy,
    // The reference page's cards, in its order and spans: Summary strip, the
    // by-period series (4) beside the by-vertical split (2), the ranked list
    // full-width, new-vs-repeat (3) beside the slot the reference gives
    // "New Logos by Rep" (held by a spacer until that card is agreed), then
    // the cohort's Category × OEM pivot full-width.
    cells: [
      'summary',
      // The cohort's own headline strip under the shared Summary — New in
      // <window> / New-account revenue / Avg first order / Already reordered,
      // LIVE off `/insights/summary-tiles` with `report_type: new_accounts`
      // (see `INSIGHT_TILES_REPORT_TYPE`). The first two tiles drill into the
      // cohort's orders on `/records`; the two ratios ship no drill-down.
      'revenue-kpis',
      { cell: 'new-accounts-by-period', span: 4 },
      { cell: 'new-accounts-by-vertical', span: 2 },
      { cell: 'new-accounts-list', span: 6 },
      // New vs Repeat Revenue — parked for now (2026-10-07). The cell, its
      // hook and the `/insights/new-accounts-by-period` fields that feed it
      // all stay wired; uncomment this line to bring the card back. Its
      // half-row slot and the "New Logos by Rep" slot beside it collapse
      // together, so no spacer is needed while it is parked.
      // { cell: 'new-vs-repeat-revenue', span: 3 },
      // { cell: 'spacer', span: 3 },
      { cell: 'new-accounts-category-oem', span: 6 },
      // Revenue by Condition + Top Products share a row, then the Revenue by
      // Month trend full-width. These three are the SAME cells the other
      // insight pages mount, on the page's filter body — the whole window,
      // not the new-accounts cohort (their endpoints take no `cohort` flag).
      { cell: 'condition', span: 3 },
      { cell: 'top-products', span: 3 },
      // { cell: 'revenue-trend', span: 6 },
      { cell: 'revenue-hero', span: 6 },
    ],
    // The same set as every revenue page — the endpoint takes `months` and
    // `account_ids`, so both facets narrow the cohort. `owner` (Rep) is
    // appended by the page for a multi-rep scope; listing it here rendered
    // the Rep facet twice.
    filters: DEFAULT_FILTERS,
  },
  'inactive-accounts': {
    key: 'inactive-accounts',
    title: INSIGHTS_STRINGS.inactiveAccounts.title,
    why: INSIGHTS_STRINGS.inactiveAccounts.pageWhy,
    // The reference page's order: Summary strip, the page's headline strip,
    // the win-back plan full-width (the dormant list itself, titled with the
    // window), active vs inactive by period, then what these accounts used to
    // buy — the Category × OEM pivot, condition and top products — and the
    // revenue hero.
    //
    // `revenue-kpis` is the page's headline strip — LIVE off
    // `/insights/summary-tiles` with `report_type: inactive_accounts` (see
    // `INSIGHT_TILES_REPORT_TYPE`) — Inactive Accounts (drills into the
    // cohort's past orders on `/records`) and Avg Months Idle (inert).
    //
    // The pivot is cohort-scoped (`inactive-accounts-category-oem`: the
    // dormant accounts' PAST orders). The condition / top-products cells still
    // read the page's filter body over EVERY visible account — by-source
    // takes no inactive cohort yet (plan §2.3). The win-back table's Rep / Avg Order columns print "—"
    // until the row carries them (plan §2.2).
    cells: [
      'summary',
      'revenue-kpis',
      { cell: 'inactive-accounts-win-back', span: 6 },
      { cell: 'inactive-accounts-by-period', span: 6 },
      { cell: 'inactive-accounts-category-oem', span: 6 },
      { cell: 'condition', span: 3 },
      { cell: 'top-products', span: 3 },
      { cell: 'revenue-hero', span: 6 },
    ],
    // The same set as every revenue page — the endpoint takes `months` and
    // `account_ids`, so both facets narrow the cohort. `owner` (Rep) is
    // appended by the page for a multi-rep scope; listing it here rendered
    // the Rep facet twice.
    filters: DEFAULT_FILTERS,
  },
}

export const isMetricKey = (v: string): v is MetricKey =>
  (METRIC_KEYS as readonly string[]).includes(v)

// ── Revenue Insights tiles (dashboard first page) ────────────────────────────
//
// THE list of breakdown tiles under the "Revenue Insights" heading. Every one
// of them is the SAME endpoint — `GET /crm/dashboard/revenue/by-source` — with
// a different `report_type`, so adding a breakdown is an entry here and
// nothing else: no new component, no page edit, no new query.
//
// To add one: append a tile with the `report_type` the backend supports
// (`account` | `category` | `oem` | `condition` | `account_type_wise`), pick
// `kind` (a ranked table or a donut), give it a `pagingKey` from `PAGING_KEYS`
// so it pages independently of its neighbours, and point `facet` /
// `metaIdField` at the filter it drills into. To hide one, delete or comment
// out the line. Order here IS render order.

import type { DashboardReportType } from '../../../api/dashboard'
import type { MultiFilterKey } from '../../../data/insights/records'
import type { PagingKey } from '../../../hooks/dashboard/useInsightPaging'
import type { Span } from './InsightWidget'

export interface RevenueInsightTile {
  id: string
  /** The detail page this tile drills into. Several tiles may share one —
   *  Category and OEM both open `category-oem`. */
  metric: MetricKey
  /** The endpoint's dispatch key. */
  reportType: DashboardReportType
  /** Ranked table, or the share donut. */
  kind: 'table' | 'donut'
  span: Span
  title: string
  why: string
  /** Own URL page param, so paging one tile never moves another (§16.7). */
  pagingKey: PagingKey
  /** Facet a row/slice click adds to the board's filters. Omit for no drill-in. */
  facet?: MultiFilterKey
  /** Field inside the row's `extra_metadata` holding the real entity id. The
   *  filter binds by id, not by display name. */
  metaIdField?: string
}


// ── Revenue Insights tiles ───────────────────────────────────────────────
// Named consts rather than one array: a tile's CONFIG lives here, its
// PLACEMENT is `CRM_DASHBOARD_LAYOUT`'s business below. That split is what
// lets a tile be hidden from the board by commenting one line, without
// deleting the definition it would need when re-enabled.

export const ACCOUNT_TILE: RevenueInsightTile = {
    id: 'account-revenue',
    metric: 'account-revenue',
    reportType: 'account',
    kind: 'table',
    span: 3,
    title: INSIGHTS_STRINGS.breakdowns.accounts,
    why: INSIGHTS_STRINGS.breakdowns.accountsWhy,
    pagingKey: 'accounts',
    facet: 'account',
    metaIdField: 'account_id',
  }

export const CATEGORY_TILE: RevenueInsightTile = {
    id: 'category-revenue',
    metric: 'category-oem',
    reportType: 'category',
    kind: 'table',
    span: 3,
    title: INSIGHTS_STRINGS.breakdowns.category,
    why: INSIGHTS_STRINGS.breakdowns.categoryWhy,
    pagingKey: 'category',
    facet: 'category',
    metaIdField: 'category_id',
  }

export const OEM_TILE: RevenueInsightTile = {
    id: 'oem-revenue',
    metric: 'category-oem',
    reportType: 'oem',
    kind: 'table',
    span: 3,
    title: INSIGHTS_STRINGS.breakdowns.oem,
    why: INSIGHTS_STRINGS.breakdowns.oemWhy,
    pagingKey: 'oem',
    facet: 'oem',
    metaIdField: 'oem_id',
  }

export const CONDITION_TILE: RevenueInsightTile = {
    id: 'condition-revenue',
    metric: 'condition-revenue',
    reportType: 'condition',
    kind: 'donut',
    span: 3,
    title: INSIGHTS_STRINGS.breakdowns.condition,
    why: INSIGHTS_STRINGS.breakdowns.conditionWhy,
    pagingKey: 'condition',
    facet: 'condition',
    metaIdField: 'condition',
  }

export const ACCOUNT_TYPE_TILE: RevenueInsightTile = {
    id: 'account-type-revenue',
    metric: 'account-type-revenue',
    // Same endpoint, same donut — only the grouping differs. The backend
    // zero-fills missing buckets, so all four account types always render.
    reportType: 'account_type_wise',
    kind: 'donut',
    span: 3,
    title: INSIGHTS_STRINGS.breakdowns.accountType,
    why: INSIGHTS_STRINGS.breakdowns.accountTypeWhy,
    pagingKey: 'account-type',
    // `vertical` is the facet that maps to the endpoint's `type` param (see
    // `toSharedParams`); `account_type` is where the row carries the value.
    // Here id === label — the API's account_type IS its display name.
    facet: 'vertical',
    metaIdField: 'account_type',
  }

// ── First-page layout ────────────────────────────────────────────────────
//
// The CRM dashboard's first page (`/crm`) is composed from THIS array and
// nothing else. Hiding a widget is commenting out its entry; hiding a whole
// band is commenting out the section. No page edits, no JSX surgery.
//
// Pure data on purpose — it must not import hooks or components, so both the
// dashboard and tests can read it. `renderWidget` in `DashboardSectionView`
// supplies the params each widget needs.
//
// A widget is a discriminated union so one section can mix kinds, and adding a
// new `kind` fails to compile until the renderer's switch handles it.

export type DashboardWidget =
  | { kind: 'sales-team'; span: Span; enabled?: boolean }
  | { kind: 'revenue-by-month'; span: Span; enabled?: boolean }
  // Category × OEM pivot — its own endpoint (`/crm/revenue/by-category-oem`),
  // its own response shape (a pivot, not the flat rows every by-source tile
  // returns), so it doesn't fit as another `RevenueInsightTile`.
  | { kind: 'category-oem-mix'; span: Span; enabled?: boolean }
  // Category — Period Comparison (from the erp-demo board). UI only for now:
  // static sample data until its endpoint lands — see
  // CRM_CATEGORY_PERIOD_COMPARISON_PLAN.md.
  | { kind: 'category-period-comparison'; span: Span; enabled?: boolean }
  | { kind: 'avg-order-value'; span: Span; enabled?: boolean }
  | { kind: 'top-orders'; span: Span; enabled?: boolean }
  | { kind: 'sales-funnel'; span: Span; enabled?: boolean }
  // Growth is NOT a `by-source` tile: different endpoint, different response
  // shape, and no `report_type` — so it needs its own kind rather than another
  // entry in `RevenueInsightTile`.
  | { kind: 'growth'; span: Span; enabled?: boolean }
  // Account Movement — SEPARATE widgets for growing + declining. `bucket`
  // picks which half of the shared widget-mode response the card renders.
  // Two instances on the dashboard dedupe via TanStack Query cache (same
  // params → same key → one network request). Its own kind for the same
  // reason Growth has one: its endpoint doesn't fit the by-source model.
  | { kind: 'account-movement'; bucket: 'growing' | 'declining'; span: Span; enabled?: boolean }
  // New Accounts — count of newly-acquired accounts (first-ever SO in
  // current window) + top-5 ranked list. Rule A per NEW_ACCOUNTS_WIDGET_PLAN.
  | { kind: 'new-accounts'; span: Span; enabled?: boolean }
  // Inactive Accounts — buyers with no approved SO in the period-driven
  // rolling day window. Only `period` + `limit` wire to the backend today;
  // no filter facets yet.
  | { kind: 'inactive-accounts'; span: Span; enabled?: boolean }
  | { kind: 'by-source'; tile: RevenueInsightTile; enabled?: boolean }

export interface DashboardSection {
  id: string
  /** Omit for a band with no heading (the hero row). */
  heading?: string
  /** Grid track. The hero row is 5 so it reads 60/40; bands are 6. */
  columns: 5 | 6
  /** `false` hides the section but keeps it visible in this file. */
  enabled?: boolean
  /** Stretch every card in this band to the height of the tallest one, instead
   *  of letting each size to its own content.
   *
   *  OPT-IN per band, not the grid default, because the two behaviours are both
   *  right in different places. A band of small breakdown tiles wants
   *  content-height: a short list that stretched to match a tall neighbour is
   *  just a card with a void in it. The HERO pair is the opposite — two big
   *  cards side by side at the top of the page, where a ragged bottom edge is
   *  the first thing you see, and whose row counts drift apart as soon as the
   *  period changes (10 reps beside 3 accounts).
   *
   *  Cards in a stretched band should pin their footer with `mt-auto` so the
   *  extra height opens up ABOVE the pager rather than below it. */
  stretch?: boolean
  widgets: DashboardWidget[]
}

/** Absent `enabled` means shown — so an entry without the field still renders. */
export const isEnabled = (x: { enabled?: boolean }) => x.enabled !== false

/** Widgets shown only while the `crm_extras` feature switch (FEATURE_CRM_EXTRAS)
 *  is on — the ones main's board leaves out. */
export const CRM_EXTRA_WIDGET_KINDS: ReadonlySet<DashboardWidget["kind"]> = new Set([
  "category-oem-mix",
  "category-period-comparison",
  "account-movement",
  "new-accounts",
  "inactive-accounts",
])

export const CRM_DASHBOARD_LAYOUT: DashboardSection[] = [
  // Hero — Sales Team on the left, Revenue by Month on the right (replacing
  // the Revenue-by-Account tile that used to live here; it has moved into
  // Revenue Insights with the other by-source breakdowns).
  {
    id: 'hero',
    columns: 6,
    widgets: [
      { kind: 'sales-team', span: 3 },
      { kind: 'revenue-by-month', span: 3 },
    ],
  },
  // Revenue Insights — pivot & breakdowns first, then period comparison, then
  // the by-source tiles, then the growth / account-movement / new-accounts
  // scalar pipeline tiles.
  {
    id: 'revenue-insights',
    heading: INSIGHTS_STRINGS.page.revenueInsights,
    columns: 6,
    widgets: [
      { kind: 'category-oem-mix', span: 6 },
      { kind: 'by-source', tile: CATEGORY_TILE },
      { kind: 'by-source', tile: OEM_TILE },
      { kind: 'category-period-comparison', span: 6 },
      { kind: 'by-source', tile: ACCOUNT_TILE },
      { kind: 'by-source', tile: CONDITION_TILE },
      { kind: 'by-source', tile: ACCOUNT_TYPE_TILE },
      { kind: 'growth', span: 3 },
      // Account Movement growing + declining fill a full row together.
      { kind: 'account-movement', bucket: 'growing', span: 3 },
      { kind: 'account-movement', bucket: 'declining', span: 3 },
      { kind: 'new-accounts', span: 3 },
      // Pair with Inactive Accounts so growth + attrition sit side-by-side.
      { kind: 'inactive-accounts', span: 3 },
    ],
  },
  // Performance & Pipeline — Sales Funnel + AOV paired on the top row, then
  // Top Orders full-width beneath.
  {
    id: 'performance-pipeline',
    heading: INSIGHTS_STRINGS.page.performancePipeline,
    columns: 6,
    widgets: [
      { kind: 'sales-funnel', span: 3 },
      { kind: 'avg-order-value', span: 3 },
      { kind: 'top-orders', span: 6 },
    ],
  },
]
