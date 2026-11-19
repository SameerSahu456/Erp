import { useQuery } from "@tanstack/react-query"

import {
  fetchRevenueByCategoryOem,
  type RevenueByCategoryOemParams,
  type RevenueByCategoryOemResponse,
} from "../../api/dashboard"

// Revenue by Category × OEM — `GET /crm/revenue/by-category-oem`.
//
// One endpoint feeds two mounts:
//   * Account 360° tab → pass `params.account_id`
//   * CRM dashboard    → omit `params.account_id`
//
// One call, one payload, four widgets — TOP CATEGORY / TOP OEM / TOTAL VALUE
// tiles + Category × Brand pivot. On the dashboard the two ranked category /
// OEM lists below the pivot are derived on the FE from `pivot.rows[i].total`
// and `pivot.columns[j].total`, so the endpoint stays lean.
//
// The pivot is server-shaped: rows and columns sorted by their totals, cells
// zero-filled for empty (category, OEM) intersections. Freeform SO lines (no
// OEM) bucket into a synthetic "No OEM" column whose `oem_id` stays null.
//
// Pagination is REAL and paginates the CATEGORY axis (row axis). OEM columns
// always ship in full so the same brand column stays put across pages.
// `totals.*` and `derived.*` are universe-wide — flipping page never changes
// them. The pivot's `grand_total` + per-column totals reflect ONLY the
// visible slice, so the rendered table's totals always add up to what the
// user sees.
//
// Scope is resolved SERVER-side. When `account_id` is set the AccountService
// authorisation gate runs first (403/404 with no data leak on out-of-scope
// accounts); when it's omitted the standard multi-lane visibility applies
// (superuser bypass, PM/APM pm_assignments lane OR'd with account-owner
// lane, everyone else by ownership). An out-of-scope `user_ids` is a 403,
// not empty rows — route through `LoadErrorState` so it reads as "no
// access".
//
// No per-hook query config (§6.5.1): staleTime / gcTime / retry /
// refetchOn* come from the global QueryClient in `src/app/providers.tsx`.
// Overriding them here is the documented cause of "stale data after save".
//
// `params` is a structural key level so any filter / period / page change
// refetches rather than re-slicing a cached page (§16.7).

export const REVENUE_BY_CATEGORY_OEM_KEY = [
  "crm",
  "revenue-by-category-oem",
] as const

/** `enabled` is the ONLY option accepted — it gates whether the request
 *  fires, not how it is cached / retried (per §6.5.1). Useful when the
 *  caller can't build `params` yet (waiting on a route param, another
 *  hook's data, etc.). */
export function useRevenueByCategoryOem(
  params: RevenueByCategoryOemParams,
  options?: { enabled?: boolean },
) {
  return useQuery<RevenueByCategoryOemResponse>({
    queryKey: [...REVENUE_BY_CATEGORY_OEM_KEY, params],
    queryFn: () => fetchRevenueByCategoryOem(params),
    enabled: options?.enabled ?? true,
  })
}
