// The insight filter contract — the shape the dashboard, the inner view and the
// query mapper all agree on.
//
// This used to live in `data/insights/`, alongside the seeded demo records. That
// folder is gone: the widgets read the live dashboard endpoints now. The TYPES
// were never demo data, so they moved here rather than dying with it.

/** One selected facet value.
 *
 *  Both halves are carried because the two consumers need different ones:
 *    • `id`    — what the API filters on (`category_ids=<uuid>`, `conditions=new`).
 *    • `label` — what the user sees: the trigger, the "Filtered by:" chips.
 *
 *  Storing only the id would render raw uuids in the chips; storing only the
 *  label would make the query unbuildable. The URL codec in `useInsightView`
 *  packs them as `id|label`.
 *
 *  `id === label` for static enums whose wire value and display text coincide
 *  (account type), and for legacy label-only URLs. */
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
}

export const MULTI_FILTER_KEYS = [
  'vertical',
  'condition',
  'category',
  'oem',
  'owner',
  'account',
] as const
export type MultiFilterKey = (typeof MULTI_FILTER_KEYS)[number]

/** Mirrors the backend `PeriodType`. Presets compute their own window from
 *  today and ignore `start`/`end`; `custom` requires both. */
export type Period = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export const PERIODS: readonly Period[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom']

export const isPeriod = (v: string | null): v is Period =>
  !!v && (PERIODS as readonly string[]).includes(v)

/** Ids for one facet — the shape every API list param wants. */
export const facetIds = (v: FacetValue[] | undefined): string[] => (v ?? []).map((x) => x.id)
