import { useQuery } from "@tanstack/react-query"

import {
  fetchNewAccountsByPeriod,
  type NewAccountsByPeriodParams,
} from "../../api/dashboard"

// New Accounts by Period — `GET /crm/dashboard/insights/new-accounts-by-period`.
//
// The New Accounts insight page's two per-bucket series in ONE response:
// accounts won per bucket, and the bucket's revenue split new-vs-repeat.
// Takes the same params object as the period breakdown and the mix
// cross-tabs, so the window, bucket unit and facets match every other cell
// on the page. The By Period list and the New vs Repeat table both call this
// with identical params → one TanStack key → one network request.
//
// No per-hook query config (§6.5.1): the global QueryClient owns it.
export const NEW_ACCOUNTS_BY_PERIOD_KEY = ["crm", "dashboard", "new-accounts-by-period"] as const

export function useNewAccountsByPeriod(params: NewAccountsByPeriodParams) {
  return useQuery({
    queryKey: [...NEW_ACCOUNTS_BY_PERIOD_KEY, params],
    queryFn: () => fetchNewAccountsByPeriod(params),
  })
}
