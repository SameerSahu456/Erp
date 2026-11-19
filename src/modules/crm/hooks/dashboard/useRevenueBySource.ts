import { useQuery } from '@tanstack/react-query'

import { fetchRevenueBySource, type RevenueBySourceParams } from '../../api/dashboard'

// Revenue by source — `GET /crm/dashboard/revenue/by-source`.
//
// One endpoint, three groupings (`report_type`: account / category / oem). The
// report type rides in `params`, so it is part of the query key: the three
// breakdown cells get three independent cache entries off one hook.
//
// Scope is resolved SERVER-side from the caller. Note it is NOT the same model
// as `hierarchy_wise_report`: this endpoint bypasses for `is_superuser` or the
// `admin` role, and gives PM/APM a `pm_assignments` lane OR'd with an
// account-owner lane. An out-of-scope `user_ids` is a 403, not an empty list —
// consumers must route the error through `LoadErrorState` so it reads as "no
// access" rather than "failed to load".
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient. Overriding them here is the
// documented cause of "stale data after save".
//
// `params` is a structural part of the key, so any filter / period / page
// change refetches rather than re-slicing a cached page (§16.7).

export const REVENUE_BY_SOURCE_KEY = ['crm', 'dashboard', 'revenue-by-source'] as const

/** `enabled` is the ONLY option accepted, and it is not one of the settings
 *  §6.5.1 reserves to the global QueryClient — it gates whether the request
 *  fires, not how it is cached or retried. The tile drill-down page needs it:
 *  its params come from the tile's server-built `drilldown` block, so the call
 *  must be parked until that block has actually arrived. */
export function useRevenueBySource(
  params: RevenueBySourceParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...REVENUE_BY_SOURCE_KEY, params],
    queryFn: () => fetchRevenueBySource(params),
    enabled: options?.enabled ?? true,
  })
}
