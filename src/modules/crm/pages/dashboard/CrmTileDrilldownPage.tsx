import { useMemo } from "react"
import { useParams } from "react-router-dom"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { TablePagination } from "@/components/common/tables/TablePagination"
import { PageHeader } from "@/components/page-shells"
import { formatINRShort } from "@/lib/currency"
import { PAGINATION } from "@/shared/constants"

import type {
  AccountCloser,
  DashboardConditionFilter,
  DrilldownKind,
  RevenueBySourceRow,
  TileDrilldown,
} from "../../api/dashboard"
import {
  drilldownKind,
  toAovByCategoryDrilldownParams,
  toRecordsDrilldownParams,
  toRevenueBySourceParams,
  toTopOrdersDrilldownParams,
} from "../../api/dashboard"
import { InsightEmptyState } from "../../components/dashboard/insights/InsightEmptyState"
import { InsightScopeToggle } from "../../components/dashboard/insights/InsightScopeToggle"
import { InsightViewNotice } from "../../components/dashboard/insights/InsightViewNotice"
import { RecordsFilterBar } from "../../components/dashboard/insights/RecordsFilterBar"
import { RecordsTable } from "../../components/dashboard/insights/RecordsTable"
import { RECORDS_FILTER_STRINGS } from "../../components/dashboard/insights/records-filter.strings"
import { AovByCategoryTable } from "../../components/dashboard/insights/cells/AovByCategoryTable"
import { TopOrdersTable } from "../../components/dashboard/insights/cells/TopOrdersTable"
import {
  BODY_ROW_CLASS,
  HEAD_ROW_CLASS,
  NodeTd,
  NumTd,
  RefTd,
  TABLE_CLASS,
  TABLE_SURFACE_CLASS,
  TABLE_WRAP_CLASS,
  THEAD_CLASS,
  TableErrorPanel,
  TableLoadingRows,
  TextTd,
  Th,
} from "../../components/dashboard/insights/insight-table"
import { INSIGHTS_STRINGS } from "../../components/dashboard/insights/insights.strings"
import { isTilesReportType } from "../../components/dashboard/insights/insights.registry"
import { toInsightSummaryTilesParams } from "../../hooks/dashboard/insight-query-params"
import { useInsightPaging } from "../../hooks/dashboard/useInsightPaging"
import { useInsightScope } from "../../hooks/dashboard/useInsightScope"
import { useInsightSummaryTiles } from "../../hooks/dashboard/useInsightSummaryTiles"
import { useInsightView, type InsightView } from "../../hooks/dashboard/useInsightView"
import { useRecordsWithParams } from "../../hooks/dashboard/useRecords"
import { useRecordsPageFilters } from "../../hooks/dashboard/useRecordsPageFilters"
import { useRevenueBySource } from "../../hooks/dashboard/useRevenueBySource"
import { useTileSearchFilter } from "../../hooks/dashboard/useTileSearchFilter"

// The rows behind a KPI tile — `/crm/insights/tile/:reportType/:slot` (`slot` = tile key).
//
// Same shape as `CrmRecordsPage`, deliberately: opened in a NEW TAB from the
// tile, page index and size in the URL beside the slice. Crossing either
// drill-through must not move a control or change how the page behaves.
//
// PAGE-LEVEL FILTER BAR (account body only) — the same `<RecordsFilterBar>`
// component the records page mounts, but with Status omitted and the search
// placeholder switched to "Search account name". Three controls: Search
// (`?search=` via `useTileSearchFilter`), Account, and User (both via
// `view.filters`). The other three tile facets (period, months, category,
// OEM, condition, account_type) still arrive on the URL from the tile and
// stay URL-only — same trade-off as the records page.
//
// The RECORDS body and the WIDGET bodies are unchanged for now.
//
// WHY IT RE-FETCHES THE TILES ENDPOINT rather than reading a window off the URL
// ---------------------------------------------------------------------------
// The query this page runs is NOT built here. The page re-asks `summary-tiles`
// with the inherited slice and then follows the `drilldown` block that comes
// back for `slot` — the same block the tile itself would have followed.
//
// Serialising `start`/`end` into the link instead would have looked simpler and
// been wrong twice over. The tiles bundles resolve presets differently from the
// endpoints they drill into (some year-to-date, some the current calendar
// unit), so a window rebuilt anywhere but the server drifts; and a Peak or Best
// tile's range is the argmax bucket UNDER THE ACTIVE FILTERS, so a link that
// froze it would go stale the moment the board's slice changed. Re-deriving
// from the server keeps a shared link correct instead of merely reproducible.
//
// The cost is one extra request per open, which is the cheap half of the trade.
//
// FOUR TARGETS, ONE PAGE
// ----------------------
// A tile can point at four different endpoints, and which one is a property of
// the TILE, not of the page: an account breakdown answers "who bought this
// revenue", but a Leads tile has to open leads and a Biggest Order tile has to
// open the ranked line it names. So the body is chosen from
// `drilldownKind(block)` and each kind renders the component that already
// exists for it — no fifth table was written for this page.
//
// The dispatch fails CLOSED: a block naming an endpoint this file does not
// know is treated as no drill-down at all, which renders the not-found header
// rather than sending one endpoint's params to another route.

const S = INSIGHTS_STRINGS.insightTiles.drilldown

/** Extra registry facets the tile page's toolbars expose — matches the columns
 *  each body renders (Condition, Category, OEM = the "Product" taxonomy). */
const TILE_EXTRA_FACET_FIELDS = ['condition', 'category', 'oem'] as const

/** Overlay `view.filters` onto a params object's account_ids / user_ids /
 *  conditions / category_ids / oem_ids. Non-empty facet selection wins;
 *  otherwise the tile's server-built value passes through unchanged.
 *
 *  Search stays out of here because each body's params object uses a
 *  different key (`search` vs `q`) — callers apply it separately. */
function withTileFacets<
  T extends {
    account_ids?: string[]
    user_ids?: string[]
    conditions?: DashboardConditionFilter[]
    category_ids?: string[]
    oem_ids?: string[]
  },
>(base: T, view: InsightView): T {
  return {
    ...base,
    account_ids: view.filters.account?.length
      ? view.filters.account.map((v) => v.id)
      : base.account_ids,
    user_ids: view.filters.owner?.length
      ? view.filters.owner.map((v) => v.id)
      : base.user_ids,
    // The URL parser validates each condition id against `CONDITION_IDS`
    // before it reaches `view.filters`, so this cast is safe by construction.
    conditions: view.filters.condition?.length
      ? (view.filters.condition.map((v) => v.id) as DashboardConditionFilter[])
      : base.conditions,
    category_ids: view.filters.category?.length
      ? view.filters.category.map((v) => v.id)
      : base.category_ids,
    oem_ids: view.filters.oem?.length ? view.filters.oem.map((v) => v.id) : base.oem_ids,
  }
}

/** `extra_metadata` is a union across the six by-source report types; only the
 *  `account` arm carries closers. Narrow rather than cast — a row from another
 *  report type would otherwise read `undefined` and render an empty cell that
 *  looks like genuine "nobody closed this". */
function closersOf(row: RevenueBySourceRow): AccountCloser[] {
  const meta = row.extra_metadata as { closers?: AccountCloser[] } | undefined
  return meta?.closers ?? []
}

/** Who is credited with the account's closed orders.
 *
 *  `OverflowPillList` rather than an avatar stack: it is what every other table
 *  in this app already uses for a one-of-many list (leads, rejected leads,
 *  purchase requests), so this column reads the same as the rest of the
 *  product. One name shown, `+N` for the rest, and the full breakdown on hover.
 *
 *  The hover table earns its three columns — the API returns each person's
 *  order count and value, which is the question a reader has the moment they
 *  see two names on one account ("who closed most of it?"). Initials in a
 *  circle could not have answered that. */
function ClosersCell({ closers }: { closers: AccountCloser[] }) {
  return (
    <OverflowPillList
      items={closers}
      getItemLabel={(c) => c.name}
      getItemKey={(c) => c.user_id}
      maxVisible={1}
      emptyLabel={S.noClosers}
      hoverTitle={S.columnClosedBy}
      columns={[
        { key: "name", header: S.closerColumns.name, render: (c) => c.name },
        {
          key: "orders",
          header: S.closerColumns.orders,
          render: (c) => c.order_count,
          className: "tabular-nums",
        },
        {
          key: "value",
          header: S.closerColumns.value,
          render: (c) => formatINRShort(c.value_closed),
          className: "tabular-nums",
        },
      ]}
    />
  )
}

/** The list surface the two bare-table bodies share — the list pages' chrome,
 *  not a `<Card>` (see `TABLE_SURFACE_CLASS`). Extracted so the account body
 *  and the records body cannot drift into different padding. */
function TableSurface({ children }: { children: React.ReactNode }) {
  return (
    <div className={TABLE_WRAP_CLASS}>
      <div className={TABLE_SURFACE_CLASS}>
        {/* §8.7 sanctioned exception: genuinely wide 2-D data the user pans.
            Text cells still truncate, so the PAGE never scrolls. */}
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  )
}

/** The account breakdown — the original body with a filter bar bolted on.
 *
 *  The bar overrides three slice fields on top of the server-built drilldown
 *  params: account_ids, user_ids, and search. Everything else (period, months,
 *  category / OEM / condition, account_type) stays as the tile shipped it —
 *  users edit the tile-level slice by going back to the board. */
function AccountBody({
  drilldown,
  tilesPending,
  view,
}: {
  /** `null` = the filters dropped this tile (CP-756 #1): no query, the filter
   *  bar stays, the table area explains why it is empty. */
  drilldown: TileDrilldown | null
  tilesPending: boolean
  view: InsightView
}) {
  const paging = useInsightPaging("tile-accounts")
  const searchFilter = useTileSearchFilter()
  const baseParams = toRevenueBySourceParams(drilldown)

  // Merge the toolbar's overrides on top of the tile's server-built params.
  // Account / User / Condition / Category / OEM come from `view.filters`
  // (URL-synced); `search` comes from the tile-page's own `?search=` sync
  // (min-1, matches BE).
  const params = baseParams
    ? {
        ...withTileFacets(baseParams, view),
        search: searchFilter.q ?? baseParams.search,
      }
    : null

  const { data, isLoading, isFetching, isError, error } = useRevenueBySource(
    params ? { ...params, page: paging.page, page_size: paging.pageSize } : FALLBACK_BY_SOURCE,
    { enabled: params !== null },
  )

  const total = data?.pagination.total ?? 0

  return (
    <>
      {/* Same filter-bar component the records page uses. No `tile` and no
          Status props, so the shell renders Search · Account · User plus the
          three extras (Condition, Category, OEM) that match this body's
          Product-taxonomy columns. */}
      <RecordsFilterBar
        searchPlaceholder={RECORDS_FILTER_STRINGS.searchPlaceholderAccountName}
        q={searchFilter.q}
        onQChange={searchFilter.setQ}
        filters={view.filters}
        onFiltersChange={view.setFilters}
        extraFacetFields={TILE_EXTRA_FACET_FIELDS}
      />

      <TableSurface>
        {drilldown === null ? (
          <InsightEmptyState label={S.filteredOut} className="min-h-96" />
        ) : isError ? (
          <TableErrorPanel error={error} fallback={S.loadError} />
        ) : tilesPending || isLoading || !data ? (
          <TableLoadingRows />
        ) : total === 0 ? (
          <InsightEmptyState label={S.empty} className="min-h-96" />
        ) : (
          <table className={TABLE_CLASS}>
            <thead className={THEAD_CLASS}>
              <tr className={HEAD_ROW_CLASS}>
                <Th label={S.columnRank} className="w-10" />
                <Th label={S.columnAccount} />
                <Th label={INSIGHTS_STRINGS.breakdowns.columnValueClosed} align="right" />
                {/* NO Share column. On the board's own breakdown cells share
                    is "% of company revenue", which is the useful reading.
                    Here it would not be: `share` is computed against the
                    panel's OWN filtered total, and a Top Category / Top OEM
                    panel is already narrowed to one dimension — so a row
                    would read "91%" meaning 91% of the ₹220 that one OEM
                    brought in, not 91% of anything the reader cares about.
                    Rank already conveys the ordering that share was adding. */}
                <Th label={INSIGHTS_STRINGS.breakdowns.columnOrders} align="right" />
                <Th label={S.columnClosedBy} />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const accountId = (r.extra_metadata as { account_id?: string }).account_id
                return (
                  <tr key={r.rank} className={BODY_ROW_CLASS}>
                    <TextTd text={String(r.rank)} nowrap />
                    {/* The account is the row's one navigable reference —
                        same treatment `RecordsTable` gives an entity column.
                        Degrades to plain text if the id is ever missing,
                        rather than rendering a link that goes nowhere. */}
                    {accountId ? (
                      <RefTd text={r.name} href={`/crm/accounts/${accountId}`} />
                    ) : (
                      <TextTd text={r.name} />
                    )}
                    <NumTd text={formatINRShort(r.value_closed)} />
                    <NumTd text={String(r.order_count)} />
                    <NodeTd>
                      <ClosersCell closers={closersOf(r)} />
                    </NodeTd>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </TableSurface>
      {total > 0 && (
        <TablePagination
          page={paging.page}
          totalPages={data?.pagination.page_count ?? 1}
          pageSize={paging.pageSize}
          total={total}
          isFetching={isFetching}
          onPageChange={paging.setPage}
          onPageSizeChange={paging.setPageSize}
          pageSizeOptions={PAGINATION.PAGE_SIZE_OPTIONS}
        />
      )}
    </>
  )
}

/** The entity rows behind a count tile — leads, orders.
 *
 *  `RecordsTable` derives its own columns from the response's `type`, so this
 *  body stays the same whether the tile counted leads or sales orders. Same
 *  filter bar the records page uses — Search (`?q=`), Status, Account, User —
 *  overriding the tile's server-built params. */
function RecordsBody({
  drilldown,
  tilesPending,
  view,
}: {
  drilldown: TileDrilldown
  tilesPending: boolean
  view: InsightView
}) {
  const paging = useInsightPaging("tile-accounts")
  const pageFilters = useRecordsPageFilters()
  const baseParams = toRecordsDrilldownParams(drilldown)

  // Merge the toolbar's overrides on top of the tile's server-built params.
  // Account / User / Condition / Category / OEM come from `view.filters`;
  // `q` / `status` from the shared records-page URL sync so the two pages
  // read the same URL keys for the same endpoint.
  const params = baseParams
    ? {
        ...withTileFacets(baseParams, view),
        q: pageFilters.q ?? baseParams.q,
        status: pageFilters.status ?? baseParams.status,
      }
    : null

  const { data, isLoading, isFetching, isError, error } = useRecordsWithParams(
    params ? { ...params, page: paging.page, page_size: paging.pageSize } : null,
  )

  const total = data?.pagination.total ?? 0

  return (
    <>
      {/* Same bar the records page uses. No `tile` (this page has none) so
          Status visibility is forced via `showStatus`; the records rows are
          always SO shapes here, so Approved / PartiallyApproved always
          applies. Search placeholder switches to SO # for the same reason.
          Product-taxonomy extras (Condition, Category, OEM) are shown too. */}
      <RecordsFilterBar
        searchPlaceholder={
          RECORDS_FILTER_STRINGS.searchPlaceholderByRecordType[baseParams?.type ?? ''] ??
          RECORDS_FILTER_STRINGS.searchPlaceholderDefault
        }
        q={pageFilters.q}
        onQChange={pageFilters.setQ}
        status={pageFilters.status}
        onStatusChange={pageFilters.setStatus}
        showStatus
        filters={view.filters}
        onFiltersChange={view.setFilters}
        extraFacetFields={TILE_EXTRA_FACET_FIELDS}
      />

      <TableSurface>
        {isError ? (
          <TableErrorPanel error={error} fallback={S.recordsLoadError} />
        ) : tilesPending || isLoading || !data ? (
          <TableLoadingRows />
        ) : total === 0 ? (
          <InsightEmptyState label={S.recordsEmpty} className="min-h-96" />
        ) : (
          <RecordsTable data={data} />
        )}
      </TableSurface>
      {total > 0 && (
        <TablePagination
          page={paging.page}
          totalPages={data?.pagination.page_count ?? 1}
          pageSize={paging.pageSize}
          total={total}
          isFetching={isFetching}
          onPageChange={paging.setPage}
          onPageSizeChange={paging.setPageSize}
          pageSizeOptions={PAGINATION.PAGE_SIZE_OPTIONS}
        />
      )}
    </>
  )
}

/** The ranked line items, and the AOV-by-category split.
 *
 *  These two reuse the PAGE cells rather than a bare table, because both
 *  components already own their fetch, their empty / error states and their
 *  pager — reimplementing either here would be a second copy of a table whose
 *  columns are non-trivial (category hierarchy, condition, rep). They bring
 *  their own card chrome with them, which is why this branch does not wrap
 *  them in `TableSurface`. */
function WidgetBody({
  kind,
  drilldown,
  tileLabel,
  view,
}: {
  kind: "top-orders" | "aov-by-category"
  drilldown: TileDrilldown
  tileLabel: string
  view: InsightView
}) {
  const paging = useInsightPaging("tile-accounts")
  const searchFilter = useTileSearchFilter()

  // Same override strategy as the other two bodies: merge `account_ids`,
  // `user_ids`, `conditions`, `category_ids`, `oem_ids`, and `search` on top
  // of the tile's server-built params. Both widget endpoints (`top-orders`,
  // `aov-by-category`) accept all of them.
  const baseTopOrders = toTopOrdersDrilldownParams(drilldown)
  const topOrders = baseTopOrders
    ? {
        ...withTileFacets(baseTopOrders, view),
        search: searchFilter.q ?? baseTopOrders.search,
      }
    : null

  const baseAov = toAovByCategoryDrilldownParams(drilldown)
  const aov = baseAov
    ? {
        ...withTileFacets(baseAov, view),
        search: searchFilter.q ?? baseAov.search,
      }
    : null

  // Same filter bar the account body uses — no Status here (widget universes
  // are Approved-only by construction), so the pill is omitted via the
  // records-page defaults. Product-taxonomy extras included.
  const filterBar = (
    <RecordsFilterBar
      searchPlaceholder={RECORDS_FILTER_STRINGS.searchPlaceholderAccountName}
      q={searchFilter.q}
      onQChange={searchFilter.setQ}
      filters={view.filters}
      onFiltersChange={view.setFilters}
      extraFacetFields={TILE_EXTRA_FACET_FIELDS}
    />
  )

  if (kind === "top-orders" && topOrders) {
    return (
      <>
        {filterBar}
        <TopOrdersTable
          params={topOrders}
          title={tileLabel}
          why={S.topOrdersWhy}
          span={6}
          paging={paging}
        />
      </>
    )
  }
  if (kind === "aov-by-category" && aov) {
    return (
      <>
        {filterBar}
        <AovByCategoryTable
          params={aov}
          title={tileLabel}
          why={S.aovByCategoryWhy}
          span={6}
          paging={paging}
        />
      </>
    )
  }
  return <InsightEmptyState label={S.empty} className="min-h-96" />
}

/** Parked slice for `useRevenueBySource` while the block is unknown. The hook
 *  is called unconditionally (rules of hooks) with `enabled: false`, so this
 *  value is never sent. */
const FALLBACK_BY_SOURCE = { report_type: "account", period: "monthly" } as const

/** The tile a `:slot` param names: its KEY, or — for links opened before keys
 *  existed — its plain position. `undefined` while loading or when no such tile
 *  is in the response (e.g. the filters dropped it). */
function findTile<T extends { key: string }>(tiles: T[] | undefined, slot: string): T | undefined {
  if (!tiles) return undefined
  return /^\d+$/.test(slot) ? tiles[Number(slot)] : tiles.find((t) => t.key === slot)
}

/** The header: the tile's own title once it is known, a "hidden by filters" title
 *  when the filters dropped it, otherwise the loading placeholder. */
function pageTitle(
  reportType: string,
  tile: { key: string; label: string } | undefined,
  kind: DrilldownKind | null,
  filteredOut: boolean,
): string {
  if (tile && kind) return S.titleOverride[`${reportType}:${tile.key}`] ?? S.titleFor[kind](tile.label)
  return filteredOut ? S.filteredOutTitle : S.loadingTitle
}

function CrmTileDrilldownPage() {
  const { reportType = "", slot = "" } = useParams()

  // Read-only view, exactly as on the records page — period, range and facets
  // arrive on the URL from the tile that was clicked and are never edited here.
  const view = useInsightView()
  const { showToggle, scope, currentUserId } = useInsightScope(view.scope)

  const query = useMemo(() => ({ ...view, scope, currentUserId }), [view, scope, currentUserId])

  // §11.1 — both route params are untrusted. `reportType` must be a real tile
  // bundle before it reaches the API, and `slot` is a tile KEY (`refurb_pull`) —
  // or, for links opened before keys existed, a plain index. An unknown value
  // renders not-found, never a 422 and never a crash.
  //
  // KEY, not position (CP-756 #1): `condition` and `account_type_wise` drop the
  // split tiles the active filter rules out, so with Condition → New the array
  // is Total / New / Avg Order and index 2 is no longer "Refurb + Pull".
  const validReportType = isTilesReportType(reportType) ? reportType : null

  const tilesParams = useMemo(
    () =>
      validReportType
        ? toInsightSummaryTilesParams({ ...query, reportType: validReportType })
        : null,
    [query, validReportType],
  )

  const tiles = useInsightSummaryTiles(
    // The hook is called unconditionally (rules of hooks); a null slice is
    // parked on a disabled query rather than branching around the call.
    tilesParams ?? { report_type: "revenue_by_month", period: "monthly" },
    { enabled: tilesParams !== null, keepPrevious: true },
  )
  // `keepPrevious` leaves the OLD response in place while a changed filter loads;
  // until the new one lands, whatever hangs off it is still loading.
  const tilesPending = tiles.isLoading || tiles.isPlaceholderData

  const tile = findTile(tiles.data?.data, slot)
  const drilldown = tile?.drilldown ?? null
  const kind: DrilldownKind | null = drilldownKind(drilldown)

  if (!validReportType || !slot) {
    return <PageHeader title={S.notFoundTitle} subtitle={S.notFoundSubtitle} />
  }

  // The tiles response landed and THIS tile is not in it: the filters on this page
  // ruled it out (Condition → New drops "Refurb + Pull"). Not a dead end — the
  // account body renders its filter bar with an explanation instead of rows, in
  // the SAME component the rows use, so the bar and search box are never
  // remounted and the reader can change or clear the filter to get the tile back.
  // Same state when the tile is still there but EMPTY: the backend keeps "Top
  // Category" with value "—" and no drill-down when the filters (an Owner with no
  // sale) leave no category to rank. Only that empty face counts — an average has
  // a real value and no breakdown by nature, so it keeps the not-available header.
  const filteredOut =
    !!tiles.data && !tilesPending && (!tile || (!tile.drilldown && tile.value === "—"))

  // The tile exists but is inert (an average, a rate), or its block names an
  // endpoint this page cannot render.
  if (tiles.data && !tilesPending && !filteredOut && tile && (!drilldown || !kind)) {
    return <PageHeader title={S.notFoundTitle} subtitle={S.notFoundSubtitle} />
  }

  // A 403 on the tiles call is the same story to the user as one on the rows —
  // an out-of-scope `user_ids` on the inherited slice. `LoadErrorState` renders
  // it as "no access" rather than "failed to load".
  if (tiles.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title={S.loadingTitle} className="mb-1.5" />
        <TableErrorPanel error={tiles.error} fallback={S.loadError} />
      </div>
    )
  }

  const params = drilldown?.params as { start?: string; end?: string } | undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle(validReportType, tile, kind, filteredOut)}
        // The range the page covers. Load-bearing, not decoration: a Peak tile
        // opens ONE bucket while Total opens the whole window, and the two
        // pages are otherwise identical.
        subtitle={
          params?.start && params?.end ? S.range(params.start, params.end) : undefined
        }
        actions={
          showToggle ? (
            <InsightScopeToggle scope={scope} onScopeChange={view.setScope} />
          ) : undefined
        }
        className="mb-1.5"
      />

      {/* No filter controls here, so a repaired URL param would otherwise be
          invisible — same reasoning as the records page. */}
      <InsightViewNotice repairs={view.repairs} />

      {/* One body per target. Each is its own component so the hooks it needs
          (its pager, its query) are not all called on every render path — a
          single component would have to run all four queries and disable
          three. */}
      {filteredOut ? (
        <AccountBody drilldown={null} tilesPending={false} view={view} />
      ) : !drilldown || !kind ? (
        <TableSurface>
          <TableLoadingRows />
        </TableSurface>
      ) : kind === "by-source" ? (
        <AccountBody drilldown={drilldown} tilesPending={tilesPending} view={view} />
      ) : kind === "records" ? (
        <RecordsBody drilldown={drilldown} tilesPending={tilesPending} view={view} />
      ) : (
        <WidgetBody
          kind={kind}
          drilldown={drilldown}
          tileLabel={tile?.label ?? ""}
          view={view}
        />
      )}
    </div>
  )
}

export default CrmTileDrilldownPage
