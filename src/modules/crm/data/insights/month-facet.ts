// Month facet ↔ wire-token helpers.
//
// The month facet now behaves like every other multi facet: `id` is the
// `YYYY-MM` wire token the API's repeated `months` param wants, `label` is the
// human "Jan 2026". These helpers are the single place that converts between a
// month NAME (what the seeded buckets carry), a wire TOKEN, and a display
// LABEL, so the toolbar options, the URL codec, and the query mapper can never
// disagree about a month's three forms.

import type { FacetValue } from './filters'
import type { Period } from './periods'
import { DEMO_YEAR, MONTHS } from './seed'

const pad2 = (n: number) => String(n).padStart(2, '0')
const TOKEN_RE = /^(\d{4})-(\d{2})$/
const ISO_DATE_RE = /^(\d{4})-(\d{2})-\d{2}$/

/** Month name ('Jan') → wire token '2026-01' (the demo year). Returns the input
 *  unchanged when the name is unknown, so a stray value still round-trips. */
export function monthNameToToken(name: string): string {
  const i = MONTHS.indexOf(name as (typeof MONTHS)[number])
  return i === -1 ? name : `${DEMO_YEAR}-${pad2(i + 1)}`
}

/** Wire token '2026-01' → display 'Jan 2026'. Passes an unrecognised value
 *  through unchanged rather than blanking the chip. */
export function monthTokenToLabel(token: string): string {
  const m = TOKEN_RE.exec(token)
  if (!m) return token
  const name = MONTHS[Number(m[2]) - 1]
  return name ? `${name} ${m[1]}` : token
}

/** Build a month facet value from a wire token. */
export const monthFacet = (token: string): FacetValue => ({
  id: token,
  label: monthTokenToLabel(token),
})

/** Decode a `?month=` URL value into a facet, tolerating three formats:
 *   - new `id|label` (`2026-01|Jan 2026`) — what current writes produce,
 *   - a bare wire token (`2026-01`),
 *   - a LEGACY single-select value: a bare month name (`Jan`) or display
 *     (`Jan 2026`) from an old bookmark — mapped to a token so it doesn't 422.
 */
export function decodeMonthParam(raw: string): FacetValue {
  const sep = raw.indexOf('|')
  if (sep !== -1) return { id: raw.slice(0, sep), label: raw.slice(sep + 1) }
  if (TOKEN_RE.test(raw)) return monthFacet(raw)
  // Legacy: a month name, optionally trailed by a year ('Jan' / 'Jan 2026').
  const token = monthNameToToken(raw.trim().slice(0, 3))
  return TOKEN_RE.test(token) ? monthFacet(token) : { id: raw, label: raw }
}

// ---------------------------------------------------------------------------
// The Month facet's OPTION LIST — every month the board's period window covers.
//
// It is derived from the WINDOW, never from a month-name list: the options used
// to come from `MONTH_WINDOW` (bare names, 'Jan'…) stamped with `DEMO_YEAR`,
// which made every option a month of the CURRENT year by construction. A custom
// range spanning 2024–2025 therefore offered the wrong twelve months and no way
// to reach the right ones — the facet is multi-select, but you could only ever
// multi-select inside this year.
//
// Tokens carry their own year (`2025-03`), which is what the API's repeated
// `months` param wants and what `bucket_intersects_months` matches on — so a
// cross-year selection ("Mar 2025 + Mar 2026") intersects correctly server-side.
// ---------------------------------------------------------------------------

/** Every `YYYY-MM` token an inclusive `yyyy-MM-dd` window touches, in
 *  chronological order. Spans years; a partial end month still counts (the
 *  window overlaps it, so the bucket exists). */
export function monthTokensBetween(startIso: string, endIso: string): string[] {
  const s = ISO_DATE_RE.exec(startIso)
  const e = ISO_DATE_RE.exec(endIso)
  if (!s || !e) return []

  let year = Number(s[1])
  let month = Number(s[2])
  const endYear = Number(e[1])
  const endMonth = Number(e[2])
  if (year > endYear || (year === endYear && month > endMonth)) return []

  const tokens: string[] = []
  while (year < endYear || (year === endYear && month <= endMonth)) {
    tokens.push(`${year}-${pad2(month)}`)
    if (month === 12) {
      month = 1
      year += 1
    } else {
      month += 1
    }
  }
  return tokens
}

/** The months the board's current window covers.
 *
 *  MIRRORS the backend's `resolve_window`
 *  (`services/dashboard/revenue_report/_revenue_bucketing.py`): every PRESET
 *  period resolves server-side to Apr 1 of the CURRENT INDIAN FINANCIAL YEAR
 *  → today, so its months are FY-to-date regardless of the bucket size. Only
 *  `custom` carries a caller-supplied range, and only `custom` can therefore
 *  span an FY boundary.
 *
 *  A non-ISO `from`/`to` is a legacy month-name bookmark (`?from=Feb`); those
 *  resolve against the current FY downstream, so the FY-to-date window is
 *  the right option list for them too. */
export function monthTokensForWindow(
  period: Period,
  from: string,
  to: string,
  now: Date = new Date(),
): string[] {
  const fyToDate = () => {
    // FY starts April 1. Jan-Mar (getMonth() 0..2) belong to the PREVIOUS FY.
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const end = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
    return monthTokensBetween(`${fyStartYear}-04-01`, end)
  }
  if (period !== 'custom') return fyToDate()
  const custom = monthTokensBetween(from, to)
  return custom.length ? custom : fyToDate()
}
