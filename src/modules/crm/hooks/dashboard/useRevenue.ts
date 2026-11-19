import { useQuery } from '@tanstack/react-query'

import { fetchRevenue, type RevenueParams } from '../../api/dashboard'

// Revenue by time bucket — `GET /crm/dashboard/revenue`.
//
// Scope is resolved SERVER-side from the caller (superadmin → all active users;
// manager → self + everyone reporting to them), so there is nothing to pass and
// nothing for the client to enforce.
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient. Overriding them here is the
// documented cause of "stale data after save".
//
// `params` is a structural part of the key, so any filter / period change
// refetches rather than re-bucketing a cached series client-side.
//
// PAGINATION is the caller's choice, and both choices are legitimate:
//
//   * Omit `page` / `page_size` → the WHOLE series in one request. The bucket
//     count is bounded by the period (yearly 1, quarterly ≤4, monthly ≤12,
//     weekly ≤~60), all inside the API's `page_size` cap of 100. A trend read
//     end-to-end wants every bucket. The one hole is a `custom` range longer
//     than 100 months (8+ years), which buckets monthly and truncates at the
//     cap.
//   * Pass them → a server page. The dashboard widget asks for the first 10
//     (like Sales Team) and the inner view pages through the rest, so neither
//     re-slices a cached series client-side (§16.7).
//
// `page`/`page_size` ride the query key, so the two live side by side without
// fighting over one cache entry.
export const REVENUE_PAGE_SIZE = 100

export const REVENUE_KEY = ['crm', 'dashboard', 'revenue'] as const

export function useRevenue(params: RevenueParams) {
  const withSize: RevenueParams = {
    ...params,
    page: params.page ?? 1,
    page_size: params.page_size ?? REVENUE_PAGE_SIZE,
  }
  return useQuery({
    queryKey: [...REVENUE_KEY, withSize],
    queryFn: () => fetchRevenue(withSize),
  })
}
