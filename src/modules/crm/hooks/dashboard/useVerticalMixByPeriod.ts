import { useQuery } from '@tanstack/react-query'

import {
  fetchVerticalMixByPeriod,
  type VerticalMixByPeriodParams,
} from '../../api/dashboard'

// Vertical Mix by Period — `GET /crm/dashboard/insights/vertical-mix-by-period`.
//
// The sibling of `useConditionMixByPeriod`, over the account-type dimension.
// Same slice as `usePeriodBreakdown`, pivoted: one row per bucket, one column
// per vertical. No separate param mapper — the query contract is 1:1, so
// callers pass the very `toPeriodBreakdownParams(...)` object they already
// built, and the cells on a page can never describe different windows.
//
// No server paging: the endpoint returns every bucket for the window in one
// response. The cell's pager re-slices those rows rather than refetching.
//
// Scope is resolved SERVER-side; an out-of-scope `user_ids` is a 403 rather
// than an empty result, so the consumer must route the error through
// `LoadErrorState` for it to read as "no access" instead of "failed to load".
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient.

export const VERTICAL_MIX_KEY = ['crm', 'dashboard', 'vertical-mix-by-period'] as const

export function useVerticalMixByPeriod(params: VerticalMixByPeriodParams) {
  return useQuery({
    queryKey: [...VERTICAL_MIX_KEY, params],
    queryFn: () => fetchVerticalMixByPeriod(params),
  })
}
