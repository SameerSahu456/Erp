import { useQuery } from '@tanstack/react-query'

import { fetchTopOrders, type TopOrdersParams } from '../../api/dashboard'

// Top Orders — `GET /crm/dashboard/revenue/top-orders`.
//
// Ranked approved sales-order LINE ITEMS (one row per matching line, so one SO
// can appear more than once). Its own endpoint, so its own hook — unlike the
// three by-source breakdowns that share `useRevenueBySource` via `report_type`.
//
// Scope is resolved SERVER-side and mirrors `top_products`: superadmin / admin
// see everything, PMs see their PM-scope + owned accounts, everyone else sees
// only lines from their own SOs plus their owned accounts. An out-of-scope
// `user_ids` is a 403, not an empty list — consumers must route the error
// through `LoadErrorState` so it reads as "no access", not "failed to load".
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient.
//
// `params` is a structural part of the key, so any filter / period / page
// change refetches rather than re-slicing a cached page (§16.7).

export const TOP_ORDERS_KEY = ['crm', 'dashboard', 'top-orders'] as const

/** `enabled` is the ONLY option accepted, and it is not one of the settings
 *  §6.5.1 reserves to the global QueryClient — it gates whether the request
 *  fires, not how it is cached or retried. The tile drill-down page needs it:
 *  its params come from a server-built block that arrives one round-trip
 *  later, so the call must be parked until that block is known. */
export function useTopOrders(params: TopOrdersParams, options?: { enabled?: boolean }) {
  return useQuery({

    queryKey: [...TOP_ORDERS_KEY, params],
    queryFn: () => fetchTopOrders(params),
    enabled: options?.enabled ?? true,
  })
}
