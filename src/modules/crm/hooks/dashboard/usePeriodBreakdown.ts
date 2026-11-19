import { useQuery } from '@tanstack/react-query'

import { fetchPeriodBreakdown, type PeriodBreakdownParams } from '../../api/dashboard'

// Period-wise breakdown — `GET /crm/dashboard/insights/period-wise-breakdown`.
//
// One row per time bucket, with the bucket UNIT resolved server-side from
// `period` (month / quarter / year / month-relative week). The response echoes
// it as `bucket_unit`, so the table's headers follow the DATA rather than the
// toolbar — see `PeriodicBreakdown`.
//
// The endpoint takes no `page` / `page_size`: it returns its whole result set,
// bounded by the calendar. Paging happens in the cell over rows already in
// hand, which is NOT the §16.7 anti-pattern — there is no unfetched remainder
// (same reasoning as the Sales Funnel card; see `useInsightPaging`).
//
// Scope is resolved SERVER-side from the caller, and an out-of-scope `user_ids`
// is a 403 rather than an empty list — consumers must route the error through
// `LoadErrorState` so it reads as "no access", not "failed to load".
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient. Overriding them here is the
// documented cause of "stale data after save".
//
// `params` is a structural part of the key, so any filter / period change
// refetches rather than re-deriving from a cached slice.

export const PERIOD_BREAKDOWN_KEY = ['crm', 'dashboard', 'period-breakdown'] as const

export function usePeriodBreakdown(params: PeriodBreakdownParams) {
  return useQuery({
    queryKey: [...PERIOD_BREAKDOWN_KEY, params],
    queryFn: () => fetchPeriodBreakdown(params),
  })
}
