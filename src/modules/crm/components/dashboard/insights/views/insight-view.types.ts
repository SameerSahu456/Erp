import type {
  AccountMovementParams,
  InactiveAccountsParams,
  NewAccountsParams,
  AvgOrderValueByCategoryParams,
  GrowthParams,
  InsightSummaryTilesParams,
  PeriodBreakdownParams,
  RevenueByCategoryOemParams,
  RevenueParams,
  SalesFunnelParams,
  SalesTeamRevenueParams,
  SummaryParams,
  TopOrdersParams,
} from '../../../../api/dashboard'
import type { Period, RevFilters, RevRecord } from '../../../../data/insights/records'
import type { InsightPaging } from '../../../../hooks/dashboard/useInsightPaging'
import type { BySourceCells } from '../cells/InsightCellRenderer'
import type { FunnelPaging } from '../cells/FunnelTrendCells'

// The context every metric view receives. Built once in `CrmInsightDetailPage`
// and handed down whole, so a view can pick what it needs without the page
// having to know which metric wants what.
//
// Views are per-METRIC, not per-cell: `sales-team` renders the leaderboard +
// trend, `category-oem` renders two breakdown tables, and so on. Which cells a
// view contains is DATA — `INSIGHTS[metric].cells` in the registry — not JSX,
// so adding a cell to a view is a one-line registry edit.

export interface InsightViewProps {
  records: RevRecord[]
  period: Period
  filters: RevFilters
  onFilters: (f: RevFilters) => void
  salesTeam: { params: SalesTeamRevenueParams; paging: InsightPaging }
  revenueParams: RevenueParams
  summaryParams: SummaryParams
  revenuePaging: InsightPaging
  /** The AOV trend cell's own pager — kept separate from `revenuePaging`. */
  aovPaging: InsightPaging
  /** The AOV-by-category ranking — its own endpoint + its own pager, so paging
   *  it never moves the AOV trend it sits under. */
  aovByCategory: { params: AvgOrderValueByCategoryParams; paging: InsightPaging }
  funnelPaging: FunnelPaging
  bySource: BySourceCells
  /** The Top Orders line-item table — its own endpoint + its own pager. */
  topOrders: { params: TopOrdersParams; paging: InsightPaging }
  /** The Sales Funnel conversion table — its own endpoint + its own pager. */
  salesFunnel: { params: SalesFunnelParams; paging: InsightPaging }
  /** The period-wise breakdown table — its own endpoint + its own pager. */
  periodBreakdown: { params: PeriodBreakdownParams; paging: InsightPaging }
  /** The Growth page's compact read of the same slice (bucket + change), and
   *  the Growth Ledger under it. Same params, own pagers — they share a page,
   *  so one shared index would page both at once. */
  periodDelta: { params: PeriodBreakdownParams; paging: InsightPaging }
  growthLedger: { params: PeriodBreakdownParams; paging: InsightPaging }
  /** The condition-mix cross-tab — same slice as `periodBreakdown`, its own
   *  pager so the two tables on the page move independently. */
  conditionMix: { params: PeriodBreakdownParams; paging: InsightPaging }
  /** The vertical-mix cross-tab — same slice again, its own pager. */
  verticalMix: { params: PeriodBreakdownParams; paging: InsightPaging }
  /** The Category × Brand pivot — its own endpoint + its own pager (the
   *  category axis), so paging the matrix never moves the breakdowns. */
  categoryOemMix: { params: RevenueByCategoryOemParams; paging: InsightPaging }
  /** The Growth stat's slice. No pager — the endpoint is scalar. `coerced`
   *  is true when the board's `custom` period had to be swapped for `monthly`,
   *  which the tile says out loud. */
  growth: { params: GrowthParams; coerced: boolean }
  /** The Account Movement slice — shared by the tiles strip, the two bucket
   *  cards and the mix donut (widget mode, one request). `paging` is for the
   *  All Accounts table alone, which runs its own `movement=all` request. */
  accountMovement: { params: AccountMovementParams; paging?: InsightPaging }
  /** The New Accounts slice — the ranked list's live params plus the two
   *  URL-backed pagers of the seeded series cells (by period, new vs repeat),
   *  which page rows already in hand. */
  newAccounts: {
    params: NewAccountsParams
    listPaging: InsightPaging
    byPeriodPaging: InsightPaging
    newVsRepeatPaging: InsightPaging
  }
  /** The 4-tile KPI strip's slice. Undefined on the metrics with no bundle —
   *  see `INSIGHT_TILES_REPORT_TYPE` in the registry. */
  /** The Inactive Accounts page's tables. */
  inactiveAccounts?: {
    params: InactiveAccountsParams
    winBackPaging: InsightPaging
    byPeriodPaging: InsightPaging
  }
  insightTiles?: InsightSummaryTilesParams
}
