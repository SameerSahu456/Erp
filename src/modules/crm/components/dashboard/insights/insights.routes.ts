// Route helpers for the insight dashboard ⇄ detail round-trip.
//
// Centralised so the dashboard's drill-through link, the widget row clicks and
// the detail page's back button all agree on one path and one param contract.
// A stray string literal in any one of them is how a drill-through silently
// loses the user's filters — which is exactly the bug these replace.

import type { RevFilters } from '../../../data/insights/records'
import { MULTI_FILTER_KEYS, type Period } from '../../../data/insights/records'
import { ALL_PAGE_PARAMS, sizeParam } from '../../../hooks/dashboard/useInsightPaging'
import { TEAM_SEARCH_PARAM } from '../../../hooks/dashboard/insight-view.params'
import { DEFAULT_SCOPE, type ViewScope } from '../../../hooks/dashboard/useInsightView'
import type { MetricKey } from './insights.registry'

export const CRM_DASHBOARD_PATH = '/crm'
export const CRM_INSIGHTS_PATH = '/crm/insights'
export const CRM_RECORDS_PATH = `${CRM_INSIGHTS_PATH}/records`
export const CRM_TILE_DRILLDOWN_PATH = `${CRM_INSIGHTS_PATH}/tile`

/** Period is only serialised when it differs from the default, so a plain
 *  monthly view keeps a clean URL. */
const DEFAULT_PERIOD: Period = 'monthly'

export interface InsightViewState {
  period: Period
  /** Custom-range endpoints; only meaningful when `period === 'custom'`. */
  from?: string
  to?: string
  /** My / Team. Carried through the drill-through so the inner view opens on
   *  the same slice of the hierarchy — and back again, so returning from a My
   *  View drill-in doesn't silently land the user on the team board. */
  scope?: ViewScope
  filters?: RevFilters
  /** The Sales Team role — carried through the drill-through so "Show all 60"
   *  opens on the 60 account managers, not all 180 users, and back again. One
   *  role name; `null` / absent keeps a clean URL ("All"). */
  role?: string | null
  /** The Sales Team search text — carried by the Sales Team card's own link only
   *  (see `insightDetailHref`), so the inner leaderboard opens already searched. */
  teamSearch?: string | null
}

/** Serialise the dashboard's current view into query params. Multi-select
 *  facets become repeated params (`?category=A&category=B`). */
export function insightViewParams({
  period,
  from,
  to,
  scope,
  filters,
  role,
  teamSearch,
}: InsightViewState): URLSearchParams {
  const p = new URLSearchParams()
  if (period !== DEFAULT_PERIOD) p.set('period', period)
  if (scope && scope !== DEFAULT_SCOPE) p.set('view', scope)
  if (period === 'custom') {
    if (from) p.set('from', from)
    if (to) p.set('to', to)
  }
  if (role) p.set('role', role)
  if (teamSearch) p.set(TEAM_SEARCH_PARAM, teamSearch)
  for (const k of MULTI_FILTER_KEYS) {
    // Same `id|label` codec as `useInsightView` — the drill-through must hand
    // the detail page a slice it can decode back into ids AND chips. `month`
    // rides this loop now (it joined MULTI_FILTER_KEYS), so no special case.
    for (const v of filters?.[k] ?? []) {
      p.append(k, v.id === v.label ? v.id : `${v.id}|${v.label}`)
    }
  }
  return p
}

/** The id half of an `id|label` facet token — the same codec `useInsightView`
 *  decodes with. A token with no separator IS its own id. */
export const idOf = (token: string): string => {
  const i = token.indexOf('|')
  return i === -1 ? token : token.slice(0, i)
}

/** The detail URL for a metric, carrying the dashboard's active slice so the
 *  inner view opens on what the user was looking at. `extra` pre-applies a
 *  clicked value (e.g. `{ owner: 'Amit Patel' }`) — skipped when that value is
 *  already in the board's filters, so a drill-in never doubles a chip. */
export function insightDetailHref(
  metric: MetricKey,
  view: InsightViewState,
  extra?: Record<string, string>,
): string {
  const p = insightViewParams(view)
  // Only the Sales Team page reads it — every other detail link stays clean.
  if (metric !== 'sales-team') p.delete(TEAM_SEARCH_PARAM)
  for (const [k, v] of Object.entries(extra ?? {})) {
    if (!v) continue
    // Skip a value the board ALREADY has selected for this facet, or the
    // drill-in emits `?owner=X&owner=X` — which renders the chip twice, shows
    // "2" on the facet badge and the Clear counter, and sends the id twice to
    // the API. Clicking the row for a value you had already filtered on is the
    // ordinary way to hit this.
    //
    // Compared on ID, not on the whole `id|label` token: the board may carry
    // the value with a different label than the clicked row renders (or with no
    // label at all), and those are still the same filter.
    const id = idOf(v)
    if (p.getAll(k).some((existing) => idOf(existing) === id)) continue
    p.append(k, v)
  }
  const qs = p.toString()
  return qs ? `${CRM_INSIGHTS_PATH}/${metric}?${qs}` : `${CRM_INSIGHTS_PATH}/${metric}`
}

/** Back to the dashboard, preserving the period/range the user drilled with. */
export function insightDashboardHref(view: InsightViewState): string {
  const p = insightViewParams({ ...view, filters: undefined })
  const qs = p.toString()
  return qs ? `${CRM_DASHBOARD_PATH}?${qs}` : CRM_DASHBOARD_PATH
}

/** The records page's own page-size param — stripped alongside the page
 *  indices when leaving, so a size chosen here doesn't ride back to the board. */
const RECORDS_SIZE_PARAM = sizeParam('records')

/**
 * Tile → records page, carrying the CURRENT view slice verbatim.
 *
 * `location.search` is passed THROUGH rather than re-serialised from
 * `RevFilters`: the tile always renders on a page whose URL already holds the
 * canonical slice, and a round-trip through `insightViewParams` would silently
 * drop anything `useInsightView` doesn't model.
 *
 * Page indices are stripped. Drilling from a detail page sitting on
 * `?accountsPage=3&topOrdersPage=2` would otherwise carry indices that mean
 * nothing on the records page onto every link shared from it.
 *
 * No `back` param: the records page opens in a NEW TAB and has no back control,
 * so there is nothing to return to. `location` still takes the whole object
 * (not just `search`) to keep the call sites unchanged.
 */
export function recordsHref(
  tile: string,
  location: { pathname: string; search: string },
): string {
  const p = new URLSearchParams(location.search)
  for (const key of ALL_PAGE_PARAMS) p.delete(key)
  p.delete(RECORDS_SIZE_PARAM)
  const qs = p.toString()
  return qs ? `${CRM_RECORDS_PATH}/${tile}?${qs}` : `${CRM_RECORDS_PATH}/${tile}`
}

/** The KPI tile drill-down page's own page-size param. */
const TILE_SIZE_PARAM = sizeParam('tile-accounts')

/**
 * KPI tile → its account-breakdown page, carrying the CURRENT view slice.
 *
 * Addressed by (`reportType`, tile `key`) — `key` is the tile's stable id
 * (`new`, `refurb_pull`, `avg_order`). NOT by position: a bundle's array is not
 * a fixed 4 — `condition` and `account_type_wise` DROP the split tiles the
 * active filter rules out (Condition → New removes `refurb_pull`), so every
 * tile after the dropped one moves up and a positional link would open a
 * different tile, or an inert one, once the filter changed (CP-756 #1). The
 * label is no handle either: it is the one field the backend can reword.
 * A plain number is still accepted by the page, for links opened before this.
 *
 * The window is NOT serialised here, deliberately. Only the board's slice
 * travels — the page re-asks `summary-tiles` with it and follows the
 * `drilldown` block that comes back, exactly as the tile would have. Putting
 * `start`/`end` on the URL would make a shared link freeze a window that the
 * tile recomputes (a Peak bucket moves as filters change), and would hand the
 * by-source call a range no server had vouched for.
 *
 * Page indices are stripped for the same reason as `recordsHref`, and there is
 * no `back` param — this opens in a NEW TAB.
 */
export function tileDrilldownHref(
  reportType: string,
  tileKey: string,
  location: { pathname: string; search: string },
): string {
  const p = new URLSearchParams(location.search)
  for (const key of ALL_PAGE_PARAMS) p.delete(key)
  p.delete(TILE_SIZE_PARAM)
  const qs = p.toString()
  const base = `${CRM_TILE_DRILLDOWN_PATH}/${reportType}/${encodeURIComponent(tileKey)}`
  return qs ? `${base}?${qs}` : base
}

