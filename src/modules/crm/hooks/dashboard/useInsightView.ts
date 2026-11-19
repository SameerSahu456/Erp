import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { decodeMonthParam, monthTokensForWindow } from '../../data/insights/month-facet'
import { DEMO_YEAR } from '../../data/insights/seed'
import { ALL_PAGE_PARAMS } from './useInsightPaging'
import {
  DEFAULT_SCOPE,
  encodeFacet,
  parseInsightParams,
  TEAM_SEARCH_PARAM,
  todayIso,
  type ViewRepair,
  type ViewScope,
} from './insight-view.params'
import { MULTI_FILTER_KEYS, type Period, type RevFilters } from '../../data/insights/records'

// The insight "view" — period, custom range and facet selections — read from
// and written to the URL. Shared by the dashboard and the detail page so both
// speak the same param contract, and so a drill-through or a Back can hand the
// slice over intact.
//
// URL rather than local state on purpose: a filtered board is then shareable,
// survives a refresh, and comes back unchanged from a detail page. Local state
// silently reset to Monthly on every return trip.
//
// READING is delegated wholesale to `parseInsightParams` — a pure module that
// VALIDATES rather than merely decodes, so what this hook returns is valid by
// construction and no consumer re-checks. This file owns only the two things
// that need React: the write-back of a repaired URL (below) and the setters.

// Default custom range = YEAR-TO-DATE: 1 Jan of the current year → TODAY. ISO
// `yyyy-MM-dd`, the format the date-range picker edits and the API's
// `start`/`end` accept directly. (Legacy month-name values from old URLs still
// resolve in `insight-query-params`; only the defaults are ISO.)
//
// The end is TODAY, not the end of the current month: a window that runs to 31
// Aug on the 4th claims three weeks of data that cannot exist yet, and the
// picker refuses to let a user pick those days by hand (`disableFuture`) — a
// default it forbids would be a range you can see but never re-enter.
const FIRST_DATE = `${DEMO_YEAR}-01-01`

/** Drop any `?month=` whose month falls outside the window the view is moving
 *  to, in place.
 *
 *  A month is a filter INSIDE the period window, not a window of its own: the
 *  backend intersects `months` with the resolved window
 *  (`bucket_intersects_months`) and tolerates a month outside it by matching
 *  nothing. So narrowing a custom range from 2024–2026 down to 2026, or leaving
 *  custom for a preset, would otherwise leave "Mar 2024" selected — a chip the
 *  user can no longer find in the dropdown, cannot re-select, and which
 *  silently empties every cell on the board.
 *
 *  Same call `setPeriod` already makes for `?from`/`?to` and `setScope` makes
 *  for `?owner`: a filter that has become unreachable is dropped rather than
 *  left to narrow the board invisibly. */
function pruneMonths(next: URLSearchParams, period: Period, from: string, to: string): void {
  const kept = new Set(monthTokensForWindow(period, from, to))
  const surviving = next.getAll('month').filter((raw) => kept.has(decodeMonthParam(raw).id))
  next.delete('month')
  for (const m of surviving) next.append('month', m)
}

export { DEFAULT_SCOPE, type ViewRepair, type ViewScope }

export interface InsightView {
  period: Period
  from: string
  to: string
  /** `my` = the logged-in user's own numbers; `team` = whatever the backend
   *  resolves for the caller (self + reports). Lives in the URL like every
   *  other view setting so a drill-through and a Back keep the same scope. */
  scope: ViewScope
  filters: RevFilters
  /** Sales Team role filter — see `ParsedInsightParams.role`. */
  role: string | null
  /** Sales Team search text — see `ParsedInsightParams.teamSearch`. */
  teamSearch: string | null
  /** What the parser had to change to make the URL sendable. Empty on a clean
   *  URL — which is the overwhelmingly common case, so callers can render the
   *  notice unconditionally and it costs nothing. */
  repairs: ViewRepair[]
  setPeriod: (p: Period) => void
  /** Commit BOTH ends of the custom range in one URL update. (Separate
   *  per-side setters were removed: calling two in the same tick loses the
   *  first write — each `patch` starts from the params captured at render, so
   *  the second overwrote the first.) */
  setRange: (from: string, to: string) => void
  /** Puts the board on `custom` AND commits the range in ONE URL write — what
   *  the financial-year dropdown needs. `setPeriod('custom')` followed by
   *  `setRange(...)` would be two `patch` calls that each start from the
   *  params captured at render, so the second overwrites the first. */
  setCustomRange: (from: string, to: string) => void
  setScope: (s: ViewScope) => void
  setFilters: (f: RevFilters) => void
  /** Set the Sales Team role (`null` = All). Resets every page index — a role pick
   *  resizes the leaderboard (§16.7). */
  setRole: (r: string | null) => void
  /** Set the Sales Team search text (`null` = none). Resets every page index. */
  setTeamSearch: (q: string | null) => void
}

export function useInsightView(): InsightView {
  const [params, setParams] = useSearchParams()

  // `todayIso()` is read per parse rather than pinned at module load: a tab left
  // open across midnight would otherwise clamp future dates against yesterday.
  const parsed = useMemo(
    () => parseInsightParams(params, { from: FIRST_DATE, to: todayIso() }),
    [params],
  )

  const { repairs, canonical } = parsed

  // Write the repaired URL back, so Share / Refresh / Back all reproduce what
  // is actually on screen. Leaving `?period=custom&from=<junk>` in the bar while
  // rendering monthly data means every one of those gestures disagrees with the
  // page.
  //
  // `replace: true` is load-bearing: a repair must not push a history entry, or
  // Back bounces between the broken URL and the fixed one forever.
  //
  // Guarded on `repairs.length` rather than on a params comparison, and
  // `canonical` is memoised with the parse — so a CLEAN url performs no write,
  // no re-render, and no second parse. Without both, this effect re-fires on
  // every render.
  useEffect(() => {
    if (repairs.length === 0) return
    setParams(canonical, { replace: true })
  }, [repairs, canonical, setParams])

  const patch = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    mutate(next)
    setParams(next, { replace: true })
  }

  return {
    period: parsed.period,
    from: parsed.from,
    to: parsed.to,
    scope: parsed.scope,
    filters: parsed.filters,
    role: parsed.role,
    teamSearch: parsed.teamSearch,
    repairs,
    setScope: (s) =>
      patch((next) => {
        if (s === DEFAULT_SCOPE) next.delete('view')
        else next.set('view', s)
        // My View hides the Rep facet and forces `user_ids` to the logged-in
        // user. A leftover `owner` chip would then be invisible AND overridden
        // — the user would see a filter they can't find and can't clear.
        next.delete('owner')
        // Same reason `setFilters` does it: the scope change renumbers every
        // page, so EVERY paged cell's index no longer means anything.
        for (const p of ALL_PAGE_PARAMS) next.delete(p)
      }),
    setPeriod: (p) =>
      patch((next) => {
        next.set('period', p)
        // A custom range is meaningless outside the custom period — drop it, or
        // a stale ?from/?to would silently narrow a later custom selection.
        if (p !== 'custom') {
          next.delete('from')
          next.delete('to')
        }
        // Leaving custom for a preset snaps the window back to year-to-date, so
        // any month picked outside this year is now unreachable — see
        // `pruneMonths`.
        pruneMonths(next, p, next.get('from') ?? FIRST_DATE, next.get('to') ?? todayIso())
        // A period change resizes every result set on the board, so every page
        // index is meaningless against the new one and can land past the end —
        // the same §16.7 reset `setFilters` does. Narrowing yearly → monthly
        // while sitting on page 5 otherwise refetches page 5 of a set that may
        // only have two.
        for (const pageParamName of ALL_PAGE_PARAMS) next.delete(pageParamName)
      }),
    setRange: (fromVal, toVal) =>
      patch((next) => {
        next.set('from', fromVal)
        next.set('to', toVal)
        // A narrowed range can leave a month selected that the new window no
        // longer contains — see `pruneMonths`.
        pruneMonths(next, 'custom', fromVal, toVal)
        // Same reasoning as `setPeriod` — a new custom range is a new result set.
        for (const pageParamName of ALL_PAGE_PARAMS) next.delete(pageParamName)
      }),
    setCustomRange: (fromVal, toVal) =>
      patch((next) => {
        next.set('period', 'custom')
        next.set('from', fromVal)
        next.set('to', toVal)
        // Same two resets `setRange` does: months outside the new window are
        // unreachable, and every page index is meaningless against it.
        pruneMonths(next, 'custom', fromVal, toVal)
        for (const pageParamName of ALL_PAGE_PARAMS) next.delete(pageParamName)
      }),
    setTeamSearch: (q) =>
      patch((next) => {
        next.delete(TEAM_SEARCH_PARAM)
        if (q) next.set(TEAM_SEARCH_PARAM, q)
        for (const p of ALL_PAGE_PARAMS) next.delete(p)
      }),
    setRole: (r) =>
      patch((next) => {
        next.delete('role')
        if (r) next.set('role', r)
        for (const p of ALL_PAGE_PARAMS) next.delete(p)
      }),
    setFilters: (f) =>
      patch((next) => {
        for (const k of MULTI_FILTER_KEYS) {
          next.delete(k)
          for (const v of f[k] ?? []) next.append(k, encodeFacet(v))
        }
        // `month` rides the loop above now — it is a normal multi facet, written
        // as repeated `id|label` params like every other one.
        // A filter change renumbers every page — EVERY paged cell's index is
        // meaningless against the new result set and could land past the end
        // (§16.7). The names come from `PAGING_KEYS`, so this reset cannot
        // drift out of sync with the cells that page.
        for (const p of ALL_PAGE_PARAMS) next.delete(p)
      }),
  }
}
