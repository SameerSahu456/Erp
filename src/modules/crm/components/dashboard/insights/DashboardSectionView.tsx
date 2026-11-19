import { useNavigate } from 'react-router-dom'

import type { ChartAccent } from '@/components/common/display/chartTheme'
import { cn } from '@/lib/utils'

import type {
  AccountMovementParams,
  CategoryPeriodComparisonParams,
  InactiveAccountsParams,
  NewAccountsParams,
  RevenueByCategoryOemParams,
  RevenueBySourceParams,
  RevenueParams,
  GrowthParams,
  SalesFunnelParams,
  SalesTeamRevenueParams,
  TopOrdersParams,
} from '../../../api/dashboard'
import type { FacetValue, MultiFilterKey } from '../../../data/insights/records'
import { useInsightPaging } from '../../../hooks/dashboard/useInsightPaging'
import { ACCOUNT_TYPE_ACCENT, CONDITION_ACCENT } from './cells/rank-columns'
import { NULL_BUCKET_ID } from './insights.facets'
import { AccountMovementTile } from './cells/AccountMovementTile'
import { CategoryPeriodComparisonTile } from './cells/CategoryPeriodComparisonTile'
import { InactiveAccountsTile } from './cells/InactiveAccountsTile'
import { NewAccountsTile } from './cells/NewAccountsTile'
import { RevenueBySourceTable } from './cells/RevenueBySourceTable'
import { RevenueShareDonut } from './cells/RevenueShareDonut'
import { GrowthTile } from './cells/GrowthTile'
import { SalesFunnelCard } from './cells/SalesFunnelCard'
import { TopOrdersTable } from './cells/TopOrdersTable'
import { INSIGHTS_STRINGS } from './insights.strings'
import { AovTrendWidget } from './AovTrendWidget'
import { CategoryOemMixWidget } from './CategoryOemMixWidget'
import { InsightBandHeading } from './InsightBandHeading'
import type { Span } from './InsightWidget'
import { RevenueByMonthWidget } from './RevenueByMonthWidget'
import { SalesTeamWidget } from './SalesTeamWidget'
import { insightDetailHref, type InsightViewState } from './insights.routes'
import {
  isEnabled,
  type DashboardSection,
  type DashboardWidget,
  type RevenueInsightTile,
} from './insights.registry'

// Renders ONE section of the CRM dashboard's first page from its layout entry.
//
// The page maps `CRM_DASHBOARD_LAYOUT` through this component and stops knowing
// what any section contains — which is what makes hiding a widget or a whole
// band a one-line comment in the registry rather than JSX surgery.

/** Everything the widgets need, built once by the page. */
export interface DashboardCtx {
  salesTeamParams: SalesTeamRevenueParams
  revenueParams: RevenueParams
  /** Shared body for every by-source tile; each supplies its own `report_type`. */
  bySourceParams: Omit<RevenueBySourceParams, 'report_type'>
  /** The Category × OEM pivot slice — dashboard-side widget below Revenue
   *  by Month. Same shared body as the by-source tiles; `account_id` stays
   *  undefined here (dashboard = caller-scoped, not per-account). */
  categoryOemParams: RevenueByCategoryOemParams
  /** The Category — Period Comparison slice (shared body minus `months`). */
  categoryPeriodComparisonParams: CategoryPeriodComparisonParams
  /** The Top Orders slice for its Performance & Pipeline tile. */
  topOrdersParams: TopOrdersParams
  /** The Sales Funnel slice for its Performance & Pipeline tile. */
  salesFunnelParams: SalesFunnelParams
  /** The Growth slice for its Revenue Insights tile. `growthPeriodCoerced` is
   *  true when the board sits on `custom`, which this endpoint cannot take. */
  growthParams: GrowthParams
  growthPeriodCoerced: boolean
  /** The Account Movement slice. Shares the Growth window pair, so the two
   *  tiles always agree on "this period vs last". Widget mode — no
   *  `movement` set. */
  accountMovementParams: AccountMovementParams
  /** The New Accounts slice. Same window pair as Growth / Account Movement
   *  so the three widgets always agree on "this period vs last". */
  newAccountsParams: NewAccountsParams
  /** The Inactive Accounts slice. Only `period` + `limit` wire today; no
   *  filter facets. Period mirrors the shared dashboard period selector. */
  inactiveAccountsParams: InactiveAccountsParams
  view: InsightViewState
  /** Add one value to a board facet, IN PLACE — the board re-queries with it
   *  applied and a chip appears in the toolbar. Distinct from a tile's
   *  `drillIn`, which navigates to a detail page carrying the value in the URL:
   *  some surfaces want to narrow the board they are on rather than leave it. */
  addFacet: (facet: MultiFilterKey, value: FacetValue) => void
}

// Literal classes — a template string like `lg:grid-cols-${n}` is invisible to
// Tailwind's scanner and would emit no CSS.
// Doubled tracks: widget spans render at 2× columns (see `SPAN_CLASS` in
// InsightWidget — the doubling is what makes the quarter-row `1.5` span
// possible). `columns` in the registry still speaks the original unit.
const COLUMNS_CLASS: Record<DashboardSection['columns'], string> = {
  5: 'lg:grid-cols-10',
  6: 'lg:grid-cols-12',
}

// Per-tile donut palettes, keyed by tile id. Here rather than in the registry
// because the registry is plain data and these are design tokens; a tile with
// no entry falls back to slate inside the donut.
const DONUT_ACCENTS: Record<string, Record<string, ChartAccent> | undefined> = {
  'condition-revenue': CONDITION_ACCENT,
  'account-type-revenue': ACCOUNT_TYPE_ACCENT,
}

export function DashboardSectionView({
  section,
  ctx,
}: {
  section: DashboardSection
  ctx: DashboardCtx
}) {
  const widgets = section.widgets.filter(isEnabled)

  // Empty section renders NOTHING — heading included. Commenting out the last
  // widget in a band must not strand its header over blank space.
  if (!isEnabled(section) || widgets.length === 0) return null

  return (
    <section className="space-y-3">
      {section.heading && (
        <InsightBandHeading label={section.heading} />
      )}

      {/* Alignment is per BAND — see `DashboardSection.stretch`.
          `items-start` (the default) lets each card size to its OWN content: a
          short list ends where its content ends instead of stretching to its
          neighbour's height with a void inside. A `stretch` band instead pulls
          every card to the tallest in the row, which is what the hero pair
          wants — two big cards at the top of the page, where a ragged bottom
          edge is the first thing you see and the row counts drift apart as soon
          as the period changes. Cards there pin their footer with `mt-auto`, so
          the extra height opens up above the pager, not below it. */}
      <div
        className={cn(
          'grid grid-cols-1 gap-3',
          section.stretch ? 'items-stretch' : 'items-start',
          COLUMNS_CLASS[section.columns],
        )}
      >
        {widgets.map((w) => (
          <RenderWidget key={widgetKey(w)} widget={w} ctx={ctx} />
        ))}
      </div>
    </section>
  )
}

/** Stable per-widget key — `kind` alone would collide across by-source tiles
 *  AND across the two account-movement cards (same kind, different `bucket`). */
const widgetKey = (w: DashboardWidget) => {
  if (w.kind === 'by-source') return w.tile.id
  if (w.kind === 'account-movement') return `${w.kind}:${w.bucket}`
  return w.kind
}

/**
 * A SWITCH on `widget.kind`, not a `Record<kind, Component>`: the three kinds
 * take different params types, so a component map only compiles behind an
 * `as never` cast — which turns a typo into a silently blank widget. A switch
 * keeps every branch typed and fails to compile on an unhandled new kind.
 */
function RenderWidget({ widget, ctx }: { widget: DashboardWidget; ctx: DashboardCtx }) {
  const navigate = useNavigate()
  switch (widget.kind) {
    case 'sales-team':
      return (
        <SalesTeamWidget
          params={ctx.salesTeamParams}
          span={widget.span}
          detailHref={insightDetailHref('sales-team', ctx.view)}
        />
      )

    case 'revenue-by-month':
      return (
        <RevenueByMonthWidget
          params={ctx.revenueParams}
          span={widget.span}
          detailHref={insightDetailHref('monthly-revenue', ctx.view)}
        />
      )

    case 'category-oem-mix':
      return <CategoryOemMixTileView span={widget.span} ctx={ctx} />

    case 'category-period-comparison':
      return <CategoryPeriodComparisonTileView span={widget.span} ctx={ctx} />

    case 'avg-order-value':
      return <AovTileView span={widget.span} ctx={ctx} />

    case 'top-orders':
      return (
        <TopOrdersTable
          params={ctx.topOrdersParams}
          span={widget.span}
          title={INSIGHTS_STRINGS.topOrders.title}
          why={INSIGHTS_STRINGS.topOrders.why}
          // No `paging` → preview mode: the top 10 line items, no footer. The
          // whole card drills into the full paginated `/crm/insights/top-orders`
          // view, where the pager lives.
          detailHref={insightDetailHref('top-orders', ctx.view)}
          // A single row drills into that full view already filtered to the
          // clicked account (the card drills in unfiltered) — same split as the
          // by-source tiles' row-vs-card behaviour.
          onRowClick={(r) =>
            navigate(
              insightDetailHref('top-orders', ctx.view, {
                account: `${r.account_details.id}|${r.account_details.name}`,
              }),
            )
          }
        />
      )

    case 'sales-funnel':
      return <SalesFunnelTileView span={widget.span} ctx={ctx} />

    case 'growth':
      return (
        <GrowthTile
          span={widget.span}
          params={ctx.growthParams}
          periodCoerced={ctx.growthPeriodCoerced}
          // The whole card drills into `/crm/insights/growth`. Scalar tile —
          // there are no rows, so there is no row-level drill-in either.
          detailHref={insightDetailHref('growth', ctx.view)}
        />
      )

    case 'account-movement':
      return (
        <AccountMovementTile
          span={widget.span}
          params={ctx.accountMovementParams}
          bucket={widget.bucket}
          // Drills into `/crm/insights/account-movement`. Phase 2 of this
          // widget registers that route; until then the link 404s and the
          // tile stays functional as a read-only widget. See the FE
          // follow-up plan for the insights page composition.
          detailHref={insightDetailHref('account-movement', ctx.view)}
        />
      )

    case 'new-accounts':
      return (
        <NewAccountsTile
          span={widget.span}
          params={ctx.newAccountsParams}
          // Drills into `/crm/insights/new-accounts` — the page composes the
          // reference's five cards around the same endpoint this tile reads.
          detailHref={insightDetailHref('new-accounts', ctx.view)}
        />
      )

    case 'inactive-accounts':
      return (
        <InactiveAccountsTile
          span={widget.span}
          params={ctx.inactiveAccountsParams}
          // Drills into the Inactive Accounts page — the ranked list, the
          // win-back plan and what these accounts used to buy.
          detailHref={insightDetailHref('inactive-accounts', ctx.view)}
        />
      )

    case 'by-source':
      return <RevenueInsightTileView tile={widget.tile} ctx={ctx} />
  }
}

/** The AOV trend tile. Its own component so `useInsightPaging` runs at a
 *  component top level (not inside `RenderWidget`'s switch) — same reason as
 *  `RevenueInsightTileView`. It server-pages exactly like the by-source tiles:
 *  the `RevenueTrendWidget` renders the footer pager once `paging` is passed. */
function AovTileView({ span, ctx }: { span: Span; ctx: DashboardCtx }) {
  const paging = useInsightPaging('aov')
  return (
    <AovTrendWidget
      // Same live series as Revenue by Month, `metric: 'avg_order_value'` — the
      // widget overrides it internally, so it takes `revenueParams` as-is.
      params={ctx.revenueParams}
      span={span}
      detailHref={insightDetailHref('avg-order-value', ctx.view)}
      paging={paging}
    />
  )
}

/** The Category × OEM pivot tile. Its own component so `useInsightPaging` runs
 *  at a component top level (same reason as `AovTileView` and
 *  `RevenueInsightTileView`). The pager targets the pivot's CATEGORY axis; the
 *  OEM columns always ship in full so the same brand column stays put across
 *  pages. */
function CategoryOemMixTileView({ span, ctx }: { span: Span; ctx: DashboardCtx }) {
  const navigate = useNavigate()
  const paging = useInsightPaging('category-oem-mix')
  return (
    <CategoryOemMixWidget
      params={ctx.categoryOemParams}
      paging={paging}
      span={span}
      // The whole card drills into the Category & OEM page — the same page the
      // Category / OEM by-source tiles open — which also renders this pivot.
      detailHref={insightDetailHref('category-oem', ctx.view)}
      // A category row, a brand header or a winner tile DRILLS IN, exactly like
      // a row on the by-source tiles: it opens that page with the clicked value
      // already applied as a filter (same `id|label` codec `useInsightView`
      // decodes). It used to narrow the board in place, which made this card
      // the odd one out on the dashboard.
      onDrillIn={(facet, value) =>
        navigate(insightDetailHref('category-oem', ctx.view, { [facet]: facetToken(value) }))
      }
    />
  )
}

/** Category — Period Comparison. Its own component so `useInsightPaging` runs
 *  at a component top level — same reason as `CategoryOemMixTileView`. */
function CategoryPeriodComparisonTileView({ span, ctx }: { span: Span; ctx: DashboardCtx }) {
  const navigate = useNavigate()
  const paging = useInsightPaging('category-period-comparison')
  return (
    <CategoryPeriodComparisonTile
      span={span}
      params={ctx.categoryPeriodComparisonParams}
      paging={paging}
      // The whole card drills into the Category & OEM page, where the
      // product-side splits (and the Category × Brand pivot) get full room.
      detailHref={insightDetailHref('category-oem', ctx.view)}
      // A row DRILLS IN to that page with the category applied — the same
      // behaviour as a row on the by-source tiles.
      onRowClick={(category) =>
        navigate(insightDetailHref('category-oem', ctx.view, { category: facetToken(category) }))
      }
    />
  )
}

/** The `id|label` facet token `useInsightView` decodes — the id it queries
 *  with and the label it renders as a chip. A value whose id IS its label
 *  travels bare. Same codec as `RevenueInsightTileView.drillIn`. */
const facetToken = (value: FacetValue) =>
  value.id === value.label ? value.id : `${value.id}|${value.label}`

/** The Sales Funnel tile. Its own component so `useInsightPaging` runs at a
 *  component top level (not inside `RenderWidget`'s switch) — same reason as
 *  `AovTileView` and `RevenueInsightTileView`. It carries the same footer pager
 *  as the by-source tiles; unlike them it pages the response instead of
 *  refetching, because the endpoint returns its whole result set (see
 *  `SalesFunnelCard`). */
function SalesFunnelTileView({ span, ctx }: { span: Span; ctx: DashboardCtx }) {
  const paging = useInsightPaging('sales-funnel')
  return (
    <SalesFunnelCard
      params={ctx.salesFunnelParams}
      span={span}
      title={INSIGHTS_STRINGS.salesFunnel.title}
      why={INSIGHTS_STRINGS.salesFunnel.why}
      paging={paging}
      // The whole card drills into the full `/crm/insights/sales-funnel` page.
      // There is no row-level drill-in: a funnel stage is not a facet the board
      // can filter by (unlike an account or a category row).
      detailHref={insightDetailHref('sales-funnel', ctx.view)}
    />
  )
}

/** One by-source tile. Its own component because `useInsightPaging` is a hook
 *  and cannot be called inside the layout's `.map` — the same reason the detail
 *  page's cells own their paging rather than the renderer's switch. */
function RevenueInsightTileView({ tile, ctx }: { tile: RevenueInsightTile; ctx: DashboardCtx }) {
  const navigate = useNavigate()
  const paging = useInsightPaging(tile.pagingKey)
  const tileParams: RevenueBySourceParams = { ...ctx.bySourceParams, report_type: tile.reportType }
  // Clicking the CARD opens the same page a row does, just without a filter —
  // "show me this whole breakdown" rather than "show me this one value".
  const detailHref = insightDetailHref(tile.metric, ctx.view)

  // A clicked row/slice DRILLS IN: it opens that tile's detail view with the
  // clicked value already applied as a filter. `id|label` is the same codec
  // `useInsightView` decodes, so the inner page gets both the id it queries
  // with and the label it renders as a chip.
  const drillIn = (value: FacetValue) => {
    const extra = tile.facet ? { [tile.facet]: facetToken(value) } : undefined
    navigate(insightDetailHref(tile.metric, ctx.view, extra))
  }

  if (tile.kind === 'donut') {
    return (
      <RevenueShareDonut
        params={tileParams}
        paging={paging}
        title={tile.title}
        why={tile.why}
        span={tile.span}
        detailHref={detailHref}
        metaField={tile.metaIdField ?? ''}
        accents={DONUT_ACCENTS[tile.id]}
        // Lets the "No Condition" slice drill in like every other one — its
        // `extra_metadata.condition` is NULL, so without a value to send the
        // click would silently do nothing. Undefined for facets with no null
        // bucket, which keeps those clicks inert.
        nullId={tile.facet ? NULL_BUCKET_ID[tile.facet] : undefined}
        onSliceClick={tile.facet ? drillIn : undefined}
      />
    )
  }

  return (
    <RevenueBySourceTable
      params={tileParams}
      paging={paging}
      title={tile.title}
      why={tile.why}
      span={tile.span}
      detailHref={detailHref}
      onRowClick={
        tile.facet && tile.metaIdField
          ? (row) => {
              // The id lives in `extra_metadata` under a per-report key, so the
              // filter binds by entity id rather than by display name.
              const meta = row.extra_metadata as Record<string, string | null> | null
              const id = meta?.[tile.metaIdField!]
              if (id) drillIn({ id, label: row.name })
            }
          : undefined
      }
    />
  )
}
