import { makeStaticAsyncOptions } from '@/components/ui/async-select'
import { CHANNEL_TAG_OPTIONS } from '@/constants/channel-tags'
import { categoryLabel, useCategoryOptions, useOEMOptions } from '@modules/ims'
import { getUserDisplayName } from '@modules/users'

import { NO_CONDITION_ID, type SalesTeamRoleFacet } from '../../../api/dashboard'
import { useAccountOptions } from '../../../hooks/accounts/useAccounts'
import { useAllowedUsers } from '../../../hooks/dashboard/useAllowedUsers'
import { INSIGHTS_STRINGS } from './insights.strings'
// The registry's `MultiFilterKey` (`data/insights/records`), NOT the one in
// the local `insights.filters` — that copy predates the `month` facet, and
// indexing this map with a tile's `facet` needs the same union the tile specs
// are typed with.
import type { MultiFilterKey } from '../../../data/insights/records'
import type { InsightFilterField } from './insights.registry'

// WHERE each facet's options come from — the single source both filter bars
// read. The dashboard toolbar and the inner-view filter bar keep their own
// chrome but share every bit of behaviour through this registry, so a facet can
// never work in one bar and not the other.
//
// Static and API-backed facets present the SAME interface: a
// `(search, opts?) => infiniteQueryShape` hook. `makeStaticAsyncOptions` adapts
// a fixed array into that shape, so the enum facets get identical search + chip
// UX through the same component with no round-trip, and there is one code path.

// ── static enums ──────────────────────────────────────────────────────────
// These are backend Literals, not tables — there is nothing to fetch.

/** `AccountTypeLiteral` on the dashboard endpoints. Reuses the existing
 *  allow-list rather than another hardcoded copy. NOTE it carries four
 *  values; the Phase-1 mock only generates two (no `Cloud / Data Center`). */
const TYPE_ITEMS = CHANNEL_TAG_OPTIONS.map((t) => ({ id: t, name: t }))

/** IMS `ConditionEnum`, plus "No Condition". `id` is the wire value sent as
 *  `?conditions=<id>`; `name` is what the user reads — both taken from
 *  `INSIGHTS_STRINGS.conditionLabels`, the same map the Condition Mix column
 *  headers and the Top Orders sub-line read, so the dropdown can never disagree
 *  with the widgets about what a condition is called.
 *
 *  The 4th option is NOT an enum member: SO lines carry a NULLABLE condition
 *  (freeform lines have none), and the enum values cannot select that bucket
 *  because they only ever widen. It sends `NO_CONDITION_ID` — see the constant
 *  in `api/dashboard.ts` for the wire contract. The label reuses the report's
 *  own `no_condition` copy so the filter chip and the "No Condition" donut
 *  slice / mix column read identically. */
const CONDITION_ITEMS = [
  { id: 'new', name: INSIGHTS_STRINGS.conditionLabels.new },
  { id: 'refurbished', name: INSIGHTS_STRINGS.conditionLabels.refurbished },
  { id: 'new_pull', name: INSIGHTS_STRINGS.conditionLabels.new_pull },
  { id: NO_CONDITION_ID, name: INSIGHTS_STRINGS.conditionLabels.no_condition },
]

/** Which facets have a NULL bucket, and the wire value that selects it.
 *
 *  A breakdown row/slice normally filters by the entity id in the row's
 *  `extra_metadata`. For a nullable dimension that id is `null` on one row —
 *  the "No Condition" slice IS the `condition IS NULL` rows — and a click on it
 *  has to send the sentinel instead.
 *
 *  Every drill-in surface reads this map rather than hardcoding the value, so
 *  the Condition dropdown, the detail page's donut, and the dashboard layout's
 *  donut cannot disagree about how that bucket is filtered. A facet absent
 *  here has no null bucket, and such a click stays inert.
 *
 *  `condition` is the only entry today: `type` / `category` / `oem` / `owner` /
 *  `account` are all NOT NULL on the rows they group. */
export const NULL_BUCKET_ID: Partial<Record<MultiFilterKey, string>> = {
  condition: NO_CONDITION_ID,
}

const byName = (i: { name: string }) => i.name

// ── hook adapters ─────────────────────────────────────────────────────────
// `useUserOptions` is 3-arg and `useAccountOptions` takes `enabled` inside its
// options bag, so neither matches `(search, { enabled })` directly. Declared at
// module level (not inline) so their identity is stable across renders.
// Mirrors the adapter pattern in `LinkChildAccountsDialog`.

// The User facet reads the DASHBOARD's own picker endpoint, not the org-wide
// `/api/v1/users` list `useUserOptions` wraps. Both render the same row shape,
// but only this one is scope-resolved by the same rules the widgets enforce, so
// the dropdown can no longer offer a user the board then rejects with a 403
// DASHBOARD_SCOPE_DENIED. Already `(search, { enabled })`, so no adapter.
const useRepOptions = useAllowedUsers

const useAccountFacetOptions = (search: string, options?: { enabled?: boolean }) =>
  // `status: null` = every status, so Inactive accounts are offered too (CP-756 #5:
  // the year's top customer was Inactive and could not be found). Approval keeps
  // the hook's default (`["Approved"]`).
  useAccountOptions(search, { enabled: options?.enabled, status: null })

// ── the registry ──────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any -- Each facet's hook
   returns a different row type (Category / OEM / UserListItem /
   AccountListItem). They are only ever consumed together, through
   AsyncMultiSelect's generic, which re-narrows per call site. A union here
   would have to be threaded through the registry for no gain — the row type is
   opaque to every consumer except its own `toLabel`. */
export interface InsightFacetSource {
  label: string
  useOptions: (search: string, options?: { enabled?: boolean }) => any
  toLabel: (item: any) => string
  /** Wire value for a row. Defaults to `item.id`; static enums use their enum
   *  value, roles use their NAME (`Role.id` is a number and would 422). */
  toId?: (item: any) => string
  /** Optional trailing column, rendered right-aligned and `shrink-0` beside the
   *  label — a count or other short stat. Kept OUT of `toLabel` on purpose: a
   *  value baked into the label string wraps (or truncates) with the name, and
   *  for the role facet that meant the user count was the first thing lost on a
   *  long role. Omit for facets with nothing to show. */
  toMeta?: (item: any) => string
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const S = INSIGHTS_STRINGS.facets

export const INSIGHT_FACETS: Record<
  Exclude<InsightFilterField, 'month'>,
  InsightFacetSource
> = {
  // static
  vertical: {
    label: S.vertical,
    useOptions: makeStaticAsyncOptions(TYPE_ITEMS, byName),
    toLabel: byName,
  },
  condition: {
    label: S.condition,
    useOptions: makeStaticAsyncOptions(CONDITION_ITEMS, byName),
    toLabel: byName,
  },
  // API-backed
  category: {
    label: S.category,
    useOptions: useCategoryOptions,
    // Parent-prefixed ("Parent / Name") so two sub-categories sharing a leaf
    // name stay distinct — the same label the rest of the app shows.
    toLabel: categoryLabel,
  },
  oem: {
    label: S.oem,
    useOptions: useOEMOptions,
    toLabel: byName,
  },
  owner: {
    label: S.owner,
    useOptions: useRepOptions,
    toLabel: getUserDisplayName,
  },
  account: {
    label: S.account,
    useOptions: useAccountFacetOptions,
    toLabel: byName,
  },
}

/** Facets whose options come from this registry. `month` is excluded — it is
 *  bound to the period window and stays derived from the loaded records. */
export const isRegistryFacet = (
  f: InsightFilterField,
): f is Exclude<InsightFilterField, 'month'> => f !== 'month'

/** The Sales Team widget's role filter, built from the roles the REPORT
 *  actually contains — `SalesTeamRevenueResponse.roles`, which rides along on
 *  the widget's own query.
 *
 *  Was `useRolesInfinite` (the app-wide paginated `/roles` endpoint). That
 *  listed every role defined in the system, including ones held by nobody the
 *  caller can see, so the dropdown offered filters that returned zero rows and
 *  could show no counts. The report's own facet is scope-aware and carries
 *  `user_count`.
 *
 *  NOT a §16.11 violation despite being a static list: this is not a paginated
 *  endpoint being fetched-then-filtered client-side. The array arrives COMPLETE
 *  and unpaginated on a response the widget already makes (role cardinality is
 *  bounded by the `roles` table), so there is no unfetched remainder — the same
 *  reasoning the `sales-funnel` / `period-breakdown` pagers are documented with.
 *  Zero extra round-trips.
 *
 *  NOT a page-level facet: it filters that widget's own query, so it lives
 *  outside `INSIGHT_FACETS`. The wire param `roles` takes role NAMES, so the
 *  id IS the name (`Role.id` is a number and would 422).
 *
 *  Built per-render from `roles`; `makeStaticAsyncOptions` keys its memo on the
 *  items array, so a refetch that changes the counts re-renders the options. */
export function buildRoleFacet(roles: SalesTeamRoleFacet[]): InsightFacetSource {
  const items = roles.map((r) => ({
    id: r.name,
    name: r.name,
    user_count: r.user_count,
  }))
  return {
    label: INSIGHTS_STRINGS.salesTeam.rolesLabel,
    useOptions: makeStaticAsyncOptions(items, byName),
    // Name only. The count is NOT concatenated in here — it goes through
    // `toMeta` so it renders as its own right-hand column and cannot be pushed
    // onto a second line (or clipped) by a long role name.
    toLabel: byName,
    toId: byName,
    toMeta: (item: { user_count: number }) => String(item.user_count),
  }
}
