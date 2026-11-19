import { useQuery } from '@tanstack/react-query'

import { fetchAccountKpis, type AccountKpisParams } from '../../api/accounts'

// Account 360° KPI strip — GET /crm/accounts/{id}/kpis.
//
// Three tiles (Lifetime, current calendar Period, Last Order) narrowed by
// the same Category / OEM facets as the widgets below on the same tab, so
// changing a facet refetches the tiles alongside the widgets.
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient.

export const ACCOUNT_KPIS_KEY = ['crm', 'account-kpis'] as const

export function useAccountKpis(accountId: string, params: AccountKpisParams) {
  return useQuery({
    queryKey: [...ACCOUNT_KPIS_KEY, accountId, params],
    queryFn: () => fetchAccountKpis(accountId, params),
  })
}
