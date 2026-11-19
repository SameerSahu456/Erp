import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import type {
  RevenueBySourceParams,
  RevenueParams,
} from "../../api/dashboard"
import type { RevFilters } from "../../data/insights/records"
import type { Period } from "../../data/insights/periods"
import { RevenueBySourceTable } from "../dashboard/insights/cells/RevenueBySourceTable"
import { InsightPeriodControl } from "../dashboard/insights/InsightPeriodControl"
import { InsightsToolbar } from "../dashboard/insights/InsightsToolbar"
import { DashboardGrid } from "../dashboard/insights/InsightWidget"
import { INSIGHTS_STRINGS } from "../dashboard/insights/insights.strings"
import { RevenueTrendWidget } from "../dashboard/insights/RevenueTrendWidget"
import { pageParam, useInsightPaging } from "../../hooks/dashboard/useInsightPaging"
import { todayIso } from "../../hooks/dashboard/insight-view.params"
import { monthTokensForWindow } from "../../data/insights/month-facet"
import type { DashboardConditionFilter } from "../../api/dashboard"
import { DEMO_YEAR } from "../../data/insights/seed"
import { InsightBandHeading } from "../dashboard/insights/InsightBandHeading"
import { useAccountKpis } from "../../hooks/accounts/useAccountKpis"
import { AccountKpiStrip } from "./AccountKpiStrip"
import { CategoryOemMixWidget } from "../dashboard/insights/CategoryOemMixWidget"
import { kpiWindowLabel } from "./accountDetailHelpers"
import { ACCOUNTS_STRINGS } from "./accounts.strings"
import type { RevenueByCategoryOemParams } from "../../api/dashboard"

// Which registry facets the 360° tab exposes. `<InsightsToolbar>` renders
// one pill per key, in this order, plus the "Filtered by" chips row + Clear
// button below the strip — same chrome the CRM dashboard mounts.
const FACET_FIELDS = ["condition", "category", "oem", "month"] as const

// Every paged cell on this tab. A filter/period/range change invalidates each
// one's page index and must clear ALL of them in a SINGLE URL write — calling
// `setPage(1)` on each `useInsightPaging` handle in sequence races, because
// every handle derives its "next" params from the same stale snapshot and only
// the last `setSearchParams` wins (same pattern `useInsightView` already uses).
const TAB_PAGING_KEYS = [
  "account-360-revenue",
  "account-360-top-products",
  "account-360-category",
  "account-360-oem",
  "account-360-category-oem",
] as const

// The account 360° tab body — a widget grid scoped to ONE account.
//
// Starts with Top Products (`report_type=top_products` on the shared
// `/dashboard/revenue/by-source` endpoint, narrowed by `account_ids=[this]`).
// More widgets will slot in over time; the `<DashboardGrid>` shell is chosen
// so each new cell just declares its own `span` and drops into place — same
// grid the CRM dashboard uses, so widgets look and behave identically here.
//
// PERIOD: the tab owns its own period, rendered at the top-right of the body
// (NOT inside any widget's header — this control is a tab-level slice
// selector, so mounting it there would suggest it filters only that cell).
// Kept as local state rather than URL-synced: the account detail URL already
// carries the record id, and per-tab period churn would fill the history
// stack. If a later tab needs to survive refresh, promote to search params.
//
// SURVIVING A TAB SWITCH: `<DetailTabs>` renders only the active tab, so
// leaving this tab unmounts it and plain `useState` would reset the period and
// every facet. `retainedViews` below keeps them per account for the life of the
// page session, and the state is seeded from it on mount. A refresh still
// resets to defaults, as before.
//
// FILTERS: no per-widget filter bar. The account is fixed by the page's URL,
// and users edit the wider slice (facets) on the dashboard.

const S_INSIGHTS = INSIGHTS_STRINGS.breakdowns
const S_ACCOUNT = ACCOUNTS_STRINGS.detail.threeSixty

interface AccountThreeSixtyTabProps {
  accountId: string
}

interface RetainedView {
  period: Period
  range: { from: string; to: string }
  filters: RevFilters
}

// Period / range / facets last used on each account's 360° tab, so they
// outlast the unmount that `<DetailTabs>` does on a tab switch. Module scope on
// purpose: it must live longer than the component. Keyed by account id so one
// account's filters never leak onto another.
const retainedViews = new Map<string, RetainedView>()

export function AccountThreeSixtyTab({ accountId }: AccountThreeSixtyTabProps) {
  const revenuePaging = useInsightPaging("account-360-revenue")
  const categoryPaging = useInsightPaging("account-360-category")
  const oemPaging = useInsightPaging("account-360-oem")
  const topProductsPaging = useInsightPaging("account-360-top-products")
  const categoryOemPaging = useInsightPaging("account-360-category-oem")

  const [searchParams, setSearchParams] = useSearchParams()

  // Clears every paged cell on the tab in ONE URL write. Must be a single
  // `setSearchParams` call — see the note on `TAB_PAGING_KEYS` above.
  const resetAllPaging = () => {
    const next = new URLSearchParams(searchParams)
    let changed = false
    for (const k of TAB_PAGING_KEYS) {
      const name = pageParam(k)
      if (next.has(name)) {
        next.delete(name)
        changed = true
      }
    }
    if (changed) setSearchParams(next, { replace: true })
  }

  // Period / filters are local state (NOT URL-synced — see the block comment
  // above the component), so a refresh resets them to defaults. Pagination
  // IS URL-synced via `useInsightPaging`, so without this effect a stale
  // `?account-360-revenuePage=2` would survive the refresh against a result
  // set rebuilt from the default period + no filters — the page lands past
  // the end and the table shows "No records found". Clear all tab pagers on
  // mount so the view is reinitialized consistently. Mount-only on purpose
  // (empty deps): any later URL change is a user navigation and must stand.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    resetAllPaging()
  }, [])

  // Local period state — default `monthly` to match the dashboard's default.
  // `from` / `to` are only sent to the API when `period === "custom"`; they
  // still need seed values so the calendar picker in `InsightPeriodControl`
  // has something to open on.
  const retained = retainedViews.get(accountId)
  const [period, setPeriod] = useState<Period>(retained?.period ?? "monthly")
  // Custom range seeds YEAR-TO-DATE — 1 Jan of the current year → today — which
  // is what the CRM dashboard opens with (`FIRST_DATE`/`todayIso` in
  // `useInsightView`). It used to seed today → today, so picking "Custom" here
  // collapsed the window to a single day and every widget emptied out; the user
  // then had to go and find a range by hand before the tab showed anything.
  //
  // The end is TODAY, not the end of the month: a window running to 30 Sep on
  // the 23rd claims a week of data that cannot exist yet, and the picker's own
  // `disableFuture` would refuse to let anyone re-enter that range by hand.
  const [range, setRange] = useState<{ from: string; to: string }>(
    retained?.range ?? {
      from: `${DEMO_YEAR}-01-01`,
      to: todayIso(),
    },
  )

  // Tab-level facets — a single `RevFilters` bag so `<InsightsToolbar>` (the
  // dashboard's own toolbar) can own the pill strip, the "Filtered by" chips
  // row, and the Clear button. Only `category` / `oem` are exposed on this
  // tab, but the RevFilters shape is what the toolbar expects.
  const [rawFilters, setFilters] = useState<RevFilters>(retained?.filters ?? {})

  useEffect(() => {
    retainedViews.set(accountId, { period, range, filters: rawFilters })
  }, [accountId, period, range, rawFilters])

  const handleFiltersChange = (next: RevFilters) => {
    setFilters(next)
    resetAllPaging()
  }

  // `from` / `to` only travel with `custom`; presets resolve their own window.
  const apiPeriod: Period = period
  const apiStart = period === "custom" ? range.from : undefined
  const apiEnd = period === "custom" ? range.to : undefined

  // Month facet options = the months the effective window covers (same rule as
  // the dashboard). A month selected under an earlier window and now outside
  // it is dropped rather than left narrowing the tab invisibly.
  const monthOptions = monthTokensForWindow(apiPeriod, apiStart ?? "", apiEnd ?? "")
  const filters: RevFilters = {
    ...rawFilters,
    month: rawFilters.month?.filter((m) => monthOptions.includes(m.id)),
  }
  const category_ids = (filters.category ?? []).map((v) => v.id)
  const oem_ids = (filters.oem ?? []).map((v) => v.id)
  const conditions = (filters.condition ?? []).map((v) => v.id) as DashboardConditionFilter[]
  const months = (filters.month ?? []).map((v) => v.id)
  // The facets every widget on the tab shares — spread into each params object.
  const facetParams = {
    category_ids: category_ids.length ? category_ids : undefined,
    oem_ids: oem_ids.length ? oem_ids : undefined,
    conditions: conditions.length ? conditions : undefined,
    months: months.length ? months : undefined,
  }

  const handlePeriodChange = (next: Period) => {
    if (next === period) return
    setPeriod(next)
    // A slice change invalidates the current page index on every paged cell
    // in this tab — reset all of them so the user doesn't land past the end
    // of a smaller result set.
    resetAllPaging()
  }

  const handleRangeChange = (from: string, to: string) => {
    setRange({ from, to })
    resetAllPaging()
  }

  const revenueParams: RevenueParams = {
    period: apiPeriod,
    start: apiStart,
    end: apiEnd,
    account_ids: [accountId],
    // Facet narrowing propagates to every widget on the tab.
    ...facetParams,
    // 360° = "show this account's full activity". The page's own
    // account visibility check already gates whether the user reaches
    // this tab; once here, every widget reports the account whole rather
    // than the caller's individual slice of it. Same rationale on the
    // by-source and category-oem params below.
    bypass_visibility: true,
  }

  // Every by-source widget on this tab shares the same slice — the only
  // thing that changes between them is `report_type`. Extracted so a period
  // / range / account / facet edit lands on all three at once.
  const bySourceBase: Omit<RevenueBySourceParams, "report_type"> = {
    period: apiPeriod,
    // Only meaningful for `custom`; the backend ignores them for presets.
    start: apiStart,
    end: apiEnd,
    account_ids: [accountId],
    ...facetParams,
    // See the note on ``revenueParams.bypass_visibility``.
    bypass_visibility: true,
    // No `page` / `page_size` here — the widget takes them from the paging
    // handle below, the same way every other paged cell on this tab does.
  }

  const categoryParams: RevenueBySourceParams = {
    ...bySourceBase,
    report_type: "category",
  }

  const oemParams: RevenueBySourceParams = {
    ...bySourceBase,
    report_type: "oem",
  }

  const topProductsParams: RevenueBySourceParams = {
    ...bySourceBase,
    report_type: "top_products",
  }

  // Category × OEM mix widget — one call feeds the pivot + tiles.
  // Skips `report_type` (not a report_type widget) and `account_ids` (the
  // backend hardcodes it from the URL path — see the hook comment).
  const categoryOemParams: RevenueByCategoryOemParams = {
    period: apiPeriod,
    start: apiStart,
    end: apiEnd,
    ...facetParams,
    // See the note on ``revenueParams.bypass_visibility``.
    bypass_visibility: true,
    // No `page` / `page_size` here — the widget takes them from the paging
    // handle below, the same way every other paged cell on this tab does.
  }

  // One params object, passed to `<AccountKpiStrip>` AND used for the band
  // heading's window label. Identical params means TanStack Query hashes the
  // same key, so the strip's request and this one are the SAME request — one
  // fetch, one cache entry, and the heading can never name a different window
  // than the tiles it sits under.
  //
  // The label is built from the `start`/`end` the SERVER echoes back, never
  // re-derived from `period` here: the backend owns the IST calendar bounds
  // (a "monthly" window is month-to-date, not a whole month), so computing it
  // client-side is how the heading and the figures drift apart.
  const kpiParams = {
    period: apiPeriod,
    start: apiStart,
    end: apiEnd,
    ...facetParams,
  }
  const { data: kpis } = useAccountKpis(accountId, kpiParams)
  const windowLabel = kpiWindowLabel(period, kpis?.period.start, kpis?.period.end)

  return (
    <div className="space-y-4">
      {/* Same `<InsightsToolbar>` the CRM dashboard mounts — pill strip on
          the left, Period on the right, and the "Filtered by" chips row +
          Clear button below when any facet has a selection. This tab exposes
          the dashboard's facets that make sense for ONE account (Condition,
          Category, OEM, Month); Type, Account and Rep are left out. */}
      <InsightsToolbar
        filters={filters}
        onChange={handleFiltersChange}
        fields={[...FACET_FIELDS]}
        monthOptions={monthOptions}
        period={
          <InsightPeriodControl
            period={period}
            onPeriodChange={handlePeriodChange}
            from={range.from}
            to={range.to}
            onRangeChange={handleRangeChange}
          />
        }
      />

      {/* KPI strip — same account, same facets, same period as the
          widgets below. When the toolbar picks `custom`, the strip forwards
          the date range so the middle tile matches the widget's window. */}
      <AccountKpiStrip
        accountId={accountId}
        period={kpiParams.period}
        start={kpiParams.start}
        end={kpiParams.end}
        categoryIds={kpiParams.category_ids}
        oemIds={kpiParams.oem_ids}
        conditions={kpiParams.conditions}
        months={kpiParams.months}
      />

      {/* The widget grid is its own BAND, opened by the same rule the CRM
          dashboard puts above each of its bands. `pt-2` is the deliberate gap
          between the KPI tiles and this section — the strip's own
          `margin-bottom` was switched off (`mb-0!`) because it was an
          accidental 20px that only one component carried; the separation
          belongs to the section boundary, where it is visible in the markup
          and consistent with every other band in the product. */}
      <section className="space-y-3 pt-2">
        <InsightBandHeading label={S_ACCOUNT.revenueBand(windowLabel)} />

        <DashboardGrid>
          {/* Card order on this tab is deliberate and IS the DOM order — a CSS
              grid lays children out in source order, so re-sequencing these
              JSX blocks is the whole mechanism. It reads widest-to-narrowest
              and general-to-specific:

                Revenue trend       how much, over time
                Top Products        what sold
                Category & Brand    which category x which brand
                Category | OEM      each axis ranked on its own

              Revenue leads because every card below it is a breakdown OF that
              number. No `detailHref` — this page has no per-account revenue
              drill-down, so the card doesn't offer one. */}
          <RevenueTrendWidget
            params={revenueParams}
            paging={revenuePaging}
            title={S_ACCOUNT.revenueTitle}
            why={S_ACCOUNT.revenueWhy}
            span={6}
            breakdown
            // Leads become accounts via conversion, so a lead counter on a
            // per-account view reads as meta ("how many leads became THIS
            // account?") — hide them. Main CRM dashboard keeps both columns.
            hideLeadColumns
          />

          <RevenueBySourceTable
            title={S_ACCOUNT.topProductsTitle}
            why={S_INSIGHTS.topProductsWhy}
            span={6}
            params={topProductsParams}
            paging={topProductsPaging}
            // Opt-in extras — OEM (from `TopProductExtraMetadata.oem_name`) and
            // Qty (from `qty_sold`). The dashboard's Top Products cell omits both
            // because that tile is narrow; the 360° tab has room and both columns
            // answer "which brands did this account buy, and how many units".
            showOem
            showQty
            // Value Closed lands at the row's end here — the categorical columns
            // (OEM / Share / Orders / Qty) read first and the money figure is the
            // row's summary. Dashboard tiles keep the default (value first).
            valueAtEnd
            // Sizes the SHORT columns for this full-width mount so NAME absorbs
            // the slack — seven columns at span 6 need it.
            wide
            // Deliberately no `onRowClick`: freeform "Other" rows carry no product
            // id, and there is no product facet to drill into on this tab. Matches
            // the dashboard's own top-products cell wiring.
          />

          {/* Category & Brand Mix — the crossed pivot plus Top Category /
              Top Brand / Total tiles, all from one call. Span 6 so it owns its
              row: a pivot cannot be read at half width.

              It complements the two ranked tables BELOW rather than replacing
              them — this crosses the two axes, they rank each axis alone. */}
          {/* The SAME widget the CRM dashboard mounts, scoped by `accountId`.
              It was a separate near-identical component until the two drifted:
              the account copy had no pager, so a wide account silently showed
              page 1 of N with no way to reach the rest. */}
          <CategoryOemMixWidget
            accountId={accountId}
            params={categoryOemParams}
            paging={categoryOemPaging}
            span={6}
          />

          {/* Category / OEM breakdowns — they SHARE a row (span 3 each = half
              the 12-col grid). Same `<RevenueBySourceTable>` the CRM dashboard
              uses for the same two cells; only `report_type` differs. Default
              column set — the OEM / Qty extras are Top Products-only.

              Half width is load-bearing, not a preference. These two carry FOUR
              flexible columns (name / share / orders / value). `table-fixed`
              splits the remainder equally, so at full width each one became
              ~235px holding ~40px of ink, and the row read as islands with a
              void between them — which no alignment fixes, and which widening
              the name column only relocates. At half width the same four
              columns land at ~115px and the content fills them, which is the
              size these cells were designed at (the dashboard mounts them at
              span 3 too).

              Landing LAST also makes them the tab's closing detail: the pivot
              above already answered the crossed question, so these are the
              per-axis rankings you scroll to when you want one axis alone. */}
          <RevenueBySourceTable
            title={S_ACCOUNT.categoryTitle}
            why={S_ACCOUNT.categoryWhy}
            span={3}
            params={categoryParams}
            paging={categoryPaging}
            // Same row-order convention as Top Products above — Value Closed
            // lands last on this tab. Dashboard mounts stay untouched
            // (`valueAtEnd` defaults to false).
            valueAtEnd
          />

          <RevenueBySourceTable
            title={S_ACCOUNT.oemTitle}
            why={S_ACCOUNT.oemWhy}
            span={3}
            params={oemParams}
            paging={oemPaging}
            valueAtEnd
          />
        </DashboardGrid>
      </section>
    </div>
  )
}
