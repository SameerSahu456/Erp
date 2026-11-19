import { useMemo } from 'react'

import { ALL_USERS } from '../../data/insights/hierarchy'
import {
  applyFilters,
  MULTI_FILTER_KEYS,
  restrictToRange,
  revRecords,
  type MultiFilterKey,
  type Period,
  type RevFilters,
  type RevRecord,
} from '../../data/insights/records'

// Resolves the record set behind an insight view. Shared by the dashboard and
// the detail page so both aggregate the same rows for the same slice.
//
// PHASE 1 — this reads the seeded demo data. Phase 2 replaces the body with
// `useQuery` against `/crm/dashboard/revenue` +
// `/crm/dashboard/hierarchy_wise_report`; the return shape is designed to
// survive that swap, so the pages and cells should not need to change.

export interface InsightRecords {
  /** Every user in scope. Phase 2: the endpoint decides this, server-side. */
  users: string[]
  /** Period-scoped but UNFILTERED. No longer the Month facet's option source —
   *  those come from the window itself (`monthTokensForWindow`), because these
   *  records are seeded and their months could only ever be this year's. */
  periodRecords: RevRecord[]
  /** Period-scoped AND filtered — what every widget renders. */
  records: RevRecord[]
  /** Facets worth showing. `owner` is dropped for a single-rep scope. */
  fields: MultiFilterKey[]
}

interface Args {
  period: Period
  from: string
  to: string
  filters: RevFilters
}

export function useInsightRecords({ period, from, to, filters }: Args): InsightRecords {
  // Phase 1 shows the whole roster — the reference's superadmin view. Phase 2
  // drops this: the endpoint returns only the rows the caller may see.
  const users = ALL_USERS

  const periodRecords = useMemo(() => {
    const base = revRecords(users)
    return period === 'custom' ? restrictToRange(base, from, to) : base
  }, [users, period, from, to])

  const records = useMemo(() => applyFilters(periodRecords, filters), [periodRecords, filters])

  const fields = useMemo(
    () =>
      users.length > 1
        ? [...MULTI_FILTER_KEYS]
        : MULTI_FILTER_KEYS.filter((k) => k !== 'owner'),
    [users.length],
  )

  return { users, periodRecords, records, fields }
}
