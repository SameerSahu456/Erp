import { useQuery } from "@tanstack/react-query"

import {
  fetchInactiveAccountsByPeriod,
  type InactiveAccountsByPeriodParams,
} from "../../api/dashboard"

export const INACTIVE_ACCOUNTS_BY_PERIOD_KEY = [
  "crm",
  "dashboard",
  "inactive-accounts-by-period",
] as const

export function useInactiveAccountsByPeriod(params: InactiveAccountsByPeriodParams) {
  return useQuery({
    queryKey: [...INACTIVE_ACCOUNTS_BY_PERIOD_KEY, params],
    queryFn: () => fetchInactiveAccountsByPeriod(params),
  })
}
