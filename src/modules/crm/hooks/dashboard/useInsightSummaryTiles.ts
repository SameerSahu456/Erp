import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { fetchInsightSummaryTiles, type InsightSummaryTilesParams } from '../../api/dashboard'

// Insights summary tiles — `GET /crm/dashboard/insights/summary-tiles`.
//
// The 4-tile KPI strip under the Summary card on the Revenue by Month /
// Revenue by Account / Category & OEM / Channel vs End Customer pages. One
// endpoint, four bundles, dispatched by `report_type` — so `report_type` is
// part of the key and the four pages cache independently.
//
// A scalar widget: no pagination, no search, one request per filter slice.
//
// Scope is resolved SERVER-side from the caller, on the same model as
// `/revenue/by-source` — superadmin/admin see everything, PM/APM get their
// `pm_assignments` lane OR'd with an account-owner lane, everyone else gets
// self + direct reports OR'd with owned accounts. An out-of-scope `user_ids`
// is a 403, not an empty result, so consumers must route the error through
// `LoadErrorState` for it to read as "no access" rather than "failed to load".
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient.

export const INSIGHT_SUMMARY_TILES_KEY = ['crm', 'dashboard', 'insight-summary-tiles'] as const

/** Two options, neither of them a setting §6.5.1 reserves to the global
 *  QueryClient (`staleTime` / `gcTime` / `retry` / `refetchOn*`):
 *
 *  - `enabled` gates whether the request fires at all. The tile drill-down page
 *    needs it: `reportType` comes off the URL, so the call must be parked until
 *    that value is known to be a real bundle rather than 422-ing on a typo.
 *  - `keepPrevious` keeps the last response on screen while a changed slice
 *    loads. The key carries the whole filter slice, so without it every filter
 *    change starts from NO data — and the drill-down page, which reads its tile
 *    out of this response, tore down its filter bar and search box for a
 *    skeleton on each pick (CP-756 #1 follow-up). Same intent as
 *    `keepPreviousData` on a paged list. Consumers must treat
 *    `isPlaceholderData` as "still loading" for what hangs off the response. */
export function useInsightSummaryTiles(
  params: InsightSummaryTilesParams,
  options?: { enabled?: boolean; keepPrevious?: boolean },
) {
  return useQuery({
    queryKey: [...INSIGHT_SUMMARY_TILES_KEY, params],
    queryFn: () => fetchInsightSummaryTiles(params),
    enabled: options?.enabled ?? true,
    placeholderData: options?.keepPrevious ? keepPreviousData : undefined,
  })
}
