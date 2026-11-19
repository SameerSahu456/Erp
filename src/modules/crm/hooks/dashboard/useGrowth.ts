import { useQuery } from '@tanstack/react-query'

import { fetchGrowth, type GrowthParams } from '../../api/dashboard'

// Growth — `GET /crm/dashboard/growth`.
//
// This window's revenue vs the previous FULL window, as one scalar payload
// (`current` / `previous` / `delta` / `delta_pct` / `direction`).
//
// The endpoint is SCALAR — no `page` / `page_size` / `search`, one request per
// filter slice, same class as `useSummary` and `useSalesFunnel`. There is no
// pager over it either: unlike the funnel there are no rows to slice.
//
// Scope is resolved SERVER-side, and an out-of-scope `user_ids` is a 403 rather
// than an empty result — so consumers must route the error through
// `LoadErrorState` for it to read as "no access" instead of "failed to load".
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` all come from the global QueryClient.
//
// `params` is a structural part of the key, so any period / facet / scope
// change refetches. Note the key can never contain `custom`: `toGrowthParams`
// coerces it to `monthly` before it gets here, because `GrowthPeriod` has no
// such member and the request would 422.

export const GROWTH_KEY = ['crm', 'dashboard', 'growth'] as const

export function useGrowth(params: GrowthParams) {
  return useQuery({
    queryKey: [...GROWTH_KEY, params],
    queryFn: () => fetchGrowth(params),
  })
}
