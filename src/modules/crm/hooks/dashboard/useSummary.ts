import { useQuery } from '@tanstack/react-query'

import { fetchSummary, type SummaryParams } from '../../api/dashboard'

// Dashboard summary — `GET /crm/dashboard/summary`.
//
// The 7-tile strip above the insight body. A scalar widget: no pagination, no
// search, one request per filter slice.
//
// Scope is resolved SERVER-side from the caller, on the same model as
// `/revenue/by-source` — superadmin/admin see everything, PM/APM get their
// `pm_assignments` lane OR'd with an account-owner lane, everyone else gets
// self + direct reports OR'd with owned accounts. An out-of-scope `user_ids`
// is a 403, not an empty result, so consumers must route the error through
// `LoadErrorState` for it to read as "no access" rather than "failed to load".
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient.
//
// `params` is a structural part of the key, so any period / facet / scope
// change refetches — this is what the previous mock-data version could not do.

export const SUMMARY_KEY = ['crm', 'dashboard', 'summary'] as const

export function useSummary(params: SummaryParams) {
  return useQuery({
    queryKey: [...SUMMARY_KEY, params],
    queryFn: () => fetchSummary(params),
  })
}
