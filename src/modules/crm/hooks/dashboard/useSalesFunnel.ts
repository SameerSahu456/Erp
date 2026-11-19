import { useQuery } from '@tanstack/react-query'

import { fetchSalesFunnel, type SalesFunnelParams } from '../../api/dashboard'

// Sales Funnel — `GET /crm/dashboard/sales-funnel`.
//
// Conversion by population: four rows (`[leads, deals, quotes, demo_requests]`,
// fixed order), each with `total`, `converted` and `conv_rate`.
//
// The ENDPOINT is scalar — no `page` / `page_size` / `search`, one request per
// filter slice, same class as `useSummary`. `SalesFunnelCard` still renders the
// board's standard footer pager over the result, but it pages rows already in
// hand rather than refetching, so `page` / `pageSize` deliberately never reach
// this hook or its query key. See `SalesFunnelCard`'s PAGING note.
//
// Scope is resolved SERVER-side and mirrors `/dashboard/summary`: superadmin /
// admin see everything org-wide, PM / Asst PM get their `pm_assignments` lane
// OR'd with an account-owner lane (leads: the account-owner lane only, since
// leads carry no product columns), everyone else gets self + direct reports OR'd
// with owned accounts. The quotes row attributes on `Quote.created_by` and the
// demo-requests row on `requested_by_id`, each with its own account-owner and
// PM-category lane. An out-of-scope `user_ids` is a 403, not an empty result,
// so consumers must route the error through `LoadErrorState` for it to read as
// "no access" rather than "failed to load".
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient.
//
// `params` is a structural part of the key, so any period / facet / scope change
// refetches. That includes the three product facets the endpoint accepts and
// ignores (`conditions` / `category_ids` / `oem_ids`) — see `api/dashboard.ts`
// for why they are sent anyway.

export const SALES_FUNNEL_KEY = ['crm', 'dashboard', 'sales-funnel'] as const

export function useSalesFunnel(params: SalesFunnelParams) {
  return useQuery({
    queryKey: [...SALES_FUNNEL_KEY, params],
    queryFn: () => fetchSalesFunnel(params),
  })
}
