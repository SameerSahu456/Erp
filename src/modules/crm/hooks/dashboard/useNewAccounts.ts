import { useQuery } from "@tanstack/react-query"

import { fetchNewAccounts, type NewAccountsParams } from "../../api/dashboard"

// New Accounts — `GET /crm/dashboard/new-accounts`.
//
// Reads the top-N newly-acquired accounts for the current period window
// plus the count delta against the previous full window. Rule A per
// NEW_ACCOUNTS_WIDGET_PLAN — "new" = account's FIRST-EVER sales order
// landed in the window.
//
// No per-hook query config (§6.5.1): the global QueryClient owns
// `staleTime` / `gcTime` / `retry` / `refetchOn*`. `params` is structural
// in the key so any period / filter / limit change refetches.

export const NEW_ACCOUNTS_KEY = ["crm", "dashboard", "new-accounts"] as const

export function useNewAccounts(params: NewAccountsParams) {
  return useQuery({
    queryKey: [...NEW_ACCOUNTS_KEY, params],
    queryFn: () => fetchNewAccounts(params),
  })
}
