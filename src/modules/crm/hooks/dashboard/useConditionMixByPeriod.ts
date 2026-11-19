import { useQuery } from '@tanstack/react-query'

import {
  fetchConditionMixByPeriod,
  type ConditionMixByPeriodParams,
} from '../../api/dashboard'

// Condition Mix by Period — `GET /crm/dashboard/insights/condition-mix-by-period`.
//
// The same slice `usePeriodBreakdown` fetches, pivoted: one row per bucket, one
// column per condition. There is no separate param mapper because the query
// contract is 1:1 — callers pass the very `toPeriodBreakdownParams(...)` object
// they already built for the breakdown table, so the two cells on the page can
// never describe different windows.
//
// No server paging: the endpoint returns the whole bucket set for the window
// (weekly is at most ~5 rows, monthly 12, yearly 1), and the chart wants them
// all at once anyway.
//
// Scope is resolved SERVER-side; an out-of-scope `user_ids` is a 403 rather
// than an empty result, so the consumer must route the error through
// `LoadErrorState` for it to read as "no access" instead of "failed to load".
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient.

export const CONDITION_MIX_KEY = ['crm', 'dashboard', 'condition-mix-by-period'] as const

export function useConditionMixByPeriod(params: ConditionMixByPeriodParams) {
  return useQuery({
    queryKey: [...CONDITION_MIX_KEY, params],
    queryFn: () => fetchConditionMixByPeriod(params),
  })
}
