// Facet filter state, shared by the dashboard and the inner view.
//
// Each selected value carries BOTH halves, because the two consumers need
// different ones:
//   • `id`    — what the API filters on (`category_ids=<uuid>`, `conditions=new`).
//   • `label` — what the user sees: the chips, the "Filtered by:" row.
//
// Storing only the id would render raw uuids in the chips; storing only the
// label would make the query unbuildable. The URL codec in `useInsightView`
// packs them as `id|label`.
//
// The still-seeded cells (Summary, Revenue by Month, the breakdowns) match on
// `label`, because those records hold names and have no entity ids — so they
// keep working wherever a real name matches a seeded one. Sales Team is live
// and filters by `id`.

import type { RevRecord } from './records'
import { DEMO_YEAR, MONTHS } from './seed'

/** One selected facet value. `id === label` for static enums whose wire value
 *  and display text coincide (account type), and for a record-derived pick
 *  (a breakdown row click) that has no id behind it. */
export interface FacetValue {
  id: string
  label: string
}

export interface RevFilters {
  vertical?: FacetValue[]
  condition?: FacetValue[]
  category?: FacetValue[]
  oem?: FacetValue[]
  owner?: FacetValue[]
  account?: FacetValue[]
  /** Selected calendar months — a normal multi facet like every other. `id` is
   *  the `YYYY-MM` wire token (sent as the API's repeated `months` param);
   *  `label` is the display "Jan 2026". Multi-select: `period` still chooses the
   *  bucket size, `months` narrows which records feed the buckets. */
  month?: FacetValue[]
}

export const MULTI_FILTER_KEYS = [
  'vertical',
  'condition',
  'category',
  'oem',
  'owner',
  'account',
  'month',
] as const
export type MultiFilterKey = (typeof MULTI_FILTER_KEYS)[number]

/** A facet matches when it has no selection, or the record's value is one of
 *  the selected LABELS (records carry names, not ids — see the note above). */
const facetMatch = (sel: FacetValue[] | undefined, v: string): boolean =>
  !sel || sel.length === 0 || sel.some((s) => s.label === v)

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Seeded records carry a month NAME ('Jan'); the month facet carries the
 *  `YYYY-MM` wire token. Convert the record's name to a token so the mock match
 *  lines up with the same ids the live API filters on. */
const recordMonthToken = (name: string): string => {
  const i = MONTHS.indexOf(name as (typeof MONTHS)[number])
  return i === -1 ? name : `${DEMO_YEAR}-${pad2(i + 1)}`
}

/** Month matches on `id` (the wire token), not `label` — unlike the name-based
 *  facets above — because the seeded record only knows its month name. */
const monthMatch = (sel: FacetValue[] | undefined, recordMonth: string): boolean =>
  !sel || sel.length === 0 || sel.some((s) => s.id === recordMonthToken(recordMonth))

export function applyFilters(records: RevRecord[], f: RevFilters): RevRecord[] {
  return records.filter(
    (r) =>
      facetMatch(f.vertical, r.vertical) &&
      facetMatch(f.condition, r.condition) &&
      facetMatch(f.category, r.category) &&
      facetMatch(f.oem, r.oem) &&
      facetMatch(f.owner, r.owner) &&
      facetMatch(f.account, r.account) &&
      monthMatch(f.month, r.month),
  )
}

/** Ids for one facet — the shape every API list param wants. */
export const facetIds = (v: FacetValue[] | undefined): string[] => (v ?? []).map((x) => x.id)
