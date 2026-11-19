import { useQuery } from '@tanstack/react-query'

import {
  fetchAvgOrderValueByCategory,
  type AvgOrderValueByCategoryParams,
} from '../../api/dashboard'

// Avg Order Value by category —
// `GET /crm/dashboard/insights/avg-order-value/by-category`.
//
// One grouping only (IMS category), so unlike `useRevenueBySource` there is no
// `report_type` to key on — the whole board runs a single cache entry per
// filter slice.
//
// Scope is resolved SERVER-side from the caller: superadmin/admin see the org,
// PM/APM get a `pm_assignments` lane OR'd with an account-owner lane, everyone
// else sees their own + direct reports' SOs. An out-of-scope `user_ids` is a
// 403, not an empty list — consumers must route the error through
// `LoadErrorState` so it reads as "no access" rather than "failed to load".
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient. Overriding them here is the
// documented cause of "stale data after save".
//
// `params` is a structural part of the key, so any filter / period / page
// change refetches rather than re-slicing a cached page (§16.7).

export const AVG_ORDER_VALUE_BY_CATEGORY_KEY = [
  'crm',
  'dashboard',
  'avg-order-value-by-category',
] as const

/** `enabled` is the ONLY option accepted, and it is not one of the settings
 *  §6.5.1 reserves to the global QueryClient — it gates whether the request
 *  fires, not how it is cached or retried. The tile drill-down page needs it:
 *  its params come from a server-built block that arrives one round-trip
 *  later, so the call must be parked until that block is known. */
export function useAvgOrderValueByCategory(params: AvgOrderValueByCategoryParams, options?: { enabled?: boolean }) {
  return useQuery({

    queryKey: [...AVG_ORDER_VALUE_BY_CATEGORY_KEY, params],
    queryFn: () => fetchAvgOrderValueByCategory(params),
    enabled: options?.enabled ?? true,
  })
}
