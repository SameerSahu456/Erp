import { useQuery } from '@tanstack/react-query'

import { fetchSalesTeamRevenue, type SalesTeamRevenueParams } from '../../api/dashboard'

// Sales team revenue — `GET /crm/dashboard/hierarchy_wise_report`.
//
// Scope is resolved SERVER-side from the caller (superadmin → all active users;
// manager → self + everyone reporting to them), so there is nothing to pass and
// nothing for the client to enforce.
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient. Overriding them here is the
// documented cause of "stale data after save".
//
// `params` is a structural part of the key, so any filter / period / page
// change refetches rather than re-filtering a cached page client-side.

export const SALES_TEAM_REVENUE_KEY = ['crm', 'dashboard', 'sales-team-revenue'] as const

export function useSalesTeamRevenue(params: SalesTeamRevenueParams) {
  return useQuery({
    queryKey: [...SALES_TEAM_REVENUE_KEY, params],
    queryFn: () => fetchSalesTeamRevenue(params),
  })
}
