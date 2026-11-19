import { useQuery } from "@tanstack/react-query"

import { fetchInactiveAccounts, type InactiveAccountsParams } from "../../api/dashboard"

// Inactive Accounts — `GET /crm/dashboard/inactive-accounts`.
//
// Buyers whose most recent approved sales order is older than the
// period-driven rolling day threshold (monthly=30d, quarterly=90d,
// yearly=365d, weekly=7d). Scoped to root accounts.
//
// No per-hook query config (§6.5.1): the global QueryClient owns
// `staleTime` / `gcTime` / `retry` / `refetchOn*`. `params` is structural
// in the key so any period / limit change refetches.

export const INACTIVE_ACCOUNTS_KEY = ["crm", "dashboard", "inactive-accounts"] as const

export function useInactiveAccounts(params: InactiveAccountsParams) {
  return useQuery({
    queryKey: [...INACTIVE_ACCOUNTS_KEY, params],
    queryFn: () => fetchInactiveAccounts(params),
  })
}
