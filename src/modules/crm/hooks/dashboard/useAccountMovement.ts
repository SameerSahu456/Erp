import { useQuery } from "@tanstack/react-query"

import { fetchAccountMovement, type AccountMovementParams } from "../../api/dashboard"

// Account Movement — `GET /crm/dashboard/account-movement`.
//
// Dual-mode endpoint: widget (both buckets, top-N) when `movement` is unset,
// drill-down (one bucket, paginated) when it is. Both modes share one DB
// round-trip pair + one visibility resolution — see the backend service for
// the invariant that keeps summary numbers aligned across modes.
//
// Window math is identical to Growth — same `resolve_growth_windows`, same
// filter semantics applied to BOTH windows. Numbers reconcile exactly with
// `/dashboard/revenue-by-account` for the same filters + window.
//
// No per-hook query config (§6.5.1): the global QueryClient owns `staleTime`
// / `gcTime` / `retry` / `refetchOn*`. `params` is structural in the key so
// any period / mode / page / filter change refetches.

export const ACCOUNT_MOVEMENT_KEY = ["crm", "dashboard", "account-movement"] as const

export function useAccountMovement(params: AccountMovementParams) {
  return useQuery({
    queryKey: [...ACCOUNT_MOVEMENT_KEY, params],
    queryFn: () => fetchAccountMovement(params),
  })
}
