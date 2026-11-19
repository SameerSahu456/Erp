import { isValid, parseISO } from 'date-fns'

import { CHANNEL_TAG_OPTIONS } from '@/constants/channel-tags'

import {
  NO_CONDITION_ID,
  type DashboardAccountType,
  type DashboardConditionFilter,
} from '../../api/dashboard'
import { decodeMonthParam } from '../../data/insights/month-facet'
import {
  MULTI_FILTER_KEYS,
  type FacetValue,
  type MultiFilterKey,
  type Period,
  type RevFilters,
} from '../../data/insights/records'
import { ALL_PAGE_PARAMS } from './useInsightPaging'

// THE validating parser for every insight-board URL param.
//
// `useInsightView` used to read params straight off `URLSearchParams` and hand
// them down as `InsightView`, which typed them as if they were valid (`from:
// string`) while carrying whatever was in the address bar. Only `period`,
// `view` and the paging params were ever guarded; `from` / `to` and every facet
// id were passed through untouched, so a hand-edited URL reached the wire and
// came back as a 422 on EVERY widget at once — twelve red boxes reading
// "end must be greater than or equal to start".
//
// This module is where that stops. It is PURE — no router, no hooks — so the
// whole matrix of bad URLs is unit-testable without rendering anything, and it
// returns three things:
//
//   • `view`      — valid BY CONSTRUCTION. Downstream never re-checks.
//   • `repairs`   — what had to be changed, so the UI can SAY so. Silent repair
//                   is a lie: the board would answer a different question than
//                   the URL claims (the same reasoning behind
//                   `isGrowthPeriodCoerced`).
//   • `canonical` — what the URL SHOULD say. `useInsightView` writes it back, so
//                   Share / Refresh / Back all reproduce what is on screen.
//
// Repair beats reject throughout: a dashboard should always render something.
// The rule is "coerce to the nearest sane value and own up to it", never "blank
// the page".

/** ISO `yyyy-MM-dd` SHAPE. Necessary but nowhere near sufficient — `2026-13-45`
 *  matches it, which is exactly the bug this module exists to close. Always
 *  paired with a real calendar parse (`isRealDate`). */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** `YYYY-MM`, months 01–12 — the wire token the API's repeated `months` param
 *  wants. The month range is spelled out rather than `\d{2}` so `2026-13` is
 *  rejected here instead of 422-ing at the backend. */
const MONTH_TOKEN_RE = /^\d{4}-(0[1-9]|1[0-2])$/

/** RFC-4122-shaped id, which is what FastAPI's `uuid.UUID` coercion accepts.
 *  Version-agnostic on purpose: our ids are UUIDv7 and the backend does not
 *  check the version nibble either. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A real calendar day, not just a date-SHAPED string. `parseISO('2026-13-45')`
 *  yields an Invalid Date, which `isValid` catches. */
function isRealDate(s: string): boolean {
  return ISO_DATE_RE.test(s) && isValid(parseISO(s))
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Today as `yyyy-MM-dd` on the LOCAL calendar.
 *
 *  Local, not UTC: the board's dates are calendar days the user picks in a
 *  calendar, and `toISOString()` would roll IST evenings (+5:30) onto tomorrow —
 *  so "today" would briefly be a future date and get clamped away. */
export const todayIso = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`

export const PERIODS: readonly Period[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom']
const isPeriod = (v: string | null): v is Period =>
  !!v && (PERIODS as readonly string[]).includes(v)

/** Which slice of the hierarchy the board shows. */
export type ViewScope = 'my' | 'team'

/** Team is the default, so it is never serialised — a plain board keeps a clean
 *  URL, and only `?view=my` appears. */
export const DEFAULT_SCOPE: ViewScope = 'team'

/** Facets whose ids are entity UUIDs on the wire. `condition` / `vertical` are
 *  enums and `month` is a token, so each is validated its own way below. */
const UUID_FACETS: readonly MultiFilterKey[] = ['category', 'oem', 'owner', 'account']

/** One repair the parser had to make. Carried to the UI so it can say what
 *  changed — see `InsightViewNotice`. */
export type ViewRepair =
  | { param: 'period'; reason: 'unknown' }
  | { param: 'range'; reason: 'malformed' | 'inverted' | 'future' }
  | { param: 'view'; reason: 'unknown' }
  | { param: MultiFilterKey; reason: 'bad-id'; dropped: string[] }
  | { param: 'role'; reason: 'unknown' | 'multiple' }

export interface ParsedInsightParams {
  period: Period
  from: string
  to: string
  scope: ViewScope
  filters: RevFilters
  /** The Sales Team role filter (`?role=`) — ONE role name, or `null` for "All".
   *  Not a facet (it narrows one widget's query, never becomes a toolbar chip, and
   *  `Clear` cannot wipe it), but it lives in the URL so the board's "Show all"
   *  opens the inner leaderboard on the SAME role (CP-756 / DF-12). The value IS the
   *  wire value: `?roles=` takes the role NAME, a number would 422. */
  role: string | null
  /** The Sales Team search box (`?team_search=`) — what the user typed on the card,
   *  carried to the inner leaderboard so both show the same filtered list. Trimmed;
   *  empty or over-long is dropped without a repair (a search that filters nothing
   *  is not worth a notice). */
  teamSearch: string | null
  /** Empty === the URL was already clean. Non-empty means `canonical` differs
   *  from what was passed in and the caller should write it back. */
  repairs: ViewRepair[]
  /** What the URL should say for the view that was actually produced. Only
   *  meaningful when `repairs` is non-empty. */
  canonical: URLSearchParams
}

/** A facet value round-trips through the URL as `id|label` — the API needs the
 *  id, the chips need the label. `|` cannot appear in a uuid and is vanishingly
 *  rare in a name; only the FIRST one splits, so a label containing `|`
 *  survives. */
const SEP = '|'

export const encodeFacet = (v: FacetValue): string =>
  v.id === v.label ? v.id : `${v.id}${SEP}${v.label}`

const decodeFacet = (raw: string): FacetValue => {
  const i = raw.indexOf(SEP)
  // No separator = a static enum whose id IS its label, or a record-derived
  // pick with no id. Both read correctly as id === label.
  if (i === -1) return { id: raw, label: raw }
  return { id: raw.slice(0, i), label: raw.slice(i + 1) }
}

/** The enum vocabularies the backend will accept, so an unknown value is
 *  dropped here instead of 422-ing the whole board.
 *
 *  Both are tied to the WIRE types (`DashboardCondition` /
 *  `DashboardAccountType`, generated from the backend's OpenAPI), so a backend
 *  enum change fails typecheck here rather than silently letting a value
 *  through — or, worse, silently dropping a newly-valid one. `vertical` reuses
 *  the shared `CHANNEL_TAG_OPTIONS` constant the facet dropdown itself is built
 *  from (`insights.facets.ts:28`), so the filter can never offer an option this
 *  parser then discards. */
const CONDITION_IDS: readonly DashboardConditionFilter[] = [
  'new',
  'refurbished',
  'new_pull',
  // The "No Condition" option (`?conditions=no-condition`). Sendable, so a link
  // carrying it must survive this parser — without it the facet would be
  // silently dropped and the board would quietly show every condition.
  NO_CONDITION_ID,
]
const VERTICAL_IDS: readonly DashboardAccountType[] = CHANNEL_TAG_OPTIONS

/** Is this facet value's id sendable? One switch so every facet's rule is
 *  visible in one place. */
function isValidFacetId(key: MultiFilterKey, id: string): boolean {
  if (UUID_FACETS.includes(key)) return UUID_RE.test(id)
  if (key === 'month') return MONTH_TOKEN_RE.test(id)
  if (key === 'condition') return (CONDITION_IDS as readonly string[]).includes(id)
  if (key === 'vertical') return (VERTICAL_IDS as readonly string[]).includes(id)
  return true
}

/** Resolve `?from` / `?to` into a window that the API can actually accept.
 *
 *  Four outcomes, in the order they are checked:
 *
 *  1. **Absent** — each end defaults (`from` → the caller's default, `to` →
 *     today). Not a repair: an omitted param is not a wrong one.
 *  2. **Malformed** — either end is not a real calendar day. The range cannot be
 *     salvaged (there is nothing to swap or clamp), so the period falls back to
 *     the preset. `2026-13-45` lands here, NOT in the shape check that used to
 *     let it through.
 *  3. **Inverted** — both are real but `from > to`. SWAPPED, per the plan's
 *     Decision A1: the user typed two real dates and only their order was odd,
 *     so the range is unambiguous as a SET. Discarding both over an ordering
 *     slip would throw away a range that was 95% right. The swap is a guess, so
 *     it is reported, never silent.
 *  4. **Future end** — clamped to today. The picker already refuses to let a
 *     user select tomorrow onward (`disableFuture` in `InsightPeriodControl`),
 *     so a future `to` in the URL is a window the control cannot re-enter — the
 *     board would be showing a range its own picker disagrees with. Clamping
 *     costs nothing: those buckets can only ever be empty.
 *
 *  Order matters: swap BEFORE clamping, or an inverted range whose later end is
 *  in the future would be clamped on the wrong end first and then swap into
 *  something the user never typed. */
function resolveRange(
  rawFrom: string | null,
  rawTo: string | null,
  defaults: { from: string; to: string },
  repairs: ViewRepair[],
): { from: string; to: string; usable: boolean } {
  const from = rawFrom ?? defaults.from
  const to = rawTo ?? defaults.to

  const fromOk = isRealDate(from)
  const toOk = isRealDate(to)

  // Legacy month-name bookmarks (`?from=Feb`) are NOT malformed — they still
  // resolve in `insight-query-params.resolveWindow`. Only a value that is
  // neither a real date nor a plausible legacy token is unusable.
  const fromLegacy = !fromOk && /^[A-Za-z]{3,}$/.test(from)
  const toLegacy = !toOk && /^[A-Za-z]{3,}$/.test(to)

  if ((!fromOk && !fromLegacy) || (!toOk && !toLegacy)) {
    repairs.push({ param: 'range', reason: 'malformed' })
    return { from: defaults.from, to: defaults.to, usable: false }
  }

  // Ordering and the future clamp only apply to real ISO dates — a legacy month
  // name has no comparable value here (it is expanded downstream).
  if (!fromOk || !toOk) return { from, to, usable: true }

  let start = from
  let end = to

  if (start > end) {
    // Lexical compare is a DATE compare for zero-padded ISO — no parsing needed.
    ;[start, end] = [end, start]
    repairs.push({ param: 'range', reason: 'inverted' })
  }

  const today = todayIso()
  if (end > today) {
    end = today
    repairs.push({ param: 'range', reason: 'future' })
    // The clamp can invert a wholly-future range (both ends after today), which
    // would hand the backend `start > end` — the exact 422 this module exists to
    // prevent. Fall back rather than emit an impossible window.
    if (start > end) {
      repairs.push({ param: 'range', reason: 'malformed' })
      return { from: defaults.from, to: defaults.to, usable: false }
    }
  }

  return { from: start, to: end, usable: true }
}

/**
 * Parse an insight board's URL into a view that is valid by construction.
 *
 * `defaults` are the caller's fallbacks for an absent custom range — passed in
 * rather than computed here so this stays pure and the test can pin them.
 */
export function parseInsightParams(
  params: URLSearchParams,
  defaults: { from: string; to: string },
): ParsedInsightParams {
  const repairs: ViewRepair[] = []

  const rawPeriod = params.get('period')
  let period: Period = isPeriod(rawPeriod) ? rawPeriod : 'monthly'
  // An ABSENT period is the default, not a repair — only a present-but-unknown
  // one is worth telling the user about.
  if (rawPeriod !== null && !isPeriod(rawPeriod)) {
    repairs.push({ param: 'period', reason: 'unknown' })
  }

  const rawView = params.get('view')
  const scope: ViewScope = rawView === 'my' ? 'my' : DEFAULT_SCOPE
  if (rawView !== null && rawView !== 'my' && rawView !== 'team') {
    repairs.push({ param: 'view', reason: 'unknown' })
  }

  // The range is only meaningful for `custom`. For a preset, `from`/`to` are
  // ignored entirely (the server computes the window), so validating them would
  // report a repair for values that change nothing on screen.
  let from = defaults.from
  let to = defaults.to
  if (period === 'custom') {
    const resolved = resolveRange(params.get('from'), params.get('to'), defaults, repairs)
    from = resolved.from
    to = resolved.to
    // An unusable range leaves `custom` selected with nothing to send. Fall back
    // to the preset rather than firing a request that cannot succeed — the same
    // call `insight-query-params` makes, moved to where the user can be told.
    if (!resolved.usable) period = 'monthly'
  }

  const filters: RevFilters = {}
  for (const k of MULTI_FILTER_KEYS) {
    const vals = params.getAll(k)
    if (!vals.length) continue

    // DEDUPE BY ID. A repeated param (`?owner=X&owner=X`) otherwise renders the
    // same chip twice, double-counts the facet badge and the Clear counter, and
    // sends the id twice to the API.
    //
    // The URL can legitimately arrive that way: a drill-in appends the clicked
    // value to a href that ALREADY carries the board's filters, so clicking the
    // row/slice for a value you had already selected repeats it
    // (`insightDetailHref`'s `extra`, `SalesTeamWidget.openRep`). Both producers
    // are fixed, but this is the layer that makes it impossible — it also cleans
    // up links already shared or bookmarked with the dupe.
    //
    // Keyed on `id`, not the raw param: `019f…|JYOTIKA PATIL` and a bare `019f…`
    // are the same filter wearing different labels. First wins, so the earliest
    // (board-level) label survives.
    const seen = new Set<string>()
    const decoded: FacetValue[] = []
    const dropped: string[] = []
    for (const raw of vals) {
      const v = (k === 'month' ? decodeMonthParam : decodeFacet)(raw)
      if (seen.has(v.id)) continue
      // Drop only the offending VALUE, never the whole facet: one bad id in a
      // shared link should not cost the user the three good ones beside it.
      if (!isValidFacetId(k, v.id)) {
        dropped.push(v.id)
        continue
      }
      seen.add(v.id)
      decoded.push(v)
    }
    if (dropped.length) repairs.push({ param: k, reason: 'bad-id', dropped })
    if (decoded.length) filters[k] = decoded
  }

  const role = parseRoleParam(params, repairs)

  const teamSearch = parseTeamSearchParam(params)

  const view = { period, from, to, scope, filters, role, teamSearch, repairs }
  return { ...view, canonical: canonicalize(params, view) }
}

/** `?role=` → one trimmed role name, or `null`.
 *
 *  No vocabulary check: the valid set is the report's own `roles` facet, which
 *  arrives on the very query this filters, and `roles` is free text server-side —
 *  an unknown name matches nobody rather than 422-ing. Only what cannot mean
 *  anything is repaired: an empty / whitespace value (`unknown`), and several
 *  values at once (`multiple`, the dropdown is pick-one — the first wins). */
function parseRoleParam(params: URLSearchParams, repairs: ViewRepair[]): string | null {
  const raw = params.getAll('role')
  if (raw.length === 0) return null
  const first = raw[0].trim()
  if (!first) {
    repairs.push({ param: 'role', reason: 'unknown' })
    return null
  }
  if (raw.length > 1) repairs.push({ param: 'role', reason: 'multiple' })
  return first
}

const TEAM_SEARCH_MAX_LENGTH = 200
export const TEAM_SEARCH_PARAM = 'team_search'

/** `?team_search=` → one trimmed string, or `null` when absent / blank / too long. */
function parseTeamSearchParam(params: URLSearchParams): string | null {
  const v = params.get(TEAM_SEARCH_PARAM)?.trim() ?? ''
  return v.length > 0 && v.length <= TEAM_SEARCH_MAX_LENGTH ? v : null
}

/** Rebuild the search params so they describe the view that was actually
 *  produced. Everything not owned by the board (`?tab=`, tracking params, a
 *  records page's `?back=`) is preserved — this rewrites the board's own keys
 *  and nothing else. */
function canonicalize(
  original: URLSearchParams,
  view: Omit<ParsedInsightParams, 'canonical'>,
): URLSearchParams {
  const next = new URLSearchParams(original)

  next.set('period', view.period)
  if (view.period === 'custom') {
    next.set('from', view.from)
    next.set('to', view.to)
  } else {
    // A custom range is meaningless outside the custom period — leaving it would
    // silently narrow a later custom selection. Same rule as `setPeriod`.
    next.delete('from')
    next.delete('to')
  }

  if (view.scope === DEFAULT_SCOPE) next.delete('view')
  else next.set('view', view.scope)

  for (const k of MULTI_FILTER_KEYS) {
    next.delete(k)
    for (const v of view.filters[k] ?? []) next.append(k, encodeFacet(v))
  }

  next.delete('role')
  if (view.role) next.set('role', view.role)
  next.delete(TEAM_SEARCH_PARAM)
  if (view.teamSearch) next.set(TEAM_SEARCH_PARAM, view.teamSearch)

  // A repair changes the result set, so every paged cell's index is meaningless
  // against the new one and can land past the end (§16.7) — the same reset
  // `setPeriod` / `setFilters` do.
  if (view.repairs.length) for (const p of ALL_PAGE_PARAMS) next.delete(p)

  return next
}
