import { useQuery } from '@tanstack/react-query'

import { PAGINATION } from '@/shared/constants'

import {
  fetchRecords,
  type RecordsParams,
  type RecordsResponse,
  type SalesOrderStatus,
  type SummaryParams,
} from '../../api/dashboard'
import { SUMMARY_DRILLDOWN } from '../../components/dashboard/insights/summary-drilldown.config'
import type { SummaryTileKey } from '../../components/dashboard/insights/InsightSummaryCard'

// Rows behind a summary tile, served by the dedicated `GET /crm/dashboard/records`
// endpoint — see `summary-drilldown.config.ts` for the per-tile `(type, metric)`
// map. The endpoint returns the union item shape plus a server-built `header`
// (title / subtitle / totals) and `pagination`, so this hook is a thin
// param-builder over one fetch: no list-endpoint composition, no client-side
// quote↔SO intersection, no client pagination.
//
// Powers `/crm/insights/records/:tile` (`CrmRecordsPage`). It previously backed
// a modal over the board and took the loaded `summary` as a "wait for the tile
// strip" gate; a standalone page has no strip above it, and the params never
// read that value, so the gate is gone — `enabled` now hinges on the tile alone.
//
// WINDOW: the page's selected period flows straight through (weekly stays
// weekly, monthly stays monthly, custom carries its `start`/`end`). The records
// endpoint resolves the window with the SAME resolver as `/dashboard/summary`
// (`_resolve_window` — weekly → Monday of this week, monthly → 1st, quarterly →
// FY quarter start, yearly → Apr 1 of the current Indian FY, end = today), so
// the drill-down lands on the exact slice the tile counted.
//
// FILTERS: the page's live filter slice flows straight through, so the records
// narrow by the same facets the tile did. `SummaryParams.type` is the
// account-type filter, mapped to this endpoint's `account_type` param.
//
// No per-hook query config (§6.5.1). Server pagination throughout (§16.7).

export const SUMMARY_DRILLDOWN_KEY = ['crm', 'dashboard', 'records'] as const

/** The same query, driven by EXPLICIT params instead of a tile key.
 *
 *  `useRecords` below resolves a `(type, metric)` pair from
 *  `SUMMARY_DRILLDOWN` — right for the summary strip, where the FE owns the
 *  mapping. The KPI-tile drill-down is the opposite case: the SERVER built the
 *  whole query (window, facets, `status` pin) inside the tile computation and
 *  shipped it in the tile's `drilldown` block, so re-deriving anything here
 *  would be the drift this whole feature exists to avoid.
 *
 *  Hence two entry points over one fetch rather than a second hook: the cache
 *  key is the params object either way, so an identical slice reached from
 *  either direction hits the same cache entry. */
export function useRecordsWithParams(
  params: RecordsParams | null,
  options?: { enabled?: boolean },
) {
  return useQuery<RecordsResponse>({
    queryKey: [...SUMMARY_DRILLDOWN_KEY, params],
    enabled: (options?.enabled ?? true) && params !== null,
    queryFn: () => fetchRecords(params!),
  })
}

/** Page-level filters added by the records drill-down page itself (not
 *  inherited from the tile). Kept as a separate arg rather than mixed into
 *  `SummaryParams` so the summary strip's own hooks are unaffected. */
export interface RecordsPageFilters {
  /** Free-text search on the row's per-type identifier. Backend rejects <2
   *  chars after strip, so callers should hold the request until the user has
   *  typed at least that much. */
  q?: string
  /** Status narrowing on the SO panels (`deal:won`, `lead:won`,
   *  `sales_order:total`). No-op on the quote / lead-total shapes. */
  status?: SalesOrderStatus[]
}

export function useRecords(
  tile: string,
  summaryParams: SummaryParams,
  page: number,
  pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE,
  pageFilters: RecordsPageFilters = {},
) {
  const map = tile in SUMMARY_DRILLDOWN ? SUMMARY_DRILLDOWN[tile as SummaryTileKey] : undefined

  // Only build params for a tile that has a `(type, metric)` mapping; an
  // unknown `:tile` renders the not-found header instead of querying.
  const params: RecordsParams | undefined = map
    ? {
        type: map.type,
        metric: map.metric,
        // Selected period passes through — same resolver as /summary, so the
        // records land on the exact window the tile counted (see note above).
        period: summaryParams.period,
        start: summaryParams.start,
        end: summaryParams.end,
        user_ids: summaryParams.user_ids,
        // `SummaryParams.type` is the account-type filter; this endpoint calls
        // it `account_type`.
        account_type: summaryParams.type,
        // Same month narrowing as the tile it drills into.
        months: summaryParams.months,
        account_ids: summaryParams.account_ids,
        conditions: summaryParams.conditions,
        category_ids: summaryParams.category_ids,
        oem_ids: summaryParams.oem_ids,
        // Page-level filters added by the records page itself.
        q: pageFilters.q,
        status: pageFilters.status,
        page,
        page_size: pageSize,
      }
    : undefined

  // Delegates, so the two entry points cannot drift into different cache keys
  // or different `enabled` semantics.
  return useRecordsWithParams(params ?? null)
}
