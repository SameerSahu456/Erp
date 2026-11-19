/**
 * Pending inspection work for the Work Assignments listing.
 *
 * The "Pending" tab lists devices still waiting to be assigned to an inspection
 * engineer. That data is the SAME grouped rollup the issue wizard starts from —
 * `GET /work-assignments/eligible-summary` (one row per GRN → part, with pending
 * counts) — so this reuses `fetchEligibleSummary` rather than adding a route.
 *
 * The endpoint is per-warehouse (one required `warehouse_id`), while the listing
 * runs in a MULTI-warehouse navbar scope. So we fan out one query per warehouse
 * (`useQueries`) and merge the groups, tagging each with the warehouse it came
 * from — the same pattern as `useAssignPoolsByWarehouse`. A GRN batch belongs to
 * exactly one warehouse, so the merged groups are naturally distinct (no dedupe).
 *
 * No query-config knobs here beyond `placeholderData` — `staleTime` / `retry` /
 * `refetchOn*` belong to the global QueryClient (§6.5.1). The key shape matches
 * `useEligibleSummary` (stage, warehouse, category), so the wizard and this tab
 * share one cache entry per warehouse and neither double-fetches.
 */
import { useMemo } from 'react'
import { keepPreviousData, useQueries } from '@tanstack/react-query'

import {
  fetchEligibleSummary,
  type EligibleGrnGroup,
  type WorkAssignmentStage,
} from '../../api/work-assignments'

import { wmsKeys } from '../keys'

/** One GRN's waiting work, tagged with the warehouse it was fetched from —
 *  eligible-summary is per-warehouse, so the row needs to know its source to
 *  resolve the warehouse name and deep-link the issue wizard. */
export type PendingGrnGroup = EligibleGrnGroup & { warehouse_id: string }

export interface EligibleSummaryResult {
  /** GRN groups across every warehouse in scope, oldest work first per group. */
  groups: PendingGrnGroup[]
  isLoading: boolean
  isFetching: boolean
  isError: boolean
}

/**
 * Waiting work for `stage` across a set of warehouses, merged GRN-by-GRN.
 *
 * Pass the warehouses in scope (the navbar pick, or the user's assignments when
 * the pick is "all"). An empty list runs no query and returns empty groups.
 */
export function useWorkAssignmentEligibleSummary(
  warehouseIds: readonly string[],
  stage: WorkAssignmentStage,
  options: { enabled?: boolean } = {},
): EligibleSummaryResult {
  const enabled = options.enabled ?? true
  const ids = useMemo(() => Array.from(new Set(warehouseIds)).sort(), [warehouseIds])

  return useQueries({
    queries: ids.map((warehouseId) => ({
      // Same key shape as useEligibleSummary (stage, warehouse, category) so the
      // wizard and this tab reuse one cache entry — category is unset here.
      queryKey: wmsKeys.workAssignments.eligible('summary', stage, warehouseId, undefined),
      queryFn: () => fetchEligibleSummary({ stage, warehouse_id: warehouseId }),
      enabled,
      placeholderData: keepPreviousData,
    })),
    combine: (results) => ({
      groups: results.flatMap((result, i) =>
        (result.data ?? []).map((group) => ({ ...group, warehouse_id: ids[i] })),
      ),
      isLoading: results.some((result) => result.isLoading),
      isFetching: results.some((result) => result.isFetching),
      isError: results.some((result) => result.isError),
    }),
  })
}
