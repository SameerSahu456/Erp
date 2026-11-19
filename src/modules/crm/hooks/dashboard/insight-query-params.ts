import { facetIds, type Period, type RevFilters } from '../../data/insights/records'
import { DEMO_YEAR, MONTHS } from '../../data/insights/seed'
import type {
  AccountMovementParams,
  AvgOrderValueByCategoryParams,
  CategoryPeriodComparisonParams,
  DashboardAccountType,
  DashboardConditionFilter,
  DashboardReportType,
  GrowthParams,
  GrowthPeriod,
  InactiveAccountsParams,
  InsightSummaryTilesParams,
  InsightTilesReportType,
  NewAccountsParams,
  PeriodBreakdownParams,
  RevenueByCategoryOemParams,
  RevenueBySourceParams,
  RevenueParams,
  SalesFunnelParams,
  SalesTeamRevenueParams,
  SummaryParams,
  TopOrdersParams,
} from '../../api/dashboard'
import type { ViewScope } from './useInsightView'

// Filter state → dashboard API query params.
//
// ONE mapper per endpoint, both built from the SAME shared body, so the widget
// and the inner view can never disagree about what a filter means.
//
// Two mappers rather than one because the endpoints' contracts genuinely
// differ: `/revenue` accepts no `search` and no `roles`. Passing them anyway
// would not error — it would just be ignored, which is how a filter silently
// stops filtering.
//
// DATES — the controls speak MONTH NAMES ('Feb'), both endpoints speak ISO
// `date`. Everything below converts at this boundary, because it is the only
// place that knows about both:
//
//   * `period=custom` needs `start` AND `end` (the backend 422s without them,
//     and 422s again if `end < start`). A raw 'Feb' was being sent straight
//     through as `start`, which is why Custom failed outright.
//
// MONTHS are NO LONGER a window. The month facet is a multi-select record
// filter sent as the repeated `months` param (see `toSharedParams`); `period`
// keeps choosing the bucket size, and the backend intersects the two. So
// `resolveWindow` below no longer looks at month at all — a month pick leaves
// the period (weekly / quarterly / …) exactly as the user set it.
//
// The custom window defaults to year-to-date (1 Jan of the CURRENT year →
// today; see `useInsightView`), so `DEMO_YEAR` — itself derived from today's
// clock, not a pinned year — is what legacy month-name `from`/`to` values
// resolve into. Real date inputs come from `InsightPeriodControl`.

const pad = (n: number) => String(n).padStart(2, '0')

/** 'Feb' → 2 (1-based). 0 when the name is unknown. */
const monthNo = (m: string) => MONTHS.indexOf(m as (typeof MONTHS)[number]) + 1

/** 'Feb' → '2026-02-01'. Undefined for an unknown month name. */
function monthStart(m: string): string | undefined {
  const no = monthNo(m)
  return no ? `${DEMO_YEAR}-${pad(no)}-01` : undefined
}

/** 'Feb' → '2026-02-28'. Day 0 of the NEXT month is the last of this one, so
 *  month lengths and leap years come from the calendar, not a table. */
function monthEnd(m: string): string | undefined {
  const no = monthNo(m)
  if (!no) return undefined
  const lastDay = new Date(Number(DEMO_YEAR), no, 0).getDate()
  return `${DEMO_YEAR}-${pad(no)}-${pad(lastDay)}`
}

/** ISO `yyyy-MM-dd` — what the custom date-range picker writes.
 *
 *  A SHAPE check only, and that is now all it needs to be: real-calendar
 *  validity (`2026-13-45`), ordering (`from ≤ to`) and the future clamp are
 *  enforced upstream in `insight-view.params.ts`, which is also where the user
 *  gets told. Before that existed, this regex was the ONLY guard on the range,
 *  which is exactly how an inverted window reached the wire and 422'd every
 *  widget on the board. Do not re-add validation here — a second, weaker copy
 *  is how the two drift. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** The custom window to send, or null when the view isn't date-bounded (every
 *  preset resolves its own window server-side).
 *
 *  Custom `from`/`to` arrive PRE-VALIDATED (see above) and pass straight
 *  through; bare month names ('Feb') are the legacy URL format and still
 *  resolve to that month's bounds. Months are NOT consulted here — they go out
 *  as the `months` record filter and never touch the window. */
function resolveWindow(
  period: Period,
  from: string,
  to: string,
): { start: string; end: string } | null {
  if (period !== 'custom') return null
  const start = ISO_DATE_RE.test(from) ? from : from ? monthStart(from) : undefined
  const end = ISO_DATE_RE.test(to) ? to : to ? monthEnd(to) : undefined
  return start && end ? { start, end } : null
}

interface Args {
  period: Period
  /** Month NAMES from the picker's window ('Feb'), not dates — only meaningful
   *  for the `custom` period. Converted to ISO before they hit the wire. */
  from: string
  to: string
  scope?: ViewScope
  /** The logged-in user's id. Required for `scope: 'my'` to do anything — see
   *  `user_ids` below. */
  currentUserId?: string | null
  filters: RevFilters
  search?: string
  page?: number
  pageSize?: number
}

/** The filter vocabulary both dashboard endpoints share. */
function toSharedParams({ period, from, to, scope, currentUserId, filters, page, pageSize }: Args) {
  // My View = "just me". Team View sends no `user_ids` at all and lets the
  // backend resolve the caller's scope (self + everyone reporting to them).
  //
  // In My View this REPLACES `filters.owner` rather than intersecting with it:
  // the Rep facet is hidden in that scope, so the only owner that can be in
  // play is the user themselves. Falling back to the facet when we have no id
  // would be worse than useless — a missing `user_ids` silently widens the
  // board to the whole team while the toggle still reads "My View".
  const ownScope = scope === 'my' && !!currentUserId

  const window = resolveWindow(period, from, to)

  // `custom` with no resolvable window would be a guaranteed 422 — fall back to
  // the preset rather than firing a request that cannot succeed.
  //
  // A BACKSTOP, not the guard. `insight-view.params.ts` already falls back (and
  // tells the user) for every unusable range that can arrive from the URL, so
  // in practice this catches only a caller constructing `Args` by hand. Kept
  // because the cost is one comparison and the failure it prevents is the whole
  // board erroring at once.
  const effectivePeriod: Period = period === 'custom' && !window ? 'monthly' : period

  return {
    period: effectivePeriod,
    // Presets compute their window from today and ignore these.
    start: window?.start,
    end: window?.end,
    // Selected calendar months → the repeated `months` record filter. `period`
    // still chooses the bucket size; the backend intersects `months` with the
    // period window. Empty when no month is picked (dropped before the wire).
    months: facetIds(filters.month),
    // Sent as a repeated param like the other facets — the backend honours the
    // full list (union of the selected account types).
    type: facetIds(filters.vertical) as DashboardAccountType[],
    conditions: facetIds(filters.condition) as DashboardConditionFilter[],
    category_ids: facetIds(filters.category),
    oem_ids: facetIds(filters.oem),
    user_ids: ownScope ? [currentUserId as string] : facetIds(filters.owner),
    account_ids: facetIds(filters.account),
    page,
    page_size: pageSize,
  }
}

export function toSalesTeamParams(args: Args): SalesTeamRevenueParams {
  return { ...toSharedParams(args), search: args.search }
}

/** `/crm/dashboard/revenue`. Takes no `search` — see the note above. */
export function toRevenueParams(args: Omit<Args, 'search'>): RevenueParams {
  return toSharedParams(args)
}

/** `/crm/dashboard/revenue/by-source` — the Accounts / Category / OEM cells.
 *
 *  Built from the same shared body, so a breakdown cell and the leaderboard
 *  beside it always agree on the slice. `roles` is deliberately NOT forwarded:
 *  this endpoint has no such param and FastAPI would drop it silently, which is
 *  how a filter stops filtering (see `api/dashboard.ts`). */
export function toBySourceParams(
  args: Omit<Args, 'search'> & { reportType: DashboardReportType },
): RevenueBySourceParams {
  return { ...toSharedParams(args), report_type: args.reportType }
}

/** `/crm/dashboard/insights/avg-order-value/by-category` — the AOV ranking.
 *
 *  The SAME shared body as `toBySourceParams`, minus `report_type`: that
 *  endpoint dispatches on a grouping key, this one only ever groups by
 *  category. Sharing the body is what makes the AOV table agree with the AOV
 *  trend directly above it about which orders are in the window.
 *
 *  `page` / `page_size` ride along from the shared body but are overridden by
 *  the cell's own pager before the request — exactly as the by-source cells
 *  do — so this table's page index is independent of the leaderboard's. */
export function toAvgOrderValueByCategoryParams(
  args: Omit<Args, 'search'>,
): AvgOrderValueByCategoryParams {
  return toSharedParams(args)
}

/** `/crm/revenue/by-category-oem` — the Category × OEM pivot widget.
 *
 *  Same shared body as `toBySourceParams`, minus `report_type` (this endpoint
 *  is the pivot; the dashboard's separate Category / OEM widgets keep dispatch
 *  on the by-source endpoint). Dashboard callers omit `account_id` and get
 *  their caller-scoped slice; the 360° widget wires `account_id` at its own
 *  callsite before the fetch.
 *
 *  `page` / `page_size` ride along and paginate the CATEGORY axis — the OEM
 *  columns always ship in full so the same brand column stays put across
 *  pages. */
export function toRevenueByCategoryOemParams(
  args: Omit<Args, 'search'>,
): RevenueByCategoryOemParams {
  return toSharedParams(args)
}

/** `/crm/dashboard/insights/period-wise-breakdown` — the row-per-bucket table.
 *
 *  Same shared body as the hero chart and the KPI strip on the same page, which
 *  is what makes `Σ row.revenue` reconcile with both.
 *
 *  `search` / `page` / `page_size` are STRIPPED rather than passed through, for
 *  the same reason as `toSalesFunnelParams`: the endpoint has none of them, and
 *  while FastAPI would ignore the extras they would still land in the query KEY
 *  — so one slice reached from two differently-paged pages would cache and
 *  refetch twice for nothing. */
export function toPeriodBreakdownParams(
  args: Omit<Args, 'search' | 'page' | 'pageSize'>,
): PeriodBreakdownParams {
  const { page: _page, page_size: _pageSize, ...rest } = toSharedParams(args)
  return rest
}

/** `/crm/dashboard/insights/category-period-comparison` — the shared body
 *  minus `months`: the widget's columns ARE periods, so a month facet would
 *  blank every other column (the endpoint does not take it). */
export function toCategoryPeriodComparisonParams(
  args: Omit<Args, 'search' | 'page' | 'pageSize'>,
): CategoryPeriodComparisonParams {
  const { months: _months, ...rest } = toPeriodBreakdownParams(args)
  return rest
}

/** `/crm/dashboard/revenue/top-orders` — the ranked SO line-item table.
 *
 *  Same shared body as every other widget, so the Top Orders tile and the
 *  breakdowns beside it can never disagree about what a filter means. `roles`
 *  is deliberately NOT forwarded (this endpoint has no such param); `search` is
 *  passed through so the full inner view can search line items — the tile does
 *  not supply one, so it stays undefined there. */
export function toTopOrdersParams(args: Args): TopOrdersParams {
  return { ...toSharedParams(args), search: args.search }
}

/** `/crm/dashboard/sales-funnel` — the lead & deal conversion card.
 *
 *  Same shared body as every other widget, so the funnel card and the cells
 *  beside it can never disagree about what a filter means. `page` / `page_size`
 *  are STRIPPED rather than passed through, for the same reason as
 *  `toSummaryParams`: this is a scalar widget with no pagination, and while the
 *  endpoint would ignore them they would still land in the query KEY — so two
 *  identical slices reached from differently-paged pages would cache and refetch
 *  separately for no reason.
 *
 *  The three product facets (`conditions` / `category_ids` / `oem_ids`) DO ride
 *  along even though the endpoint ignores them — see `api/dashboard.ts`.
 *  `lead_account_match` is deliberately not set: no UI exposes it, so the
 *  backend's `exact` default stands. */
export function toSalesFunnelParams(
  args: Omit<Args, 'search' | 'page' | 'pageSize'>,
): SalesFunnelParams {
  const { page: _page, page_size: _pageSize, ...rest } = toSharedParams(args)
  return rest
}

/** True when the board's period cannot be sent to `/crm/dashboard/growth` and
 *  `toGrowthParams` had to substitute one.
 *
 *  Exported so the tile can SAY so. A silently substituted window would have
 *  the card answer a different question than the toolbar claims — the number
 *  would be right and the label a lie. */
export function isGrowthPeriodCoerced(period: Period): boolean {
  return period === 'custom'
}

/** `/crm/dashboard/growth` — the scalar current-vs-previous tile.
 *
 *  Three deliberate departures from the shared body, all forced by the
 *  endpoint's own contract (see the note in `api/dashboard.ts`):
 *
 *  1. **`custom` is coerced to `monthly`, unconditionally.** `GrowthPeriod`
 *     has no `custom` member, so sending it is a guaranteed 422. Note this
 *     coerces even when the custom window RESOLVES — unlike `toSharedParams`,
 *     which only falls back when it cannot resolve one. The reason is
 *     different: there, dates were missing; here the endpoint accepts no dates
 *     at all, so a resolvable window is just as unsendable as an empty one.
 *  2. **`months` is dropped.** No such param. Leaving it in the object would
 *     put it in the query KEY and split the cache across month selections that
 *     produce byte-identical requests.
 *  3. **`start` / `end` are dropped.** Both windows are derived server-side
 *     from `period` alone and are calendar-strict.
 *
 *  Everything else — `type` / `conditions` / `category_ids` / `oem_ids` /
 *  `user_ids` / `account_ids` — passes straight through and narrows BOTH
 *  windows identically. The three sibling cards (Account Movement, New
 *  Accounts, Inactive Accounts) do NOT share this: their endpoints take the
 *  full board contract. */
export function toGrowthParams(
  args: Omit<Args, 'search' | 'page' | 'pageSize'>,
): GrowthParams {
  const {
    page: _page,
    page_size: _pageSize,
    months: _months,
    start: _start,
    end: _end,
    period,
    ...rest
  } = toSharedParams(args)
  return {
    ...rest,
    period: (period === 'custom' ? 'monthly' : period) as GrowthPeriod,
  }
}

/** `/crm/dashboard/account-movement` — per-account movement tile + its
 *  drill-down.
 *
 *  Shares the Growth window pair (same resolver server-side), so the two
 *  widgets agree on what "this period" means — including a custom range and
 *  the month facet. Same shared body; `page` / `page_size` from the body are
 *  dropped so widget-mode callers do not fork the cache key — the drill-down
 *  table supplies its own pager through `overrides`.
 *
 *  Widget-mode params (`movement` / `limit` / `page` / `page_size`) are passed
 *  through if the caller sets them; mode defaults to widget when `movement`
 *  is omitted. */
export function toAccountMovementParams(
  args: Omit<Args, 'search'>,
  overrides?: Pick<AccountMovementParams, 'movement' | 'limit' | 'page' | 'page_size'>,
): AccountMovementParams {
  const { page: _page, page_size: _pageSize, ...rest } = toSharedParams(args)
  return { ...rest, ...overrides }
}

/** `/crm/dashboard/inactive-accounts` — buyers with no approved SO inside
 *  the window.
 *
 *  Same window contract as the siblings (presets are a rolling day window
 *  ending today; `custom` and the month facet are the selected window) and
 *  the SAME shared body: `type` / `user_ids` / `account_ids` narrow the
 *  buyers, and the line facets (condition / category / OEM) narrow which
 *  orders count — "inactive on Dell" is a Dell buyer with no Dell order in
 *  the window. `page` / `page_size` from the body are dropped; the win-back
 *  table supplies its own pager. */
export function toInactiveAccountsParams(
  args: Omit<Args, 'search'>,
  overrides?: Pick<InactiveAccountsParams, 'limit'>,
): InactiveAccountsParams {
  const { page: _page, page_size: _pageSize, ...rest } = toSharedParams(args)
  return { ...rest, ...overrides }
}

/** `/crm/dashboard/new-accounts` — top-N newly-acquired accounts tile.
 *
 *  Same window pair as Growth / Account Movement, same shared body. `page` /
 *  `page_size` from the body are dropped (the drill-down list supplies its own
 *  pager through `overrides`); `limit` passes through from `overrides` —
 *  omitted → backend default of 5. */
export function toNewAccountsParams(
  args: Omit<Args, 'search'>,
  overrides?: Pick<NewAccountsParams, 'limit'>,
): NewAccountsParams {
  const { page: _page, page_size: _pageSize, ...rest } = toSharedParams(args)
  return { ...rest, ...overrides }
}

/** `/crm/dashboard/summary` — the 7-tile strip.
 *
 *  Same shared body, so the tiles always agree with the cells beneath them.
 *  `page` / `page_size` are STRIPPED rather than passed through: the summary is
 *  a scalar widget with no pagination. The endpoint would ignore them rather
 *  than error, but they'd still land in the query KEY — so two identical
 *  slices on different pages would cache and refetch separately for no reason.
 *  Everything else the shared body produces is valid here. */
export function toSummaryParams(args: Omit<Args, 'search' | 'page' | 'pageSize'>): SummaryParams {
  const { page: _page, page_size: _pageSize, ...rest } = toSharedParams(args)
  return rest
}

/** `/crm/dashboard/insights/summary-tiles` — the 4-tile KPI strip.
 *
 *  Same shared body as the Summary strip above it and the cells below it, so
 *  the KPI tiles can never disagree with either about what a filter means —
 *  which is exactly what the seeded version of this cell got wrong.
 *
 *  `page` / `page_size` are STRIPPED for the same reason as `toSummaryParams`:
 *  a scalar widget with no pagination, and leaving them in would split the
 *  cache key across pages that render the identical slice.
 *
 *  `reportType` is this endpoint's dispatch key and is NOT the by-source one —
 *  see `InsightTilesReportType` in `api/dashboard.ts`. */
export function toInsightSummaryTilesParams(
  args: Omit<Args, 'search' | 'page' | 'pageSize'> & { reportType: InsightTilesReportType },
): InsightSummaryTilesParams {
  const { page: _page, page_size: _pageSize, ...rest } = toSharedParams(args)
  return { ...rest, report_type: args.reportType }
}
