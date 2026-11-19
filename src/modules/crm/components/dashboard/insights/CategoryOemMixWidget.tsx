import { TablePagination } from "@/components/common/tables/TablePagination"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

import type {
  CategoryOemDerived,
  RevenueByCategoryOemParams,
} from "../../../api/dashboard"
import { useRevenueByCategoryOem } from "../../../hooks/dashboard/useRevenueByCategoryOem"
import type { InsightPaging } from "../../../hooks/dashboard/useInsightPaging"
import { CategoryOemPivotTable } from "../../accounts/CategoryOemPivotTable"
import { InsightEmptyState } from "./InsightEmptyState"
import { InsightWidget, INSIGHT_PAGER_CLASS } from "./InsightWidget"
import type { Span } from "./InsightWidget"
import { INSIGHTS_STRINGS } from "./insights.strings"
import { InsightShimmer } from "./InsightShimmer"

// "Category & Brand Mix" — the CRM dashboard's pivot widget.
//
// Single API call (`useRevenueByCategoryOem` with no `account_id`) feeds:
//
//   1. Three tiles across the top   — top category, top brand, total value
//   2. Category × Brand pivot table — full matrix, sticky row/column totals
//   3. Footer pager                 — pages the CATEGORY axis of the pivot
//
// The per-category / per-OEM ranked lists that used to sit below the pivot
// were removed once the dashboard was found to already render dedicated
// "Category — Value Closed" and "OEM — Value Closed" tiles from the same
// `by-source` endpoint immediately below this widget — a second copy here
// just meant three cards reading the same numbers. The Account 360° version
// of this widget dropped them for the same reason.
//
// ONE component serves both mounts: the CRM dashboard (org-wide) and the
// Account 360° tab (`accountId` set, which scopes the call to that account).
// It used to be two near-identical files, and they drifted exactly as you would
// expect — the account copy grew a brand dot and a tile fill the dashboard
// never got, and the dashboard kept a pager the account copy never had, so the
// account card silently showed page 1 of N with no way to reach the rest.
//
// `params.page` / `params.page_size` come from the caller-owned `InsightPaging`
// handle so a filter / period change resets the pager (§16.7). The header
// tiles and `totals` block are UNIVERSE-wide — flipping page never changes
// them; only the pivot's rows + row/column totals reflect the visible slice.

const S = INSIGHTS_STRINGS.breakdowns

interface CategoryOemMixWidgetProps {
  params: RevenueByCategoryOemParams
  paging: InsightPaging
  span?: Span
  /** Scope to ONE account (the 360° tab). Omitted on the dashboard, where the
   *  endpoint applies the caller's own multi-lane visibility instead. */
  accountId?: string
  /** Clicking the Top Category / Top Brand tile drills into that value.
   *
   *  The CALLER decides what that means, because the two mounts differ: the
   *  dashboard navigates to the drill-through page with the value in the URL,
   *  while the 360° tab filters in place (the account is already the scope, so
   *  there is nowhere to drill TO). Omit it and the tiles stay inert. */
  onDrillIn?: (facet: "category" | "oem", value: { id: string; label: string }) => void
  /** When set, clicking the card (outside its tiles / pager) drills in. The
   *  dashboard points it at the Category & OEM page; the detail page and the
   *  360° tab omit it. */
  detailHref?: string
}

export function CategoryOemMixWidget({
  params,
  paging,
  span = 6,
  accountId,
  onDrillIn,
  detailHref,
}: CategoryOemMixWidgetProps) {
  const request = {
    ...params,
    ...(accountId ? { account_id: accountId } : {}),
    page: paging.page,
    page_size: paging.pageSize,
  }
  const { data, isLoading, isError, isFetching } = useRevenueByCategoryOem(request)

  return (
    <InsightWidget title={S.categoryOemMix} why={S.categoryOemMixWhy} span={span} detailHref={detailHref}>
      {isLoading ? (
        <InsightShimmer variant="mix" />
      ) : isError || !data ? (
        <EmptyState />
      ) : data.totals.row_count === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* The pager is a SIBLING of this stack, not a member of it. As a
              child it picked up the stack's `space-y` gap ON TOP of the `mt-3`
              that `INSIGHT_PAGER_CLASS` already carries, and the hairline
              floated far below the totals row.

              `mt-0` then overrides that `mt-3` as well, so the pager's own
              `border-t` sits flush against the bottom of the table and reads as
              the table's closing rule rather than a detached strip. The class
              is overridden HERE rather than edited in `InsightWidget`, which
              20+ other insight cells share and where the 12px is correct —
              they have no full-width table for the rule to close. */}
          <div className="space-y-3">
            <TilesRow derived={data.derived} onDrillIn={onDrillIn} />
            {/* Rows and brand headers drill in exactly like the tiles above. */}
            <CategoryOemPivotTable pivot={data.pivot} onDrillIn={onDrillIn} />
          </div>
          {data.pagination.total > 0 ? (
            <TablePagination
              className={cn(INSIGHT_PAGER_CLASS, "mt-0")}
              scrollCardIntoView
              page={paging.page}
              pageSize={paging.pageSize}
              totalPages={data.pagination.page_count}
              total={data.pagination.total}
              isFetching={isFetching}
              onPageChange={paging.setPage}
              onPageSizeChange={paging.setPageSize}
            />
          ) : null}
        </>
      )}
    </InsightWidget>
  )
}

// ── Building blocks ─────────────────────────────────────────────────────────

interface TilesRowProps {
  derived: CategoryOemDerived
  onDrillIn?: (facet: "category" | "oem", value: { id: string; label: string }) => void
}

/** The Top Category / Top Brand tile pair. Exported so the "What New Accounts
 *  Buy" card renders the SAME tiles over its cohort-scoped payload. */
export { TilesRow as CategoryOemTilesRow }

function TilesRow({ derived, onDrillIn }: TilesRowProps) {
  // Only the two WINNER tiles drill in — they name one entity, so there is a
  // single unambiguous value to filter by. Total Value and Breadth are
  // aggregates over every category and brand; clicking them has no one meaning.
  //
  // Guarded on both the handler AND the entity id: an empty window leaves
  // `top_category` null, and a tile showing an em-dash must not be clickable.
  const drillCategory =
    onDrillIn && derived.top_category
      ? () =>
          onDrillIn("category", {
            id: derived.top_category!.category_id,
            label: derived.top_category!.name,
          })
      : undefined
  // `oem_id` is NULLABLE: when the top brand is the "No OEM" bucket (freeform
  // SO lines with no catalogue variant) there is no entity to filter by, so
  // that tile stays inert rather than sending a null id to the API.
  const topOemId = derived.top_oem?.oem_id ?? null
  const drillOem =
    onDrillIn && derived.top_oem && topOemId
      ? () => onDrillIn("oem", { id: topOemId, label: derived.top_oem!.name })
      : undefined

  return (
    // erp-demo chip STYLING, our CONTENT: two tiles, label + name only.
    <div className="grid grid-cols-2 gap-2">
      <MetricTile
        dot
        onClick={drillCategory}
        label={S.categoryOemMixTopCategory}
        primary={derived.top_category?.name ?? S.categoryOemMixPivotZeroCell}
      />
      <MetricTile
        dot
        onClick={drillOem}
        label={S.categoryOemMixTopOem}
        primary={derived.top_oem?.name ?? S.categoryOemMixPivotZeroCell}
      />
      {/* Hidden for now (product request) — the value/share sub-line on the two
          tiles above, and the Total Value + Breadth tiles. To restore: re-add
          the `totals` prop (`RevenueByCategoryOemTotals`) to TilesRow + its
          call site, import `formatINRShort` / `formatSharePct`, pass
          `secondary` below, and switch the grid to `grid-cols-2 lg:grid-cols-4`.

          secondary on the winners:
            `${formatINRShort(t.value_closed)} · ${formatSharePct(Math.round(t.share))} ${S.categoryOemMixShareSuffix}`
            (or S.categoryOemMixNoOrders when the tile has no winner)

      <MetricTile
        label={S.categoryOemMixTotalValue}
        primary={formatINRShort(totals.value_closed)}
        secondary={S.categoryOemMixOrdersLabel(totals.order_count)}
      />
      <MetricTile
        label={S.categoryOemMixBreadth}
        primary={S.categoryOemMixBreadthValue(totals.category_count, totals.oem_count)}
        secondary={S.categoryOemMixBreadthSub}
      />
      */}
    </div>
  )
}

interface MetricTileProps {
  label: string
  primary: string
  /** Optional third line — currently unused (hidden, see TilesRow). */
  secondary?: string
  /** Brand dot before the label — marks the tiles that name a WINNER (top
   *  category / top brand). `bg-primary` is the brand navy token, so it
   *  tracks the palette and dark mode (§8.5). erp-demo used indigo/violet;
   *  the product keeps the brand colour instead. */
  dot?: boolean
  /** Makes the tile a button that drills into the value it names. Omitted for
   *  a tile with nothing to drill into, which then renders as a plain div —
   *  so nothing advertises a click target that does not exist. */
  onClick?: () => void
}

function MetricTile({ label, primary, secondary, dot, onClick }: MetricTileProps) {
  // A real <button> when it is interactive, not a div with a handler: that is
  // what gives keyboard focus, Enter/Space activation and a screen-reader role
  // for free. `text-left` because a button centres its text by default.
  const Tag = onClick ? "button" : "div"
  return (
    // erp-demo chip chrome: soft top-down muted gradient, hairline border that
    // firms up on hover. `min-w-0` + `truncate` on every line keeps a long
    // category name inside a quarter-width tile (§8.7).
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-xl border border-border/50 bg-gradient-to-b from-muted/40 to-muted/10 px-4 py-3 text-left",
        "transition-colors duration-150 hover:border-border",
        onClick &&
          "w-full cursor-pointer hover:bg-primary/[0.04] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      )}
    >
      {/* The STANDARD tile pair (11px label / 18px name), not the dense one:
          two tiles share the full card width here, so each is wide — the
          10px / 15px pair made them read undersized (§4 of the typography
          plan: dense pair only for 3-4 tiles packed into one widget). */}
      <span className="flex min-w-0 items-center gap-1.5">
        {dot && (
          <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        )}
        <Typography variant="kpi-label" className="truncate">
          {label}
        </Typography>
      </span>
      <Typography variant="kpi-value-sm" className="block truncate" title={primary}>
        {primary}
      </Typography>
      {secondary && (
        <Typography variant="caption" numeric className="block truncate">
          {secondary}
        </Typography>
      )}
    </Tag>
  )
}

// `InsightEmptyState` — the same empty state every other insight cell renders
// (donut lists, ranking tables, trend lists, the sales-team card).
//
// This card used to render a bare one-line <Typography>, which is precisely the
// failure that component was built to fix: its own note says an empty widget
// that sizes to its text becomes "a ~40px stub sitting beside a 400px populated
// neighbour, which read as a broken card rather than an empty one". It fills
// the widget body instead and centres the message, with a `min-h-40` floor so
// an empty card cannot collapse into a strip.
//
// No `label` override, so it says "No records found." like the rest of the
// board. The old wording named the report's internals ("No category × OEM
// revenue in this period") — a distinction only this card made, in vocabulary
// the UI does not otherwise use (it says BRAND, not OEM).
function EmptyState() {
  return <InsightEmptyState />
}
