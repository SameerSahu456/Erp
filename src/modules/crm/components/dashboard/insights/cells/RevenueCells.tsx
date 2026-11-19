import {
  ArrowUpDown,
  Boxes,
  Building2,
  CalendarRange,
  IndianRupee,
  Layers,
  Percent,
  PieChart,
  Receipt,
  RefreshCw,
  Repeat,
  Server,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Trophy,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { Link, useLocation } from 'react-router-dom'

import { DataCard, type DataCardAccent } from '@/components/common/display/DataCard'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'

import type { InsightSummaryTilesParams } from '../../../../api/dashboard'
import { drilldownKind } from '../../../../api/dashboard'
import { useInsightSummaryTiles } from '../../../../hooks/dashboard/useInsightSummaryTiles'
import { tileDrilldownHref } from '../insights.routes'
import { INSIGHTS_STRINGS } from '../insights.strings'
import { ShimmerBar } from "../InsightShimmer"

// The Revenue by Month hero cell: the 4-tile KPI strip.
//
// The month-by-month table that used to live here is gone — it derived its rows
// from seeded `records`. Its live, period-adaptive replacement is
// `PeriodicBreakdown`, off `/crm/dashboard/insights/period-wise-breakdown`.

const S_TILES = INSIGHTS_STRINGS.insightTiles

/** Accent + icon per tile KEY, per bundle.
 *
 *  Keyed by `tile.key` — the stable machine identity the endpoint ships beside
 *  each tile — not by slot and not by label.
 *
 *  It used to be by SLOT, which held while every bundle returned a fixed 4 in a
 *  fixed order. Two bundles now drop tiles under a filter (`account_type_wise`
 *  returns Total + one tile per account type IN SCOPE; `condition` drops its
 *  split tiles when `?conditions=` excludes them), so slot 2 is "Refurb + Pull"
 *  unfiltered and "Avg Order" under `?conditions=new` — keyed by slot, the
 *  icons visibly shuffle as you filter.
 *
 *  Not by `label` either: that is the one field on a tile the backend owns as
 *  COPY and can reword at will, which would make a wording change a silent UI
 *  bug. `key` is owned by the backend as a CONTRACT instead.
 *
 *  The keys below mirror the service files one-for-one:
 *    revenue_by_month   Total · Peak Month · Avg / Month · Months Active
 *    revenue_by_account Total · Accounts · Top Account · Top-3 Share
 *    category_oem       Total · Top Category · Top OEM · Categories
 *    account_type_wise  Total · one tile per account type in scope
 *    condition          Total · New · Refurb + Pull · Avg Order
 *    growth             Revenue · Growth % · Δ vs Prev · Best Month
 *    sales_funnel       Leads · Orders · Lead → Order · Closed Value
 *    top_orders         Total Value · Orders · Biggest Order · Avg Order
 *    avg_order_value    AOV · Orders · Peak Period · Total Value
 *                       (THREE tiles at `yearly` — Peak is dropped there; a
 *                        year-to-date span bucketed by year is one bucket, so
 *                        the tile could only ever render "—".)
 *
 *  Accents follow the reference dashboard: the MONEY total is `success` on
 *  every bundle so the same number reads the same colour across pages, and
 *  `primary` always lands on the tile that names the winner (Peak, Top, Best,
 *  Biggest) or, where a bundle has no winner tile, on the figure the page is
 *  named for.
 *
 *  The outer map is NOT `Partial` and must not become one: it is keyed by the
 *  backend enum, so adding a bundle server-side breaks this file until a row is
 *  added — the only thing standing between a new bundle and a strip of fallback
 *  icons. The INNER maps are plain records: an unknown key falls back to
 *  `DEFAULT_FACE`, so a backend that adds a tile renders it plainly rather than
 *  crashing the strip. */
type TileFace = { accent: DataCardAccent; icon: LucideIcon }

const TILE_FACES: Record<
  InsightSummaryTilesParams['report_type'],
  Record<string, TileFace>
> = {
  revenue_by_month: {
    total: { accent: 'success', icon: IndianRupee },
    peak: { accent: 'primary', icon: TrendingUp },
    avg: { accent: 'info', icon: CalendarRange },
    active: { accent: 'violet', icon: CalendarRange },
  },
  revenue_by_account: {
    total: { accent: 'success', icon: IndianRupee },
    accounts: { accent: 'info', icon: Building2 },
    top_account: { accent: 'primary', icon: Trophy },
    top3_share: { accent: 'violet', icon: PieChart },
  },
  category_oem: {
    total: { accent: 'success', icon: IndianRupee },
    top_category: { accent: 'primary', icon: Layers },
    top_oem: { accent: 'violet', icon: Boxes },
    categories: { accent: 'info', icon: Layers },
  },
  account_type_wise: {
    total: { accent: 'success', icon: IndianRupee },
    end_customer: { accent: 'violet', icon: Users },
    channel_partner: { accent: 'info', icon: Building2 },
    cloud_data_center: { accent: 'primary', icon: Server },
    end_user: { accent: 'teal', icon: UserRound },
  },
  condition: {
    total: { accent: 'success', icon: IndianRupee },
    new: { accent: 'primary', icon: Sparkles },
    refurb_pull: { accent: 'violet', icon: RefreshCw },
    avg_order: { accent: 'info', icon: Receipt },
  },
  growth: {
    revenue: { accent: 'success', icon: IndianRupee },
    growth: { accent: 'primary', icon: TrendingUp },
    delta: { accent: 'info', icon: ArrowUpDown },
    best: { accent: 'violet', icon: CalendarRange },
  },
  sales_funnel: {
    leads: { accent: 'info', icon: Users },
    orders: { accent: 'violet', icon: ShoppingCart },
    lead_to_order: { accent: 'primary', icon: Percent },
    closed_value: { accent: 'success', icon: IndianRupee },
  },
  top_orders: {
    total_value: { accent: 'success', icon: IndianRupee },
    orders: { accent: 'info', icon: ShoppingCart },
    biggest_order: { accent: 'primary', icon: Trophy },
    avg_order: { accent: 'violet', icon: Receipt },
  },
  avg_order_value: {
    aov: { accent: 'success', icon: IndianRupee },
    orders: { accent: 'info', icon: ShoppingCart },
    peak: { accent: 'primary', icon: TrendingUp },
    total_value: { accent: 'violet', icon: Layers },
  },
  // New in <window> · New-account revenue · Avg first order · Already reordered.
  // `primary` lands on the count the page is named for; the money tile keeps
  // the bundle-wide `success`.
  new_accounts: {
    new: { accent: 'primary', icon: UserPlus },
    revenue: { accent: 'success', icon: IndianRupee },
    avg_first_order: { accent: 'info', icon: Receipt },
    reordered: { accent: 'violet', icon: Repeat },
  },
  // Inactive Accounts · Avg Months Idle — a two-tile strip by product
  // decision. `danger` on the count the page is named for.
  inactive_accounts: {
    inactive: { accent: 'danger', icon: Users },
    avg_idle: { accent: 'info', icon: CalendarRange },
  },
}

/** Fallback for a bundle that ever returns MORE than 4 tiles — the strip keeps
 *  rendering rather than dropping a tile or crashing on an undefined face. */
const DEFAULT_FACE: TileFace = { accent: 'primary', icon: IndianRupee }

/** How many skeleton cards to reserve while loading.
 *
 *  A HINT, explicitly not a contract — and two bundles now prove it: filtering
 *  `account_type_wise` to one account type returns TWO tiles. The grid is
 *  `flex-wrap` with `flex-1`, so whatever arrives splits its line's full width
 *  and a short bundle closes up rather than leaving dead tracks. Four is simply
 *  the common case, so the strip usually does not resize when data lands. */
const TILE_COUNT = 4

/** Bundles that ship FEWER than four tiles, so the skeleton reserves the same
 *  number the data will land with and the strip does not jump on load.
 *  `sales_funnel` is three while Lead → Order is commented out of the backend
 *  bundle; `inactive_accounts` is a two-tile strip by product decision (the two
 *  cards split the row half and half). Keep in step with the services. */
const SHIMMER_TILE_COUNT: Partial<Record<InsightSummaryTilesParams['report_type'], number>> = {
  // PREVIEW (user request 2026-11-17): two half-width shimmer cards. The real
  // bundle ships THREE tiles while Lead → Order is hidden, so set this back to
  // 3 once the look has been judged.
  sales_funnel: 2,
  inactive_accounts: 2,
}

/** Full-bleed row wrapper.
 *
 *  `lg:col-span-12`, not `-6`: `DashboardGrid` renders on TWELVE tracks (spans
 *  still SPEAK in sixths — see `SPAN_CLASS`), so a 6 would leave this strip at
 *  half width with dead space beside it. */
const STRIP_CLASS = 'lg:col-span-12'

/** Content-driven layout — the strip fills its row whatever it is handed.
 *
 *  Was a hardcoded `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, which pinned the
 *  track count to the four tiles every bundle happens to return today. Fixed
 *  tracks never redistribute: drop a tile and the fourth stays behind as dead
 *  space, add one and it wraps alone onto a second row.
 *
 *  Not the shared `.cpt-kpi-grid` either — that is `auto-FILL minmax(220px,1fr)`,
 *  which lays down as many tracks as the row can hold (~6 at this width) and
 *  KEEPS the empty ones, parking four cards on the left with a third of the row
 *  blank. That is the gap the old explicit 4-up was working around.
 *
 *  Not `auto-FIT` either: it collapses tracks empty across the WHOLE grid, so it
 *  fixes the removal case only while every card still fits one row. On a ragged
 *  wrap (4 cards over 3 tracks) the orphan keeps two dead cells beside it.
 *  `flex-wrap` + `flex-1` has no tracks — whatever lands on a line splits that
 *  line's full width, so the last row closes up as readily as a full one.
 *
 *  `gap-3.5` is the same 14px the shared class uses, so the strip keeps the
 *  app's KPI rhythm; the CARDS are still `.cpt-kpi` via `DataCard`, which is
 *  where the visual identity actually lives. */
const GRID_CLASS = 'cpt-kpi-strip flex flex-wrap gap-3.5'

/** Per-card sizing, the other half of `GRID_CLASS`.
 *
 *  `flex-1` is `flex: 1 1 0%`, so a card's width comes purely from splitting its
 *  line's free space — every card on a line is equal width — and the min-width
 *  is what decides where the line breaks. 13.75rem = 220px, the same floor the
 *  shared `.cpt-kpi-grid` uses, so the strip wraps at the density the rest of the
 *  app's KPI rows do. */
const CARD_CLASS = 'min-w-[13.75rem] flex-1'

/** The 4-tile KPI strip under the Summary card — live off
 *  `GET /crm/dashboard/insights/summary-tiles`.
 *
 *  Built from `DataCard` (the shared `.cpt-kpi` card used by every other module's
 *  stat row) rather than a local tile, so this strip picks up the accent bar,
 *  icon chip and hover lift for free and cannot drift from the rest of the app.
 *
 *  Every label / value / sub-line is a PRE-FORMATTED string from the server, so
 *  this component formats nothing: the strip and the widgets around it round
 *  currency the same way because ONE implementation does it.
 *
 *  An out-of-scope `user_ids` is a 403 here, not empty tiles — hence
 *  `LoadErrorState`, which renders that as "no access" rather than
 *  "failed to load". */
export function InsightTilesStrip({ params }: { params: InsightSummaryTilesParams }) {
  const { data, isLoading, isError, error } = useInsightSummaryTiles(params)
  // The drill-through must carry the URL the user is actually on — the tile
  // computed its number from that slice, so the page it opens has to inherit it.
  const location = useLocation()

  if (isError) {
    return (
      <div className={STRIP_CLASS}>
        <LoadErrorState error={error} fallback={S_TILES.loadError} compact />
      </div>
    )
  }

  // `!data` covers the first paint after an invalidation, where `isLoading` is
  // false but the cache is still empty.
  if (isLoading || !data) {
    return (
      <div className={STRIP_CLASS}>
        <div className={GRID_CLASS}>
          {Array.from({ length: SHIMMER_TILE_COUNT[params.report_type] ?? TILE_COUNT }, (_, i) => (
            // Same `.cpt-kpi` shell as the real card, so the skeleton has the
            // card's own padding and radius and nothing shifts on load. The
            // three bars mirror label / value / sub — the sub slot is reserved
            // unconditionally because a tile that HAS one is the taller shape.
            <div key={i} className={`cpt-kpi ${CARD_CLASS}`} data-accent="primary">
              <div className="space-y-2">
                <ShimmerBar className="h-3 w-24" />
                <ShimmerBar className="h-7 w-28" />
                <ShimmerBar className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const faces = TILE_FACES[data.report_type]

  return (
    <div className={STRIP_CLASS}>
      <div className={GRID_CLASS}>
        {data.data.map((tile) => {
          // By KEY, with the slot as a fallback only for a tile whose key this
          // build does not know — a backend that adds one renders it plainly
          // instead of blanking the strip.
          const { accent, icon } = faces[tile.key] ?? DEFAULT_FACE
          // A tile drills through only when the SERVER gave it somewhere to go.
          // No `drilldown` (Avg / Month, Months Active) → a plain card with no
          // link and no hover affordance, exactly as `isDrillable` gates the
          // summary strip. A dead click target reads as a broken feature.
          //
          // Gated on `drilldownKind`, which recognises ALL FOUR targets a tile
          // can name, and NOT on `toRevenueBySourceParams` — that narrower
          // returns null for anything but `/revenue/by-source`, so using it
          // here silently killed every tile pointing at `/records`,
          // `/revenue/top-orders` or `/insights/avg-order-value/by-category`.
          // That was the whole Sales Funnel stage pair, both AOV tiles and the
          // Top Orders tile: server sent a drill-down, the strip threw it away
          // and rendered an inert card. `CrmTileDrilldownPage` has always
          // rendered all four kinds — only this gate disagreed.
          const drillable = drilldownKind(tile.drilldown) !== null

          // `CARD_CLASS` carries the flex sizing (`flex-1` + `min-w-*`) that
          // decides how the strip splits and where it wraps, so it MUST land on
          // the direct flex child — the anchor when there is one, the card
          // itself when there is not. Putting it on the inner card inside a
          // wrapper would leave the wrapper unsized and collapse the strip.
          const card = (
            <DataCard
              key={tile.label}
              label={tile.label}
              value={tile.value}
              // Always an object, never null — an empty-metadata tile ships
              // `{label: "", value: ""}`, which must render as no sub-line.
              sub={tile.metadata?.value || undefined}
              accent={accent}
              icon={icon}
              // Fills the anchor so the hover surface is the whole tile, and so
              // flex's stretch gives every card on a line the same height.
              className={drillable ? 'h-full' : CARD_CLASS}
            />
          )
          if (!drillable) return card

          // NEW TAB, via a real anchor — same treatment as the summary strip's
          // records drill-through, and for the same reasons: the board is a
          // reading surface that must not be taken away, and an anchor keeps
          // ctrl/middle-click and "copy link" behaving as the user expects.
          //
          // KNOWN AND ACCEPTED: the new tab has no session history, so Back is
          // inert on the page this opens. The way back is the other tab.
          //
          // Addressed by tile KEY, not by position or label: some bundles drop
          // a tile the active filter rules out, which shifts every later
          // position (CP-756 #1), and the label is the one field the backend
          // can reword.
          return (
            <Link
              key={tile.key}
              to={tileDrilldownHref(data.report_type, tile.key, location)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${CARD_CLASS} block outline-none`}
            >
              {card}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
